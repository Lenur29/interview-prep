import { UseGuards } from '@nestjs/common';
import {
  Args, Mutation, Resolver,
} from '@nestjs/graphql';
import { PasswordAuthService } from './password-auth.service.js';
import {
  RecoverPasswordInput, SendPasswordRecoveryEmailInput, VerifyPasswordRecoveryInput,
} from './types/resolver/index.js';
import { ActionContextParam } from '@/context/action-context.decorator.js';
import type { ActionContext } from '@/context/action-context.js';
import { GraphQLAuthGuard } from '@/guards/auth.guard.js';
import { GraphQLPermissionsGuard } from '@/guards/permissions.guard.js';
import { UsePermission } from '@/permissions/use-permission.decorator.js';

@Resolver()
@UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
export class PasswordAuthResolver {
  constructor(
    protected readonly authNService: PasswordAuthService,
  ) {}

  @Mutation(() => Boolean, {
    description: 'Send password recovery email',
  })
  @UsePermission('lm:auth:create-password-recovery-request')
  async createPasswordRecoveryRequest(
    @Args('input') input: SendPasswordRecoveryEmailInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<boolean> {
    return await this.authNService.createPasswordRecoveryRequest(input.email, ctx);
  }

  @Mutation(() => Boolean, {
    description: 'Verify password recovery token from email',
  })
  @UsePermission('lm:auth:verify-password-recovery-token')
  async verifyPasswordRecoveryToken(
    @Args('input') input: VerifyPasswordRecoveryInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<boolean> {
    return await this.authNService.verifyPasswordRecoveryToken(input, ctx);
  }

  @Mutation(() => Boolean, {
    description: 'Recover password with new password and token',
  })
  @UsePermission('lm:auth:recover-password')
  async recoverPassword(
    @Args('input') input: RecoverPasswordInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<boolean> {
    await this.authNService.recoverPassword(input, ctx);

    return true;
  }
}
