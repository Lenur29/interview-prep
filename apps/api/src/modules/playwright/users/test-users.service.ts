import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';

import type { ServiceMethodContext } from '@/context/service-method-context.js';
import { Session } from '@/modules/auth/sessions/session.entity.js';
import { User } from '@/modules/users/user.entity.js';
import { UserStatus } from '@/modules/users/types/common.js';
import { UsersService } from '@/modules/users/users.service.js';
import { UserRole } from '@/modules/user-roles/user-role.entity.js';
import { UserRolesService } from '@/modules/user-roles/user-roles.service.js';

import type { TestCreateUserInput, TestDeleteUserPermanentlyResult } from './types/index.js';

/**
 * TestUsersService provides test utilities for user operations in E2E tests.
 *
 * SECURITY: This service is ONLY available when APP_ENV=local.
 * The PlaywrightModule is conditionally imported in app.module.ts.
 */
@Injectable()
export class TestUsersService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly userRolesService: UserRolesService,
  ) {}

  /**
   * Creates a test user with auto-generated data using faker.
   * Optionally assigns a system role via UserRoles.
   */
  async createUser(
    input: TestCreateUserInput,
    ctx: ServiceMethodContext,
  ): Promise<User> {
    const user = await this.usersService.create({
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: `test-${randomUUID()}@example.test`,
      status: UserStatus.ACTIVE,
      password: input.password,
    }, ctx);

    if (input.roleId) {
      await this.userRolesService.create({
        userId: user.id,
        roleId: input.roleId,
      }, ctx);
    }

    return user;
  }

  /**
   * Permanently deletes a user along with their sessions and user_roles.
   * Hard delete — no soft delete, no recovery.
   */
  async deleteUserPermanently(userId: string): Promise<TestDeleteUserPermanentlyResult> {
    const userRepo = this.dataSource.getRepository(User);
    const userRolesRepo = this.dataSource.getRepository(UserRole);
    const sessionsRepo = this.dataSource.getRepository(Session);

    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user) {
      return {
        success: false,
        userId,
        userRolesDeleted: 0,
        sessionsDeleted: 0,
      };
    }

    const sessionsResult = await sessionsRepo.delete({ userId });
    const sessionsDeleted = sessionsResult.affected ?? 0;

    const userRolesResult = await userRolesRepo.delete({ userId });
    const userRolesDeleted = userRolesResult.affected ?? 0;

    await userRepo.delete(userId);

    return {
      success: true,
      userId,
      userRolesDeleted,
      sessionsDeleted,
    };
  }
}
