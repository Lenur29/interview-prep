import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';

import jwt from 'jsonwebtoken';

import {
  DataSource,
  DeepPartial,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import type { MaybeNull } from '@pcg/predicates';

import { JwtConfig } from '@/config/index.js';
import { ServiceMethodContext } from '@/context/service-method-context.js';
import { IdPrefix } from '@/enums/id-prefix.enum.js';
import { NestError } from '@/errors/nest-error.js';
import { NotFoundError } from '@/errors/not-found.error.js';
import { createListMeta } from '@/pagination/tools.js';
import { ListMeta } from '@/pagination/types.js';
import { extractSortParams } from '@/sorting/sorting.tools.js';
import {
  JwtServiceToken,
  JwtServiceTokenPayload,
  JwtTokenType,
} from '@/types/jwt.js';

import { IdService } from '@/modules/id/id.service.js';
import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { Logger } from '@/modules/logger/classes/logger.js';
import { LoggerFactory } from '@/modules/logger/classes/logger-factory.js';

import { UserStatus, UserType } from '../../users/types/common.js';
import { UsersService } from '../../users/users.service.js';
import { ServiceToken } from './service-token.entity.js';
import { ServiceTokensOrderBy, ServiceTokensOrderFields } from './types/resolver/index.js';
import {
  CreateServiceTokenOptions,
  CreateServiceTokenResult,
  GetManyServiceTokensOptions,
  RegenerateServiceTokenResult,
  UpdateServiceTokenOptions,
} from './types/service/index.js';

@Injectable()
export class ServiceTokensService {
  private logger!: Logger;

  constructor(
    @InjectLoggerFactory() private readonly loggerFactory: LoggerFactory,
    private readonly idService: IdService,
    private readonly usersService: UsersService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(JwtConfig.KEY) private readonly jwtCfg: ConfigType<typeof JwtConfig>,
  ) {
    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  public get repository(): Repository<ServiceToken> {
    return this.dataSource.getRepository(ServiceToken);
  }

  protected generateEntityId() {
    return this.idService.generateEntityId(IdPrefix.SERVICE_TOKEN);
  }

  /**
   * Check if service account has roles in any organization
   * @param serviceAccountId - Service account ID
   * @returns true if service account has organization roles, false otherwise
   */
  protected async hasServiceAccountOrganizationRoles(serviceAccountId: string): Promise<boolean> {
    const organizationMembersRepository = this.dataSource.getRepository('OrganizationMember');

    const roleCount = await organizationMembersRepository.createQueryBuilder('om')
      .where('om.userId = :serviceAccountId', {
        serviceAccountId,
      })
      .andWhere('om.organizationId IS NOT NULL')
      .getCount();

    return roleCount > 0;
  }

  /**
   * Create service token for service account
   * @returns access token
   */
  async create(input: CreateServiceTokenOptions, ctx: ServiceMethodContext): Promise<CreateServiceTokenResult> {
    const logger = this.logger.forMethod(this.create.name, ctx, {
      ...input,
    });

    const { serviceAccountId, name } = input;

    const sa = await this.usersService.getOneOrFail(serviceAccountId, ctx);

    if (sa.type !== UserType.SA) {
      throw new NestError({
        message: `Can't create service account access token for user. It must be service (user.type = SA)`,
        key: 'SERVICE_TOKENS_ACCESS_TOKEN_GENERATE_FAILED',
        context: logger.getContext(),
      });
    }

    if (sa.status !== UserStatus.ACTIVE) {
      throw new NestError({
        message: `Service account ${serviceAccountId} is not active`,
        key: 'SERVICE_TOKENS_SA_NOT_ACTIVE',
        context: logger.getContext(),
      });
    }

    const serviceTokenPayload: JwtServiceTokenPayload = {
      sub: JwtTokenType.SERVICE,
      iss: this.jwtCfg.iss,
      id: this.generateEntityId(),
      aud: this.jwtCfg.aud,
      uid: sa.id,
    };

    const hasOrganizationRoles = await this.hasServiceAccountOrganizationRoles(serviceAccountId);

    const jwtServiceTokenString = jwt.sign(serviceTokenPayload, this.jwtCfg.secret, {
      ...(hasOrganizationRoles && this.jwtCfg.expiration.serviceAccountAccessToken && {
        expiresIn: this.jwtCfg.expiration.serviceAccountAccessToken,
      }),
    });

    const decodedToken = jwt.decode(jwtServiceTokenString) as JwtServiceToken;

    const dbServiceToken = this.repository.create({
      id: serviceTokenPayload.id,
      name,
      serviceAccountId: sa.id,
    } as DeepPartial<ServiceToken>);

    if (decodedToken.exp) {
      dbServiceToken.expiresAt = new Date(decodedToken.exp * 1000);
    }

    try {
      await this.repository.save(dbServiceToken);
    } catch (error) {
      throw new NestError({
        message: `Failed to create service token`,
        key: 'SERVICE_TOKENS_CREATE_FAILED',
        context: logger.getContext(),
        cause: error,
      });
    }

    return {
      serviceToken: dbServiceToken,
      jwt: jwtServiceTokenString,
    };
  }

  /**
   * Get service token by ID
   * @param id - Service token ID
   * @returns Service token entity or null if not found
   */
  async getOne(id: string): Promise<MaybeNull<ServiceToken>> {
    return await this.repository.findOneBy({
      id,
    } as FindOptionsWhere<ServiceToken>);
  }

  /**
   * Get service token by ID or throw an exception if not found
   * @param id - Service token ID
   * @param ctx - Service method context
   * @returns Service token entity or throws an exception if not found
   */
  async getOneOrFail(id: string, ctx: ServiceMethodContext): Promise<ServiceToken> {
    const logger = this.logger.forMethod('getOneOrFail', ctx, {
      id,
    });

    const serviceToken = await this.getOne(id);

    if (!serviceToken) {
      throw new NotFoundError({
        message: `Service token with id ${id} not found`,
        key: 'SERVICE_TOKENS_NOT_FOUND',
        context: logger.getContext(),
      });
    }

    return serviceToken;
  }

  /**
   * Get service tokens list
   */
  async getMany({
    filter,
    orderBy = ServiceTokensOrderBy.name_ASC,
    limit,
    offset,
    needCountTotal,
  }: GetManyServiceTokensOptions): Promise<[ServiceToken[], ListMeta]> {
    const query = this.repository.createQueryBuilder('st');
    const sort = extractSortParams<ServiceTokensOrderFields>(orderBy);

    if (filter.serviceAccountId) {
      query.where('st.serviceAccountId = :serviceAccountId', {
        serviceAccountId: filter.serviceAccountId,
      });
    }

    if (filter.search) {
      query.andWhere('st.name ILIKE :search', {
        search: `%${filter.search}%`,
      });
    }

    query.addOrderBy(`st.${sort.columnName}`, sort.direction);
    query.limit(limit);
    query.offset(offset);

    return await Promise.all([
      query.getMany(),
      createListMeta<ServiceToken>({
        query,
        needCountTotal,
        limit,
        offset,
      }),
    ]);
  }

  async update(
    { id, ...opts }: UpdateServiceTokenOptions,
    ctx: ServiceMethodContext,
  ): Promise<ServiceToken> {
    const logger = this.logger.forMethod(this.update.name, ctx, {
      id,
    });

    const serviceToken = await this.getOneOrFail(id, ctx);

    this.repository.merge(serviceToken, opts as DeepPartial<ServiceToken>);

    try {
      await this.repository.save(serviceToken);
    } catch (error) {
      throw new NestError({
        message: `Failed to update service token with id ${id}`,
        key: 'SERVICE_TOKENS_UPDATE_FAILED',
        context: logger.getContext(),
        cause: error,
      });
    }

    return serviceToken;
  }

  async regenerate(id: string, ctx: ServiceMethodContext): Promise<RegenerateServiceTokenResult> {
    const st = await this.getOneOrFail(id, ctx);

    const { name, serviceAccountId } = st;

    await this.delete(id, ctx);

    return await this.create({
      name,
      serviceAccountId,
    }, ctx);
  }

  /**
   * Delete service token from database
   * @param id - id of service account
   */
  async delete(id: string, ctx: ServiceMethodContext): Promise<void> {
    const logger = this.logger.forMethod(this.delete.name, ctx, {
      id,
    });

    try {
      await this.repository.delete({
        id,
      } as FindOptionsWhere<ServiceToken>);
    } catch (error) {
      throw new NestError({
        message: `Failed to delete service token "${id}"`,
        key: 'SERVICE_TOKENS_DELETE_FAILED',
        context: logger.getContext(),
        cause: error,
      });
    }
  }

  async deleteAllByServiceAccountId(serviceAccountId: string, ctx: ServiceMethodContext): Promise<void> {
    const logger = this.logger.forMethod(this.deleteAllByServiceAccountId.name, ctx, {
      serviceAccountId,
    });

    try {
      await this.repository.delete({
        serviceAccountId,
      } as FindOptionsWhere<ServiceToken>);
    } catch (error) {
      throw new NestError({
        message: `Failed to delete service tokens for service account "${serviceAccountId}"`,
        key: 'SERVICE_TOKENS_DELETE_FAILED',
        context: logger.getContext(),
        cause: error,
      });
    }
  }
}
