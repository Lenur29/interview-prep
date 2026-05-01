import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { ServiceMethodContext } from '@/context/service-method-context.js';
import { IdPrefix } from '@/enums/id-prefix.enum.js';
import { NestError } from '@/errors/nest-error.js';

import { IdService } from '@/modules/id/id.service.js';
import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { Logger } from '@/modules/logger/classes/logger.js';
import { LoggerFactory } from '@/modules/logger/classes/logger-factory.js';

import { UserType } from '../users/types/common.js';
import { UpdateUserOptions } from '../users/types/service/index.js';
import { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { ServiceTokensService } from './service-tokens/service-tokens.service.js';
import {
  CreateServiceAccountOptions,
  UpdateServiceAccountOptions,
} from './types/service/index.js';

/**
 * A Service Accounts is an interface that allows you to create, manage,
 * and use service accounts within your application.
 * Service accounts are special accounts that are used to perform automated tasks on behalf of your application,
 * such as accessing APIs, managing resources, or performing background tasks.
 * With a Service Accounts API, you can create and manage service accounts,
 * assign roles and permissions to those accounts, and generate credentials that can be used to authenticate and authorize API calls.
 * This API provides a secure and scalable way to automate tasks within your application,
 * while ensuring that only authorized users and processes can access sensitive data and resources.
 */
@Injectable()
export class ServiceAccountsService {
  private saEmailDomain = 'serviceaccount.hope.cloud';
  private logger!: Logger;

  constructor(
    @InjectLoggerFactory() private readonly loggerFactory: LoggerFactory,
    private readonly idService: IdService,
    private readonly usersService: UsersService,
    private readonly serviceTokensService: ServiceTokensService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  onModuleInit() {
    if (!process.env.SERVICE_ACCOUNT_EMAIL_DOMAIN) {
      throw Error(
        `Environment variable SERVICE_ACCOUNT_EMAIL_DOMAIN must be specified for ServiceAccountsService.
        (SA EMAIL: [alias]@[SERVICE_ACCOUNT_EMAIL_DOMAIN])`,
      );
    }

    this.saEmailDomain = process.env.SERVICE_ACCOUNT_EMAIL_DOMAIN;
  }

  public get repository(): Repository<User> {
    return this.dataSource.getRepository<User>('User');
  }

  /**
   * Checks if service account with specified alias exists
   * @param email - email of service account (e.g. "
   * @return true if service account exists
   */
  async isExistsWithEmail(email: string): Promise<boolean> {
    const user = await this.usersService.getOneBy({
      email,
      type: UserType.SA,
    });

    return Boolean(user);
  }

  /**
   * Checks if service account with specified alias exists
   * @param alias - alias of service account (e.g. "backoffice")
   * @return true if service account exists
   */
  async isExistsWithAlias(alias: string): Promise<boolean> {
    const user = await this.usersService.getOneBy({
      alias,
      type: UserType.SA,
    });

    return Boolean(user);
  }

  protected generateEntityId(): string {
    return this.idService.generateEntityId(IdPrefix.SERVICE_ACCOUNT);
  }

  /**
   * Creates service account
   * @param opts - options for creating service account
   * @param ctx - context of current request
   * @returns created service account
   */
  async create(opts: CreateServiceAccountOptions, ctx: ServiceMethodContext): Promise<User> {
    const alias = opts.alias.toLocaleLowerCase();

    const logger = this.logger.forMethod('create', ctx, {
      alias,
    });

    const email = `${alias.toLocaleLowerCase()}@${this.saEmailDomain}`;

    if (await this.isExistsWithEmail(email)) {
      throw new NestError({
        message: 'Service account already exist with the same email',
        key: 'SA_EMAIL_NOT_UNIQUE',
        context: logger.getContext(),
      });
    }

    try {
      const sa = await this.usersService.create({
        id: this.generateEntityId(),
        type: UserType.SA,
        firstName: opts.name,
        lastName: '',
        email,
        permissions: opts.permissions,
      }, ctx);

      // if (opts.roleId && opts.organizationId) {
      //   await this.userToRolesService.create({
      //     organizationId: opts.organizationId,
      //     roleId: opts.roleId,
      //     userId: sa.id,
      //     grantedById: ctx.user.id,
      //   }, ctx);
      // }

      return sa;
    } catch (error) {
      throw new NestError({
        message: 'Failed to create service account',
        key: 'SA_CREATE_FAILED',
        cause: error,
        context: logger.getContext(),
      });
    }
  }

  /**
   * Updates service account
   */
  async update({
    id,
    ...opts
  }: UpdateServiceAccountOptions, ctx: ServiceMethodContext): Promise<User> {
    const logger = this.logger.forMethod('update', ctx, {
      id,
    });

    const sa = await this.usersService.getOneOrFail(id, ctx);

    const updateUserOpts: UpdateUserOptions = {
      id: sa.id,
    };

    if (opts.name) {
      updateUserOpts.firstName = opts.name;
    }

    try {
      return await this.usersService.update(updateUserOpts, ctx);
    } catch {
      throw new NestError({
        message: 'Failed to update service account',
        key: 'SA_UPDATE_FAILED',
        context: logger.getContext(),
      });
    }
  }

  /**
   * Deletes service account by id
   * @param id - id of service account
   */
  async delete(id: string, ctx: ServiceMethodContext): Promise<void> {
    const logger = this.logger.forMethod('delete', ctx, {
      id,
    });

    const sa = await this.usersService.getOne(id);

    if (!sa || sa.isDeleted) {
      return;
    }

    if (sa.type !== UserType.SA) {
      throw new NestError({
        message: `Can't delete user with id ${id}. Need to provide Service Account id instead user id`,
        key: 'SA_DELETE_FAILED',
        context: logger.getContext(),
      });
    }

    await this.serviceTokensService.deleteAllByServiceAccountId(sa.id, ctx);

    await this.repository.remove(sa);
  }
}
