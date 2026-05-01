import {
  type ActionScopesArray, isGranted,
} from '@pcg/auth';
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import { AccessDeniedError } from '@/errors/access-denied.error.js';
import { type ActionContext } from './action-context.js';
import { type User } from '@/modules/users/user.entity.js';

/**
 * Creates permission checking methods bound to current user
 */
export const createUserContextMethods = (user: User) => ({
  isGranted(action: string, actionScopes?: ActionScopesArray) {
    return isGranted(user, action, actionScopes);
  },
  isGuest() {
    return user.id.includes('guest');
  },
  validateAccess(action: string, scopes?: ActionScopesArray) {
    if (!isGranted(user, action, scopes)) {
      throw new AccessDeniedError({
        action,
        context: {
          action,
          userId: user.id,
          scopes,
        },
      });
    }
  },
});

/**
 * GraphQL action context parameter decorator.
 * Extracts current user and provides permission checking methods.
 *
 * @example
 * ```ts
 * @Query(() => User)
 * async user(@ActionContextParam() ctx: ActionContext) {
 *   ctx.validateAccess('users:read');
 *   return this.userService.findOne(ctx.user.id);
 * }
 * ```
 */
export const ActionContextParam = createParamDecorator(
  (data: unknown, context: ExecutionContext): ActionContext => {
    const ctx = GqlExecutionContext.create(context);

    const { user, sessionId } = ctx.getContext<{
      user: User;
      sessionId?: string;
    }>();

    return {
      user,
      sessionId,
      ...createUserContextMethods(user),
    };
  },
);

/**
 * REST action context parameter decorator.
 * Extracts current user from HTTP request and provides permission checking methods.
 *
 * @example
 * ```ts
 * @Get(':id')
 * async getUser(@RestActionContext() ctx: ActionContext) {
 *   ctx.validateAccess('users:read');
 *   return this.userService.findOne(ctx.user.id);
 * }
 * ```
 */
export const RestActionContextParam = createParamDecorator(
  (data: unknown, context: ExecutionContext): ActionContext => {
    const req = context.switchToHttp().getRequest<{ user: User; sessionId?: string }>();

    return {
      user: req.user,
      sessionId: req.sessionId,
      ...createUserContextMethods(req.user),
    };
  },
);
