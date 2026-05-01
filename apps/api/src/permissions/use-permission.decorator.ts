import { SetMetadata } from '@nestjs/common';
import { type Permission } from './permissions.js';

export const USE_PERMISSION_KEY = Symbol('USE_PERMISSION_KEY');

/**
 * Set permission for query or mutation.
 * Used with permission guard to check access before executing resolver.
 *
 * @example
 * ```ts
 * @UsePermission('users:read')
 * @Query(() => User)
 * async user(@Args('id') id: string) {
 *   return this.userService.findOne(id);
 * }
 * ```
 */
export const UsePermission = (permission: Permission) => SetMetadata(USE_PERMISSION_KEY, permission);
