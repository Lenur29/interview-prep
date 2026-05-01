import { SystemRole } from '@/permissions/roles.js';

export interface GetUserRoleByOptions {
  id?: string;
  userId?: string;
  roleId?: SystemRole;
}
