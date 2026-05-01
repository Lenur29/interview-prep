import { Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  DataSource,
  type DeepPartial,
  type FindOptionsWhere,
  Not,
  type Repository,
  type SelectQueryBuilder,
} from 'typeorm';

import { type ConfigType } from '@nestjs/config';

import { JwtConfig } from '@/config/index.js';
import { IdPrefix } from '@/enums/id-prefix.enum.js';
import { type ServiceMethodContext } from '@/context/service-method-context.js';
import { BadRequestError } from '@/errors/bad-request.error.js';
import { ForbiddenError } from '@/errors/forbidden.error.js';
import { NestError } from '@/errors/nest-error.js';
import { NotFoundError } from '@/errors/not-found.error.js';
import { UnauthorizedError } from '@/errors/unauthorized.error.js';
import { IdService } from '@/modules/id/id.service.js';
import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { type Logger } from '@/modules/logger/classes/logger.js';
import { type LoggerFactory } from '@/modules/logger/classes/logger-factory.js';
import { createListMeta } from '@/pagination/tools.js';
import { type ListMeta } from '@/pagination/types.js';
import { extractSortParams } from '@/sorting/sorting.tools.js';
import { defineStatuses } from '@/tools/define-statuses.js';
import { stringifyOpts } from '@/tools/stringify-opts.js';
import { type JwtAccessToken } from '@/types/jwt.js';
import { type MaybeNull } from '@pcg/predicates';
import { createRandomString } from '@pcg/text-kit';
import { HooksService } from '@/modules/hooks/hooks.service.js';
import { UserUpdatedHook } from './hooks/index.js';
import {
  defaultUserStatuses, UserStatus, UserType,
} from './types/common.js';
import {
  type UsersFilter, UsersOrderBy, type UsersOrderFields,
} from './types/resolver/index.js';
import {
  type ChangePasswordOptions, type FetchUsersOptions, type UpdateUserOptions,
} from './types/service/index.js';
import { type CreateUserOptions } from './types/service/create-user.js';
import { type GetUserByOptions } from './types/service/get-user-by.js';
import { type IsUniqueEmailOptions } from './types/service/is-email-unique.js';
import { User } from './user.entity.js';

export class UsersService {
  protected logger!: Logger;

