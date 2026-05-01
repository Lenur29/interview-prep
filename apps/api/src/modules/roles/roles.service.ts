import { Injectable } from '@nestjs/common';

import { ROLES_REGISTRY, SystemRole } from '@/permissions/roles.js';

import { Role } from './role.js';

@Injectable()
export class RolesService {
  getAll(): Role[] {
    return Object.entries(ROLES_REGISTRY).map(([roleId, definition]) => ({
      id: roleId as SystemRole,
      title: definition.title,
      type: definition.type,
      description: definition.description,
      permissions: definition.permissions,
    }));
  }
}
