---
name: write-e2e-test
description: Creates Playwright E2E tests for the UGI.Cloud monorepo (@ugi/e2e) following established patterns. Use when user asks to write e2e test, create test spec, add Playwright test, or test a feature end-to-end.
---

# E2E Test Writing Guide — UGI.Cloud

> **The rule:** every test creates its own users at runtime via API factories.
> Never reference seed users in a test body. See [`e2e/CLAUDE.md`](e2e/CLAUDE.md).

## Quick Reference

| Item | Convention |
|------|------------|
| Workspace package | `@ugi/e2e` |
| E2E root | `e2e/` |
| Test files | `e2e/tests/{feature}/{feature}-{action}.spec.ts` |
| Page Objects | `e2e/pages/{feature}.page.ts` |
| Component helpers | `e2e/components/basic/u-{name}.component.ts` |
| Path alias | `@/...` → `e2e/*` |
| Imports | Always use `.js` extension (ESM) |
| `data-testid` | `{module}-{element}` or `{module}-{element}-{id}` |

Admin app is Vue 3 + Nuxt UI v4 + Vite (dev server with HMR). API is NestJS + Apollo GraphQL. Auth is session-cookie based via the `testLogin` mutation.

The frontend can run in two interchangeable modes — **dev** (`pnpm dev:admin`, Vite HMR) or **preview** (`pnpm build:admin && pnpm preview:admin`, serves `dist/`). The URL is the same in both; tests don't need to know which is running. When the user wants to exercise tests against the preview build, they run `pnpm --filter @ugi/e2e test:preview` which sets `PW_PREVIEW=1` (extends timeout to 120s, adds slowMo). `test:ui` and `test:headed` drive the normal dev-mode flow.

## REQUIRED: Locators MUST use `data-testid`

**All element locators in test code MUST target `data-testid`.** No exceptions — not for "temporary" locators, not for Nuxt UI composites that "don't forward testids", not for `role=`, `name=`, `type=submit`, CSS class, tag name, or text content.

- ✅ `page.getByTestId('login-submit')`
- ✅ `page.locator('[data-testid^="user-row-"]')` — attribute-prefix selector on `data-testid` is fine, it's still a testid
- ❌ `page.locator('input[name="email"]')`
- ❌ `page.locator('[role="alert"]')`
- ❌ `page.locator('button[type="submit"]')`
- ❌ `page.getByRole('button', { name: 'Login' })`
- ❌ `page.locator('.some-class')`
- ❌ `page.getByText('Save')`

If the component you're targeting doesn't have a testid (commonly Nuxt UI composites like `UAuthForm`, or inner slotted elements of `USlideover`), **add one to the Vue source first**, rebuild if in preview mode, then write the test. See the "Adding testids to the frontend" subsection below. This rule applies to **both new tests and fixes** — when `debug-e2e-test` points at a stale locator, the fix is to add a testid, not to swap one CSS selector for another.

## Test File Template

```typescript
import { test, expect } from '@/fixtures/auth.fixture.js';
import { MePage } from '@/pages/me.page.js';

test.describe('Feature name — action', () => {
  test.describe('Positive cases', () => {
    test('superadmin can perform action', async ({ authenticatedPageAs }) => {
      // Create a fresh user with the role + log them in (one call)
      const { user, page } = await authenticatedPageAs({ roleId: 'SUPERADMIN' });

      const me = new MePage(page);
      await me.navigate();
      await me.expectEmail(user.email);
    });
  });

  test.describe('Permission checks', () => {
    test('guest is redirected to login', async ({ guestPage }) => {
      await guestPage.goto('/me');
      await expect(guestPage).toHaveURL(/\/login/);
    });
  });
});
```

## Auth Fixtures

All defined in [auth.fixture.ts](e2e/fixtures/auth.fixture.ts). There are no
pre-baked role pages — every authenticated test creates its user at runtime.

| Fixture | Returns | Use case |
|---------|---------|----------|
| `authenticatedPageAs({ roleId })` | `{ user, page }` | **Default** for any role-based admin test (`'SUPERADMIN'` / `'DEANS_SECRETARY'` / `'STUDENT'`) |
| `testUser({ roleId?, password? })` | `CreatedUserApi` | When you need the user but not a logged-in page (e.g. logging in via the UI form with a known password) |
| `createAuthenticatedPage(email)` | `Page` | Log an already-existing user in via `testLogin` |
| `guestPage` | `Page` | Unauthenticated; public / redirect tests |

Plus from [student.fixture.ts](e2e/fixtures/student.fixture.ts) for webapp / Telegram flows:

