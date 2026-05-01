import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { UserRolesModule } from '../user-roles/user-roles.module.js';
import { TestUsersModule } from './users/test-users.module.js';
import { PlaywrightResolver } from './playwright.resolver.js';

/**
 * PlaywrightModule provides test utilities for E2E tests.
 *
 * IMPORTANT: This module should ONLY be loaded when APP_ENV=local.
 * It provides mutations that bypass normal business logic for testing purposes:
 * - testLogin: Bypasses password/2FA validation
 *
 * Submodules:
 * - TestUsersModule: User operations (testCreateUser, testDeleteUserPermanently)
 *
 * @see app.module.ts for conditional import
 */
@Module({
  imports: [
    AuthModule,
    UsersModule,
    UserRolesModule,
    TestUsersModule,
  ],
  providers: [PlaywrightResolver],
})
export class PlaywrightModule {}
