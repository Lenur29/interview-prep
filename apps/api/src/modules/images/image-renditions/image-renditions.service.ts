import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  DeepPartial,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import type { MaybeNull } from '@pcg/predicates';

import { ServiceMethodContext } from '@/context/service-method-context.js';
import { IdPrefix } from '@/enums/id-prefix.enum.js';
import { NestError } from '@/errors/nest-error.js';
import { NotFoundError } from '@/errors/not-found.error.js';
import { createListMeta } from '@/pagination/tools.js';
import { ListMeta } from '@/pagination/types.js';
import { extractSortParams } from '@/sorting/sorting.tools.js';
import { getLocation } from '@/tools/locations.js';

import { IdService } from '@/modules/id/id.service.js';
import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { Logger } from '@/modules/logger/classes/logger.js';
import { LoggerFactory } from '@/modules/logger/classes/logger-factory.js';
import { ImageRendition } from './image-rendition.entity.js';
import {
  CreateImageRenditionOptions,
  GetImageRenditionUrlOptions,
  GetManyImageRenditionsOptions,
  GetOneImageRenditionByImageIdOptions,
  ImageRenditionsOrderBy,
  UpdateImageRenditionOptions,
} from './types/service/index.js';

/**
 * Image renditions service
 * Helps to work with image renditions
 */
@Injectable()
export class ImageRenditionsService {
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

  public get repository(): Repository<ImageRendition> {
    return this.dataSource.getRepository(ImageRendition);
  }

  /**
   * Get image rendition by id
   * @param id - image rendition id
   * @returns image rendition if exists or null
   * @example
   * const imageRendition = await this.imageRenditionsService.getOne('hcimg:xxxxxxxxxxx');
   */
  async getOne(id: string): Promise<MaybeNull<ImageRendition>> {
    return await this.repository.findOneBy({
      id,
    } as FindOptionsWhere<ImageRendition>);
  }

  /**
   * Get image rendition with specific type for image
   * @returns image rendition if exists or null
   * @example
   * const imageRendition = await this.imageRenditionsService.getOneByImageId({
   *  imageId: 'hcimg:xxxxxxxxxxx',
   *  type: ImageRenditionType.SMALL,
   * });
   */
  async getOneByImageId(
    { imageId, type }: GetOneImageRenditionByImageIdOptions,
  ): Promise<MaybeNull<ImageRendition>> {
    return await this.repository.findOneBy({
      imageId,
      type,
    } as FindOptionsWhere<ImageRendition>);
  }

  /**
   * Get image rendition url
   * @example
   * const url = await imageRenditionsService.getUrl({
   *  type: ImageRenditionType.SMALL,
   *  imageId: 'hcimg:xxxxxxxxxxx',
   * });
   */
  async getUrl(opts: GetImageRenditionUrlOptions): Promise<MaybeNull<string>> {
    const rendition = await this.repository.findOneBy({
      type: opts.type,
      imageId: opts.imageId,
    } as FindOptionsWhere<ImageRendition>);

    return rendition?.url ?? null;
  }

  /**
   * Get image rendition list
   * @returns image rendition list
   *
   * @example
   * const [imageRenditions, meta] = await this.imageRenditionsService.getMany({
   *  orderBy: ImageRenditionsOrderBy.type_ASC,
   *  limit: 10,
   *  filter: {
   *    imageId: 'hcimg:xxxxxxxxxxx',
   *  },
   * });
   */
  async getMany({
    limit,
    offset,
    filter,
    orderBy = ImageRenditionsOrderBy.type_ASC,
    needCountTotal,
  }: GetManyImageRenditionsOptions): Promise<[ImageRendition[], ListMeta]> {
    const query = this.repository.createQueryBuilder('ir');
    const sort = extractSortParams<ImageRenditionsOrderBy>(orderBy);

    if (filter.imageId) {
      query.andWhere('ir."image_id" = :imageId', {
        imageId: filter.imageId,
      });
    }

    if (filter.type) {
      query.andWhere('ir."type" = :type', {
        type: filter.type,
      });
    }

    query.addOrderBy(`ir.${sort.columnName}`, sort.direction);

    query.limit(limit);
    query.offset(offset);

    return await Promise.all([
      query.getMany(),
      createListMeta<ImageRendition>({
        query,
        needCountTotal,
        limit,
        offset,
      }),
    ]);
  }