| Fixture | Returns | Use case |
|---------|---------|----------|
| `testStudent({ groupId? })` | `CreatedStudentApi` | User + STUDENT role + StudentProfile + telegramChatId |
| `testGroup({ programId? })` | `CreatedGroupApi` | Group via API |
| `openWebappAsStudent(student)` | `Page` | Webapp session via `?devTelegramChatId=…` |

All factories track created IDs and auto-cleanup at test teardown.

### Composing factories

When `authenticatedPageAs` doesn't fit (e.g. test needs to compare two users
side-by-side), compose `testUser` + `createAuthenticatedPage` directly:

```typescript
test('two staff users have separate sessions', async ({
  testUser,
  createAuthenticatedPage,
}) => {
  const ada = await testUser({ roleId: 'SUPERADMIN' });
  const grace = await testUser({ roleId: 'DEANS_SECRETARY' });

  const adaPage = await createAuthenticatedPage(ada.email);
  const gracePage = await createAuthenticatedPage(grace.email);
  // both pages auto-closed at teardown
});
```

## Test-Only GraphQL API

The API exposes test-only mutations from `apps/api/src/modules/playwright/`. They are **only registered when `APP_ENV=local`** — safe in prod.

| Mutation | Purpose |
|----------|---------|
| `testLogin(email)` | Bypass password/2FA, set session cookies. Used by `createAuthenticatedPage` and the bootstrap inside `testUser`. |
| `testCreateUser(input)` | Create a user with faker-generated profile + optional `roleId` and optional `password` (bcrypt-hashed). Backing the `testUser` fixture. |
| `testDeleteUserPermanently(userId)` | Hard-delete user + sessions + user_roles + student_profiles. Used in cleanup. |
| `testCreateStudent(input)` / `testDeleteStudent(userId)` | Student lifecycle for webapp flows (used by `student.fixture.ts`). |
| `testCreateGroup(input)` / `testDeleteGroup(groupId)` | Group lifecycle (used by `student.fixture.ts`). |

**If you need a new test-only entity helper** (e.g. `testCreateCourse`), add a mutation there, expose it via a new fixture in `e2e/fixtures/`, and track created IDs for auto-cleanup — mirror the `testUser` fixture in [auth.fixture.ts](e2e/fixtures/auth.fixture.ts) or the richer pattern in [student.fixture.ts](e2e/fixtures/student.fixture.ts).

## Multi-Role Testing

Loop the role IDs and call `authenticatedPageAs` per test so each role can be run in isolation from the VSCode Test Explorer:

```typescript
import { test } from '@/fixtures/auth.fixture.js';
import type { SystemRole } from '@/fixtures/auth.fixture.js';
import { MePage } from '@/pages/me.page.js';

test.describe('Profile page access', () => {
  const roles: SystemRole[] = ['SUPERADMIN', 'DEANS_SECRETARY', 'STUDENT'];

  for (const roleId of roles) {
    test(`${roleId} can open profile`, async ({ authenticatedPageAs }) => {
      const { user, page } = await authenticatedPageAs({ roleId });
      const me = new MePage(page);
      await me.navigate();
      await me.expectEmail(user.email);
    });
  }
});
```

## Permissions Matcher

`expect` from `@/fixtures/auth.fixture.js` is extended (via [matchers/permissions.matcher.ts](e2e/matchers/permissions.matcher.ts)) with:

```typescript
await expect(page).toHavePermission('users:manage');
await expect(page).not.toHavePermission('users:delete');

// With action scopes
import { ActionScopes } from '@/matchers/permissions.matcher.js';
await expect(page).toHavePermission('users:manage', new ActionScopes({ orgId: 'org_123' }));
```

Scopes ultimately come from `@pcg/auth`. Inspect [tools/permissions.ts](e2e/tools/permissions.ts) for the `getCurrentUser(page)` helper that the matcher uses.

## Page Object Pattern

**CRITICAL**: Page Objects contain BOTH actions AND assertions (`expect*` methods). Keep assertions inside the page object so they're reusable across tests.

**CRITICAL**: Every `async` method MUST start with `logger.info(...)`. Synchronous `get*` locator helpers do not log.

Example adapted to the UGI conventions (see [pages/login.page.ts](e2e/pages/login.page.ts) for a real one):

