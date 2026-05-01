import {
  type CanActivate,
  type ExecutionContext, Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { isGranted } from '@pcg/auth';
import type { Request } from 'express';

import { USE_PERMISSION_KEY } from '@/permissions/use-permission.decorator.js';
import { AccessDeniedError } from '@/errors/access-denied.error.js';
import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { type Logger } from '@/modules/logger/classes/logger.js';
import { type LoggerFactory } from '@/modules/logger/classes/logger-factory.js';
import { type User } from '@/modules/users/user.entity.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger: Logger;

  constructor(
    private readonly reflector: Reflector,
    @InjectLoggerFactory() private readonly loggerFactory: LoggerFactory,
  ) {
    this.logger = this.loggerFactory.create({
      scope: PermissionsGuard.name,
    });
  }

  /**
   *
   * @param context - execution context
   * @returns - true if user has permission to access resource
   * @throws - AccessDeniedError if user has no permission to access resource
   *
   * @example - Use in resolver
   * ```ts
   * @UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
   * @UsePermissions('js:core:users:get')
   * ```
   */
  canActivate(context: ExecutionContext): boolean {
    const action = this.reflector.getAllAndOverride<string>(
      USE_PERMISSION_KEY,
      [context.getHandler()], // , context.getClass()
    );

    if (!action) {
      return true;
    }

    const user = this.getUserFromContext(context);

    if (!user) {
      throw new Error('User not found in request context. GraphQLPermissionsGuard must be set after GraphQLAuthGuard');
    }

    const logger = this.logger.child({
      action: this.canActivate.name,
      validatedAction: action,
      userId: user.id,
      ...this.getRequestDetails(context),
    });

    if (!isGranted(user, action, ['*'])) {
      throw new AccessDeniedError({
        action: action,
        context: logger.getContext(),
      });
    }

    return true;
  }

  /**
   * Extracts request from execution context
   * @param context - execution context
   * @returns express request
   */
  getRequest(context: ExecutionContext): Request & { user?: User } {
    return context.switchToHttp().getRequest();
  }

  /**
   * Extracts request details from execution context
   * @param context - execution context
   * @returns request details
   */
  getRequestDetails(context: ExecutionContext): Record<string, unknown> {
    const request = this.getRequest(context);

    return {
      path: request.path,
      method: request.method,
      query: request.query,
    };
  }

  /**
   * Extracts current user from request object
   * @param context - execution context
   * @returns current user if exists
   */
  getUserFromContext(context: ExecutionContext): User | null {
    const request = this.getRequest(context);

    return request.user ?? null;
  }
}

/**
 * Guard that checks if user has permission to access resource
 * @example - Use in resolver
 * ```ts
 * @UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
 * @UsePermissions('js:core:users:get')
 * @Resolver(() => User)
 * export class UserResolver {
 *  // ...
 * }
 * ```
 *
 * @example - Use for queries
 * ```ts
 * @UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
 * @UsePermissions('js:core:users:get')
 * @Query(() => User)
 * async user(
 *  @Args('id') id: string
 * ) {
 *  // ...
 * }
 *```
 *
 * @example - Use for mutation
 * ```ts
 * @UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
 * @UsePermissions('js:core:users:delete')
 * @Mutation(() => Boolean)
 * async deleteUser(
 *  @Args('id') id: string
 * ) {
 *  // ...
 * }
 *```
 */
@Injectable()
export class GraphQLPermissionsGuard extends PermissionsGuard {
  /**
   * Extracts request details from execution context
   * @param context - execution context
   * @returns request details
   */
  getRequestDetails(context: ExecutionContext): Record<string, unknown> {
    const ctx = GqlExecutionContext.create(context);

    const { fieldName } = ctx.getInfo();

    return {
      fieldName,
    };
  }

  /**
   * Get request from GraphQL execution context
   * @param context - execution context
   * @returns request from GraphQL execution context
   */
  getRequest(context: ExecutionContext): Request & { user?: User } {
    const ctx = GqlExecutionContext.create(context);

    return ctx.getContext().req;
  }

  /**
   * Extracts current user from GraphQL context
   * @param context - execution context
   * @returns current user if exists
   */
  getUserFromContext(context: ExecutionContext): User | null {
    const ctx = GqlExecutionContext.create(context);

    const graphQlContext = ctx.getContext<{ user?: User }>();

    return graphQlContext.user ?? null;
  }
}
