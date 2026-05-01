import {
  Field, InputType, Int,
} from '@nestjs/graphql';

import { ImageRenditionType } from '../common.js';

@InputType()
export class CreateImageRenditionMetaInput {
  /**
   * Rendition file size in bytes
   * @example 20394
   */
  @Field({
    description: 'Rendition file size in bytes (e.g. 20394)',
  })
  filesize!: number;

  /**
   * Rendition mime type
   * @example 'image/jpeg'
   */
  @Field(() => String, {
    description: 'Rendition mime type (e.g. "image/jpeg")',
  })
  mimeType!: string;

  /**
   * Rendition width in pixels
   * @example 1920
   */
  @Field(() => Int, {
    description: 'Rendition width in pixels (e.g. 1920)',
  })
  width!: number;

  /**
   * Rendition height in pixels
   * @example 1080
   */
  @Field(() => Int, {
    description: 'Rendition height in pixels (e.g. 1080)',
  })
  height!: number;
}

@InputType()
export class CreateImageRenditionInput {
  id?: string;

  /**
   * Image ID which this rendition belongs to
   * @example 'hcimg:289gjfhslertu'
   */
  @Field({
    description: 'Image ID (e.g. "hcimg:289gjfhslertu")',
  })
  imageId!: string;

  /**
   * Image rendition type for different image sizes
   */
  @Field(() => ImageRenditionType)
  type!: ImageRenditionType;

  /**
   * Image rendition metadata
   */
  @Field(() => CreateImageRenditionMetaInput)
  meta!: CreateImageRenditionMetaInput;

  /**
   * Image rendition url
   * @example 'https://cdn.hicetnunc.xyz/objkt/289gjfhslertu/1.jpg'
   */
  @Field({
    description: 'Image rendition url (e.g. "https://cdn.hicetnunc.xyz/objkt/289gjfhslertu/1.jpg")',
  })
  url!: string;
}