```typescript
import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { logger } from '@/tools/logger.js';

export class ExamplePage {
  readonly page: Page;
  readonly pageContainer: Locator;
  readonly addButton: Locator;
  readonly nameInput: Locator;
  readonly itemsList: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContainer = page.getByTestId('example-page');
    this.addButton = page.getByTestId('example-add-button');
    this.nameInput = page.getByTestId('example-name-input');
    this.itemsList = page.getByTestId('example-items');
    this.emptyState = page.getByTestId('example-empty-state');
  }

  // === Navigation ===
  async goto(): Promise<void> {
    logger.info('Navigate to example page');
    await this.page.goto('/example');
    await this.waitForPage();
  }

  async waitForPage(): Promise<void> {
    logger.info('Wait for example page to be visible');
    await this.pageContainer.waitFor({ state: 'visible', timeout: 10_000 });
  }

  // === Dynamic locators (no logging) ===
  getItemById(id: string): Locator {
    return this.page.getByTestId(`example-item-${id}`);
  }

  // === Actions ===
  async createItem(name: string): Promise<void> {
    logger.info(`Create item "${name}"`);
    await this.addButton.click();
    await this.nameInput.fill(name);
    await this.page.getByTestId('example-submit').click();
  }

  async deleteItem(id: string): Promise<void> {
    logger.info(`Delete item (${id})`);
    await this.getItemById(id).getByTestId('delete-button').click();
    await this.page.getByTestId('confirm-delete').click();
  }

  // === Assertions (expect* prefix) ===
  async expectVisible(): Promise<void> {
    logger.info('Verify example page is visible');
    await expect(this.pageContainer).toBeVisible();
  }

  async expectItemVisible(id: string): Promise<void> {
    logger.info(`Verify item is visible (${id})`);
    await expect(this.getItemById(id)).toBeVisible();
  }

  async expectItemsCount(count: number): Promise<void> {
    logger.info(`Verify items count is ${count}`);
    await expect(this.page.locator('[data-testid^="example-item-"]')).toHaveCount(count);
  }

  async expectNoItems(): Promise<void> {
    logger.info('Verify empty state is visible');
    await expect(this.emptyState).toBeVisible();
  }
}
```

### Method categories

| Category | Prefix | Returns | Example |
|----------|--------|---------|---------|
| Navigation | `goto`, `waitFor*` | `void` | `goto()`, `waitForPage()` |
| Dynamic locators | `get*` | `Locator` | `getItemById(id)` |
| Actions | verb | `void` or data | `createItem()`, `deleteItem()` |
| **Assertions** | `expect*` | `void` | `expectVisible()`, `expectItemsCount(n)` |

### Logging format

| Method type | Format | Example |
|-------------|--------|---------|
| Navigation | `Navigate to {where}` | `Navigate to /me` |
| Action with ID | `{Action} ({id})` | `Delete item (item_123)` |
| Action with text | `{Action} "{text}"` | `Create item "Test"` |
| Assertion | `Verify {state}` | `Verify item is visible (item_123)` |
| Negative assertion | `Verify {thing} is NOT {state}` | `Verify item is NOT visible (item_123)` |

## Adding testids to the frontend (Nuxt UI v4)

The admin uses **Nuxt UI v4 in standalone Vue mode**. Most components forward `data-testid` to the root element (UButton, UCard, UModal, UInput, UFormField, …) — just add the attribute and use `getByTestId`.

Two cases need extra work:

1. **`USlideover`** doesn't forward `data-testid` — put it on an inner element inside `<template #body>`.
2. **Composite components** like `UAuthForm` don't expose per-field testids. **Do not fall back to `input[name="email"]`** — that violates the locator rule. Instead, refactor the form so the test can address each field by testid. Two acceptable patterns:
   - Replace `UAuthForm` with hand-rolled `UFormField` + `UInput` so each input gets its own `data-testid`.
   - Wrap the form in a container testid AND add per-field testids via slot overrides / refactor the rendering, so locators read `getByTestId('login-email')`, `getByTestId('login-password')`, `getByTestId('login-submit')`.

If you're tempted to write `input[name="..."]`, `button[type="submit"]`, `[role="alert"]`, or `getByText('…')` — stop and add a testid to the Vue source first.

```typescript
// ✅ Preferred — testid on the Nuxt UI root
<UButton data-testid="example-submit-button">Save</UButton>

// ✅ USlideover — testid goes inside
<USlideover>
  <template #body>
    <div data-testid="example-slideover">…</div>
  </template>
</USlideover>

// ✅ Composite component — refactor / add per-field testids in the .vue source
<UAlert v-if="apiError" data-testid="login-error" :description="apiError" />
this.errorAlert = page.getByTestId('login-error');

// ❌ Forbidden — even when a Nuxt UI composite makes it inconvenient
this.emailInput = this.pageContainer.locator('input[name="email"]');
```

