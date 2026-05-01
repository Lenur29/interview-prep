import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Response } from 'express';
import ms, { type StringValue } from 'ms';

import { CookieConfig } from '@/config/cookie.config.js';
import { JwtConfig } from '@/config/jwt.config.js';
import { SessionsConfig } from '@/config/sessions.config.js';

@Injectable()
export class CookieService {
  constructor(
    @Inject(CookieConfig.KEY) private readonly cookieConfig: ConfigType<typeof CookieConfig>,
    @Inject(JwtConfig.KEY) private readonly jwtConfig: ConfigType<typeof JwtConfig>,
    @Inject(SessionsConfig.KEY) private readonly sessionsConfig: ConfigType<typeof SessionsConfig>,
  ) {}

  /**
   * Set session cookie (httpOnly) and subscription token cookie
   */
  setSessionCookies(res: Response, sessionId: string, subscriptionToken: string): void {
    const baseOptions = this.cookieConfig.getBaseOptions();
    const subscriptionOptions = this.cookieConfig.getSubscriptionCookieOptions();
    const { names } = this.cookieConfig;
    const { expiration } = this.jwtConfig;

    // Session cookie (httpOnly)
    res.cookie(names.session, sessionId, {
      ...baseOptions,
      maxAge: ms(this.sessionsConfig.maxAge as StringValue),
    });

    // Subscription token cookie (NOT httpOnly - JS needs access for WebSocket)
    res.cookie(names.subscriptionToken, subscriptionToken, {
      ...subscriptionOptions,
      maxAge: ms(expiration.subscriptionToken as StringValue),
    });
  }

  /**
   * Clear session-based cookies (session and subscription token)
   */
  clearSessionCookies(res: Response): void {
    const baseOptions = this.cookieConfig.getBaseOptions();
    const { names } = this.cookieConfig;

    const clearOptions = {
      httpOnly: baseOptions.httpOnly,
      secure: baseOptions.secure,
      sameSite: baseOptions.sameSite,
      domain: baseOptions.domain,
      path: baseOptions.path,
    };

    res.clearCookie(names.session, clearOptions);
    res.clearCookie(names.subscriptionToken, {
      ...clearOptions,
      httpOnly: false,
    });
  }
}
