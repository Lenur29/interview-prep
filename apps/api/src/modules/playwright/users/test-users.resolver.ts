import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { ActionContextParam } from '@/context/action-context.decorator.js';
import type { ActionContext } from '@/context/action-context.js';
import { GraphQLAuthGuard } from '@/guards/auth.guard.js';
import { GraphQLPermissionsGuard } from '@/guards/permissions.guard.js';
import { User } from '@/modules/users/user.entity.js';

import { TestUsersService } from './test-users.service.js';
import {
  TestCreateUserInput,
  TestDeleteUserPermanentlyResult,
} from './types/index.js';

/**
 * TestUsersResolver provides test utilities for user operations in E2E tests.
 *
 * SECURITY: This resolver is ONLY available when APP_ENV=local.
 * The PlaywrightModule is conditionally imported in app.module.ts.
 */
@Resolver()
@UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
export class TestUsersResolver {
  constructor(
    private readonly testUsersService: TestUsersService,
  ) {}

  @Mutation(() => User, {
    description: 'Create test user with faker data and optional role assignment. Only available when APP_ENV=local.',
  })
  async testCreateUser(
    @Args('input') input: TestCreateUserInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<User> {
    return this.testUsersService.createUser(input, ctx);
  }

  @Mutation(() => TestDeleteUserPermanentlyResult, {
    description: 'Permanently delete user with sessions and user_roles for E2E tests. Only available when APP_ENV=local.',
  })
  async testDeleteUserPermanently(
    @Args('userId') userId: string,
  ): Promise<TestDeleteUserPermanentlyResult> {
    return this.testUsersService.deleteUserPermanently(userId);
  }
}
