import {
  Inject, UseGuards,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  Args, Field, Mutation, ObjectType, Resolver, Subscription,
} from '@nestjs/graphql';
import type { Request, Response } from 'express';

import { FrontendConfig } from '@/config/index.js';
import { ActionContextParam } from '@/context/action-context.decorator.js';
import type { ActionContext } from '@/context/action-context.js';
import { GqlRequest } from '@/context/gql-request.decorator.js';
import { GqlResponse } from '@/context/gql-response.decorator.js';
import { GraphQLAuthGuard } from '@/guards/auth.guard.js';
import { GraphQLPermissionsGuard } from '@/guards/permissions.guard.js';
import { PostgresPubSub } from '../postgres-pubsub/postgres-pubsub.js';
import { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import {
  type ILoginPayload,
  type IRegisterPayload,
  LoginInput,
  RegisterInput,
  SessionLoggedOutPayload,
  SessionLoggedOutSubscriptionInput,
  type SessionLoggedOutSubscriptionPayload,
  sessionLoggedOutSubscriptionFilter,
} from './types/resolver/index.js';
import { AuthSubscriptions } from './types/subscriptions.js';

@ObjectType()
class LoginPayload implements ILoginPayload<User> {
  @Field(() => User)
  user!: User;
}

@ObjectType()
class RegisterPayload implements IRegisterPayload<User> {
  @Field(() => User)
  user!: User;
}

@Resolver()
@UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly pubSub: PostgresPubSub,
  ) {}

  @Mutation(() => RegisterPayload, {
    description: 'Register a new user with email and password',
  })
  async register(
    @Args('input') input: RegisterInput,
    @ActionContextParam() ctx: ActionContext,
    @GqlRequest() req: Request,
    @GqlResponse() res: Response,
  ): Promise<RegisterPayload> {
    return await this.authService.register(input, ctx, res, req);
  }

  @Mutation(() => LoginPayload, {
    description: `The login mutation allows users to securely authenticate themselves
    within the application using their email and password.`,
  })
  async login(
    @Args('input') input: LoginInput,
    @ActionContextParam() ctx: ActionContext,
    @GqlRequest() req: Request,
    @GqlResponse() res: Response,
  ): Promise<LoginPayload> {
    return await this.authService.login(input, ctx, res, req);
  }

  @Mutation(() => Boolean, {
    description: 'Logout user from current session',
  })
  async logout(
    @ActionContextParam() ctx: ActionContext,
    @GqlRequest() req: Request,
    @GqlResponse() res: Response,
  ): Promise<boolean> {
    return await this.authService.logoutWithSession(req, res, ctx);
  }

  @Mutation(() => Boolean, {
    description: 'Logout user from all other devices (keeps current session)',
  })
  async logoutFromAllDevices(
    @ActionContextParam() ctx: ActionContext,
    @GqlRequest() req: Request,
  ): Promise<boolean> {
    return await this.authService.logoutFromAllDevices(req, ctx);
  }

  @Subscription(() => SessionLoggedOutPayload, {
    description: 'Notifies when current session is logged out (for cross-tab sync)',
    filter: sessionLoggedOutSubscriptionFilter,
  })
  sessionLoggedOut(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Args() input: SessionLoggedOutSubscriptionInput,
  ): AsyncIterator<SessionLoggedOutSubscriptionPayload> {
    return this.pubSub.asyncIterator([AuthSubscriptions.SESSION_LOGGED_OUT]);
  }
}

/**
 * Public authentication resolver - no authentication required
 */
@Resolver()
export class PublicAuthResolver {
  constructor(
    private readonly usersService: UsersService,
    @Inject(FrontendConfig.KEY) private readonly frontendConfig: ConfigType<typeof FrontendConfig>,
  ) {}
}
