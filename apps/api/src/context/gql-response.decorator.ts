import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Response } from 'express';

/**
 * GraphQL Response parameter decorator.
 * Extracts the Express Response object from GraphQL context for setting cookies.
 *
 * @example
 * ```ts
 * @Mutation(() => LoginPayload)
 * async login(
 *   @Args('input') input: LoginInput,
 *   @GqlResponse() res: Response,
 * ) {
 *   const tokens = await this.authService.login(input);
 *   this.cookieService.setAuthCookies(res, tokens);
 *   return { user: tokens.user };
 * }
 * ```
 */
export const GqlResponse = createParamDecorator(
  (data: unknown, context: ExecutionContext): Response => {
    const ctx = GqlExecutionContext.create(context);

    return ctx.getContext<{ res: Response }>().res;
  },
);
