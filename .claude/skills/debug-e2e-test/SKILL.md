---
name: debug-e2e-test
description: Invoke after creating a new *.spec.ts file in e2e/tests/ or modifying test logic in an existing one. Runs each test in isolation, gathers full debug context (DOM snapshot, browser console, network errors) on failure, applies fixes in a 5-iteration loop, and surfaces side issues found in the logs. Never run `pnpm test:e2e` directly on a freshly written test — always use this skill. Triggers "after writing e2e test", "test was just added", "after editing spec file", "verify e2e test", "run new e2e test".
---

# Debug & Fix Loop for E2E Tests — UGI.Cloud

Mandatory next step after writing or modifying a Playwright spec in the `@ugi/e2e` package. Running the full suite on a fresh test is a waste: it runs other specs you don't care about, and the built-in CLI output hides browser console errors + 4xx/5xx network failures — the actual root causes behind most "element not found" symptoms.

## Project geometry

- E2E root: `e2e/` (workspace package `@ugi/e2e`)
- Spec paths are **relative to `e2e/`** — e.g. `tests/smoke/login.spec.ts:42`
- Frontend apps: `@ugi/admin` (admin panel) and `@ugi/webapp` (Telegram Web App). Both are Vue 3 + Vite.
- API (`@ugi/api`) runs as a **build + start** pair — `pnpm build:api` produces `apps/api/dist/`, `pnpm start:api` runs it (`APP_ENV=local node apps/api/dist/main.js`). There is **no `--watch`** in this skill — every API source change is `KillShell` → rebuild → relaunch.
- Frontends are served as static builds by **a single** `pnpm preview:frontend` process (one Turbo run that serves both `apps/admin/dist/` and `apps/webapp/dist/`). `vite preview` re-serves whatever sits in `dist/` on the next request — **rebuilding either app does NOT require restarting the preview process**.
- All e2e runs use **preview mode only**. `PW_PREVIEW=1` in [e2e/playwright.config.ts:3](e2e/playwright.config.ts#L3) extends per-test timeout to 120s and adds 700ms `slowMo` — pass it on every command. There is no dev-mode path in this skill.
- No SSO sub-app, no Mailpit-based email testing yet.
- Workers/background jobs — not part of the current e2e surface.

## Pre-flight (once per invocation)

### 1. Resolve workspace URLs

**Never hardcode `*.ugi.local`** — hostnames are workspace-scoped (e.g. `api.saskatoon.ugi.local`). Source of truth: `e2e/.env.yml`.

```bash
[ -f e2e/.env.yml ] || { echo ".env.yml missing — run: cp e2e/.env.example.yml e2e/.env.yml"; exit 1; }
API_URL=$(awk   '/^API_URL:/   {print $2}' e2e/.env.yml)
ADMIN_URL=$(awk '/^ADMIN_URL:/ {print $2}' e2e/.env.yml)
```

If either variable is empty → STOP, ask the user to re-run Conductor setup / populate `e2e/.env.yml`.

### 2. Reachability (parallel)

```bash
curl -kIs "$API_URL/graphql" | head -1    # 200 or 400 — anything except connection refused / 502
curl -kIs "$ADMIN_URL"       | head -1    # 200
```

`502` from Caddy = the host is routed but upstream port isn't listening (`start:api` or `preview:frontend` not running yet).

### 3. Seeded superadmin reachable

There's no pre-baked storage state anymore — `auth.fixture.ts` logs in the
seeded superadmin programmatically via `testLogin` on every test run. If the
seed user is missing (e.g. fresh DB without `pnpm --filter @ugi/cli dev db
seed`), the `testUser` / `authenticatedPageAs` factories will fail with
`testUser fixture: superadmin login failed`.

```bash
# Quick smoke: testLogin against the API for the seeded superadmin
curl -ks -X POST "$API_URL/graphql" \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation{testLogin(email:\"superadmin@ugi.test\"){id}}"}' \
  | head -c 200
```

A non-`data.testLogin.id` response → STOP, ask the user to re-seed
(`pnpm --filter @ugi/cli dev db seed --env local --clean`).

### 4. `.only` guard

```bash
grep -n "\.only(" e2e/tests/<modified-spec>.spec.ts
```

Any match → STOP, tell the user to remove (forbidOnly is enabled in CI but not locally, so a stray `.only` will silently narrow the run).

### Failure → action (quote the **resolved** URL when prompting)

| Failure | User command |
|---|---|
| Caddy / dnsmasq not reachable | `pnpm dev:up` |
| `$API_URL` returns 502 / connection refused | `pnpm build:api` (foreground, must succeed), then `pnpm start:api` via `Bash(run_in_background: true)`; `Monitor` the shell stdout for `Nest application successfully started`. **Save the shell ID** — every API source change later in the loop will `KillShell` it. |
| `$ADMIN_URL` or `$WEBAPP_URL` returns 502 | `pnpm build:frontend` (foreground), then `pnpm preview:frontend` via `Bash(run_in_background: true)` — one process serves both apps; `Monitor` for both `Local: …` lines. Save the shell ID **but do not restart it on rebuilds** — `vite preview` re-serves the updated `dist/` automatically. |
| `.env.yml` missing | `cp e2e/.env.example.yml e2e/.env.yml` then adjust hostnames |
| `testUser fixture: superadmin login failed` + API up | Re-seed: `pnpm --filter @ugi/cli dev db seed --env local --clean` |
| GraphQL error "testLogin not found" from `testUser` / `authenticatedPageAs` | API is not running with `APP_ENV=local` — PlaywrightModule is conditionally loaded; restart `start:api` with `APP_ENV=local` |

## Building the test queue

### From modified spec files (default)

Read each modified `*.spec.ts`, extract `{name, line}` per `test(...)` block. Queue is spec-file modification order × source order within the file.

### From the Playwright JSON report (if user asks to debug previous failures)

If `e2e/test-results/results.json` exists:

```bash
node -e "
  const r = require('./e2e/test-results/results.json');
  const out = [];
  (function walk(s){
    for (const spec of (s.specs||[])) for (const t of spec.tests)
      if (t.status !== 'expected') out.push(spec.file+':'+spec.line+' | '+spec.title+' | '+(t.results?.[0]?.error?.message||'').split('\n')[0]);
    for (const c of (s.suites||[])) walk(c);
  })({suites: r.suites});
  out.forEach(x => console.log(x));
"
```

## Three phases

1. **Triage** — run the whole spec file once (`--workers=1` is already the config default) to classify pass/fail fast. Skip triage if > 10 tests OR any single test > 60s in isolation — go straight to Phase 2.
2. **Fix loop** — for each FAILED test, re-run in isolation by `:line` through the 5-iteration loop below.
3. **Stability** — each passed-or-fixed test re-runs once alone. Re-run failure = masked flake → treat as fresh failure.

> ⚠️ `e2e/test-results/test.log` is wiped by [log-reporter.ts:32](e2e/tools/log-reporter.ts#L32) on every `onTestBegin`. After Phase 1 triage only the LAST test's log survives — **never read `test.log` after triage**. Only Phase 2 per-test runs produce a usable `test.log`.

## The fix loop (Phase 2, per test, ≤ 5 iterations)

Track `Set<diffHash>` and `category[]` across iterations. Abort criteria below.

### Run (from monorepo root — NEVER `cd e2e`)

```bash
# Absolute path inside the project: e2e/test-results/_debug/
# Absolute is required because `pnpm --filter @ugi/e2e exec` runs Playwright
# with cwd=e2e/, so any relative --output value would resolve against e2e/,
# not the monorepo root. Putting `_debug/` next to the default `test-results/`
# subdirs keeps every artifact inside the project tree.
PW_OUT="$(git rev-parse --show-toplevel)/e2e/test-results/_debug"
mkdir -p "$PW_OUT"

PW_LOG=1 PW_PREVIEW=1 pnpm --filter @ugi/e2e exec playwright test \
  tests/smoke/login.spec.ts:42 \
  --workers=1 --max-failures=1 \
  --reporter=list \
  --trace retain-on-failure \
  --output="$PW_OUT"
```

Flag reference:

- `pnpm --filter @ugi/e2e exec` — runs from `e2e/` as cwd; monorepo root stays as the shell cwd.
- `PW_LOG=1` — enables [log-reporter.ts](e2e/tools/log-reporter.ts) (`test.log`) AND the debug capture in [base.fixture.ts](e2e/fixtures/base.fixture.ts) (`browser-console.log` + `network-errors.log`). Also flips `trace` to `retain-on-failure` via [playwright.config.ts:24](e2e/playwright.config.ts#L24).
- `PW_PREVIEW=1` — required (this skill always runs against preview mode). Extends per-test timeout to 120s and adds 700ms `slowMo`; without it, fast steps may race the preview's first-paint cycle.
- `--trace retain-on-failure` — belt-and-braces; guarantees trace.zip + `error-context.md` on failure even if someone forgets `PW_LOG=1`.
- `--output` — **must be an absolute path** (Playwright resolves relative paths against `e2e/` cwd, not monorepo root). Pins outputDir to a stable location inside `e2e/test-results/_debug/` so you don't need `ls -td` to discover the subdir, and so artifacts always land inside the project (never above the monorepo root).

**Never** add `PWDEBUG=1` (opens the blocking Inspector). **Never** omit the spec path (would launch the full suite). **Never** pass a relative path to `--output` — it will silently resolve against `e2e/` cwd and may write outside the project tree.

### On pass

Run once more with the same command (Phase 3 stability). Pass twice → `DONE`. Fail on re-run → the previous "fix" hid a flake; treat as fresh failure.

### On failure — gather context

The [agent-reporter](e2e/tools/agent-reporter.ts) consolidates everything into a single `failure.md` per test. **Read that first — one Read, not four.**

| Source | Path | Role |
|---|---|---|
| **Consolidated failure** | `${PW_OUT}/<subdir>/failure.md` | **Read first.** Contains: header, errors w/ stack, **test source snippet** around the failing line, **unified timeline** (steps + console + network merged by timestamp), DOM snapshot, deduplicated browser console, network failures, screenshot ref, trace hint. |
| All failures index | `e2e/test-results/all-failures.md` | Table of every failed test in the run, with a link to each `failure.md`. Useful for Phase 1 triage — one file covers N failures. |
| Runner trace | `e2e/test-results/test.log` | Step-by-step flow with `STEP:` markers from [log-reporter.ts](e2e/tools/log-reporter.ts). Mostly superseded by the unified timeline; keep for completeness. Only reliable in Phase 2 (wiped per test start). |
| Failure screenshot | `${PW_OUT}/<subdir>/test-failed-1.png` | Visual state. `failure.md` references it. |

> **If `failure.md` is missing**: the reporter didn't register — check that `playwright.config.ts` still has `['./tools/agent-reporter.ts']` in `reporter[]`. As fallback, the raw `browser-console.log` / `network-errors.log` attachments are written to `${PW_OUT}/<subdir>/` by [base.fixture.ts](e2e/fixtures/base.fixture.ts) via `testInfo.attach()`.

### Reading `failure.md` — what each section tells you

- **`## Test source around line N`** — ±3 lines around the failing assertion. Usually enough to avoid re-reading the spec file for simple failures.
- **`## Unified timeline`** — **the primary diagnostic tool.** Merges `result.steps` + timestamped console + timestamped network into one chronological table. Each row: `Time | Kind | Event` where Kind ∈ `STEP / CONSOLE / NETWORK` and icons mark ✓/✗ pass/fail, ⚠️ warning or ⚠️ SLOW (>5s step), ❌ error or 4xx/5xx.
- **`## DOM snapshot at failure`** — Playwright's accessibility tree. Use to verify what was actually in the DOM at assertion time.
- **`## Browser console`** — deduplicated (repeated lines collapse to `[×N]`). Noise-suppressed.
- **`## Network failures`** — 4xx/5xx with response body excerpts (up to 2KB).

### API-side signals

When `APP_ENV=local`, NestJS writes structured logs to **`apps/api/logs/api.log`** in addition to stdout (see [apps/api/src/config/logger.config.ts](apps/api/src/config/logger.config.ts)). One JSON object per line; the file is **truncated on every API restart** (`flags: 'w'`), so it only covers the current `pnpm start:api` process — every `KillShell` + relaunch wipes it.

If the timeline shows `❌ NETWORK 500 /graphql` (or any 4xx/5xx you need backend context for), grep the log around the failure timestamp from `failure.md`:

```bash
# Last 200 lines — fast first look
tail -n 200 apps/api/logs/api.log | jq -c '{timestamp, level, message, scope, action, errorKey, statusCode}'

# Window around a known failure timestamp (e.g. 2026-04-27T16:47:24Z)
TS="2026-04-27T16:47"
grep -F "$TS" apps/api/logs/api.log | jq .

# Errors only
jq -c 'select(.level == "error")' apps/api/logs/api.log | tail -n 50
```

Each line has `timestamp`, `level`, `message`, optional `scope` / `action` / `errorKey` / `statusCode`, optional `stack`, and a nested `error` chain for causes. Use `errorKey` to correlate with the API error catalog.

If `apps/api/logs/api.log` is missing or stale (older than the last reachability check), the API isn't running with `APP_ENV=local` — read the saved `start:api` shell stdout via `BashOutput <shell-id>`, or restart it through the API rebuild flow.

If `failure.md` doesn't yield a category in one pass: re-read the spec source and the page objects it uses. Do **not** try to parse `trace.zip` — it's preserved for human follow-up via `npx playwright show-trace`.

### Diagnose — pick ONE category (forces root-cause thinking)

**Start at `## Unified timeline`.** Read it top-to-bottom — the row with `✗ STEP` and `FAILED` is the assertion that threw. Scroll up from there and ask:

1. Any `❌ NETWORK 401/403/500` in the **last 2 seconds before** the failed step? → `permission_denied` or `api_error`.
2. Any `❌ CONSOLE` (pageerror / uncaught error) in the same window? → `frontend_runtime`.
3. `❌ NETWORK` **right after** a `✓ STEP` action (click/fill)? → Action triggered a refetch that got rejected. Usually still `permission_denied` but could be a real API bug.
4. `⚠️ SLOW` marker on a STEP that precedes the failure? → race condition candidate: the step took longer than expected; its `waitForResponse` or auto-retry assertion may have been missing.
5. No NETWORK / CONSOLE signals in the window before failure → check **DOM snapshot vs screenshot**. If snapshot shows loaded content where the screenshot shows skeletons, it's `race_condition`. If both agree the element is missing, it's `locator_missing` / `locator_stale`.

| Category | Timeline signal | Fix location |
|---|---|---|
| `api_error` | `❌ NETWORK 500` preceding failure; ask user for API stdout tail to confirm | `apps/api/src/...` |
| `permission_denied` | `❌ NETWORK 401/403` from `/graphql` before failure | `apps/api/src/permissions/` or test user role |
| `frontend_runtime` | `❌ CONSOLE` uncaught JS / pageerror before failure | `apps/admin/src/...` or `libs/core/src/...` / `libs/graphql/src/...` |
| `locator_stale` | DOM snapshot shows element with different selector, no NETWORK/CONSOLE signals | Test or page object |
| `locator_missing` | Element absent in snapshot AND screenshot, no NETWORK/CONSOLE signals | Frontend render bug OR missing wait in test |
| `race_condition` | DOM snapshot vs screenshot disagreement, OR `⚠️ SLOW` step, OR action fired before a response settled in the timeline | **Page object method** that fired the failing step |
| `test_flake` | Passed once, failed on Phase 3 with no code change | Tighten assertion. **NOT a product bug.** |
| `test_logic` | Test clicks wrong thing / asserts wrong text | The test |

**Critical rule**: if the timeline shows any `❌ NETWORK 401/403/500` in the 2 seconds before the `✗ STEP FAILED` row, category is **almost never** `locator_missing` — fix the API/permission first.

### Fix patterns for `locator_stale` / `locator_missing`

**REQUIRED: every locator in the codebase targets `data-testid`.** When you fix a stale or missing locator, you MUST use `data-testid` — never `[role=…]`, `input[name=…]`, `button[type=…]`, `getByRole(…)`, `getByText(…)`, CSS class, or tag selectors. If the failing element doesn't have a testid yet:

1. Open the Vue source for the component the test targets (usually `apps/admin/src/...`).
2. Add `data-testid="<feature>-<element>"` to the relevant element. For Nuxt UI composites that don't forward the attr (e.g. inner inputs of `UAuthForm`), refactor the form to use individual `UFormField` + `UInput` so each input gets its own testid; for `USlideover`, put the testid on a child of `<template #body>`.
3. Update the page object to `page.getByTestId('<feature>-<element>')`.
4. Rebuild the affected app (`pnpm build:admin` / `pnpm build:webapp`) before re-running — `vite preview` will serve the refreshed `dist/` on the next request, no restart needed.

```ts
// ❌ Forbidden — even if the element has a stable role/name today
this.errorAlert = this.pageContainer.locator('[role="alert"]');

// ✅ Add testid in the .vue component, then:
this.errorAlert = this.pageContainer.getByTestId('login-error');
```

If you find yourself reaching for any non-testid selector to "make the iteration green faster", you're violating the project rule — stop and add the testid to the source.

### Fix patterns for `race_condition`

- **Action side** (click triggers a GraphQL refetch): set up `waitForResponse` **before** the action, keyed on the operation name:

  ```ts
  const responsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/graphql')
      && resp.request().method() === 'POST'
      && resp.request().postDataJSON()?.operationName === 'UsersList',
    { timeout: 10_000 },
  );
  await locator.click();
  await responsePromise;
  ```

  The Apollo WebSocket keepalive keeps the event loop "busy", so `waitForLoadState('networkidle')` returns during loading skeletons. Matching by operation name in the POST body is the robust approach.

- **Assertion side**: prefer auto-retrying assertions. `await expect(locator).toBeVisible()` retries within the test timeout. For compound predicates: `await expect.poll(async () => …, { timeout: 5_000 }).toBe(true)`.

- **Banned**: `page.waitForLoadState('networkidle')` — unreliable in this codebase due to the persistent Apollo WebSocket.

### Apply ONE targeted fix, then decide rebuild

```bash
diffHash=$(git diff | sha256sum | cut -d' ' -f1)
```

Abort if:
- `diffHash` already in seen set (spinning), or
- Category differs from BOTH iterations 1 and 2 (guessing, not converging).

### Restart scope by `git diff --name-only`

This skill assumes the **single preview-mode topology** described in "Project geometry":
- API = `pnpm start:api` running `apps/api/dist/main.js` (rebuilt by `pnpm build:api`).
- Frontends = one `pnpm preview:frontend` process serving `apps/{admin,webapp}/dist/`.

The frontend `preview:frontend` process is **dist-driven** — `vite preview` re-serves whatever sits in `dist/` on the next request. Rebuilds refresh the served bytes; **do not restart the preview process**. The API has no `--watch` — every API change is `KillShell` → rebuild → relaunch.

| Changed | Action |
|---|---|
| Only `e2e/**` | none — tests re-read on each run |
| `apps/api/src/**` | API rebuild flow (below) |
| `apps/admin/src/**` | `pnpm build:admin` only — preview keeps serving the refreshed `dist/` |
| `apps/webapp/src/**` | `pnpm build:webapp` only |
| `libs/core/src/**` OR `libs/graphql/src/**` | `pnpm build:frontend` (both apps re-import the lib) |
| `libs/permissions/src/**` | API rebuild flow + `pnpm build:frontend` (consumed by both) |
| `apps/api/src/modules/playwright/**` | API rebuild flow |

### API rebuild flow

Every API source change goes through these four steps in order:

1. **Kill the running `start:api`** via `KillShell <saved-shell-id>`. If you don't have a saved ID (user started it out of band), fall back to `pkill -f 'apps/api/dist/main' || pkill -f '@ugi/api.*start'`.
2. **`pnpm build:api`** in the foreground — must succeed. Verify with the mtime check below.
3. **Relaunch `pnpm start:api`** via `Bash(run_in_background: true)`. **Save the new shell ID** — you'll need it on the next iteration.
4. **`Monitor`** the new shell stdout for `Nest application successfully started`. Don't proceed until it appears, AND `curl -kIs "$API_URL/graphql" | head -1` returns `200` or `400`.

### Verify each rebuild actually happened

Silent build failures are the worst bug class — always check the artifact mtime advanced.

```bash
# API
pre=$(stat -f "%m" apps/api/dist/main.js 2>/dev/null || echo 0)
pnpm build:api
post=$(stat -f "%m" apps/api/dist/main.js)
[ "$post" -gt "$pre" ] || { echo "BUILD SILENTLY FAILED for api"; exit 1; }

# Admin
pre=$(stat -f "%m" apps/admin/dist/index.html 2>/dev/null || echo 0)
pnpm build:admin
post=$(stat -f "%m" apps/admin/dist/index.html)
[ "$post" -gt "$pre" ] || { echo "BUILD SILENTLY FAILED for admin"; exit 1; }

# Webapp
pre=$(stat -f "%m" apps/webapp/dist/index.html 2>/dev/null || echo 0)
pnpm build:webapp
post=$(stat -f "%m" apps/webapp/dist/index.html)
[ "$post" -gt "$pre" ] || { echo "BUILD SILENTLY FAILED for webapp"; exit 1; }
```

Failure → read the build stdout, escalate to user, **do not** re-run against a stale `dist/` or stale API binary.

After an API restart, if `curl -kIs "$API_URL/graphql" | head -1` still returns `502` after Monitor saw the ready line, the upstream port hasn't rebound — read the start:api shell stdout (`BashOutput <shell-id>`) for the actual error before iterating further.

### Loop

Re-run test. **Cap: 5 hard, most fixes land in 1–2.** If on iteration 3 you're still changing category, the problem is misdiagnosis — stop and ask the user.

## Final report

```
✅ test 1 (3 iterations, fixed: race_condition in pages/users.page.ts:42)
✅ test 2 (1 iteration, no fixes needed)
❌ test 3 (5 iterations exhausted, last category: api_error)
   Last error: <one-line excerpt from failure.md>
   Files touched: apps/api/src/modules/users/users.resolver.ts
   Asked user for: `BashOutput <start:api-shell-id>` tail around <timestamp>
   Picking up here: <suggested next investigation>

Side issues observed (omit entirely if empty):
- <one bullet per concrete, reproducible issue with a file path>
```

**Auto-include rule**: after each Phase 2 run, grep `test.log` for `Cleanup:.*failed|teardown.*error|console\.warn.*Cleanup` and surface as side-issue bullets. Bar is "concrete, reproducible, with file path". No filler like "Vue devtools not detected" — omit the section if empty.

For any failure, inline the relevant log excerpts so the user can resume.

## Must not

- ❌ `pnpm test:e2e` on a fresh test (runs the whole suite — wastes cycles and noise)
- ❌ Playwright command without a spec path scope (launches full suite)
- ❌ `cd` away from repo root (always use `pnpm --filter @ugi/e2e exec`)
- ❌ `page.waitForLoadState('networkidle')` (Apollo WS keepalive makes it unreliable)
- ❌ Read `test.log` after Phase 1 triage (wiped per test start)
- ❌ Treat a missing `apps/api/logs/api.log` as "logs go to stdout" — when `APP_ENV=local` the file is the source of truth; if it's missing, the API isn't running locally
- ❌ `pnpm dev:api` / `pnpm dev:admin` / `pnpm dev:webapp` / `pnpm dev` — this skill always uses `build:api` + `start:api` for API (which runs `APP_ENV=local node apps/api/dist/main.js` — no on-the-fly compile, no watch) and `build:frontend` + `preview:frontend` for frontends
- ❌ Skip the `KillShell` step on an API source change — the new build won't take effect because `start:api` is still serving the previous `apps/api/dist/main.js`
- ❌ Restart `pnpm preview:frontend` after a frontend rebuild — `vite preview` re-serves the updated `dist/` on the next request. Restart only if the process actually died.
- ❌ Treat an empty `## Browser console` / `## Network failures` section in `failure.md` as fixture failure — they're written only when events occurred. Only a missing `failure.md` itself signals reporter/fixture problems.
- ❌ `PWDEBUG=1` (blocks on Inspector)
- ❌ Iterate with a repeated diff hash (spinning)
- ❌ Iterate after disagreement of categories in iterations 1 & 2 (guessing)
- ❌ Guess at locators before reading `failure.md`
- ❌ "Fix" a `locator_stale` / `locator_missing` failure with anything other than `data-testid` — no `[role=…]`, `input[name=…]`, `getByRole`, `getByText`, CSS class, or tag selectors. Add the testid to the Vue source, rebuild the affected app (`pnpm build:admin` / `pnpm build:webapp`), and retarget via `getByTestId(...)`.
- ❌ Apply a fix before scanning the `## Unified timeline` for `❌ NETWORK 4xx/5xx` or `❌ CONSOLE` entries preceding the failure
- ❌ Skip Phase 3 stability re-run on passing tests
- ❌ Parse `trace.zip` — preserved for human follow-up via `npx playwright show-trace`
- ❌ Pad "Side issues observed" with generic warnings — omit when empty