## Component Helpers (Nuxt UI)

Import from `@/components/basic/index.js` ([e2e/components/basic/](e2e/components/basic)):

| Helper | Component | Key methods |
|--------|-----------|-------------|
| `USelectHelper` | `USelect` | `selectOption()`, `expectSelected()` |
| `USelectMenuHelper` | `USelectMenu` | `selectOption()`, `search()` |
| `UCheckboxHelper` | `UCheckbox` | `check()`, `uncheck()`, `expectChecked()` |
| `USwitchHelper` | `USwitch` | `enable()`, `disable()`, `expectEnabled()` |
| `UInputDateHelper` | Date picker | `fillDate('1990-01-15')` |
| `UInputNumberHelper` | Number input | `fill()`, `increment()`, `decrement()` |
| `UPhoneInputHelper` | Phone input | `fill()` |
| `UPaginationHelper` | `UPagination` | `goToPage()`, `next()`, `prev()` |
| `URadioGroupHelper` | `URadioGroup` | `select()`, `expectSelected()` |
| `UYesNoHelper` | Yes/No choice | `selectYes()`, `selectNo()` |
| `UToastHelper` | `UToast` | `expectToast()`, `dismiss()` |
| `UErrorHelper` | Inline errors | `expectError()` |
| `URepeatableCollectionHelper` | Dynamic list | `add()`, `remove()`, `fillRow()` |

```typescript
import { USelectHelper, UCheckboxHelper } from '@/components/basic/index.js';

await USelectHelper.selectOption(page, selectLocator, 'Option text');
await USelectHelper.expectSelected(selectLocator, 'Option text');
await UCheckboxHelper.check(page, checkboxLocator);
```

Before writing yet another helper, browse the existing ones — most Nuxt UI widgets are already covered.

## Data Generation

```typescript
import { fake } from '@/tools/fake.js';

fake.user();                 // { firstName, lastName, email } — full faker profile
fake.uniqueEmail('prefix');  // 'prefix+<timestamp>@test.ugi.local'
fake.uniqueId('prefix-');    // 'prefix-<timestamp>-<random>'
```

Raw faker is also re-exported (`import { faker } from '@/tools/fake.js'`) for custom scenarios.

## Seed Data

Only one seeded user matters for tests, and it's an internal implementation
detail of `auth.fixture.ts` — **never reference it from a test body**. See
[`e2e/CLAUDE.md`](e2e/CLAUDE.md).

```typescript
import { TEST_PASSWORD } from '@/fixtures/seed-data.js';

TEST_PASSWORD  // arbitrary constant used by UI-login smoke tests when
               // creating a fresh user via `testUser({ password: TEST_PASSWORD })`
```

Regenerate the seeded superadmin (the one `auth.fixture.ts` uses internally to
authenticate API calls) via: `pnpm --filter @ugi/cli dev db seed --env local --clean`.

## Test Steps Pattern

Use `test.step()` for multi-phase flows. Each step should have a descriptive name, construct its own Page Object, return any data the next step needs, and (for page-object calls) use `expect*` methods from the page object rather than inline assertions.

```typescript
test('complete user lifecycle', async ({
  authenticatedPageAs,
  testUser,
  createAuthenticatedPage,
}) => {
  // Step 1 — superadmin context
  const admin = await test.step('Open admin as a fresh superadmin', async () => {
    return authenticatedPageAs({ roleId: 'SUPERADMIN' });
  });

  // Step 2 — create a new staff user via API, returns data
  const newUser = await test.step('Create staff user via API', async () => {
    return testUser({ roleId: 'DEANS_SECRETARY' });
  });

  // Step 3 — superadmin sees the newly created user in the list
  await test.step('Superadmin sees the new user', async () => {
    const usersPage = new UsersPage(admin.page);
    await usersPage.navigate();
    await usersPage.expectUserVisible(newUser.email);
  });

  // Step 4 — newly created user logs into their profile
  await test.step('Newly created user logs in', async () => {
    const userPage = await createAuthenticatedPage(newUser.email);
    const me = new MePage(userPage);
    await me.navigate();
    await me.expectEmail(newUser.email);
    // userPage is auto-closed at teardown
  });
});
```

## Common Patterns

### URL assertions

```typescript
await page.waitForURL(/\/me/);
await expect(page).toHaveURL(/\/login/);
```

### Locator filtering

