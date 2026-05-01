import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { ActionContextParam } from '@/context/action-context.decorator.js';
import { type ActionContext } from '@/context/action-context.js';
import { GraphQLAuthGuard } from '@/guards/auth.guard.js';
import { GraphQLPermissionsGuard } from '@/guards/permissions.guard.js';

import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { Logger } from '@/modules/logger/classes/logger.js';
import { LoggerFactory } from '@/modules/logger/classes/logger-factory.js';

import { User } from '../users/user.entity.js';
import { ServiceAccountsService } from './service-accounts.service.js';
import {
  CreateServiceAccountInput,
  DeleteServiceAccountInput,
  DeleteServiceAccountPayload,
  UpdateServiceAccountInput,
} from './types/resolver/index.js';
import { UsePermission } from '@/permissions/use-permission.decorator.js';

@Resolver(() => User)
@UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
export class ServiceAccountsResolver {
  private logger!: Logger;

  constructor(
    @InjectLoggerFactory() protected readonly loggerFactory: LoggerFactory,
    protected readonly serviceAccountsService: ServiceAccountsService,
  ) {
    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  @Query(() => Boolean)
  async isServiceAccountExists(
    @Args('alias') alias: string,
  ): Promise<boolean> {
    return await this.serviceAccountsService.isExistsWithAlias(alias);
  }

  @Mutation(() => User)
  @UsePermission('lm:service-accounts:create')
  async createServiceAccount(
    @Args('input') input: CreateServiceAccountInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<User> {
    return await this.serviceAccountsService.create(input, ctx);
  }

  @Mutation(() => User)
  @UsePermission('lm:service-accounts:update')
  async updateServiceAccount(
    @Args('input') input: UpdateServiceAccountInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<User> {
    return await this.serviceAccountsService.update(input, ctx);
  }

  @Mutation(() => DeleteServiceAccountPayload)
  @UsePermission('lm:service-accounts:delete')
  async deleteServiceAccount(
    @Args('input') input: DeleteServiceAccountInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<DeleteServiceAccountPayload> {
    await this.serviceAccountsService.delete(input.id, ctx);

    return {
      ...input,
    };
  }
}
