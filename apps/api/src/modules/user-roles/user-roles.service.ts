import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  DeepPartial,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import { ServiceMethodContext } from '@/context/service-method-context.js';
import { IdPrefix } from '@/enums/id-prefix.enum.js';
import { BadRequestError } from '@/errors/bad-request.error.js';
import { NestError } from '@/errors/nest-error.js';
import { NotFoundError } from '@/errors/not-found.error.js';
import { createListMeta } from '@/pagination/tools.js';
import { ListMeta } from '@/pagination/types.js';
import { extractSortParams } from '@/sorting/sorting.tools.js';
import { stringifyOpts } from '@/tools/stringify-opts.js';
import { MaybeNull } from '@pcg/predicates';

import { IdService } from '@/modules/id/id.service.js';
import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { Logger } from '@/modules/logger/classes/logger.js';
import { LoggerFactory } from '@/modules/logger/classes/logger-factory.js';

import { UserRole } from './user-role.entity.js';
import { UserRolesFilter, UserRolesOrderBy, UserRolesOrderFields } from './types/resolver/user-roles.js';
import { CreateUserRoleOptions } from './types/service/create-user-role.js';
import { FetchUserRolesOptions } from './types/service/get-user-roles.js';
import { GetUserRoleByOptions } from './types/service/get-user-role-by.js';
import { UpdateUserRoleOptions } from './types/service/update-user-role.js';

export class UserRolesService {
  private logger!: Logger;

  constructor(
    @InjectLoggerFactory() private readonly loggerFactory: LoggerFactory,
    private readonly idService: IdService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  public get repository(): Repository<UserRole> {
    return this.dataSource.getRepository(UserRole);
  }

  async getOneBy(opts: GetUserRoleByOptions): Promise<MaybeNull<UserRole>> {
    const logger = this.logger.child({
      action: this.getOneBy.name,
      ...opts,
    });

    if (Object.keys(opts).length === 0) {
      throw new BadRequestError({
        message: 'Empty options',
        key: 'USER_ROLES_GET_ONE_BY_EMPTY_OPTIONS',
        context: logger.getContext(),
      });
    }

    return await this.repository.findOneBy({
      ...opts,
    });
  }

  async getOne(id: string): Promise<MaybeNull<UserRole>> {
    return await this.getOneBy({ id });
  }

  async getOneByOrFail(
    opts: GetUserRoleByOptions,
    ctx: ServiceMethodContext,
  ): Promise<UserRole> {
    const logger = this.logger.forMethod(this.getOneByOrFail.name, ctx, {
      ...opts,
    });

    if (Object.keys(opts).length === 0) {
      throw new BadRequestError({
        message: 'Empty options',
        key: 'USER_ROLES_GET_ONE_BY_EMPTY_OPTIONS',
        context: logger.getContext(),
      });
    }

    const userRole = await this.getOneBy(opts);

    if (!userRole) {
      throw new NotFoundError({
        message: `User role with ${stringifyOpts(opts)} not found`,
        key: 'USER_ROLES_NOT_FOUND',
        context: logger.getContext(),
      });
    }

    return userRole;
  }

  async getOneOrFail(id: string, ctx: ServiceMethodContext): Promise<UserRole> {
    return await this.getOneByOrFail({ id }, ctx);
  }

  async getMany({
    filter,
    orderBy = UserRolesOrderBy.createdAt_DESC,
    limit,
    offset,
    needCountTotal,
  }: FetchUserRolesOptions): Promise<[UserRole[], ListMeta]> {
    const query = this.repository.createQueryBuilder('ur');
    this.applyFilterToQuery(query, filter);
    this.applyOrderByToQuery(query, orderBy);

    query.limit(limit);
    query.offset(offset);

    return await Promise.all([
      query.getMany(),
      createListMeta<UserRole>({
        query,
        needCountTotal,
        limit,
        offset,
      }),
    ]);
  }

  protected applyFilterToQuery(
    query: SelectQueryBuilder<UserRole>,
    filter: UserRolesFilter,
  ) {
    const alias = query.alias;

    if (filter.ids?.length) {
      query.andWhere(`${alias}.id IN(:...ids)`, {
        ids: filter.ids,
      });
    }

    if (filter.userIds?.length) {
      query.andWhere(`${alias}.userId IN(:...userIds)`, {
        userIds: filter.userIds,
      });
    }

    if (filter.roleIds?.length) {
      query.andWhere(`${alias}.roleId IN(:...roleIds)`, {
        roleIds: filter.roleIds,
      });
    }
  }

  protected applyOrderByToQuery(
    query: SelectQueryBuilder<UserRole>,
    orderBy: UserRolesOrderBy,
  ) {
    const sort = extractSortParams<UserRolesOrderFields>(orderBy);
    const alias = query.alias;
    query.addOrderBy(`${alias}.${sort.columnName}`, sort.direction);
  }

  async create(
    opts: CreateUserRoleOptions,
    ctx: ServiceMethodContext,
  ): Promise<UserRole> {
    const logger = this.logger.forMethod(this.create.name, ctx);

    const userRole = this.repository.create({
      id: this.idService.generateEntityId(IdPrefix.USER_ROLE),
      ...opts,
    } as DeepPartial<UserRole>);

    try {
      await this.repository.save(userRole);
    } catch (error) {
      throw new NestError({
        message: 'Failed to create user role',
        key: 'USER_ROLES_CREATE_FAILED',
        context: logger.getContext(),
        cause: error,
      });
    }

    return userRole;
  }

  async update(
    { id, ...opts }: UpdateUserRoleOptions,
    ctx: ServiceMethodContext,
  ): Promise<UserRole> {
    const logger = this.logger.forMethod('update', ctx, { id });

    const userRole = await this.getOneOrFail(id, ctx);

    this.repository.merge(userRole, opts as DeepPartial<UserRole>);

    try {
      await this.repository.save(userRole);
    } catch (error) {
      throw new NestError({
        message: `Failed to update user role with id ${id}`,
        key: 'USER_ROLES_UPDATE_FAILED',
        context: logger.getContext(),
        cause: error,
      });
    }

    return userRole;
  }

  async delete(id: string, ctx: ServiceMethodContext): Promise<void> {
    const logger = this.logger.forMethod('delete', ctx, { id });

    const userRole = await this.getOne(id);

    if (!userRole) {
      return;
    }

    try {
      await this.repository.remove(userRole);
    } catch (error) {
      throw new NestError({
        message: `Failed to delete user role with id ${id}`,
        key: 'USER_ROLES_DELETE_FAILED',
        context: logger.getContext(),
        cause: error,
      });
    }
  }
}
