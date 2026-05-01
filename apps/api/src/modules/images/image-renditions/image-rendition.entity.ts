import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  TableInheritance,
} from 'typeorm';

import {
  isCustomFileLocation,
  isS3FileLocation,
  type FileLocation,
} from '@/types/locations.js';

import {
  getS3FileUrl,
} from '@/tools/locations.js';

import type { Image } from '../image.entity.js';
import { ImageRenditionMeta, ImageRenditionType } from './types/common.js';
import { JSONObjectResolver } from 'graphql-scalars';

/**
 * Image renditions
 * Keep image type, location and metadata
 */
@TableInheritance({
  column: {
    name: 'typeorm_type',
    type: 'varchar',
  },
})
@Entity('image_renditions')
@Index('idx_image_id__type', ['imageId', 'type'])
@ObjectType()
export class ImageRendition extends BaseEntity {
  @Field()
  @PrimaryColumn()
  id!: string;

  /**
   * Image rendition type for different image sizes
   * Can be used for image optimization
   * @see ImageRenditionType
   */
  @Field(() => ImageRenditionType)
  @Column({
    type: 'enum',
    enum: ImageRenditionType,
  })
  type!: ImageRenditionType;

  /**
   * Image rendition location where it is stored
   */
  @Field(() => JSONObjectResolver)
  @Column({
    type: 'jsonb',
  })
  location!: FileLocation;

  /**
   * Image rendition url
   */
  @Field(() => String)
  get url(): string {
    if (isS3FileLocation(this.location)) {
      return getS3FileUrl(this.location);
    } else if (isCustomFileLocation(this.location)) {
      return this.location.url;
    }

    throw new Error(`Unknown image rendition "${this.id}" location: ${JSON.stringify(this.location)}`);
  }

  /**
   * Image rendition metadata
   * @see ImageRenditionMeta
   */
  @Field(() => ImageRenditionMeta)
  @Column({
    type: 'jsonb',
  })
  meta!: ImageRenditionMeta;

  /**
   * Image id where this rendition belongs to
   */
  @Column()
  imageId!: string;

  /**
   * Image where this rendition belongs to
   */
  @ManyToOne('Image', 'renditions', {
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn()
  image!: Promise<Image>;

  /**
   * Date when the file was created
   */
  @Field()
  @CreateDateColumn({
    type: 'timestamptz',
    precision: 3,
  })
  createdAt!: Date;
}
