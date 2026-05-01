---
name: fix-e2e-failures
description: Fix a batch of failing Playwright tests the user just ran in VSCode. Reads the artifacts, clusters failures by root cause, and for each cluster iterates diagnose → fix → run-the-cluster-in-isolation until every test in the cluster passes. Only after all clusters are locally green does it return control so the user can re-run the full batch in VSCode to confirm, then move to the next batch. Use when the user says "fix failing tests", "analyze e2e failures", "fix the regression batch", "review failed tests", or points at `e2e/test-results/all-failures.md`.
---

# Fix E2E Failures — Batch → Cluster → Fix-loop → Handoff (UGI.Cloud)

Collaboration model between user and Claude across a regression session:

```
User runs a batch in VSCode ──▶ all-failures.md + failure.md per test
                                       │
                                       ▼
          Claude clusters failures by root-cause signature
                                       │
                                       ▼
          For each cluster (independent fix loop):
            read representative failure.md ──▶ diagnose ──▶ narrow fix
                                                              │
                        ┌─────────────────────────────────────┘
                        ▼
           dev-server settles (Vite HMR / NestJS --watch)
                        │
                        ▼
               run the cluster in isolation via playwright CLI
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
         all green           some still red
              │                   │
              │                   └──▶ iterate (up to 5× per cluster)
              ▼
        cluster DONE
                                       │
                    (all clusters done)▼
          Claude hands control back ──▶ user re-runs the full batch in VSCode
                                       │
                            green? ────┴──── red?
                               │              │
                               ▼              ▼
                       next batch        Claude starts a new fix session
                                         on the new all-failures.md
```

## Project geometry

- E2E root: `e2e/` (workspace package `@ugi/e2e`)
- Failure artifacts: `e2e/test-results/all-failures.md` + per-test `e2e/test-results/<subdir>/failure.md`
- Frontends: `@ugi/admin` and `@ugi/webapp`. Each can run in one of two modes:
  - **Dev mode** — `pnpm dev:admin` / `pnpm dev:webapp` → Vite dev server + HMR. Frontend source changes are hot-reloaded; no build step between iterations.
  - **Preview mode** — `pnpm build:admin && pnpm preview:admin` (or `build:webapp` / `preview:webapp`, or `build:frontend` / `preview:frontend` for both) → Vite preview server serves `dist/`. Closer to prod; requires an explicit rebuild after any frontend code change. Set `PW_PREVIEW=1` on the e2e run to extend timeouts and add slowMo.
  - Same port in both modes (`VITE_APP_PORT`), so the URL is transparent to tests.
