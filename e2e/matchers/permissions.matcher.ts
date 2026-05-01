import type { Page } from '@playwright/test';
import { expect as baseExpect } from '@playwright/test';
import {
  isGranted,
  ActionScopes,
  encodeScopes,
  type ActionScopesArray,
} from '@pcg/auth';
import { getCurrentUser } from '@/tools/permissions.js';
import { logger } from '@/tools/logger.js';

export { ActionScopes, type ActionScopesArray };

export const expect = baseExpect.extend({
  /**
   * Assert that the page's current user has a specific permission.
   *
   * @example
   * await expect(page).toHavePermission('users:manage');
   * await expect(page).not.toHavePermission('users:delete');
   */
  async toHavePermission(
    page: Page,
    permission: string,
    actionScopes?: ActionScopesArray | ActionScopes,
  ) {
    const user = await getCurrentUser(page);

    const scopesArray = actionScopes instanceof ActionScopes ? actionScopes.getArray() : actionScopes;
    const scopesStr = scopesArray ? ` with scopes ${encodeScopes(scopesArray)}` : '';

    logger.info(`Check permission "${permission}"${scopesStr} for user ${user.id}`);

    const granted = isGranted(user, permission, actionScopes);

    logger.info(`  → ${granted ? '✓ GRANTED' : '✗ DENIED'}`);

    return {
      pass: granted,
      message: () => {
        let message = `Expected user ${user.id} ${this.isNot ? 'NOT ' : ''}to have permission "${permission}"${scopesStr}`;

        const resolvedPermissions = user.resolvedPermissions.filter((p) => p.id === permission);

        message += resolvedPermissions.length
          ? `\n\nUser's resolved permissions:\n${JSON.stringify(resolvedPermissions, null, 2)}`
          : ' - None';

        return message;
      },
      name: 'toHavePermission',
      expected: permission,
      actual: user.resolvedPermissions.map((p) => p.id),
    };
  },
});
