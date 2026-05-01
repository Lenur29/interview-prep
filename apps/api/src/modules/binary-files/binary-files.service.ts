import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  DeepPartial,
  FindOptionsWhere,
  In,
  Repository,
} from 'typeorm';
import type { MaybeNull } from '@pcg/predicates';

import { ServiceMethodContext } from '@/context/service-method-context.js';
import { IdPrefix } from '@/enums/id-prefix.enum.js';
import { NestError } from '@/errors/nest-error.js';
import { NotFoundError } from '@/errors/not-found.error.js';
import { getLocation } from '@/tools/locations.js';

import { IdService } from '@/modules/id/id.service.js';
import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { Logger } from '@/modules/logger/classes/logger.js';
import { LoggerFactory } from '@/modules/logger/classes/logger-factory.js';

import { BinaryFile } from './binary-file.entity.js';
import { CreateBinaryFileFromLocationOptions, CreateBinaryFileOptions } from './types/service/index.js';

/**
 * Binary files service that provides methods to fetch and create binary files
 */
@Injectable()
export class BinaryFilesService {
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

  public get repository(): Repository<BinaryFile> {
    return this.dataSource.getRepository(BinaryFile);
  }

  /**
   * Fetch binary file by id
   * @param id - ID of the binary file
   * @returns - binary file
   */
  async getOne(id: string): Promise<MaybeNull<BinaryFile>> {
    return await this.repository.findOneBy({
      id,
    } as FindOptionsWhere<BinaryFile>);
  }

  /**
   * Fetch binary file by id or throw an error if not found
   * @param id - ID of the binary file
   * @param ctx - service method context
   * @returns - binary file
   */
  async getOneOrFail(id: string, ctx: ServiceMethodContext): Promise<BinaryFile> {
    const logger = this.logger.forMethod('getOneOrFail', ctx, {
      id,
    });
    const file = await this.getOne(id);

    if (!file) {
      throw new NotFoundError({
        message: `Binary file with id ${id} not found`,
        key: 'TL_BINARY_FILES_NOT_FOUND',
        context: logger.getContext(),
      });
    }

    return file;
  }

  async getManyByIds(ids: string[]): Promise<BinaryFile[]> {
    if (ids.length === 0) {
      return [];
    }

    return await this.repository.findBy({
      id: In(ids),
    });
  }

  protected generateEntityId(): string {
    return this.idService.generateEntityId(IdPrefix.BINARY_FILE);
  }

  /**
   * Create binary file
   * @param opts - options to create binary file
   * @param ctx - service method context
   * @returns - created binary file
   */
  async create(opts: CreateBinaryFileOptions, ctx: ServiceMethodContext): Promise<BinaryFile> {
    const logger = this.logger.forMethod('createFile', ctx);
    const file = this.repository.create({
      id: opts.id ?? this.generateEntityId(),
      description: opts.description,
      meta: opts.meta,
      location: getLocation(opts.url),
      isPrivate: opts.isPrivate ?? false,
    } as DeepPartial<BinaryFile>);

    try {
      await this.repository.save(file);
    } catch (error) {
      throw new NestError({
        message: 'Failed to create binary file',
        key: 'TL_BINARY_FILES_CREATE_FAILED',
        context: logger.getContext(),
        cause: error,
      });
    }

    return file;
  }

  async createFromLocation(opts: CreateBinaryFileFromLocationOptions, ctx: ServiceMethodContext): Promise<BinaryFile> {
    const logger = this.logger.forMethod('createFileFromLocation', ctx);
    const file = this.repository.create({
      id: this.generateEntityId(),
      description: opts.description,
      meta: opts.meta,
      location: opts.location,
      isPrivate: opts.isPrivate ?? false,
    } as DeepPartial<BinaryFile>);

    try {
      await this.repository.save(file);
    } catch (error) {
      throw new NestError({
        message: 'Failed to create binary file from location',
        key: 'TL_BINARY_FILES_CREATE_FROM_LOCATION_FAILED',
        context: logger.getContext(),
        cause: error,
      });
    }

    return file;
  }

  // async createSignedUrl(opts: CreateBinaryFileSignerUrlOptions, ctx: ServiceMethodContext): Promise<string> {
  //   const logger = this.logger.forMethod('createSignedUrl', ctx, {
  //     id: opts.id,
  //     tugi: opts.ttl,
  //   });

  //   const file = await this.getOneOrFail(opts.id, ctx);

  //   if (!file.isPrivate) {
  //     if (!file.url) {
  //       throw new NestError({
  //         message: 'File URL is not available',
  //         key: 'TL_BINARY_FILES_URL_NOT_AVAILABLE',
  //         context: logger.getContext(),
  //       });
  //     }

  //     return file.url;
  //   }

  //   if (isGCSFileLocation(file.location)) {
  //     // Generate signed URL for GCS file
  //     const {
  //       bucket: bucketName,
  //       path,
  //     } = file.location;

  //     const bucket = this.gcsService.getBucket(bucketName);
  //     if (!bucket) {
  //       throw new NotFoundError({
  //         message: `GCS bucket ${file.location.bucket} not found`,
  //         key: 'TL_GCS_BUCKET_NOT_FOUND',
  //         context: logger.getContext(),
  //       });
  //     }

  //     const gcsFile = bucket.file(path);

  //     try {
  //       const [url] = await gcsFile.getSignedUrl({
  //         action: 'read',
  //         expires: Date.now() + (opts.ttl * 1000),
  //       });

  //       return url;
  //     } catch (error) {
  //       throw new NestError({
  //         message: 'Failed to generate signed URL for GCS file',
  //         key: 'TL_GCS_SIGNED_URL_GENERATION_FAILED',
  //         context: logger.getContext(),
  //         cause: error,
  //       });
  //     }
  //   }

  //   throw new NestError({
  //     message: 'Signed URL generation is not supported for this file location type',
  //     key: 'TL_BINARY_FILES_SIGNED_URL_UNSUPPORTED_LOCATION',
  //     context: logger.getContext(),
  //   });
  // }

  /**
   * Delete binary file
   * @param id - ID of the binary file
   */
  async delete(id: string): Promise<void> {
    await this.repository.softRemove({
      id,
    } as DeepPartial<BinaryFile>);
  }
}
