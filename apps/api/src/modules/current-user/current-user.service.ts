import { resolvePermissions } from '@pcg/auth';
import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '../cache/cache.module.js';
import DataLoader from 'dataloader';
import { DataSource, DeepPartial, FindOptionsWhere, Repository } from 'typeorm';

import { UserStatus, UserType } from '../users/types/common.js';
import { User } from '../users/user.entity.js';
import { InjectLoggerFactory } from '../logger/logger.providers.js';
import { Logger } from '../logger/classes/logger.js';
import { LoggerFactory } from '../logger/classes/logger-factory.js';
import { AppConfig } from '@/config/app.config.js';
import { type ConfigType } from '@nestjs/config';
import { UnauthorizedError } from '@/errors/unauthorized.error.js';
import { NotFoundError } from '@/errors/not-found.error.js';
import { getRolePermissions, SystemRole } from '@/permissions/roles.js';
import { CurrentUserPermissionsService } from './current-user-permissions.service.js';

/**
 * User service helps to resolve user in auth decorators
 * Provide current user with permissions for each request context
 */
@Injectable()
export class CurrentUserService {
  private logger!: Logger;

  private userDataLoader!: DataLoader<string, User, string>;

  get userRepository(): Repository<User> {
    return this.dataSource.getRepository(User);
  }

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @Inject(AppConfig.KEY) private readonly appConfig: ConfigType<typeof AppConfig>,
    @InjectLoggerFactory() readonly loggerFactory: LoggerFactory,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(CurrentUserPermissionsService) private readonly permissionsService: CurrentUserPermissionsService,
  ) {
    this.userDataLoader = new DataLoader(async (keys: readonly string[]): Promise<User[]> => {
      const ids = [...new Set<string>(keys)];

      const results = await Promise.all(ids.map((id) => this.resolve(id)));

      const users: User[] = [];
      for (const key of keys) {
        const user = results.find((r) => r.id === key);
        if (user) {
          users.push(user);
        }
      }

      return users;
    }, {
      cache: false,
    });

    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  /**
   * Get permissions from guest role
   */
  protected getGuestPermissions(): string[] {
    return getRolePermissions(SystemRole.GUEST);
  }

  async resolveWithLoader(userId: string): Promise<User> {
    return await this.userDataLoader.load(userId);
  }

  /**
   * Find user by id and resolve permissions
   * @param userId - user id
   * @returns - user with resolved permissions
   */
  async resolve(userId: string): Promise<User> {
    if (userId.includes('guest')) {
      return await this.resolveGuest();
    }

    const cacheKey = `current-user-${userId}`;

    const cachedUser = await this.cache.get<User>(cacheKey);

    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.userRepository.findOneBy({
      id: userId,
    } as FindOptionsWhere<User>);

    if (!user) {
      throw new NotFoundError({
        message: `User with id "${userId}" not found`,
        key: 'CURRENT_USER_NOT_FOUND',
        context: this.logger.getContext(),
      });
    }

    if (user.status === UserStatus.DISABLED || user.status === UserStatus.DELETED) {
      throw new UnauthorizedError({
        message: `User ${user.id} is ${user.status.toLowerCase()}`,
        key: 'CURRENT_USER_INACTIVE',
        context: this.logger.getContext(),
      });
    }

    if (user.status === UserStatus.WAITING_FOR_APPROVAL) {
      throw new UnauthorizedError({
        message: `User ${user.id} is waiting for approval`,
        key: 'CURRENT_USER_WAITING_FOR_APPROVAL',
        context: this.logger.getContext(),
      });
    }

    user.resolvedPermissions = await this.permissionsService.resolve(user);

    await this.cache.set(cacheKey, user, 3000);

    return user;
  }

  /**
   * Returns guest user with resolved permissions
   * Used in auth-n decorators when user is not authorized
   * @returns - guest user with resolved permissions
   */
  async resolveGuest(): Promise<User> {
    const permissions = this.getGuestPermissions();

    const guest = this.userRepository.create({
      id: `${this.appConfig.shortname}u:guest`,
      firstName: 'Guest',
      lastName: '',
      fullName: 'Guest',
      type: UserType.USER,
      status: UserStatus.ACTIVE,
      email: 'guest@account.com',
      permissions,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as DeepPartial<User>);

    guest.resolvedPermissions = resolvePermissions(permissions);

    return guest;
  }
}
