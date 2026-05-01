import { Module } from '@nestjs/common';

import { UsersModule } from '@/modules/users/users.module.js';
import { UserRolesModule } from '@/modules/user-roles/user-roles.module.js';
import { TestUsersResolver } from './test-users.resolver.js';
import { TestUsersService } from './test-users.service.js';

/**
 * TestUsersModule provides test utilities for user operations in E2E tests.
 *
 * IMPORTANT: This module should ONLY be loaded when APP_ENV=local.
 * It provides mutations that bypass normal business logic for testing purposes:
 * - testCreateUser: Creates user with faker data and optional role assignment
 * - testDeleteUserPermanently: Hard deletes user + sessions + user_roles
 *
 * @see PlaywrightModule for conditional import
 */
@Module({
  imports: [UsersModule, UserRolesModule],
  providers: [TestUsersService, TestUsersResolver],
})
export class TestUsersModule {}
