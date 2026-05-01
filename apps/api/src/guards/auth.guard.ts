import { AppConfig } from '@/config/app.config.js';
import { JwtConfig } from '@/config/jwt.config.js';
import { UnauthorizedError } from '@/errors/unauthorized.error.js';
import { CookieService } from '@/modules/auth/cookie/cookie.service.js';
import { CurrentUserService } from '@/modules/current-user/current-user.service.js';
import { SessionsService } from '@/modules/auth/sessions/sessions.service.js';
import { type Logger } from '@/modules/logger/classes/logger.js';
import { type LoggerFactory } from '@/modules/logger/classes/logger-factory.js';
import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { type User } from '@/modules/users/user.entity.js';
import { extractJwtFromBearerToken, extractJwtFromBearerString, extractSessionIdFromCookie } from '@/tools/jwt-extractors.js';
import {
  type BaseJwtTokenPayload,
  isJwtServiceToken,
  isJwtSubscriptionToken,
  isJwtTelegramWebappToken,
  type JwtServiceToken,
  type JwtSubscriptionToken,
  type JwtTelegramWebappToken,
} from '@/types/jwt.js';
import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import { type Maybe } from '@pcg/predicates';
import { type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { type GraphQLWsConnectionParams } from '@/apollo/context.js';

/**
 * Unified authentication guard that supports:
 * 1. Session-based auth (from cookies) - for HTTP requests and GraphQL queries/mutations
 * 2. JWT subscription tokens - for GraphQL subscriptions (WebSocket)
 * 3. JWT service tokens - for service accounts
 *
 * Authentication priority:
 * - For subscriptions: JWT token only (subscription or service token)
 * - For other requests: Session cookie first, then JWT token fallback
 */
@Injectable()
export class AuthGuard implements CanActivate {
  protected readonly logger: Logger;

  constructor(
    @Inject(AppConfig.KEY) protected readonly appConfig: ConfigType<typeof AppConfig>,
    @Inject(JwtConfig.KEY) protected readonly jwtConfig: ConfigType<typeof JwtConfig>,
    protected readonly currentUserService: CurrentUserService,
    protected readonly sessionsService: SessionsService,
    protected readonly cookieService: CookieService,
    @InjectLoggerFactory() protected readonly loggerFactory: LoggerFactory,
  ) {
    this.logger = this.loggerFactory.create({
      scope: AuthGuard.name,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const logger = this.logger.child({
      action: this.canActivate.name,
      ...this.getRequestDetails(context),
    });

    // Check if user is already resolved
    const userInContext = this.getUserFromContext(context);
    if (userInContext) {
      return true;
    }

    const isSubscription = this.isSubscriptionRequest(context);

    // For subscriptions, use JWT token only
    if (isSubscription) {
      return this.authenticateWithJwt(context, logger, true);
    }

    // For other requests, try session first
    const sessionId = this.getSessionId(context);
    if (sessionId) {
      return this.authenticateWithSession(context, logger, sessionId);
    }

    // Fall back to JWT token
    const token = this.getJwtToken(context);
    if (token) {
      return this.authenticateWithJwt(context, logger, false);
    }

    // No authentication - return guest user
    this.setUserInContext(context, await this.currentUserService.resolveGuest());

    return true;
  }

  /**
   * Authenticate using session from cookie.
   * If session is invalid or expired, clears cookies and returns guest user.
   */
  protected async authenticateWithSession(
    context: ExecutionContext,
    logger: Logger,
    sessionId: string,
  ): Promise<boolean> {
    try {
      // Validate session from database
      const session = await this.sessionsService.validateSession(sessionId);

      // Extend session (sliding window) - fire and forget
      // Pass session object directly to avoid redundant DB SELECT
      this.sessionsService.extendSession(session).catch((err: unknown) => {
        logger.warn('Failed to extend session', { error: err });
      });

      const user = await this.currentUserService.resolve(session.userId);

      logger.setContext({
        userId: session.userId,
        sessionId,
        authMethod: 'session',
      });

      this.setUserInContext(context, user);
      this.setSessionIdInContext(context, sessionId);

      return true;
    } catch (error) {
      // Session is invalid or expired - clear cookies and throw error
      if (error instanceof UnauthorizedError) {
        logger.info('Session invalid, clearing cookies', {
          errorKey: error.key,
          sessionId,
        });

        // Clear session cookies if response is available
        const response = this.getResponse(context);
        if (response) {
          this.cookieService.clearSessionCookies(response);
        }

        // Re-throw the error after clearing cookies
        throw error;
      }

      // Re-throw unexpected errors
      throw error;
    }
  }

  /**
   * Authenticate using JWT token (subscription or service token)
   */
  protected async authenticateWithJwt(
    context: ExecutionContext,
    logger: Logger,
    isSubscription: boolean,
  ): Promise<boolean> {
    const token = this.getJwtToken(context);

    if (!token) {
      // No token for subscription is an error
      if (isSubscription) {
        throw new UnauthorizedError({
          message: 'Subscription token is required for GraphQL subscriptions',
          key: 'SUBSCRIPTION_TOKEN_REQUIRED',
          context: logger.getContext(),
        });
      }

      // No token for other requests - return guest
      this.setUserInContext(context, await this.currentUserService.resolveGuest());

      return true;
    }

    let jwtToken: JwtSubscriptionToken | JwtServiceToken | JwtTelegramWebappToken;

    try {
      const secret: jwt.Secret = this.jwtConfig.secret;
      const decoded = jwt.verify(token, secret) as BaseJwtTokenPayload;

      // Validate token type
      if (
        !isJwtSubscriptionToken(decoded)
        && !isJwtServiceToken(decoded)
        && !isJwtTelegramWebappToken(decoded)
      ) {
        throw new Error(`Invalid JWT token type "${decoded.sub}". Expected subscription, service or telegram-webapp token.`);
      }

      // Subscription tokens can only be used for subscriptions
      if (isJwtSubscriptionToken(decoded) && !isSubscription) {
        throw new Error('Subscription token can only be used for GraphQL subscriptions');
      }

      // Telegram WebApp tokens cannot be used for subscriptions (stateless, no WS handshake support today)
      if (isJwtTelegramWebappToken(decoded) && isSubscription) {
        throw new Error('Telegram WebApp token cannot be used for GraphQL subscriptions');
      }

      jwtToken = decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError({
          message: 'Token expired',
          key: 'TOKEN_EXPIRED',
          context: logger.getContext(),
          silent: true,
          cause: error,
        });
      }

      const message = error instanceof Error
        ? `Invalid token: ${error.message}`
        : 'Invalid token';

      throw new UnauthorizedError({
        message,
        key: 'TOKEN_INVALID',
        context: logger.getContext(),
        cause: error,
      });
    }

    const { uid, aud, sub, iss } = jwtToken;

    logger.setContext({
      uid,
      aud,
      sub,
      iss,
      authMethod: 'jwt',
    });

    // Validate audience
    if (Array.isArray(aud) && !aud.includes(this.appConfig.shortname)) {
      throw new UnauthorizedError({
        message: `Access denied. JWT audience "${aud.join(', ')}" doesn't include "${this.appConfig.shortname}"`,
        key: 'ACCESS_DENIED',
        context: logger.getContext(),
      });
    }

    const user = await this.currentUserService.resolveWithLoader(uid);

    this.setUserInContext(context, user);

    return true;
  }

  /**
   * Check if this is a GraphQL subscription request
   */
  protected isSubscriptionRequest(context: ExecutionContext): boolean {
    const gqlContext = GqlExecutionContext.create(context);
    const type = gqlContext.getType();

    if (type !== 'graphql') {
      return false;
    }

    const info = gqlContext.getInfo<{ parentType?: { name: string } }>();

    return info.parentType?.name === 'Subscription';
  }

  /**
   * Extracts request from execution context
   */
  getRequest(context: ExecutionContext): Request & { user?: User; sessionId?: string } {
    return context.switchToHttp().getRequest();
  }

  /**
   * Extracts response from execution context
   */
  getResponse(context: ExecutionContext): Response | null {
    try {
      return context.switchToHttp().getResponse();
    } catch {
      return null;
    }
  }

  /**
   * Extracts request details for logging
   */
  getRequestDetails(context: ExecutionContext): Record<string, unknown> {
    const request = this.getRequest(context);

    return {
      path: request.path,
      method: request.method,
    };
  }

  /**
   * Extracts session ID from request cookie
   */
  getSessionId(context: ExecutionContext): Maybe<string> {
    const request = this.getRequest(context);

    return extractSessionIdFromCookie(request);
  }

  /**
   * Extracts JWT token from request
   */
  getJwtToken(context: ExecutionContext): Maybe<string> {
    const request = this.getRequest(context);

    return extractJwtFromBearerToken(request);
  }

  /**
   * Inject current user to request object
   */
  setUserInContext(context: ExecutionContext, user: User): void {
    const request = this.getRequest(context);
    request.user = user;
  }

  /**
   * Inject session ID to request object
   */
  setSessionIdInContext(context: ExecutionContext, sessionId: string): void {
    const request = this.getRequest(context);
    request.sessionId = sessionId;
  }

  /**
   * Extracts current user from request object
   */
  getUserFromContext(context: ExecutionContext): User | null {
    const request = this.getRequest(context);

    return request.user ?? null;
  }
}

/**
 * GraphQL variant of AuthGuard
 * Handles GraphQL context differently and supports WebSocket connection params
 */
@Injectable()
export class GraphQLAuthGuard extends AuthGuard {
  /**
   * Get request from GraphQL execution context
   */
  getRequest(context: ExecutionContext): Request & { user?: User; sessionId?: string } {
    const ctx = GqlExecutionContext.create(context);

    return ctx.getContext<{
      path: string;
      method: string;
      req: Request & { user?: User; sessionId?: string };
    }>().req;
  }

  /**
   * Extracts request details for logging
   */
  getRequestDetails(context: ExecutionContext): Record<string, unknown> {
    const ctx = GqlExecutionContext.create(context);
    const { fieldName, path } = ctx.getInfo<{ fieldName: string; path: string }>();

    return {
      fieldName,
      path,
    };
  }

  /**
   * Get response from GraphQL execution context
   */
  getResponse(context: ExecutionContext): Response | null {
    const ctx = GqlExecutionContext.create(context);
    const graphQlContext = ctx.getContext<{ res?: Response }>();

    return graphQlContext.res ?? null;
  }

  /**
   * Extracts JWT token from GraphQL context (supports WebSocket connection params)
   */
  getJwtToken(context: ExecutionContext): Maybe<string> {
    const ctx = GqlExecutionContext.create(context);

    const { connectionParams } = ctx.getContext<{
      connectionParams?: GraphQLWsConnectionParams;
    }>();

    // For WebSocket connections, get token from connection params
    if (connectionParams) {
      const token
        = connectionParams.token
          ?? connectionParams.accessToken
          ?? connectionParams.authorization
          ?? connectionParams.Authorization;

      if (typeof token === 'string' && token.startsWith('Bearer')) {
        return extractJwtFromBearerString(token);
      }

      return token;
    }

    // For HTTP requests, get token from request headers
    const request = this.getRequest(context);

    return extractJwtFromBearerToken(request);
  }

  /**
   * Inject current user to GraphQL context
   */
  setUserInContext(context: ExecutionContext, user: User): void {
    const ctx = GqlExecutionContext.create(context);
    const graphQlContext = ctx.getContext<{ user?: User }>();
    graphQlContext.user = user;
  }

  /**
   * Inject session ID to GraphQL context
   */
  setSessionIdInContext(context: ExecutionContext, sessionId: string): void {
    const ctx = GqlExecutionContext.create(context);
    const graphQlContext = ctx.getContext<{ sessionId?: string }>();
    graphQlContext.sessionId = sessionId;
  }

  /**
   * Extracts current user from GraphQL context
   */
  getUserFromContext(context: ExecutionContext): User | null {
    const ctx = GqlExecutionContext.create(context);
    const graphQlContext = ctx.getContext<{ user?: User }>();

    return graphQlContext.user ?? null;
  }
}