- API (`@ugi/api`) runs under `nest start --watch` — hot-restarts in ~1–3s (no preview-mode split)
- No Mailpit-based email testing yet
- NestJS logs go to **stdout**, not a file — if the user asks "what did the API say?", ask them to paste terminal output; do NOT grep `apps/api/logs/api.log` (doesn't exist)

## When to use

- User ran a batch of Playwright tests via the VSCode Test Explorer / CodeLens / Playwright extension.
- `e2e/test-results/all-failures.md` exists with ≥ 1 row.
- User asks Claude to fix the failures before moving on.

## When NOT to use

- No batch has been run yet (no `all-failures.md`, no per-test `failure.md`) → tell the user to run a batch first.
- User is writing a brand-new spec file and wants it verified one test at a time → use [debug-e2e-test](../debug-e2e-test/SKILL.md) instead (it's per-test, not per-cluster).

## Required setup

The VSCode Playwright extension must pass `PW_LOG=1` into the test runner. This is already committed at the repo root in [.vscode/settings.json](../../.vscode/settings.json):

```json
"playwright.env": { "PW_LOG": "1" }
```

`PW_LOG=1` activates:

1. [e2e/fixtures/base.fixture.ts](e2e/fixtures/base.fixture.ts) — attaches timestamped browser-console + network-errors listeners to every page context via `newInstrumentedContext` in [tools/attach-debug-listeners.ts](e2e/tools/attach-debug-listeners.ts).
2. [e2e/tools/log-reporter.ts](e2e/tools/log-reporter.ts) — writes `STEP:` markers to `test-results/test.log`.
3. [e2e/playwright.config.ts:24](e2e/playwright.config.ts#L24) — flips `trace` to `retain-on-failure`, so DOM snapshot (`error-context.md`) + `trace.zip` exist on every failed run.

Without `PW_LOG=1` the `failure.md` files are incomplete (no console, no network, no DOM snapshot) and diagnosis is guesswork. Only fall back to a check-and-offer flow if `.vscode/settings.json` has been removed or the key was cleared — otherwise trust the committed config.

## Workflow

### Step 1 — locate the batch

```bash
ls e2e/test-results/all-failures.md   # index
ls e2e/test-results/*/failure.md      # per-test detail files
```

- Index missing → tell the user "no failures in the last batch" and stop.
- Index present → read it. One short markdown table, one row per failed test.

### Step 2 — cluster failures by signature

Failures in a batch rarely represent N independent bugs. Typically 5–20 tests hit the same root cause (one broken resolver, one renamed testid, one permission change). Fix once, verify once — instead of re-diagnosing per test.

Group rows from `all-failures.md` by:

```
cluster_key = (normalized_first_error_line, spec_file_dir)
```

Where:
- **normalized_first_error_line** — strip leading `Error:`, collapse UUIDs / IDs (`user_abc123` → `<id>`), trim whitespace. Preserves error type + affected resource, loses instance-specific noise.
- **spec_file_dir** — e.g. `e2e/tests/smoke/`. Same error in different features usually = different root cause.

Emit the cluster plan:

```
Found 18 failures in 3 clusters:

[A] 12 tests — "permission denied: users:manage" — e2e/tests/users/
[B]  4 tests — "Timeout 30000ms waiting for [data-testid=\"user-row-*\"]" — e2e/tests/users/
[C]  2 tests — "expect(received).toEqual(expected) — 'student' !== 'deansSecretary'" — e2e/tests/permissions/

Starting with cluster A (largest). Reply "skip A" or "start with B" to reorder.
```

### Step 3 — fix loop (per cluster, up to 5 iterations)

Treat clusters independently. Within a cluster, iterate until all N tests pass in isolation or the iteration cap trips.

**Track across iterations**: `Set<diffHash>` and a list of `category` choices. Abort if:

- `diffHash` repeats → you're spinning on the same diff.
- Category differs in iterations 1 AND 2 → you're guessing, not converging.

#### 3.1 — Diagnose (read ONE failure.md)

Pick the first test in the cluster as representative. Read its `failure.md` once. That file already contains header, errors, test-source snippet, unified timeline, DOM snapshot, deduplicated browser console, network failures, screenshot reference.

Apply the diagnosis order from [debug-e2e-test](../debug-e2e-test/SKILL.md#diagnose--pick-one-category-forces-root-cause-thinking):

1. **Race disambiguator** — compare `## DOM snapshot at failure` against `test-failed-1.png`. If snapshot shows loaded content where screenshot shows skeletons → `race_condition`, stop looking at locators. Both agree element is missing → `locator_missing` / `locator_stale`.
2. **Timeline-first scan** — read `## Unified timeline` top-to-bottom. The `✗ STEP … FAILED` row is the assertion that threw. Scroll up from there:
   - `❌ NETWORK 4xx/5xx` within 2 s before failure → `permission_denied` (401/403) or `api_error` (500).
   - `❌ CONSOLE` (pageerror / uncaught) in the same window → `frontend_runtime`.
   - `❌ NETWORK` right after a `✓ STEP` action (click / fill) → refetch rejected (usually `permission_denied`).
   - `⚠️ SLOW` marker preceding failure → `race_condition` candidate.
   - No NETWORK / CONSOLE signals → fall back to DOM / screenshot comparison.
3. **Critical rule** — if the timeline shows any `❌ NETWORK 401/403/500` within 2 s of the failure, category is almost never `locator_missing`; fix the API / permission first.

Pick exactly one category.

**Locator rule (REQUIRED).** When the category is `locator_stale` or `locator_missing`, the fix MUST use `data-testid` — never `[role=…]`, `input[name=…]`, `button[type=…]`, `getByRole(…)`, `getByText(…)`, CSS class, or tag selectors. If the failing element doesn't have a testid, add one to the Vue source first (in `apps/admin/src/...` or `apps/webapp/src/...`), rebuild if in preview mode, then update the page object to `page.getByTestId('<feature>-<element>')`. Same rule applies inside this skill as in [write-e2e-test](../write-e2e-test/SKILL.md#required-locators-must-use-data-testid).

#### 3.2 — Apply ONE narrow fix

Use the fix patterns in [debug-e2e-test/SKILL.md#fix-patterns-for-race_condition](../debug-e2e-test/SKILL.md#fix-patterns-for-race_condition) for `race_condition`. For the other categories, apply the smallest change that addresses the diagnosed root cause.

Never add broad refactors, cleanup commits, "while I'm here" changes, or speculative hardening. The goal is to turn this cluster green with minimum churn.

Record the diff hash:

```bash
diffHash=$(git diff | sha256sum | cut -d' ' -f1)
```

#### 3.3 — Let the servers settle (dev mode vs preview mode)

First, detect which frontend mode is live. The admin URL is the same either way — probe what it's serving:

```bash
curl -ks "$ADMIN_URL" | grep -q '/@vite/client' && echo "dev mode" || echo "preview-or-prod mode"
```

- Dev mode → Vite HMR is picking up frontend edits automatically.
- Preview mode → Vite is serving `apps/admin/dist/`; a frontend edit has NO effect until you rebuild.

**Dev-mode rebuild table** (frontend = `pnpm dev:admin` / `dev:webapp`):

| Changed path | Action |
|---|---|
| Only `e2e/**` | none — tests are re-read on each run |
| `apps/api/src/**` | `sleep 2` — wait for `nest start --watch` to hot-restart |
| `apps/admin/src/**` or `apps/webapp/src/**` | none — Vite HMR picks up the change on next `page.goto` |
| `libs/core/src/**` OR `libs/graphql/src/**` | none — HMR handles it. If the cluster fails with stale types, ask user to reload the Vite dev server. |
| `libs/permissions/src/**` | `sleep 2` — imported by both API (hot-restart) and frontend (HMR). |
| `apps/api/src/modules/playwright/**` | `sleep 2` — schema change must be live before the next `testLogin` / `testCreateUser`. |

**Preview-mode rebuild table** (frontend = `pnpm preview:admin` / `preview:webapp`, or `preview:frontend` for both):

| Changed path | Action |
|---|---|
| Only `e2e/**` | none |
| `apps/api/src/**` or `apps/api/src/modules/playwright/**` or `libs/permissions/src/**` (API side) | `sleep 2` — API still runs under `nest start --watch`. |
| `apps/admin/src/**` or code imported by admin (`libs/core`, `libs/graphql`, `libs/permissions`) | `pnpm build:admin` — then wait for preview server auto-reload; verify `apps/admin/dist/index.html` mtime advanced. |
| `apps/webapp/src/**` or code imported by webapp | `pnpm build:webapp` — same mtime check for `apps/webapp/dist/index.html`. |
| Frontend change touches BOTH admin and webapp | `pnpm build:frontend` (parallel Turbo build). |

Verify the dist got rebuilt in preview mode:

```bash
stat -f '%Sm %N' apps/admin/dist/index.html
```

If the mtime is older than the edit, the build failed silently — ask the user to paste the tail of their `pnpm build:admin` terminal.

**Verify the API is back up** after any backend change (both modes):

```bash
curl -kIs "$API_URL/graphql" | head -1   # 200 or 400 expected
```

A `502` means Nest hasn't finished restarting — extend the sleep to 5s. If it still returns 502 or connection-refused, the user's `pnpm dev:api` probably crashed with a compilation error — **ask them to paste the last 20 lines of that terminal** before iterating further.

Silent server failures are the worst bug class in this loop. If a plausible fix doesn't change the cluster result, don't iterate blindly; ask the user for the relevant dev/preview-server stdout.

#### 3.4 — Run the cluster (isolation, parallel-inside-cluster)

Build the spec-paths list from the cluster rows (each is `file:line` in `all-failures.md`) — paths in `all-failures.md` are repo-relative (e.g. `e2e/tests/users/list.spec.ts:42`). Strip the `e2e/` prefix because the pnpm filter changes cwd to that directory:

```bash
PW_LOG=1 pnpm --filter @ugi/e2e exec playwright test \
  tests/users/list.spec.ts:42 \
  tests/users/create.spec.ts:18 \
  tests/users/delete.spec.ts:60 \
  --reporter=list \
  --trace retain-on-failure
```

If the user is running the frontend in preview mode (see 3.3), add `PW_PREVIEW=1` — it extends `timeout` to 120s and adds slowMo (wired in `e2e/playwright.config.ts`). The `test:preview` script bundles this:

```bash
PW_LOG=1 pnpm --filter @ugi/e2e test:preview tests/users/list.spec.ts:42 \
  --reporter=list --trace retain-on-failure
```

Why these flags:

- Explicit spec-paths — runs **only** this cluster, not the whole batch. The user's full-batch re-run is the final verification step (Step 4), not ours.
- No `--workers` override — `playwright.config.ts` already sets `workers: 1`. Tests run sequentially; logs don't interleave; `failure.md` is per-test.
- `PW_LOG=1` — keeps the debug fixture + reporters active (same as Step 3 setup).
- `--trace retain-on-failure` — guarantees trace + DOM snapshot on any remaining failures.
- No `--max-failures` — we want the full picture of which cluster members still fail.

#### 3.5 — Interpret the cluster result

- **All green** → cluster DONE. Move to next cluster.
- **All red, same signature** → fix was wrong direction. Re-read `failure.md` (it's overwritten with fresh data), pick a new category, iterate. Check abort criteria first.
- **Partial green** — e.g. 10 of 12 pass, 2 still fail → cluster was heterogeneous. The fix addressed the dominant signature; the remaining 2 have a different root cause. Re-cluster the remaining failures and treat each sub-cluster as a new entry in the queue. Do NOT keep iterating on the original cluster with the old diagnosis.
- **New failures appear in the cluster that weren't there before** → the fix caused regressions. Revert the last diff, re-diagnose, try a different category.

### Step 4 — handoff to the user

When all clusters reach DONE (or the abort criteria tripped on one and you escalated):

```
Cluster A: ✅ 12/12 green after 2 iterations (permission_denied → apps/api/src/modules/users/users.resolver.ts:156)
Cluster B: ✅  4/4 green after 1 iteration  (race_condition → e2e/pages/users.page.ts:42)
Cluster C: ❌  1/2 green after 5 iterations, escalating.
             Last category: test_logic
             Last error: "timeout waiting for [data-testid='role-badge']"
             Files touched: e2e/tests/permissions/role-assignment.spec.ts

Ready for your full-batch re-run in VSCode.
```

The user re-runs the full batch in VSCode. Two outcomes:

- **All green** → they move to the next batch. Wait for it to land, then Step 1 again.
- **Still red** (same or different tests) → new `all-failures.md` overwrites the old one. Start a fresh fix session on the new artifacts. Do not remember the old clusters — the fix landscape has changed.

## Context discipline

Reading every `failure.md` in the batch would blow the main context (each ~10–60 KB; 12 files = 0.5 MB of markdown). The whole point of clustering is that N failures share one root cause — **one** representative read per cluster is the budget.

Re-read the cluster's `failure.md` only when:

- The cluster's playwright re-run still failed AND
- The diagnosis from the first read is being revised

### Delegate to subagent only for heavy clusters

Threshold: **≥ 8 tests in cluster AND representative failure.md > 10 KB**. Above that, the main context would absorb too much.

Delegate via the `Agent` tool (`subagent_type: general-purpose`):

```
Diagnose and fix this E2E cluster. Apply the diagnosis order from
.claude/skills/debug-e2e-test/SKILL.md (timeline scan + category table).

Representative: e2e/test-results/<subdir>/failure.md
Cluster also contains (N-1) tests: <paths>

After applying one narrow fix and waiting for the dev servers to settle
(Vite HMR is instant; NestJS --watch needs ~2s), run ONLY the cluster:
  PW_LOG=1 pnpm --filter @ugi/e2e exec playwright test <spec paths> \
    --reporter=list --trace retain-on-failure

Project notes:
- Two frontend modes: dev (Vite HMR, no builds) and preview (serves dist/,
  needs `pnpm build:admin` / `build:webapp` after frontend edits). Detect
  via: curl -ks "$ADMIN_URL" | grep -q '/@vite/client'.
- API runs nest --watch (hot-restart ~2s) in both modes.
- NestJS logs to stdout (no api.log file). If API side is suspected, ask
  the user to paste their `pnpm dev:api` terminal tail — don't grep.
- Workers=1 already in config. Use PW_PREVIEW=1 (or `test:preview`) for
  preview-mode runs.

Iterate up to 5 times. Never run the full suite — the user does the final
batch verification in VSCode.

Return in under 250 words:
- Category picked
- Root cause (file:line)
- Diff summary
- Cluster result: all-green / partial / still-red
- If partial or still-red: what to try next
```

Main context only absorbs the 250-word return.

## Must not

- ❌ Run the **full batch** (e.g. `pnpm test:e2e`, or `playwright test` without spec-paths). The user owns the full-batch run via VSCode — that is the green-light signal. Running it ourselves robs the user of that signal.
- ❌ Read more than one `failure.md` per cluster unless the cluster's playwright re-run revealed the representative was non-representative.
- ❌ Keep iterating on a cluster when the `diffHash` repeats → you're spinning.
- ❌ Keep iterating when the chosen category differs in both iterations 1 and 2 → you're guessing, not converging.
- ❌ Run `pnpm build:admin` / `pnpm build:webapp` between iterations **when the frontend is in dev mode** (Vite HMR handles it). Only rebuild if preview mode is detected (see 3.3).
- ❌ Attempt to read `apps/api/logs/api.log` — NestJS logs to stdout. Ask the user to paste their `pnpm dev:api` terminal tail instead.
- ❌ `cd` away from repo root — always use `pnpm --filter @ugi/e2e exec`.
- ❌ Commit anything. The user reviews diffs across the whole session and commits at the end.
- ❌ Apply broad refactors or "while I'm here" cleanup. Narrow fix only.
- ❌ Restart a fresh fix session while an older `all-failures.md` is still the newest artifact — you'd re-fix stale data. Wait for the user's next VSCode run to overwrite it.