```typescript
// Filter a row of testid'd items by content of a child testid
await page
  .locator('[data-testid^="user-row-"]')
  .filter({ has: page.getByTestId('user-row-name').filter({ hasText: 'Ada Lovelace' }) })
  .getByTestId('user-row-delete')
  .click();

await expect(page.locator('[data-testid^="user-row-"]')).toHaveCount(5);
```

### Waiting for GraphQL responses

Avoid `waitForLoadState('networkidle')` — Apollo's persistent WebSocket keeps the network "busy" and this will either time out or return during loading skeletons. Prefer `waitForResponse` keyed on the GraphQL operation name, or auto-retrying `expect(locator).toBeVisible()`:

```typescript
const responsePromise = page.waitForResponse(
  (resp) => resp.url().includes('/graphql') && resp.request().postDataJSON()?.operationName === 'UsersList',
  { timeout: 10_000 },
);
await addButton.click();
await responsePromise;
```

## Environment

[.env.yml](e2e/.env.yml) (copy from `.env.example.yml`, parsed by `@pcg/dotenv-yaml`) holds workspace-scoped hostnames — **do not hardcode** service URLs:

```yaml
API_URL: https://api.{workspace}.ugi.local
ADMIN_URL: https://admin.{workspace}.ugi.local
```

Consumed via:

```typescript
import { URLS, API_GQL_URL, HOSTS } from '@/tools/config.js';

URLS.api;        // 'https://api.…'
URLS.admin;      // 'https://admin.…'
API_GQL_URL;     // `${URLS.api}/graphql`
HOSTS.admin;     // 'admin.…' (for cookie domain checks)
```

The shared Caddy fragment is generated by `pnpm dev:up` (see [infra/local/up.sh](infra/local/up.sh)).

## Test Commands

Root scripts:

```bash
pnpm test:e2e         # Run all e2e tests
pnpm test:e2e:ui      # UI mode with PW_LOG=1 (detailed logging)
pnpm test:e2e:report  # Open the last HTML report
```

Direct scripts inside `e2e/` ([package.json](e2e/package.json)):

```bash
pnpm --filter @ugi/e2e test
pnpm --filter @ugi/e2e test:ui
pnpm --filter @ugi/e2e test:headed
pnpm --filter @ugi/e2e test:headed:debug   # --max-failures=1 --workers=1 + PWDEBUG=console
pnpm --filter @ugi/e2e test:preview        # PW_PREVIEW=1 --headed (slow-mo 700ms)
```

## Checklist (before running the test)

- [ ] File named `{feature}-{action}.spec.ts` under `e2e/tests/{feature}/`
- [ ] Imports use `.js` extension
- [ ] `test` + `expect` imported from `@/fixtures/auth.fixture.js` (or `@/fixtures/student.fixture.js` for webapp tests), not raw `@playwright/test`
- [ ] **Authenticated user obtained via `authenticatedPageAs` / `testUser` / `testStudent`** — never via seed-user references in test bodies. See [`e2e/CLAUDE.md`](e2e/CLAUDE.md).
- [ ] Page Object has `expect*` methods for reusable assertions
- [ ] Every async page-object method logs via `logger.info(...)`
- [ ] **Every locator uses `data-testid`** — no `input[name=…]`, `[role=…]`, `getByRole`, `getByText`, CSS class, or tag selectors. If the target lacks a testid, add one to the Vue source first.
- [ ] No `waitForLoadState('networkidle')` — use `waitForResponse` or auto-retry assertions
- [ ] Unique test data via `fake.uniqueEmail()` / `fake.uniqueId()` (factory-created users already have unique faker emails)
- [ ] Dynamically created pages (`authenticatedPageAs`, `createAuthenticatedPage`) don't need manual `.close()` — fixture handles teardown

## Final Step (REQUIRED)

After writing or editing any spec file, you **MUST** invoke the `debug-e2e-test` skill on it. Tests are not "done" until they actually pass.

Do not run `pnpm test:e2e` directly on a fresh test — `workers=1` keeps output ordered, but running the whole suite buries your new test's failure signal in unrelated output. The `debug-e2e-test` skill handles:

- Pre-flight checks (Caddy, API reachable, `.env.yml` present, `.only` guard)
- Isolated execution (`pnpm --filter @ugi/e2e exec playwright test tests/...:line`) with `PW_LOG=1`
- Rich failure diagnosis (consolidated `failure.md` with unified timeline, DOM snapshot, browser console, network errors, screenshot)
- A 5-iteration fix loop per test, with anti-spinning safeguards
- Admin relies on Vite HMR — no manual rebuild between iterations; API auto-rebuilds via `nest start --watch`

Writing a test without running the debug loop is incomplete work.
