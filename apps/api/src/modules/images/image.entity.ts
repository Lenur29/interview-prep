import { Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity, CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  TableInheritance,
  UpdateDateColumn,
} from 'typeorm';

import type { ImageRendition } from '@/modules/images/image-renditions/image-rendition.entity.js';
import type { MaybeNull } from '@pcg/predicates';
import { ImageRenditionType } from './image-renditions/types/common.js';

/**
 * Base image entity
 * Saves image renditions and metadata
 * Provide image resources by id
 */
@TableInheritance({
  column: {
    name: 'typeorm_type',
    type: 'varchar',
  },
})
@Entity('images')
@ObjectType()
export class Image extends BaseEntity {
  @Field()
  @PrimaryColumn()
  id!: string;

  /**
   * Image renditions
   * @see ImageRendition
   */
  @OneToMany('ImageRendition', 'image', {
    eager: true,
  })
  renditions!: ImageRendition[];

  /**
   * Get image url by rendition type.
   * If type is not specified, returns url for first available rendition type:
   * MAIN_2X, MAIN, MAIN_LEGACY, ORIGINAL
   * @param type - optional rendition type
   */
  getUrl(type?: ImageRenditionType): MaybeNull<string> {
    if (type) {
      const rendition = this.renditions.find((r) => r.type === type);

      return rendition?.url ?? null;
    }

    return this.url;
  }

  /**
   * Get image url.
   * Returns url for first available rendition type:
   * MAIN_2X, MAIN, MAIN_LEGACY, ORIGINAL
   */
  @Field(() => String, { nullable: true })
  get url(): MaybeNull<string> {
    if (!this.renditions) {
      throw new Error('Image renditions are not loaded. Check entity relations.');
    }

    const findRendition = (type: ImageRenditionType): ImageRendition | undefined => {
      return this.renditions.find((r) => r.type === type);
    };

    const rendition = findRendition(ImageRenditionType.MAIN_2X)
      ?? findRendition(ImageRenditionType.MAIN)
      ?? findRendition(ImageRenditionType.MAIN_LEGACY)
      ?? findRendition(ImageRenditionType.ORIGINAL);

    return rendition?.url ?? null;
  }

  /**
   * Date of image creation
   */
  @Field()
  @CreateDateColumn({
    type: 'timestamptz',
    precision: 3,
  })
  createdAt!: Date;

  /**
   * Date of image update
   */
  @UpdateDateColumn({
    type: 'timestamptz',
    precision: 3,
  })
  updatedAt!: Date;
}