  constructor(
    @Inject(JwtConfig.KEY) protected readonly jwtConfig: ConfigType<typeof JwtConfig>,
    @InjectLoggerFactory() protected readonly loggerFactory: LoggerFactory,
    private readonly idService: IdService,
    @InjectDataSource() protected readonly dataSource: DataSource,
    private readonly hooksService: HooksService,
  ) {
    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  public get repository(): Repository<User> {
    return this.dataSource.getRepository(User);
  }

  /**
   * Get user with given options
   */
  async getOneBy(opts: GetUserByOptions): Promise<MaybeNull<User>> {
    const logger = this.logger.child({
      action: this.getOneBy.name,
      ...opts,
    });

    if (Object.keys(opts).length === 0) {
      throw new BadRequestError({
        message: 'Empty options',
        key: 'GET_ONE_BY_EMPTY_OPTIONS',
        context: logger.getContext(),
      });
    }

    const query = this.repository
      .createQueryBuilder('u')
      .where('u.status != :deletedStatus', {
        deletedStatus: UserStatus.DELETED,
      });

    if (opts.id) {
      query.andWhere('u.id = :id', {
        id: opts.id,
      });
    }

    if (opts.type) {
      query.andWhere('u.type = :type', {
        type: opts.type,
      });
    }

    if (opts.email) {
      query.andWhere('LOWER(u.email) = LOWER(:email)', {
        email: opts.email,
      });
    }

    if (opts.alias) {
      query.andWhere('u.email like :email', {
        email: `${opts.alias.toLowerCase()}@%`,
      });
    }

    if (opts.status) {
      query.andWhere('u.status = :status', {
        status: opts.status,
      });
    }

    return await query.getOne();
  }

  /**
   * Get user with given id
   */
  async getOne(id: string): Promise<MaybeNull<User>> {
    return await this.getOneBy({
      id,
    });
  }

  async getByPhoneNumber(phoneNumber: string): Promise<MaybeNull<User>> {
    const normalized = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    return await this.repository.findOne({
      where: {
        status: UserStatus.ACTIVE,
        phoneNumber: normalized,
      },
    });
  }

  /**
   * Get user with given email
   */
  async getOneByEmail(email: string): Promise<MaybeNull<User>> {
    return await this.getOneBy({
      email,
    });
  }

  /**
   * Get user with given id
   * @throws NotFoundError if user not found
   */
  async getOneOrFail(id: string, ctx: ServiceMethodContext): Promise<User> {
    const logger = this.logger.forMethod('getOneOrFail', ctx, {
      id,
    });

    const user = await this.getOne(id);

    if (!user) {
      throw new NotFoundError({
        message: `User with id ${id} not found`,
        key: 'USERS_NOT_FOUND',
        context: logger.getContext(),
      });
    }

    return user;
  }

  /**
   * Get user with given options or throw an error
   */
  async getOneByOrFail(
    opts: GetUserByOptions,
    ctx: ServiceMethodContext,
  ): Promise<User> {
    const logger = this.logger.forMethod(this.getOneOrFail.name, ctx, {
      ...opts,
    });

    if (Object.keys(opts).length === 0) {
      throw new BadRequestError({
        message: 'Empty options',
        key: 'USERS_EMPTY_OPTIONS',
        context: logger.getContext(),
      });
    }

    const user = await this.getOneBy(opts);

    if (!user) {
      throw new NotFoundError({
        message: `User with ${stringifyOpts(opts)} not found`,
        key: 'USERS_NOT_FOUND',
        context: logger.getContext(),
      });
    }

    return user;
  }

  /**
   * Get user with given email
   * @throws NotFoundError if user not found
   */
  async getOneByEmailOrFail(email: string, ctx: ServiceMethodContext): Promise<User> {
    return await this.getOneByOrFail({
      email,
    }, ctx);
  }

  /**
   * Get users list with given options
   */
  async getMany(
    {
      filter,
      orderBy = UsersOrderBy.createdAt_DESC,
      needCountTotal,
      limit,
      offset,
    }: FetchUsersOptions,
  ): Promise<[User[], ListMeta]> {
    const query = this.repository.createQueryBuilder('u');
    this.applyFilterToQuery(query, filter);
    this.applyOrderByToQuery(query, orderBy);

    query.limit(limit);
    query.offset(offset);

    return await Promise.all([
      query.getMany(),
      createListMeta<User>({
        query,
        needCountTotal,
        limit,
        offset,
      }),
    ]);
  }

  /**
   * Apply UsersFilter to typeorm query builder
   */
  protected applyFilterToQuery(
    query: SelectQueryBuilder<User>,
    filter: UsersFilter,
  ) {
    const statuses = defineStatuses(filter.statuses, defaultUserStatuses);
    const alias = query.alias;

    query
      .where(`${alias}.status IN(:...statuses)`, {
        statuses,
      })
      .andWhere(`${alias}.type = '${filter.type ?? UserType.USER}'`);

    if (filter.ids?.length) {
      query.andWhere(`${alias}.id IN(:...ids)`, {
        ids: filter.ids,
      });
    }

    if (filter.exceptIds?.length) {
      query.andWhere(`${alias}.id NOT IN(:...exceptIds)`, {
        exceptIds: filter.exceptIds,
      });
    }

    if (filter.search) {
      query.andWhere(`(
          ${alias}.full_name ILIKE :text
          OR ${alias}.email ILIKE :text
        )`, {
        text: `%${filter.search}%`,
      });
    }
  }

  /**
   * Apply UsersOrderBy to typeorm query builder
   */
  protected applyOrderByToQuery(query: SelectQueryBuilder<User>, orderBy: UsersOrderBy) {
    const sort = extractSortParams<UsersOrderFields>(orderBy);
    const alias = query.alias;
    query.addOrderBy(`${alias}."id"`, sort.direction);
  }

  /**
   * Check if user with given email is unique
   */
  async isUniqueEmail({ email, exceptId }: IsUniqueEmailOptions) {
    const where: FindOptionsWhere<User> = {
      email,
    };

    if (exceptId) {
      where.id = Not(exceptId);
    }

    return (await this.repository.countBy(where)) === 0;
  }

  /**
   * Check if user with given jwt access token exists
   */
  async isExistsByToken(accessToken: string, ctx: ServiceMethodContext): Promise<boolean> {
    const logger = this.logger.forMethod('isExists', ctx, {
      accessToken,
    });

    let jwtAccessToken: JwtAccessToken;
    try {
      jwtAccessToken = jwt.verify(accessToken, this.jwtConfig.secret) as JwtAccessToken;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError({
          message: 'Access token expired',
          key: 'ACCESS_TOKEN_EXPIRED',
          context: logger.getContext(),
          silent: true,
          cause: error,
        });
      }

      throw new UnauthorizedError({
        message: 'Invalid access token',
        key: 'INVALID_ACCESS_TOKEN',
        context: logger.getContext(),
        cause: error,
      });
    }

    const user = await this.getOne(jwtAccessToken.uid);

    return Boolean(user && !user.isDeleted);
  }

