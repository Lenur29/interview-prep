import {
  Field, Int, ObjectType, registerEnumType,
} from '@nestjs/graphql';

/**
 * Image rendition type. Used for image optimization
 * Each type has different size
 */
export enum ImageRenditionType {
  /**
   * Main image rendition for retina displays (webp)
   */
  MAIN_2X = 'MAIN_2X',
  /**
   * Main image rendition (webp)
   */
  MAIN = 'MAIN',
  /**
   * Main image rendition for old browsers without webp support (jpeg)
   */
  MAIN_LEGACY = 'MAIN_LEGACY',

  /**
   * Original image rendition uploaded by user
   */
  ORIGINAL = 'ORIGINAL',

  /**
   * Small image rendition for thumbnail (webp)
   */
  SMALL = 'SMALL',
}

registerEnumType(ImageRenditionType, {
  name: 'ImageRenditionType',
});

/**
 * Image rendition metadata
 */
@ObjectType()
export class ImageRenditionMeta {
  /**
   * Rendition file size in bytes
   * @example 123456
   */
  @Field(() => Int)
  filesize!: number;

  /**
   * Rendition mime type
   * @example 'image/jpeg'
   */
  @Field()
  mimeType!: string;

  /**
   * Rendition width in pixels
   * @example 1920
   */
  @Field(() => Int)
  width!: number;

  /**
   * Rendition height in pixels
   * @example 1080
   */
  @Field(() => Int)
  height!: number;
}
