import { registerEnumType } from '@nestjs/graphql';

/**
 * System roles enum
 * Each role has a unique identifier that matches the enum key
 */
export enum SystemRole {
  GUEST = 'GUEST',
  AUTHORIZED = 'AUTHORIZED',
  SUPERADMIN = 'SUPERADMIN',
}

registerEnumType(SystemRole, {
  name: 'SystemRole',
});

/**
 * Role type classification
 */
export enum RoleType {
  /**
   * System roles are built-in roles not tied to any organization or group.
   */
  SYSTEM = 'SYSTEM',
}

registerEnumType(RoleType, {
  name: 'RoleType',
});

/**
 * Role definition with type and permissions
 */
export interface RoleDefinition {
  type: RoleType;
  title: string;
  description?: string;
  permissions: string[];
}

/**
 * Registry of all system roles with their permissions.
 *
 * Permissions use the `lm:` shortcode prefix. Scopes can be added with
 * brackets: `lm:topics[me]:read`.
 */
export const ROLES_REGISTRY: Record<SystemRole, RoleDefinition> = {
  [SystemRole.GUEST]: {
    type: RoleType.SYSTEM,
    title: 'Guest',
    description: 'Unauthenticated user with minimal access',
    permissions: [
      'lm:auth:create-password-recovery-request',
      'lm:auth:verify-password-recovery-token',
      'lm:auth:recover-password',
    ],
  },

  [SystemRole.AUTHORIZED]: {
    type: RoleType.SYSTEM,
    title: 'Authorized User',
    description: 'Authenticated user with basic access',
    permissions: [
      'lm:users[me]:get',
      'lm:users[me]:update',
      'lm:users[me]:change-password',
      'lm:users[me]:change-email',
      'lm:users[me]:set-push-notifications',
      'lm:users[me]:delete',

      'lm:images:create',
      'lm:images:get',
      'lm:images:update',
      'lm:images:delete',
      'lm:binary-files:create',
      'lm:binary-files:get',
    ],
  },

  [SystemRole.SUPERADMIN]: {
    type: RoleType.SYSTEM,
    title: 'Super Admin',
    description: 'Full system access',
    permissions: [
      'lm:*',
    ],
  },
};

/**
 * Get role permissions by role id
 * @param roleId - SystemRole enum value
 * @returns array of permissions for the role
 */
export function getRolePermissions(roleId: SystemRole): string[] {
  const role = ROLES_REGISTRY[roleId];

  return role?.permissions ?? [];
}

/**
 * Get role definition by role id
 * @param roleId - SystemRole enum value
 * @returns role definition or undefined
 */
export function getRoleDefinition(roleId: SystemRole): RoleDefinition | undefined {
  return ROLES_REGISTRY[roleId];
}
