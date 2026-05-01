---
name: review-ui
description: Audit a live page in Chrome via the claude-in-chrome MCP for UX, accessibility, performance, and consistency issues. Returns a severity-ranked report with concrete file:line fixes. Use after building a UI ("/review-ui /students") or when the user reports a screen feels off, looks wrong, or performs poorly. Requires Chrome integration enabled (`/chrome`).
when_to_use: Activate when the user asks to review a page / audit UX / find layout issues / check accessibility on a running app / "почему страница тормозит" / "что не так с этим экраном". Don't activate for static screenshots or design files — those go to /design-ui directly.
allowed-tools: Read Glob Grep
---

# Review UI — live page audit

Audit target: `$ARGUMENTS` (URL or admin route; if empty, ask the user for the route or use the currently-open tab).

## Setup

Chrome must be connected. If `claude-in-chrome` MCP isn't available:
- Tell the user: "Run `/chrome` to enable Chrome integration first."
- Don't fabricate findings or guess. Stop until connected.

The `claude-in-chrome` MCP exposes navigation, clicks, typing, screenshots, DOM/a11y snapshot, console reads, network monitoring, and JS evaluation. Run `/mcp claude-in-chrome` to confirm available tool names; then use whatever the live MCP exposes.

## Workflow

Run these in order. Don't skip unless the user says so.

### 1. Navigate and stabilize
- Open the URL.
- Wait until network is idle (no pending requests for ~1s) or `document.readyState === 'complete'`.
- Capture a baseline **desktop screenshot** (~1440 wide).
- Resize to **390 wide** and capture a mobile screenshot.

### 2. Snapshot structure
- Take a DOM / accessibility-tree snapshot.
- Note interactive controls without an accessible name, role, or label.
- Note duplicated `id`s, missing `<main>` / `<nav>` / `<header>`, missing `lang` on `<html>`.

### 3. Console & network
- Read console messages. Filter for **error**, **warning**, deprecation notices, hydration mismatches, Vue warnings (`[Vue warn]`), Apollo errors.
- List network requests. Flag:
  - 4xx / 5xx responses
  - Requests >1s on a fast network
  - Payloads >500 KB
  - Blocking resources on the critical path
  - GraphQL operations returning `errors[]` even with HTTP 200

### 4. Run the rubric
Walk through [`references/ux-checklist.md`](references/ux-checklist.md) against the screenshots and snapshot. For each finding capture:
- **Severity:** P0 (broken / inaccessible / data loss) · P1 (UX hurts) · P2 (polish)
- **Evidence:** screenshot crop / console line / DOM path
- **Code locus:** `apps/admin/src/.../File.vue:LINE` — find via `Grep` using a unique string from the DOM (component name, exact copy, distinctive class name)
- **Fix sketch:** one sentence + the Nuxt UI component or rule violated

### 5. Optional: performance trace
If the user mentioned slowness, jank, or the perf trace is one tool away — record one and surface:
- Top long task (>50ms)
- LCP element + duration
- Largest layout shift contributor
- Worst INP candidate

## Report format

Return a structured markdown report:

```markdown
## Review of <route>

### P0 — must fix
- **<short title>** — <evidence>
  - Where: `apps/admin/src/.../File.vue:42`
  - Fix: <one sentence>

### P1 — UX issues
…

### P2 — polish
…

### Summary
- Console errors: N
- Network failures: N
- A11y blockers: N
- Top 3 recommendations: …
```

End with: **"Want me to apply these fixes? I can hand off to `/design-ui`."**

## Rules

- **Don't** paste raw DOM dumps in the report — summarize.
- **Don't** propose a redesign of unrelated parts of the page; stay scoped to what's actually broken or off.
- **Don't** fix anything in this skill — the deliverable is a report. Fixing belongs to `/design-ui` or the user's follow-up.
- **Don't** invent file paths. Always verify with `Grep` first; if you can't find the source, say so.
- **Don't** run mutations / log out / submit forms with real data unless explicitly asked.

## Fast variant

If the user says "quick check" or "just a glance":
- Skip step 5 (perf trace).
- Skip mobile screenshot if desktop is clean.
- Cap findings at top 5 by severity.

## Additional resources

- [`references/ux-checklist.md`](references/ux-checklist.md) — full audit rubric (a11y, visual, states, mobile, copy, perf, consistency)
