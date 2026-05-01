import { UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  Info,
  Mutation,
  ObjectType, Query, Resolver,
} from '@nestjs/graphql';
import type { GraphQLResolveInfo } from 'graphql';

import { ActionContextParam } from '@/context/action-context.decorator.js';
import { type ActionContext } from '@/context/action-context.js';
import { GraphQLAuthGuard } from '@/guards/auth.guard.js';
import { GraphQLPermissionsGuard } from '@/guards/permissions.guard.js';
import {
  createOffsetPaginationOptions,
  offsetPaginatedOutput,
} from '@/pagination/offset/offset-pagination.helpers.js';
import { OffsetPaginated } from '@/pagination/offset/offset-pagination.types.js';

import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { Logger } from '@/modules/logger/classes/logger.js';
import { LoggerFactory } from '@/modules/logger/classes/logger-factory.js';

import { ServiceToken } from './service-token.entity.js';
import { ServiceTokensService } from './service-tokens.service.js';
import {
  CreateServiceTokenInput,
  DeleteServiceTokenInput,
  DeleteServiceTokenPayload,
  FetchServiceTokenInput,
  FetchServiceTokensInput,
  UpdateServiceTokenInput,
} from './types/resolver/index.js';
import { UsePermission } from '@/permissions/use-permission.decorator.js';

@ObjectType()
class PaginatedServiceTokens extends OffsetPaginated(ServiceToken) {}

@ObjectType()
class CreateServiceTokenPayload {
  @Field(() => ServiceToken)
  serviceToken!: ServiceToken;

  @Field(() => String)
  jwt!: string;
}

@ObjectType()
class RegenerateServiceTokenPayload {
  @Field(() => ServiceToken)
  serviceToken!: ServiceToken;

  @Field(() => String)
  jwt!: string;
}

@Resolver(() => ServiceToken)
@UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
export class ServiceTokensResolver {
  private logger!: Logger;

  constructor(
    @InjectLoggerFactory() protected readonly loggerFactory: LoggerFactory,
    protected readonly serviceTokensService: ServiceTokensService,
  ) {
    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  @Query(() => ServiceToken)
  @UsePermission('lm:service-tokens:get')
  async serviceToken(
    @Args() input: FetchServiceTokenInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<ServiceToken> {
    return await this.serviceTokensService.getOneOrFail(input.id, ctx);
  }

  @Query(() => PaginatedServiceTokens)
  @UsePermission('lm:service-tokens:list')
  async serviceTokens(
    @Args() input: FetchServiceTokensInput,
    @Info() info: GraphQLResolveInfo,
  ): Promise<PaginatedServiceTokens> {
    const [items, meta] = await this.serviceTokensService.getMany({
      filter: input.filter ?? {},
      orderBy: input.orderBy,
      ...createOffsetPaginationOptions(input, info),
    });

    return offsetPaginatedOutput(items, meta);
  }

  @Mutation(() => CreateServiceTokenPayload)
  @UsePermission('lm:service-tokens:create')
  async createServiceToken(
    @Args('input') input: CreateServiceTokenInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<CreateServiceTokenPayload> {
    return await this.serviceTokensService.create(input, ctx);
  }

  @Mutation(() => ServiceToken)
  @UsePermission('lm:service-tokens:update')
  async updateServiceToken(
    @Args('input') input: UpdateServiceTokenInput,
    @ActionContextParam() ctx: ActionContext,
  ) {
    return await this.serviceTokensService.update(input, ctx);
  }

  @Mutation(() => RegenerateServiceTokenPayload)
  @UsePermission('lm:service-tokens:regenerate')
  async regenerateServiceToken(
    @Args('id') id: string,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<RegenerateServiceTokenPayload> {
    return await this.serviceTokensService.regenerate(id, ctx);
  }

  @Mutation(() => DeleteServiceTokenPayload)
  @UsePermission('lm:service-tokens:delete')
  async deleteServiceToken(
    @Args('input') input: DeleteServiceTokenInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<DeleteServiceTokenPayload> {
    await this.serviceTokensService.delete(input.id, ctx);

    return {
      ...input,
    };
  }
}
