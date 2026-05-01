import type { Page } from '@playwright/test';
import {
  isGranted,
  type ActionScopesArray,
  type ActionScopes,
  type IUser,
} from '@pcg/auth';
import { logger } from './logger.js';
import { API_GQL_URL } from './config.js';

const ME_QUERY = `
  query Me {
    me {
      id
      permissions
      resolvedPermissions
    }
  }
`;

export interface ResolvedPermission {
  id: string;
  scopes: (string | string[])[];
}

export interface CurrentUser extends IUser {
  id: string;
  permissions: readonly string[];
  resolvedPermissions: ResolvedPermission[];
}

/**
 * Fetch current user data including permissions.
 * Uses the page's cookies for authentication.
 */
export async function getCurrentUser(page: Page): Promise<CurrentUser> {
  const response = await page.request.post(API_GQL_URL, {
    data: {
      query: ME_QUERY,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to fetch current user: ${response.status()}`);
  }

  const json = await response.json();

  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  return json.data.me as CurrentUser;
}

/**
 * Check if user has a specific permission using @pcg/auth isGranted.
 */
export function checkPermission(
  user: CurrentUser,
  permission: string,
  actionScopes?: ActionScopesArray | ActionScopes,
): boolean {
  return isGranted(user, permission, actionScopes);
}

export function findPermission(
  permissions: ResolvedPermission[],
  permissionId: string,
): ResolvedPermission | undefined {
  return permissions.find((p) => p.id === permissionId);
}

export function logPermissions(permissions: ResolvedPermission[]): void {
  logger.info('Current permissions:');
  for (const p of permissions) {
    if (p.scopes.length === 0) {
      logger.info(`  ${p.id} (global)`);
    } else {
      logger.info(`  ${p.id} → [${p.scopes.join(', ')}]`);
    }
  }
}
