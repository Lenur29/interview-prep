import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ImageRendition } from '@/modules/images/image-renditions/image-rendition.entity.js';
import { ImageRenditionsResolver } from '@/modules/images/image-renditions/image-renditions.resolver.js';
import { ImageRenditionsService } from '@/modules/images/image-renditions/image-renditions.service.js';

import { Image } from './image.entity.js';
import { ImagesResolver } from './images.resolver.js';
import { ImagesService } from './images.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Image, ImageRendition]),
  ],
  providers: [
    ImagesService,
    ImageRenditionsService,
    ImagesResolver,
    ImageRenditionsResolver,
  ],
  exports: [
    ImagesService,
    ImageRenditionsService,
  ],
})
export class ImagesModule {}