  /**
   * Check if user with given id exists
   */
  async isExistsById(id: string): Promise<boolean> {
    return Boolean(await this.getOne(id));
  }

  /**
   * Generate id for new User entity
   */
  protected generateEntityId(): string {
    return this.idService.generateEntityId(IdPrefix.USER);
  }

  /**
   * Create new user
   * @throws {NestError} if user with given email is already registered
   * @throws {NestError} if failed to create user
   */
  async create({
    id,
    password,
    ...opts
  }: CreateUserOptions, ctx: ServiceMethodContext): Promise<User> {
    const email = opts.email.toLowerCase();

    const logger = this.logger.forMethod('create', ctx, {
      email,
    });

    let user = await this.repository.findOneBy({
      email,
    });

    if (user && !user.isDeleted) {
      throw new NestError({
        message: `User with email ${email} is already registered`,
        key: 'USERS_EMAIL_NOT_UNIQUE',
        context: logger.getContext(),
      });
    }

    const userId = user?.id ?? id ?? this.generateEntityId();

    user = this.repository.create({
      id: userId,
      status: UserStatus.ACTIVE,
      ...opts,
      email,
    } as DeepPartial<User>);

    if (password) {
      user.passwordHash = await hash(password, 10);
    }

    // Generate invite token for users waiting for signup
    if (opts.status === UserStatus.WAITING_FOR_SIGNUP) {
      logger.info('Generating invite token for user waiting for signup');
      user.inviteToken = createRandomString(32);
    }

    try {
      await this.repository.save(user);
    } catch (error) {
      throw new NestError({
        message: 'Failed to create user',
        key: 'USERS_CREATE_FAILED',
        context: logger.getContext(),
        cause: error,
      });
    }

    return user;
  }

  /**
   * Update user
   */
  async update({
    id,
    password,
    ...opts
  }: UpdateUserOptions, ctx: ServiceMethodContext): Promise<User> {
    const logger = this.logger.forMethod('update', ctx, {
      id,
    });

    const user = await this.getOne(id);

    if (!user) {
      throw new NotFoundError({
        message: `User with id ${id} not found`,
        key: 'USERS_NOT_FOUND',
        context: logger.getContext(),
      });
    }

    const changedFields = [...Object.keys(opts)];

    this.repository.merge(user, opts as DeepPartial<User>);

    if (password) {
      user.passwordHash = await hash(password, 10);
      changedFields.push('password');
    }

    try {
      await this.repository.save(user);
    } catch (error) {
      throw new NestError({
        message: 'Failed to update user',
        key: 'USERS_UPDATE_FAILED',
        cause: error,
        context: logger.getContext(),
      });
    }

    await this.hooksService.runHook(
      new UserUpdatedHook(
        {
          id: user.id,
          user,
          changedFields,
        },
        ctx,
      ),
    );

    return await this.getOneOrFail(id, ctx);
  }

  /**
   * Change user password if old password is correct
   */
  async changePassword(opts: ChangePasswordOptions, ctx: ServiceMethodContext): Promise<boolean> {
    const logger = this.logger.forMethod('changePassword', ctx, {
      userId: opts.userId ?? ctx.user.id,
    });

    const { password, oldPassword } = opts;
    const userId = opts.userId ?? ctx.user.id;

    if (!password || !oldPassword) {
      throw new ForbiddenError({
        message: 'The both "oldPassword" and "password" arguments are required for password updating.',
        key: 'USERS_PASSWORDS_PARAMS_REQUIRED',
        context: logger.getContext(),
      });
    }

    if (password === oldPassword) {
      throw new ForbiddenError({
        message: 'The new password cannot be the same as the old password',
        key: 'USERS_PASSWORD_NOT_UNIQUE',
        context: logger.getContext(),
      });
    }

    const user = await this.getOne(userId);

    if (!user) {
      throw new NotFoundError({
        message: `User with id ${userId} not found`,
        key: 'USERS_NOT_FOUND',
        context: logger.getContext(),
      });
    }

    if (!user.passwordHash || !(await compare(oldPassword, user.passwordHash))) {
      throw new ForbiddenError({
        message: 'Old password is not correct',
        key: 'USERS_INCORRECT_OLD_PASSWORD',
        context: logger.getContext(),
      });
    }

    user.passwordHash = await hash(password, 10);
    await this.repository.save(user);

    return true;
  }