  protected generateEntityId(): string {
    return this.idService.generateEntityId(IdPrefix.IMAGE_RENDITION);
  }

  /**
   * Create image rendition
   * @param opts - new image rendition data
   * @param ctx - service method context
   * @returns created image rendition
   * @example
   * const imageRendition = await this.imageRenditionsService.create({
   *  imageId: 'hcimg:xxxxxxxxxxx',
   *  type: ImageRenditionType.SMALL,
   *  url: 'https://example.com/image.jpg',
   *  meta: {
   *   width: 100,
   *   height: 100,
   *   mimeType: 'image/jpeg',
   *   fileSize: 20344,
   *  },
   * });
   */
  async create(opts: CreateImageRenditionOptions, ctx: ServiceMethodContext): Promise<ImageRendition> {
    const logger = this.logger.forMethod(this.create.name, ctx);

    const {
      url,
      ...data
    } = opts;

    const imageRendition = this.repository.create({
      id: opts.id ?? this.generateEntityId(),
      location: getLocation(url),
      ...data,
    } as DeepPartial<ImageRendition>);

    try {
      await this.repository.save(imageRendition);
    } catch (error) {
      throw new NestError({
        message: 'Failed to create image rendition',
        key: 'IMAGE_RENDITIONS_CREATE_FAILED',
        cause: error,
        context: logger.getContext(),
      });
    }

    return imageRendition;
  }

  /**
   * Update image rendition
   * @param opts - update image rendition data
   * @param ctx - service method context
   * @returns updated image rendition
   * @example
   * const imageRendition = await this.imageRenditionsService.update({
   *  id: 'hcimgr:xxxxxxxxxxx',
   *  url: 'https://example.com/image-2.jpg',
   * });
   */
  async update({
    id,
    url,
    meta,
    ...opts
  }: UpdateImageRenditionOptions, ctx: ServiceMethodContext): Promise<ImageRendition> {
    const logger = this.logger.forMethod(this.update.name, ctx);

    const imageRendition: MaybeNull<ImageRendition> = await this.getOne(id);

    if (!imageRendition) {
      throw new NotFoundError({
        message: 'Image rendition could not be found',
        key: 'IMAGE_RENDITIONS_NOT_FOUND',
      });
    }

    if (url) {
      imageRendition.location = getLocation(url);
    }

    this.repository.merge(imageRendition, {
      ...opts,
      meta: {
        ...imageRendition.meta,
        ...meta,
      },
    } as DeepPartial<ImageRendition>);

    try {
      await this.repository.save(imageRendition);
    } catch (error) {
      throw new NestError({
        message: 'Failed to update image rendition',
        key: 'IMAGE_RENDITIONS_DELETE_FAILED',
        cause: error,
        context: logger.getContext(),
      });
    }

    return imageRendition;
  }

  /**
   * Delete image rendition
   * @param id - image rendition id
   * @param ctx - service method context
   * @example
   * await this.imageRenditionsService.delete('hcimgr:xxxxxxxxxxx');
   */
  async delete(id: string, ctx: ServiceMethodContext): Promise<void> {
    const logger = this.logger.forMethod(this.delete.name, ctx, {
      id,
    });

    const rendition = await this.getOne(id);

    if (!rendition) {
      return;
    }

    try {
      // Note: S3 file deletion would need to be implemented separately
      // For now, we only delete the database record
      await this.repository.remove(rendition);
    } catch (error) {
      throw new NestError({
        message: `Failed to delete image rendition "${id}"`,
        key: 'IMAGE_RENDITIONS_DELETE_FAILED',
        context: logger.getContext(),
        cause: error,
      });
    }
  }
}
