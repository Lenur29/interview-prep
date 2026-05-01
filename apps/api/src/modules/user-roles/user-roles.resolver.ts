import { UseGuards } from '@nestjs/common';
import { Args, Info, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { type GraphQLResolveInfo } from 'graphql';

import { ActionContextParam } from '@/context/action-context.decorator.js';
import { type ActionContext } from '@/context/action-context.js';
import { GraphQLPermissionsGuard } from '@/guards/permissions.guard.js';
import { createOffsetPaginationOptions, offsetPaginatedOutput } from '@/pagination/offset/offset-pagination.helpers.js';
import { MaybeNull } from '@pcg/predicates';

import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { Logger } from '@/modules/logger/classes/logger.js';
import { LoggerFactory } from '@/modules/logger/classes/logger-factory.js';
import { User } from '@/modules/users/user.entity.js';

import { UserRole } from './user-role.entity.js';
import { UserRolesService } from './user-roles.service.js';
import { CreateUserRoleInput } from './types/resolver/create-user-role.js';
import { DeleteUserRoleInput, DeleteUserRolePayload } from './types/resolver/delete-user-role.js';
import { UpdateUserRoleInput } from './types/resolver/update-user-role.js';
import { FetchUserRolesInput, PaginatedUserRoles } from './types/resolver/user-roles.js';
import { GraphQLAuthGuard } from '@/guards/auth.guard.js';
import { UsePermission } from '@/permissions/use-permission.decorator.js';

@Resolver(() => UserRole)
@UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
export class UserRolesResolver {
  private logger!: Logger;

  constructor(
    @InjectLoggerFactory() protected readonly loggerFactory: LoggerFactory,
    protected readonly userRolesService: UserRolesService,
  ) {
    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  @Query(() => UserRole)
  @UsePermission('lm:user-roles:get')
  async userRole(
    @Args('id') id: string,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<UserRole> {
    return await this.userRolesService.getOneOrFail(id, ctx);
  }

  @Query(() => PaginatedUserRoles)
  @UsePermission('lm:user-roles:list')
  async userRoles(
    @Args() input: FetchUserRolesInput,
    @ActionContextParam() ctx: ActionContext,
    @Info() info: GraphQLResolveInfo,
  ): Promise<PaginatedUserRoles> {
    const [userRoles, meta] = await this.userRolesService.getMany({
      filter: input.filter ?? {},
      orderBy: input.orderBy,
      ...createOffsetPaginationOptions(input, info),
    });

    return offsetPaginatedOutput(userRoles, meta);
  }

  @Mutation(() => UserRole)
  @UsePermission('lm:user-roles:create')
  async createUserRole(
    @Args('input') input: CreateUserRoleInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<UserRole> {
    return await this.userRolesService.create(input, ctx);
  }

  @Mutation(() => UserRole)
  @UsePermission('lm:user-roles:update')
  async updateUserRole(
    @Args('input') input: UpdateUserRoleInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<UserRole> {
    return await this.userRolesService.update(input, ctx);
  }

  @Mutation(() => DeleteUserRolePayload)
  @UsePermission('lm:user-roles:delete')
  async deleteUserRole(
    @ActionContextParam() ctx: ActionContext,
    @Args('input') input: DeleteUserRoleInput,
  ): Promise<DeleteUserRolePayload> {
    await this.userRolesService.delete(input.id, ctx);

    return {
      id: input.id,
    };
  }

  @ResolveField(() => User, { nullable: true })
  async user(@Parent() userRole: UserRole): Promise<MaybeNull<User>> {
    return await userRole.user;
  }
}
