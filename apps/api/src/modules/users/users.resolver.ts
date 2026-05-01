import { createHash } from 'node:crypto';

import * as s from '@pcg/auth/scopes';
import { Inject, UseGuards } from '@nestjs/common';
import {
  Args, Info, Mutation, ObjectType, Parent, Query, ResolveField, Resolver,
} from '@nestjs/graphql';
import type { GraphQLResolveInfo } from 'graphql';
import { type MaybeNull } from '@pcg/predicates';

import { ActionContextParam } from '@/context/action-context.decorator.js';
import { type ActionContext } from '@/context/action-context.js';
import { GraphQLAuthGuard } from '@/guards/auth.guard.js';
import { GraphQLPermissionsGuard } from '@/guards/permissions.guard.js';
import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { type Logger } from '@/modules/logger/classes/logger.js';
import { type LoggerFactory } from '@/modules/logger/classes/logger-factory.js';
import { OffsetPaginated } from '@/pagination/offset/offset-pagination.types.js';
import { createOffsetPaginationOptions, offsetPaginatedOutput } from '@/pagination/offset/offset-pagination.helpers.js';
import { AccessDeniedError } from '@/errors/access-denied.error.js';
import { BadRequestError } from '@/errors/bad-request.error.js';
import { UsePermission } from '@/permissions/use-permission.decorator.js';
import { Role } from '@/modules/roles/role.js';
import { RolesService } from '@/modules/roles/roles.service.js';
import { UserRolesService } from '@/modules/user-roles/user-roles.service.js';

import {
  ChangePasswordInput,
  ChangeUserEmailInput,
  CreateUserInput,
  DeleteUserInput,
  DeleteUserPayload,
  FetchUserInput,
  FetchUsersInput,
  SetMyPushNotificationsInput,
  UpdateUserInput,
  UserBasicInfo,
} from './types/resolver/index.js';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';

@ObjectType()
class PaginatedUsers extends OffsetPaginated(User) {}

@Resolver(() => User)
@UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
export class UsersResolver {
  private readonly logger!: Logger;

