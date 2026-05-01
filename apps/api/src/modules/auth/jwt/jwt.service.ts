import { Inject } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import jwt from 'jsonwebtoken';

import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { type Logger } from '@/modules/logger/classes/logger.js';
import { type LoggerFactory } from '@/modules/logger/classes/logger-factory.js';
import { JwtConfig } from '@/config/jwt.config.js';
import {
  JwtTokenType,
  type JwtSubscriptionTokenPayload,
  type JwtTelegramWebappTokenPayload,
} from '@/types/jwt.js';

/**
 * JwtService provides JWT token generation for subscription tokens (WebSocket connections).
 *
 * Note: Access/refresh token management has been replaced by session-based authentication.
 * This service now only handles subscription tokens for WebSocket connections.
 */
export class JwtService {
  private logger!: Logger;

  constructor(
    @InjectLoggerFactory() private readonly loggerFactory: LoggerFactory,
    @Inject(JwtConfig.KEY) private readonly jwtConfig: ConfigType<typeof JwtConfig>,
  ) {
    this.logger = this.loggerFactory.create({
      scope: JwtService.name,
    });
  }

  /**
   * Generate subscription token for WebSocket connections
   * @param userId - user ID
   * @returns subscription token string
   */
  generateSubscriptionToken(userId: string): string {
    const { iss, aud, secret, expiration } = this.jwtConfig;

    const payload: JwtSubscriptionTokenPayload = {
      sub: JwtTokenType.SUBSCRIPTION,
      aud,
      iss,
      uid: userId,
    };

    return jwt.sign(payload, secret, {
      expiresIn: expiration.subscriptionToken,
    });
  }

  /**
   * Generate short-lived bearer token for Telegram WebApp clients.
   * Stateless — no DB record. Webapp re-issues by re-submitting initData on 401.
   */
  generateTelegramWebappToken(userId: string): string {
    const { iss, aud, secret, expiration } = this.jwtConfig;

    const payload: JwtTelegramWebappTokenPayload = {
      sub: JwtTokenType.TELEGRAM_WEBAPP,
      aud,
      iss,
      uid: userId,
    };

    return jwt.sign(payload, secret, {
      expiresIn: expiration.telegramWebappToken,
    });
  }
}
