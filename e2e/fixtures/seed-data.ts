/**
 * The seed superadmin is used internally by `auth.fixture.ts` to authenticate
 * the API context that creates per-test users. It must NOT be referenced from
 * test bodies — see `e2e/CLAUDE.md` for the rule.
 *
 * `TEST_PASSWORD` is an arbitrary constant used by UI-login smoke tests when
 * they create a fresh user via `testUser({ password: TEST_PASSWORD })`.
 *
 * Seeded by:
 *   pnpm --filter @lm/cli dev db seed --env local --clean
 */
export const TEST_PASSWORD = '7BAV3HzJ3Pr_WqqZpX2x';

export const TEST_USERS = {
  superadmin: 'superadmin@lemur.test',
} as const;