  constructor(
    @InjectLoggerFactory() private readonly loggerFactory: LoggerFactory,
    @Inject(UsersService) private readonly usersService: UsersService,
    private readonly userRolesService: UserRolesService,
    private readonly rolesService: RolesService,
  ) {
    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  /**
   * Get current user with given access token
   */
  @Query(() => User, {
    description: 'Get current user with given access token',
  })
  async me(
    @ActionContextParam() ctx: ActionContext,
  ): Promise<User> {
    return ctx.user;
  }

  /**
   * Fetch user by id or email
   */
  @Query(() => User)
  @UsePermission('lm:users:get')
  async user(
    @Args() input: FetchUserInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<User> {
    const user = await this.usersService.getOneByOrFail(input, ctx);

    ctx.validateAccess('lm:users:get', [s.user(user.id)]);

    return user;
  }

  /**
   * Get user basic info by id or email.
   * Returns null if user not found (unlike `user` query which throws an error).
   */
  @Query(() => UserBasicInfo, {
    nullable: true,
    description: 'Get user basic info by id or email. Returns null if not found.',
  })
  @UsePermission('lm:users:get')
  async userInfo(
    @Args() input: FetchUserInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<MaybeNull<UserBasicInfo>> {
    const { id, email } = input;

    let user: MaybeNull<User> = null;

    if (id) {
      user = await this.usersService.getOne(id);
    } else if (email) {
      user = await this.usersService.getOneByEmail(email);
    } else {
      throw new BadRequestError({
        message: 'User id or email must be set in query params',
        key: 'USERS_BAD_PARAMS',
      });
    }

    if (!user) {
      return null;
    }

    ctx.validateAccess('lm:users:get', [s.user(user.id)]);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  /**
   * Get user by id or email.
   * Returns null if user not found (unlike `user` query which throws an error).
   */
  @Query(() => User, {
    nullable: true,
    description: 'Get user by id or email. Returns null if not found.',
  })
  @UsePermission('lm:users:lookup')
  async userOrNull(
    @Args() input: FetchUserInput,
  ): Promise<MaybeNull<User>> {
    const { id, email } = input;

    let user: MaybeNull<User> = null;

    if (id) {
      user = await this.usersService.getOne(id);
    } else if (email) {
      user = await this.usersService.getOneByEmail(email);
    } else {
      throw new BadRequestError({
        message: 'User id or email must be set in query params',
        key: 'USERS_BAD_PARAMS',
      });
    }

    return user;
  }

  /**
   * Fetch users
   */
  @Query(() => PaginatedUsers)
  @UsePermission('lm:users:list')
  async users(
    @Args() input: FetchUsersInput,
    @ActionContextParam() ctx: ActionContext,
    @Info() info: GraphQLResolveInfo,
  ): Promise<PaginatedUsers> {
    const [users, meta] = await this.usersService.getMany({
      filter: input.filter ?? {},
      orderBy: input.orderBy,
      ...createOffsetPaginationOptions(input, info),
    });

    return offsetPaginatedOutput(users, meta);
  }

  /**
   * Create user
   */
  @Mutation(() => User)
  @UsePermission('lm:users:create')
  async createUser(
    @Args('input') input: CreateUserInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<User> {
    ctx.validateAccess('lm:users:create');

    return await this.usersService.create(input, ctx);
  }

  /**
   * Update user
   */
  @Mutation(() => User)
  @UsePermission('lm:users:update')
  async updateUser(
    @Args('input') input: UpdateUserInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<User> {
    ctx.validateAccess('lm:users:update', [s.user(input.id)]);

    return await this.usersService.update(input, ctx);
  }

  /**
   * Delete user
   */
  @Mutation(() => DeleteUserPayload)
  @UsePermission('lm:users:delete')
  async deleteUser(
    @ActionContextParam() ctx: ActionContext,
    @Args('input') input: DeleteUserInput,
  ): Promise<DeleteUserPayload> {
    ctx.validateAccess('lm:users:delete', [s.user(input.id)]);

    await this.usersService.delete(input.id, ctx);

    return {
      id: input.id,
    };
  }

  /**
   * Change user password with old password
   */
  @Mutation(() => Boolean, {
    description: 'Change user password with old password',
  })
  @UsePermission('lm:users:change-password')
  async changePassword(
    @Args('input') input: ChangePasswordInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<boolean> {
    const userId = input.userId ?? ctx.user.id;

    ctx.validateAccess('lm:users:change-password', [s.user(userId)]);

    return await this.usersService.changePassword(input, ctx);
  }

  /**
   * Change user email
   */
  @Mutation(() => User, {
    description: 'Change user email',
  })
  @UsePermission('lm:users:change-email')
  async changeUserEmail(
    @Args('input') input: ChangeUserEmailInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<User> {
    const userId = input.userId ?? ctx.user.id;

    ctx.validateAccess('lm:users:change-email', [s.user(userId)]);

    return await this.usersService.changeEmail(userId, input.newEmail, ctx);
  }

  /**
   * Enable or disable push notifications for the current user. Pass an FCM
   * registration token to enable; pass null (or omit) to disable and forget
   * the previously saved token.
   */
  @Mutation(() => User, {
    description: 'Enable or disable push notifications for the current user',
  })
  @UsePermission('lm:users:set-push-notifications')
  async setMyPushNotifications(
    @Args('input') input: SetMyPushNotificationsInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<User> {
    ctx.validateAccess('lm:users:set-push-notifications', [s.user(ctx.user.id)]);

    return await this.usersService.setPushNotifications(
      ctx.user.id,
      input.token ?? null,
      ctx,
    );
  }

  @ResolveField(() => Boolean)
  isMe(
    @Parent() user: User,
    @ActionContextParam() ctx: ActionContext,
  ): boolean {
    return user.id === ctx.user.id;
  }

  /**
   * Roles assigned to a user. Only resolves for the requester themselves —
   * admin lookups must use the dedicated `userRoles` query (which has its
   * own permission checks). Selecting this on someone else's User throws so
   * the misuse is loud rather than silently returning an empty list.
   */
  @ResolveField(() => [Role])
  async roles(
    @Parent() user: User,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<Role[]> {
    if (user.id !== ctx.user.id) {
      throw new AccessDeniedError({
        action: 'User.roles',
        message: 'User.roles is only available for the current user. Use the `userRoles` query for other users.',
        context: { requestedUserId: user.id, actorId: ctx.user.id },
      });
    }

    const [userRoles] = await this.userRolesService.getMany({
      filter: { userIds: [user.id] },
      limit: 100,
      offset: 0,
    });

    const allRoles = this.rolesService.getAll();

    return userRoles
      .map((ur) => allRoles.find((r) => r.id === ur.roleId))
      .filter((r): r is Role => Boolean(r));
  }

  /**
   * SHA256 hash of current session ID.
   * Only returns value for the current user when authenticated via session.
   */
  @ResolveField(() => String, {
    nullable: true,
    description: 'SHA256 hash of current session ID (only for current user)',
  })
  sessionHash(
    @Parent() user: User,
    @ActionContextParam() ctx: ActionContext,
  ): MaybeNull<string> {
    if (user.id !== ctx.user.id) {
      return null;
    }

    if (!ctx.sessionId) {
      return null;
    }

    return createHash('sha256').update(ctx.sessionId).digest('hex');
  }
}
