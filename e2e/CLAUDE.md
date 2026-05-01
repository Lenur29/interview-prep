# E2E Tests — Conventions

Loaded automatically by Claude Code when working under `e2e/`.
For the full how-to: `.claude/skills/write-e2e-test/SKILL.md`.

## The Rule

**Every test creates its own users at runtime via API factories.**
Never reference seed users in a test body.

```ts
// ✅ Default
test('superadmin can do X', async ({ authenticatedPageAs }) => {
  const { user, page } = await authenticatedPageAs({ roleId: 'SUPERADMIN' });
  // ...
});

// ❌ The role-page fixtures no longer exist
test('...', async ({ superadminPage }) => { /* … */ });

// ❌ No seed-user emails in test bodies
await me.expectEmail(TEST_USERS.deansSecretary);
```

### Why

- **Isolation** — test data never collides between specs / workers / reruns.
- **Parallelisable** — no shared session state.
- **No order-dependence** — any test runs alone.
- **No setup phase** — there is no `globalSetup`, no stale `.auth/*.json`.

## Factories (`e2e/fixtures/`)

| Fixture | Returns | Use case |
|---|---|---|
| `authenticatedPageAs({ roleId })` | `{ user, page }` | Default for any role-based admin test |
| `testUser({ roleId?, password? })` | `CreatedUserApi` | When you need the user but not a logged-in page |
| `createAuthenticatedPage(email)` | `Page` | Log in an already-existing user |
| `testStudent({ groupId? })` | `CreatedStudentApi` | Webapp / Telegram student flows |
| `openWebappAsStudent(student)` | `Page` | Webapp session via `?devTelegramChatId=…` |
| `guestPage` | `Page` | Unauthenticated; redirect / public-page tests |

All factories track created IDs and `testDeleteUserPermanently` them at teardown.

## The single exception — UI login form smoke

`tests/smoke/login.spec.ts` exercises the password form. It calls
`testUser({ password: TEST_PASSWORD })` so the form login can succeed against
a freshly created user. This is the only place a password constant is used
in a test body.

## No dual-browser tests

When a feature spans two UIs (e.g. webapp + admin, student + secretary):
**do NOT** open two browser contexts in one test and bounce between them.
Test each side independently with API fixtures that seed the prerequisite state.

To prove "side A reflects a change made on side B" (refetch / subscription
flows), simulate the change via an **API mutation called from the test** and
dispatch the refetch trigger in the page (`document.dispatchEvent(new Event('visibilitychange'))`).
No second browser needed.

```ts
// ✅ Right — single context, API drives the cross-side state change
const document = await testCertificateOfStudyForStudent({ studentUserId, delivery });
const detail = new WebappDocumentDetailPage(page);
await detail.navigate(document.id);
await detail.expectStatus('QUEUED');

await updateDocumentStatusAsSuperadmin({ documentId: document.id, status: 'DONE' });
await detail.simulateRefocus();
await detail.expectStatus('DONE');

// ❌ Wrong — slow, race-prone, mostly tests Apollo refetch (framework code)
const studentPage = await openWebappAsStudent(student);
const { page: secretaryPage } = await authenticatedPageAs({ roleId: 'DEANS_SECRETARY' });
await secretaryPage.click('...');
await studentPage.bringToFront();
await studentPage.expect(...);
```

Why: 2-3× slower (two logins, two contexts, ordered waits), race conditions
between focus on context A and mutation on context B → flaky, and they
mostly re-test trivial framework behavior. Manual smoke before release
catches the seam at lower cost. **One** integration test for the critical
happy path is acceptable, but only if there's evidence prior bugs hid in
the seam.

## Reminders

- Locators use `data-testid` only — see SKILL.md.
- Imports use `.js` extensions (ESM).
- `test` + `expect` come from `@/fixtures/auth.fixture.js` (or `student.fixture.js` for webapp tests; `document.fixture.js` for document seeding).
- After writing/editing a spec, run the `debug-e2e-test` skill — never `pnpm test:e2e` directly on a fresh test.

## Template

```ts
import { test } from '@/fixtures/auth.fixture.js';
import { MePage } from '@/pages/me.page.js';

test('dean secretary can open profile', async ({ authenticatedPageAs }) => {
  const { user, page } = await authenticatedPageAs({ roleId: 'DEANS_SECRETARY' });
  const me = new MePage(page);
  await me.navigate();
  await me.expectEmail(user.email);
});
```
