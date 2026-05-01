import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ActionContextParam } from '@/context/action-context.decorator.js';
import { type ActionContext } from '@/context/action-context.js';
import { UsePermission } from '@/permissions/use-permission.decorator.js';
import { GraphQLAuthGuard } from '@/guards/auth.guard.js';
import { GraphQLPermissionsGuard } from '@/guards/permissions.guard.js';

import { ImageRendition } from './image-renditions/image-rendition.entity.js';
import { Image } from './image.entity.js';
import { ImagesService } from './images.service.js';
import {
  CreateImageInput,
  DeleteImageInput,
  DeleteImagePayload, UpdateImageInput,
} from './types/resolver/index.js';

@Resolver(() => Image)
@UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
export class ImagesResolver {
  constructor(
    protected readonly imagesService: ImagesService,
  ) {}

  @Query(() => Image, {
    name: 'image',
  })
  @UsePermission('lm:images:get')
  async fetchImage(
    @Args('id') id: string,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<Image> {
    return await this.imagesService.getOneOrFail(id, ctx);
  }

  @Mutation(() => Image)
  @UsePermission('lm:images:create')
  async createImage(
    @Args('input') input: CreateImageInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<Image> {
    return await this.imagesService.create(input, ctx);
  }

  @Mutation(() => Image)
  @UsePermission('lm:images:update')
  async updateImage(
    @Args('input') input: UpdateImageInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<Image> {
    return await this.imagesService.update(input, ctx);
  }

  @Mutation(() => DeleteImagePayload)
  @UsePermission('lm:images:delete')
  async deleteImage(
    @Args('input') input: DeleteImageInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<DeleteImagePayload> {
    await this.imagesService.delete(input.id, ctx);

    return {
      id: input.id,
    };
  }

  @ResolveField(() => [ImageRendition])
  renditions(
    @Parent() image: Image,
  ): ImageRendition[] {
    return image.renditions;
  }
}
