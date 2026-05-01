import {
  mergeResolvedPermissions,
  ReadonlyResolvedPermission,
  replaceScope,
  ResolvedPermission,
  resolvePermissions,
} from '@pcg/auth';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { getRolePermissions, SystemRole } from '@/permissions/roles.js';
import { User } from '../users/user.entity.js';
import { UserRole } from '../user-roles/user-role.entity.js';

/**
 * Service responsible for resolving user permissions
 */
@Injectable()
export class CurrentUserPermissionsService {
  constructor(
    @InjectRepository(UserRole) private readonly userRoleRepository: Repository<UserRole>,
  ) {}

  /**
   * Get permissions from authorized role
   */
  private getAuthorizedPermissions(): string[] {
    return getRolePermissions(SystemRole.AUTHORIZED);
  }

  /**
   * Resolve user permissions.
   * Merges common permissions with user-specific permissions and user role permissions,
   * resolves named scopes and replaces them with concrete IDs.
   * @param user - user entity
   * @returns - resolved permissions
   */
  async resolve(user: User): Promise<ReadonlyResolvedPermission[]> {
    let allResolvedPermissions: ResolvedPermission[] = resolvePermissions(user.permissions);

    // Process AUTHORIZED role permissions (common permissions for all authenticated users)
    const resolvedCommonPermissions = resolvePermissions(this.getAuthorizedPermissions());

    allResolvedPermissions = mergeResolvedPermissions(
      allResolvedPermissions,
      resolvedCommonPermissions,
    );

    // Load and process user role assignments from user_roles table
    const userRoles = await this.userRoleRepository.findBy({ userId: user.id });

    for (const userRole of userRoles) {
      const rolePermissions = getRolePermissions(userRole.roleId);
      const resolvedRolePermissions = resolvePermissions(rolePermissions);

      allResolvedPermissions = mergeResolvedPermissions(
        allResolvedPermissions,
        resolvedRolePermissions,
      );
    }

    allResolvedPermissions = allResolvedPermissions.map((rp) => {
      /**
       * Replace me scopes
       * @example
       * bo:core:users[me]:change-password
       * { id: 'bo:core:users[me]:change-password', scopes: [user#bou:xxxxx] }
       */
      if (rp.scopes.includes('me') && !rp.id.endsWith('list')) {
        rp.scopes = replaceScope(rp.scopes, 'me', `user#${user.id}`);
      }

      return rp;
    });

    return allResolvedPermissions;
  }
}