  /**
   * Delete user by id
   */
  async delete(id: string, ctx: ServiceMethodContext): Promise<void> {
    const logger = this.logger.forMethod('delete', ctx, {
      id,
    });

    const user = await this.getOne(id);

    if (!user || user.isDeleted) {
      return;
    }

    try {
      if (user.status === UserStatus.WAITING_FOR_SIGNUP) {
        await this.repository.remove(user);
      } else {
        user.status = UserStatus.DELETED;
        const [localPart, domain] = user.email.split('@');
        user.email = `${localPart}+deleted@${domain}`;
        await this.repository.save(user);
      }
    } catch {
      throw new NestError({
        message: `Can't delete user with id ${id}`,
        key: 'USERS_DELETE_FAILED',
        context: logger.getContext(),
      });
    }
  }

  /**
   * Save or clear the FCM registration token for a user. Setting a non-null
   * token enables push notifications; passing null disables them and forgets
   * the previously saved token.
   */
  async setPushNotifications(
    userId: string,
    token: MaybeNull<string>,
    ctx: ServiceMethodContext,
  ): Promise<User> {
    const logger = this.logger.forMethod('setPushNotifications', ctx, {
      userId,
      enabled: Boolean(token),
    });

    const user = await this.getOne(userId);

    if (!user) {
      throw new NotFoundError({
        message: `User with id ${userId} not found`,
        key: 'USERS_NOT_FOUND',
        context: logger.getContext(),
      });
    }

    const nextEnabled = Boolean(token);
    const changedFields: string[] = [];

    if (user.fcmToken !== token) {
      changedFields.push('fcmToken');
    }
    if (user.pushNotificationsEnabled !== nextEnabled) {
      changedFields.push('pushNotificationsEnabled');
    }

    if (changedFields.length === 0) {
      return user;
    }

    user.fcmToken = token;
    user.pushNotificationsEnabled = nextEnabled;

    try {
      await this.repository.save(user);
    } catch (error) {
      throw new NestError({
        message: 'Failed to update push notifications settings',
        key: 'USERS_SET_PUSH_NOTIFICATIONS_FAILED',
        cause: error,
        context: logger.getContext(),
      });
    }

    await this.hooksService.runHook(
      new UserUpdatedHook(
        {
          id: user.id,
          user,
          changedFields,
        },
        ctx,
      ),
    );

    return user;
  }

  /**
   * Change user email
   */
  async changeEmail(
    userId: string,
    newEmail: string,
    ctx: ServiceMethodContext,
  ): Promise<User> {
    const logger = this.logger.forMethod('changeEmail', ctx, {
      userId,
      newEmail,
    });

    const email = newEmail.toLowerCase();

    const user = await this.getOne(userId);

    if (!user) {
      throw new NotFoundError({
        message: `User with id ${userId} not found`,
        key: 'USERS_NOT_FOUND',
        context: logger.getContext(),
      });
    }

    const isUniqueEmail = await this.isUniqueEmail({
      email,
      exceptId: userId,
    });

    if (!isUniqueEmail) {
      throw new NestError({
        message: `User with email ${email} is already registered`,
        key: 'USERS_EMAIL_NOT_UNIQUE',
        context: logger.getContext(),
      });
    }

    user.email = email;

    try {
      await this.repository.save(user);
    } catch (error) {
      throw new NestError({
        message: 'Failed to change user email',
        key: 'USERS_CHANGE_EMAIL_FAILED',
        cause: error,
        context: logger.getContext(),
      });
    }

    logger.info('User email changed successfully');

    return await this.getOneOrFail(userId, ctx);
  }
}
