import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  DeepPartial, Repository,
} from 'typeorm';
import type { MaybeNull } from '@pcg/predicates';

import { ServiceMethodContext } from '@/context/service-method-context.js';
import { IdPrefix } from '@/enums/id-prefix.enum.js';
import { NestError } from '@/errors/nest-error.js';
import { NotFoundError } from '@/errors/not-found.error.js';

import { IdService } from '@/modules/id/id.service.js';
import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { Logger } from '@/modules/logger/classes/logger.js';
import { LoggerFactory } from '@/modules/logger/classes/logger-factory.js';

import { ImageRenditionsService } from './image-renditions/image-renditions.service.js';
import { ImageRenditionType } from './image-renditions/types/common.js';
import { Image } from './image.entity.js';
import { CreateImageOptions, UpdateImageOptions } from './types/service/index.js';

/**
 * Images service
 */
@Injectable()
export class ImagesService {
  private logger!: Logger;

  constructor(
    @InjectLoggerFactory() private readonly loggerFactory: LoggerFactory,
    private readonly idService: IdService,
    private readonly imageRenditionsService: ImageRenditionsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  public get repository(): Repository<Image> {
    return this.dataSource.getRepository(Image);
  }

  /**
   * Get image by id
   * @param id - image id
   * @returns image if exists or null
   * @example
   * const image = await this.imagesService.getOne('hcimg:xxxxxxxxxxx');
   */
  async getOne(id: string): Promise<MaybeNull<Image>> {
    return await this.repository.findOne({
      where: {
        id,
      },
      relations: ['renditions'],
    });
  }

  /**
   * Get image by id or throw not found exception
   * @param id - image id
   * @param ctx - service method context
   * @returns image if exists
   * @example
   * const image = await this.imagesService.getOneOrFail('hcimg:xxxxxxxxxxx');
   */
  async getOneOrFail(id: string, ctx: ServiceMethodContext): Promise<Image> {
    const logger = this.logger.forMethod(this.getOneOrFail.name, ctx, {
      id,
    });

    const image = await this.getOne(id);

    if (!image) {
      throw new NotFoundError({
        message: `Image with id ${id} not found`,
        key: 'IMAGES_NOT_FOUND',
        context: logger.getContext(),
      });
    }

    return image;
  }

  /**
   * Get image url by id
   * @param id - image id
   * @param renditionType - image rendition type
   * @returns image url if exists or null
   */
  async getUrlById(id: string, renditionType?: ImageRenditionType): Promise<MaybeNull<string>> {
    const image = await this.getOne(id);

    if (!image) {
      return null;
    }

    return image.getUrl(renditionType);
  }

  /**
   * Generate image entity id
   * @returns image entity id
   */
  protected generateEntityId(): string {
    return this.idService.generateEntityId(IdPrefix.IMAGE);
  }

  /**
   * Create image
   * @param opts - new image options
   * @param ctx - service method context
   * @returns created image
   * @example
   * const image = await this.imagesService.create({
   *  id: 'hcimg:xxxxxxxxxxx',
   *  renditions: [{
   *    type: ImageRenditionType.SMALL,
   *    url: 'https://example.com/image.jpg',
   *    meta: {
   *     width: 100,
   *     height: 100,
   *     mimeType: 'image/jpeg',
   *     fileSize: 20344,
   *    },
   *  }],
   * });
   */
  async create({
    renditions,
    ...opts
  }: CreateImageOptions, ctx: ServiceMethodContext): Promise<Image> {
    const logger = this.logger.forMethod(this.create.name, ctx);

    const image = this.repository.create({
      ...opts,
      id: opts.id ?? this.generateEntityId(),
    } as DeepPartial<Image>);

    try {
      await this.repository.save(image);
    } catch (error) {
      throw new NestError({
        message: 'Failed to create image',
        key: 'IMAGES_CREATE_FAILED',
        context: logger.getContext(),
        cause: error,
      });
    }

    if (renditions) {
      await Promise.all(renditions.map(async (rendition) => {
        await this.imageRenditionsService.create({
          ...rendition,
          imageId: image.id,
        }, ctx);
      }));
    }

    return await this.getOneOrFail(image.id, ctx);
  }

  /**
   * Update image entity
   * @param opts - update image options
   * @param ctx - service method context
   * @returns updated image
   */
  async update(opts: UpdateImageOptions, ctx: ServiceMethodContext): Promise<Image> {
    const logger = this.logger.forMethod(this.update.name, ctx);

    const image: MaybeNull<Image> = await this.getOne(opts.id);

    if (!image) {
      throw new NotFoundError({
        message: `Image with id ${opts.id} not found`,
        key: 'IMAGES_NOT_FOUND',
        context: logger.getContext(),
      });
    }

    this.repository.merge(image, opts as DeepPartial<Image>);

    try {
      await this.repository.save(image);
    } catch (error) {
      throw new NestError({
        message: 'Failed to update image',
        key: 'IMAGES_UPDATE_FAILED',
        context: logger.getContext(),
        cause: error,
      });
    }

    return await this.getOneOrFail(image.id, ctx);
  }

  /**
   * Delete image
   * @param id - image id
   * @param ctx - service method context
   * @example
   * await this.imagesService.delete('hcimg:xxxxxxxxxxx');
   */
  async delete(id: string, ctx: ServiceMethodContext): Promise<void> {
    const logger = this.logger.forMethod(this.delete.name, ctx, {
      id,
    });

    const image = await this.getOne(id);

    if (!image) {
      return;
    }

    const renditions = image.renditions;

    try {
      for (const rendition of renditions) {
        await this.imageRenditionsService.delete(rendition.id, ctx);
      }

      await this.repository.remove(image);
    } catch (error) {
      throw new NestError({
        message: `Failed to delete image "${id}"`,
        key: 'IMAGES_DELETE_FAILED',
        context: logger.getContext(),
        cause: error,
      });
    }
  }
}
