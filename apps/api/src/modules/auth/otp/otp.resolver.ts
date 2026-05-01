import { UseGuards } from '@nestjs/common';
import {
  Args, Field, Mutation, ObjectType, Resolver,
} from '@nestjs/graphql';
import type { Request, Response } from 'express';

import { ActionContextParam } from '@/context/action-context.decorator.js';
import type { ActionContext } from '@/context/action-context.js';
import { GqlRequest } from '@/context/gql-request.decorator.js';
import { GqlResponse } from '@/context/gql-response.decorator.js';
import { GraphQLAuthGuard } from '@/guards/auth.guard.js';
import { GraphQLPermissionsGuard } from '@/guards/permissions.guard.js';
import { User } from '@/modules/users/user.entity.js';
import { OtpService } from './otp.service.js';
import {
  ConfigureOtpInput,
  DisableOtpInput, ValidateOtpInput, VerifyOtpInput,
} from './types/resolver/index.js';

@ObjectType()
class ConfigureOtpPayload {
  /**
   * The user to configure OTP for
   */
  @Field(() => User)
  user!: User;

  /**
   * The secret key to use for generating OTP codes.
   */
  @Field({
    description: 'The secret key to use for generating OTP codes.',
  })
  secret!: string;

  /**
   * The URL to use for configuring One-Time Password Authentificator in the user's OTP app.
   */
  @Field({
    description: 'The URL to use for configuring One-Time Password Authentificator in the user\'s OTP app.',
  })
  otpAuthUrl!: string;
}

@ObjectType()
class VerifyOtpPayload {
  @Field(() => User)
  user!: User;
}

@ObjectType()
class ValidateOtpPayload {
  @Field(() => User)
  user!: User;
}

@ObjectType()
class DisableOtpPayload {
  @Field(() => User)
  user!: User;
}

@Resolver()
@UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
export class OtpResolver {
  constructor(
    private readonly otpService: OtpService,
  ) {}

  @Mutation(() => ConfigureOtpPayload, {
    description: 'Configure One-Time Password for a user. Generates secret key and OTP auth URL.',
  })
  async configureOtp(
    @Args('input') input: ConfigureOtpInput,
    @ActionContextParam() ctx: ActionContext,
  ) {
    return await this.otpService.configureOtp(input, ctx);
  }

  @Mutation(() => VerifyOtpPayload, {
    description: 'Verify One-Time Password code first time. Enables OTP for the use if the code is valid',
  })
  async verifyOtp(
    @Args('input') input: VerifyOtpInput,
    @ActionContextParam() ctx: ActionContext,
  ) {
    return await this.otpService.verifyOtp(input, ctx);
  }

  @Mutation(() => ValidateOtpPayload, {
    description: 'Validate One-Time Password code. Sets auth cookies if the code is valid',
  })
  async validateOtp(
    @Args('input') input: ValidateOtpInput,
    @ActionContextParam() ctx: ActionContext,
    @GqlRequest() req: Request,
    @GqlResponse() res: Response,
  ): Promise<ValidateOtpPayload> {
    // Service sets auth cookies and returns only user
    return await this.otpService.validateOtp(input, ctx, req, res);
  }

  @Mutation(() => DisableOtpPayload, {
    description: 'Disable One-Time Password authentication for a user.',
  })
  async disableOtp(
    @Args('input') input: DisableOtpInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<DisableOtpPayload> {
    return await this.otpService.disableOtp(input, ctx);
  }
}
