import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';

import { ActionContextParam } from '@/context/action-context.decorator.js';
import { type ActionContext } from '@/context/action-context.js';
import { UsePermission } from '@/permissions/use-permission.decorator.js';
import { GraphQLAuthGuard } from '@/guards/auth.guard.js';
import { GraphQLPermissionsGuard } from '@/guards/permissions.guard.js';

import { Image } from '../image.entity.js';
import { ImageRendition } from './image-rendition.entity.js';
import { ImageRenditionsService } from './image-renditions.service.js';
import { CreateImageRenditionInput, UpdateImageRenditionInput } from './types/resolver/index.js';

@Resolver(() => ImageRendition)
@UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
export class ImageRenditionsResolver {
  constructor(
    protected readonly imageRenditionsService: ImageRenditionsService,
  ) {}

  /**
   * Create image rendition
   * @param input - create image rendition input
   * @param ctx - action context
   * @returns created image rendition
   */
  @Mutation(() => ImageRendition)
  @UsePermission('lm:images:create')
  async createImageRendition(
    @Args('input') input: CreateImageRenditionInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<ImageRendition> {
    return await this.imageRenditionsService.create(input, ctx);
  }

  /**
   * Update image rendition
   * @param input - update image rendition input
   * @param ctx - action context
   * @returns updated image rendition
   */
  @Mutation(() => ImageRendition)
  @UsePermission('lm:images:update')
  async updateImageRendition(
    @Args('input') input: UpdateImageRenditionInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<ImageRendition> {
    return await this.imageRenditionsService.update(input, ctx);
  }

  @ResolveField(() => Image)
  async image(
    @Parent() rendition: ImageRendition,
  ): Promise<Image> {
    return rendition.image;
  }
}
