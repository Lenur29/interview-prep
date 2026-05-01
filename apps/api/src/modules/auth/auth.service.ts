import { createHash } from 'node:crypto';

import { MailerService } from '@/modules/mailer/mailer.service.js';
import { Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { compare } from 'bcrypt';
import type { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { AppConfig } from '@/config/app.config.js';
import { type ConfigType } from '@nestjs/config';
import { IdService } from '@/modules/id/id.service.js';
import { PostgresPubSub } from '../postgres-pubsub/postgres-pubsub.js';
import { UserStatus } from '../users/types/common.js';
import { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { CookieService } from './cookie/cookie.service.js';
import { JwtService } from './jwt/jwt.service.js';
import { PasswordAuthService } from './password/password-auth.service.js';
import { PasswordRecoveryRequest } from './password/password-recovery-request.entity.js';
import { SessionsService } from './sessions/sessions.service.js';
import {
  type LoginOptions,
  type LoginResult,
  type RegisterOptions,
  type RegisterResult,
} from './types/service/index.js';
import { AuthSubscriptions } from './types/subscriptions.js';
import { type ServiceMethodContext } from '@/context/service-method-context.js';
import { UnauthorizedError } from '@/errors/unauthorized.error.js';
import { InjectLoggerFactory } from '../logger/logger.providers.js';
import { type Logger } from '../logger/classes/logger.js';
import { type LoggerFactory } from '../logger/classes/logger-factory.js';
import { ForbiddenError } from '@/errors/forbidden.error.js';
import { extractSessionIdFromCookie } from '@/tools/jwt-extractors.js';

export class AuthService {
  protected logger!: Logger;

  constructor(
    @InjectLoggerFactory() protected readonly loggerFactory: LoggerFactory,
    @Inject(IdService) protected readonly idService: IdService,
    @Inject(MailerService) protected readonly mailerService: MailerService,
    @Inject(AppConfig.KEY) protected readonly appConfig: ConfigType<typeof AppConfig>,
    @InjectDataSource() protected readonly dataSource: DataSource,
    protected readonly usersService: UsersService,
    protected readonly jwtService: JwtService,
    protected readonly passwordAuthService: PasswordAuthService,
    protected readonly cookieService: CookieService,
    protected readonly sessionsService: SessionsService,
    protected readonly pubSub: PostgresPubSub,
    // protected readonly notificationsService: NotificationsService,
  ) {
    this.logger = this.loggerFactory.create({
      scope: AuthService.name,
    });
  }

  protected get userRepository() {
    return this.dataSource.getRepository(User);
  }

  get passwordRecoveryRequestRepository() {
    return this.dataSource.getRepository(PasswordRecoveryRequest);
  }

  /**
   * Create session and set cookies after successful login/registration
   */
  protected async createSessionAndSetCookies(
    userId: string,
    req: Request,
    res: Response,
    ctx: ServiceMethodContext,
  ): Promise<void> {
    // Create session in database
    const session = await this.sessionsService.createSession({
      userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    }, ctx);

    // Generate subscription token for WebSocket
    const subscriptionToken = this.jwtService.generateSubscriptionToken(userId);

    // Set session cookies
    this.cookieService.setSessionCookies(res, session.id, subscriptionToken);
  }

  /**
   * Session-based logout.
   * Deletes only the current session and notifies all tabs with the same session.
   */
  async logoutWithSession(
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ctx: ServiceMethodContext,
  ): Promise<boolean> {
    const sessionId = extractSessionIdFromCookie(req);

    if (sessionId) {
      const session = await this.sessionsService.getSession(sessionId);

      if (session) {
        // Delete only current session (not all devices)
        await this.sessionsService.deleteSession(sessionId);

        // Publish logout event with sessionHash for cross-tab sync
        const sessionHash = createHash('sha256').update(sessionId).digest('hex');
        await this.pubSub.publish(AuthSubscriptions.SESSION_LOGGED_OUT, {
          sessionLoggedOut: {
            sessionHash,
            logoutAt: new Date(),
          },
        });
      }
    }

    // Clear session cookies (including current scope)
    this.cookieService.clearSessionCookies(res);

    return true;
  }

  /**
   * Logout from all other devices.
   * Deletes all sessions except the current one.
   */
  async logoutFromAllDevices(
    req: Request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ctx: ServiceMethodContext,
  ): Promise<boolean> {
    const sessionId = extractSessionIdFromCookie(req);

    if (sessionId) {
      const session = await this.sessionsService.getSession(sessionId);

      if (session) {
        // Delete all sessions except current
        await this.sessionsService.deleteUserSessionsExcept(session.userId, sessionId);
      }
    }

    return true;
  }

  /**
   * Register a new user
   * @param opts - register options
   * @param ctx - service method context
   * @param res - Express response for setting cookies
   * @param req - Express request
   * @returns - new user (session cookies are set)
   */
  async register(
    opts: RegisterOptions,
    ctx: ServiceMethodContext,
    res: Response,
    req: Request,
  ): Promise<RegisterResult> {
    const logger = this.logger.forMethod(this.register.name, ctx, {
      email: opts.email,
    });

    logger.info(`Start user registration with email ${opts.email}`);

    // Check if user already exists with WAITING_FOR_SIGNUP status
    const existingUser = await this.usersService.getOneByEmail(opts.email);

    let user: User;

    if (existingUser && existingUser.status === UserStatus.WAITING_FOR_SIGNUP) {
      logger.info(`Found existing user ${existingUser.id} with WAITING_FOR_SIGNUP status, updating...`);

      // Validate invite token for pre-invited users
      if (!opts.inviteToken) {
        throw new ForbiddenError({
          message: 'Invite token is required for pre-invited users',
          key: 'AUTH_INVITE_TOKEN_REQUIRED',
          context: logger.getContext(),
        });
      }

      if (existingUser.inviteToken !== opts.inviteToken) {
        throw new ForbiddenError({
          message: 'Invalid invite token',
          key: 'AUTH_INVALID_INVITE_TOKEN',
          context: logger.getContext(),
        });
      }

      user = await this.usersService.update({
        id: existingUser.id,
        ...opts,
        status: UserStatus.ACTIVE,
        inviteToken: null, // Clear the invite token after successful signup
      }, ctx);
    } else {
      user = await this.usersService.create({
        ...opts,
        status: UserStatus.ACTIVE,
      }, ctx);
    }

    // Create session and set cookies
    await this.createSessionAndSetCookies(user.id, req, res, ctx);

    logger.info(`User ${user.id} (${user.email}) successfully registered`);

    // Send welcome notification (fire-and-forget)
    // try {
    //   await this.notificationsService.create(
    //     WelcomeNotification,
    //     {
    //       userId: user.id,
    //       referenceId: user.id,
    //     },
    //     ctx,
    //   );
    // } catch (error) {
    //   if (error instanceof Error) {
    //     logger.error('Failed to create welcome notification', error);
    //   }
    // }

    return {
      user: await this.usersService.getOneOrFail(user.id, ctx),
    };
  }

  /**
   * Login user with email and password
   * @param opts - login options
   * @param ctx - service method context
   * @param res - Express response for setting cookies
   * @param req - Express request
   * @returns user (session cookies are set, unless 2FA is required)
   */
  async login(opts: LoginOptions, ctx: ServiceMethodContext, res: Response, req: Request): Promise<LoginResult<User>> {
    const logger = this.logger.forMethod(this.login.name, ctx, {
      email: opts.email,
    });

    const user = await this.usersService.getOneByEmail(opts.email);

    if (!user) {
      throw new UnauthorizedError({
        message: `User with email ${opts.email} not found`,
        key: 'AUTH_EMAIL_NOT_FOUND',
        context: logger.getContext(),
      });
    }

    logger.setContext({
      userId: user.id,
    });

    if (user.status === UserStatus.WAITING_FOR_APPROVAL) {
      throw new UnauthorizedError({
        message: `User with email ${opts.email} waiting for approval`,
        key: 'AUTH_USER_WAITING_FOR_APPROVAL',
        context: logger.getContext(),
      });
    }

    if (user.status === UserStatus.DISABLED) {
      throw new UnauthorizedError({
        message: `User with email ${opts.email} has been disabled`,
        key: 'AUTH_USER_DISABLED',
        context: logger.getContext(),
      });
    }

    if (user.status === UserStatus.DELETED) {
      throw new UnauthorizedError({
        message: `User with email ${opts.email} has been deleted`,
        key: 'AUTH_USER_DELETED',
        context: logger.getContext(),
      });
    }

    if (!user.passwordHash || !await compare(opts.password, user.passwordHash)) {
      throw new UnauthorizedError({
        message: `Invalid password`,
        key: 'AUTH_INVALID_PASSWORD',
        context: logger.getContext(),
      });
    }

    // If 2FA is enabled, don't set cookies yet - wait for OTP validation
    if (user.is2faEnabled) {
      return {
        user,
      };
    }

    // Create session and set cookies
    await this.createSessionAndSetCookies(user.id, req, res, ctx);

    return {
      user,
    };
  }
}
