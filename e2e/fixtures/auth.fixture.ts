import { Page, BrowserContext } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

import { test as base } from '@/fixtures/base.fixture.js';
import { API_GQL_URL, URLS } from '@/tools/config.js';
import { logger } from '@/tools/logger.js';
import { newInstrumentedContext } from '@/tools/attach-debug-listeners.js';
import { TEST_USERS } from './seed-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============ User API Types ============

export type SystemRole = 'SUPERADMIN' | 'AUTHORIZED' | 'GUEST';

export interface CreateUserApiOptions {
  roleId?: SystemRole;
  password?: string;
}

export interface CreatedUserApi {
  id: string;
  email: string;
  fullName: string;
}

const TEST_CREATE_USER_MUTATION = `
  mutation TestCreateUser($input: TestCreateUserInput!) {
    testCreateUser(input: $input) {
      id
      firstName
      lastName
      fullName
      email
    }
  }
`;

const TEST_DELETE_USER_MUTATION = `
  mutation TestDeleteUserPermanently($userId: String!) {
    testDeleteUserPermanently(userId: $userId) {
      success
      userId
      userRolesDeleted
      sessionsDeleted
    }
  }
`;

const TEST_LOGIN_MUTATION = `
  mutation TestLogin($email: String!) {
    testLogin(email: $email) {
      id
      email
    }
  }
`;

// ============ Fixture Types ============

type AuthFixtures = {
  guestPage: Page;

  /**
   * Create an authenticated admin page for an arbitrary email via the testLogin mutation.
   * Useful for newly created users that have no pre-baked storage state.
   */
  createAuthenticatedPage: (email: string) => Promise<Page>;

  /**
   * Create a staff user via API and clean it up at the end of the test.
   */
  testUser: (options?: CreateUserApiOptions) => Promise<CreatedUserApi>;

  /**
   * Create a user with the given role and return both the user and an
   * authenticated Page. Composition of `testUser` + `createAuthenticatedPage`.
   */
  authenticatedPageAs: (
    options: { roleId: SystemRole },
  ) => Promise<{ user: CreatedUserApi; page: Page }>;
};

function getRecordVideoOptions(
  role: string,
  testInfo: { project: { use: { video?: unknown } } },
) {
  const videoSetting = testInfo.project.use.video;
  const shouldRecordVideo = videoSetting && videoSetting !== 'off';

  if (!shouldRecordVideo) {
    return undefined;
  }

  return {
    dir: path.join(__dirname, '..', 'test-results', 'videos', role),
    size: { width: 1920, height: 1080 },
  };
}

export const test = base.extend<AuthFixtures>({
  guestPage: async ({ browser, debugBuffer }, use, testInfo) => {
    logger.info(`Open browser for ${URLS.admin} as guest`);
    const context = await newInstrumentedContext(
      browser,
      {
        baseURL: URLS.admin,
        ignoreHTTPSErrors: true,
        recordVideo: getRecordVideoOptions('guest', testInfo),
      },
      debugBuffer,
    );
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  createAuthenticatedPage: async ({ browser, debugBuffer }, use, testInfo) => {
    const contexts: BrowserContext[] = [];

    await use(async (email: string) => {
      logger.info(`Open browser for ${URLS.admin} as authenticated user (${email})`);
      const context = await newInstrumentedContext(
        browser,
        {
          baseURL: URLS.admin,
          ignoreHTTPSErrors: true,
          recordVideo: getRecordVideoOptions('authenticated', testInfo),
        },
        debugBuffer,
      );
      contexts.push(context);

      const response = await context.request.post(API_GQL_URL, {
        data: {
          query: TEST_LOGIN_MUTATION,
          variables: { email },
        },
      });

      if (!response.ok()) {
        const text = await response.text();
        throw new Error(`testLogin failed for ${email}: ${response.status()} - ${text}`);
      }

      const json = await response.json();
      if (json.errors) {
        throw new Error(`testLogin GraphQL error: ${JSON.stringify(json.errors)}`);
      }

      return context.newPage();
    });

    for (const ctx of contexts) {
      await ctx.close();
    }
  },

  testUser: async ({ browser }, use) => {
    const createdIds: string[] = [];
    const context = await browser.newContext({ ignoreHTTPSErrors: true });

    const superadminLogin = await context.request.post(API_GQL_URL, {
      data: {
        query: TEST_LOGIN_MUTATION,
        variables: { email: TEST_USERS.superadmin },
      },
    });
    if (!superadminLogin.ok()) {
      throw new Error(
        `testUser fixture: superadmin login failed (${superadminLogin.status()})`,
      );
    }

    await use(async (options?: CreateUserApiOptions) => {
      const response = await context.request.post(API_GQL_URL, {
        data: {
          query: TEST_CREATE_USER_MUTATION,
          variables: {
            input: {
              roleId: options?.roleId ?? null,
              password: options?.password ?? null,
            },
          },
        },
      });

      if (!response.ok()) {
        const text = await response.text();
        throw new Error(`testCreateUser failed: ${response.status()} - ${text}`);
      }

      const json = await response.json();
      if (json.errors) {
        throw new Error(`testCreateUser GraphQL error: ${JSON.stringify(json.errors)}`);
      }

      const user = json.data.testCreateUser as CreatedUserApi;
      createdIds.push(user.id);
      logger.info(`Create test user ${user.fullName} (${user.id}) (via API)`);
      return user;
    });

    for (const id of createdIds) {
      logger.info(`Cleanup: delete user permanently (${id}) (via API)`);
      try {
        await context.request.post(API_GQL_URL, {
          data: {
            query: TEST_DELETE_USER_MUTATION,
            variables: { userId: id },
          },
        });
      } catch (error) {
        console.warn(`Cleanup: failed to delete user ${id}:`, error);
      }
    }

    await context.close();
  },

  authenticatedPageAs: async ({ testUser, createAuthenticatedPage }, use) => {
    await use(async ({ roleId }) => {
      const user = await testUser({ roleId });
      const page = await createAuthenticatedPage(user.email);
      return { user, page };
    });
  },
});

export { expect } from '@/matchers/permissions.matcher.js';
