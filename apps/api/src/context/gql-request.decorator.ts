import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';

/**
 * GraphQL Request parameter decorator.
 * Extracts the Express Request object from GraphQL context.
 *
 * @example
 * ```ts
 * @Mutation(() => LoginPayload)
 * async login(
 *   @Args('input') input: LoginInput,
 *   @GqlRequest() req: Request,
 *   @GqlResponse() res: Response,
 * ) {
 *   return await this.authService.login(input, ctx, res, req);
 * }
 * ```
 */
export const GqlRequest = createParamDecorator(
  (data: unknown, context: ExecutionContext): Request => {
    const ctx = GqlExecutionContext.create(context);

    return ctx.getContext<{ req: Request }>().req;
  },
);
