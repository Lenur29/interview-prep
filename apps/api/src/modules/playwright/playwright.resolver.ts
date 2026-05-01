import { Args, Mutation, Resolver } from '@nestjs/graphql';
import type { Request, Response } from 'express';

import { GqlRequest } from '@/context/gql-request.decorator.js';
import { GqlResponse } from '@/context/gql-response.decorator.js';
import type { ServiceMethodContext } from '@/context/service-method-context.js';
import { NotFoundError } from '@/errors/not-found.error.js';
import { CookieService } from '../auth/cookie/cookie.service.js';
import { JwtService } from '../auth/jwt/jwt.service.js';
import { SessionsService } from '../auth/sessions/sessions.service.js';
import { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';

/**
 * PlaywrightResolver provides test authentication for E2E tests.
 *
 * SECURITY: This resolver is ONLY available when APP_ENV=local.
 * The PlaywrightModule is conditionally imported in app.module.ts.
 *
 * The testLogin mutation bypasses password validation and 2FA,
 * creating a session directly for the specified user email.
 */
@Resolver()
export class PlaywrightResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
    private readonly cookieService: CookieService,
  ) {}

  /**
   * Test login - bypasses password validation and 2FA.
   * This is the only mutation that doesn't require authentication.
   */
  @Mutation(() => User, {
    description: 'Test login for Playwright E2E tests. Only available when APP_ENV=local. Bypasses password/2FA.',
  })
  async testLogin(
    @Args('email') email: string,
    @GqlRequest() req: Request,
    @GqlResponse() res: Response,
  ): Promise<User> {
    const user = await this.usersService.getOneByEmail(email.toLowerCase());

    if (!user) {
      throw new NotFoundError({
        message: `User with email ${email} not found. Run 'pnpm --filter @lm/cli dev db seed --env local --clean' to create test users.`,
        key: 'TEST_USER_NOT_FOUND',
      });
    }

    const ctx: ServiceMethodContext = {
      user,
      isGranted: () => true,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      validateAccess: () => {},
    };

    const session = await this.sessionsService.createSession({
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    }, ctx);

    const subscriptionToken = this.jwtService.generateSubscriptionToken(user.id);

    this.cookieService.setSessionCookies(res, session.id, subscriptionToken);

    return user;
  }
}
