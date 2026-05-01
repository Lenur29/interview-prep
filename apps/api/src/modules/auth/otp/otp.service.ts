import { Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Request, Response } from 'express';
import { authenticator } from 'otplib';

import { AppConfig } from '@/config/index.js';
import { type ServiceMethodContext } from '@/context/service-method-context.js';
import { BadRequestError } from '@/errors/bad-request.error.js';
import { type User } from '@/modules/users/user.entity.js';
import { UsersService } from '@/modules/users/users.service.js';
import { CookieService } from '../cookie/cookie.service.js';
import { JwtService } from '../jwt/index.js';
import { SessionsService } from '../sessions/sessions.service.js';
import {
  type ConfigureOtpOptions,
  type ConfigureOtpResult,
  type DisableOtpOptions,
  type DisableOtpResult,
  type ValidateOtpOptions,
  type ValidateOtpResult,
  type VerifyOtpOptions,
  type VerifyOtpResult,
} from './types/service/index.js';

/**
 * OtpService (One-Time Password Service) is a service that provides the functionality to configure OTP,
 * generate secret tokens for the authenticator, and verify and disable OTP for users.
 *
 * It is commonly used for adding an additional layer of security to the authentication process.
 * With OtpService, users can enable OTP to receive a one-time code to verify their identity when they log in.
 * The service can generate a unique secret token for each user, which is then used by the authenticator app to generate one-time codes.
 * OtpService can verify the code entered by the user and grant access upon successful verification.
 *
 * Additionally, users can disable OTP for their account if they no longer wish to use it.
 */
export class OtpService {
  constructor(
    @Inject(AppConfig.KEY) protected readonly appConfig: ConfigType<typeof AppConfig>,
    protected readonly jwtService: JwtService,
    protected readonly usersService: UsersService,
    protected readonly cookieService: CookieService,
    protected readonly sessionsService: SessionsService,
  ) {}

  /* Configure One Time Password */
  async configureOtp(opts: ConfigureOtpOptions, ctx: ServiceMethodContext): Promise<ConfigureOtpResult> {
    const user = await this.usersService.getOneOrFail(opts.userId, ctx);

    if (!user.otpSecret) {
      const secret = authenticator.generateSecret();

      const updatedUser = await this.usersService.update({
        id: user.id,
        otpSecret: secret,
      }, ctx);

      return {
        secret,
        otpAuthUrl: this.generateAuthUrl(updatedUser),
        user: updatedUser,
      };
    }

    return {
      secret: user.otpSecret,
      otpAuthUrl: this.generateAuthUrl(user),
      user: user,
    };
  }

  /**
   * Generate One-Time Password auth URL for authenticator app
   * @param user - user to generate OTP auth URL for
   * @returns - OTP auth URL
   */
  generateAuthUrl(user: User) {
    if (!user.otpSecret) {
      throw new BadRequestError({
        message: 'User does not have OTP secret',
        key: 'AUTH_USER_DOES_NOT_HAVE_OTP_SECRET',
      });
    }

    return authenticator.keyuri(
      user.fullName,
      this.appConfig.name,
      user.otpSecret,
    );
  }

  /**
   * Check if token is valid at the first time and enable One-Time passwrd it for user
   * @param opts - verify OTP options
   * @param ctx - service method context
   * @returns - verify OTP result
   */
  async verifyOtp(opts: VerifyOtpOptions, ctx: ServiceMethodContext): Promise<VerifyOtpResult> {
    const user = await this.usersService.getOneOrFail(opts.userId, ctx);

    if (!user.otpSecret) {
      throw new BadRequestError({
        message: 'User does not have OTP secret',
        key: 'AUTH_USER_DOES_NOT_HAVE_OTP_SECRET',
      });
    }

    const isValid = authenticator.verify({
      token: opts.token,
      secret: user.otpSecret,
    });

    if (!isValid) {
      throw new BadRequestError({
        message: 'Invalid OTP',
        key: 'AUTH_INVALID_OTP',
      });
    }

    const updatedUser = await this.usersService.update({
      id: user.id,
      isOtpEnabled: true,
      is2faEnabled: true,
    }, ctx);

    return {
      user: updatedUser,
    };
  }

  /**
   * Check if token is valid, authenticate user and set auth cookies
   * @param opts - validate OTP options
   * @param ctx - service method context
   * @param req - Express request
   * @param res - Express response for setting cookies
   * @returns - validate OTP result (tokens are set via HTTP-only cookies)
   */
  async validateOtp(
    opts: ValidateOtpOptions,
    ctx: ServiceMethodContext,
    req: Request,
    res: Response,
  ): Promise<ValidateOtpResult> {
    const user = await this.usersService.getOneOrFail(opts.userId, ctx);

    if (!user.otpSecret) {
      throw new BadRequestError({
        message: 'User does not have OTP secret',
        key: 'AUTH_USER_DOES_NOT_HAVE_OTP_SECRET',
      });
    }

    const isValid = authenticator.verify({
      token: opts.token,
      secret: user.otpSecret,
    });

    if (!isValid) {
      throw new BadRequestError({
        message: 'Invalid OTP',
        key: 'AUTH_INVALID_OTP',
      });
    }

    // Create session and set cookies after successful 2FA
    const session = await this.sessionsService.createSession({
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    }, ctx);

    const subscriptionToken = this.jwtService.generateSubscriptionToken(user.id);
    this.cookieService.setSessionCookies(res, session.id, subscriptionToken);

    return {
      user,
    };
  }

  /**
   * Disable One-Time Password for user
   * @param opts - disable OTP options
   * @param ctx - service method context
   * @returns - disable OTP result
   */
  async disableOtp(opts: DisableOtpOptions, ctx: ServiceMethodContext): Promise<DisableOtpResult> {
    const user = await this.usersService.update({
      id: opts.userId,
      isOtpEnabled: false,
      is2faEnabled: false,
    }, ctx);

    return {
      user,
    };
  }
}
