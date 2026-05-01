import {
  Field, InputType, Int,
} from '@nestjs/graphql';

import { ImageRenditionType } from '../common.js';

@InputType()
export class UpdateImageRenditionMetaInput {
  /**
   * Rendition file size in bytes (e.g. 20394)
   * @example 20394
   */
  @Field({
    nullable: true,
    description: 'Rendition file size in bytes (e.g. 20394)',
  })
  filesize?: number;

  /**
   * Rendition mime type (e.g. "image/jpeg")
   * @example 'image/jpeg'
   */
  @Field({
    nullable: true,
    description: 'Rendition mime type (e.g. "image/jpeg")',
  })
  mimeType?: string;

  /**
   * Rendition width in pixels (e.g. 1920)
   * @example 1920
   */
  @Field(() => Int, {
    nullable: true,
    description: 'Rendition width in pixels (e.g. 1920)',
  })
  width?: number;

  /**
   * Rendition height in pixels (e.g. 1080)
   * @example 1080
   */
  @Field(() => Int, {
    nullable: true,
    description: 'Rendition height in pixels (e.g. 1080)',
  })
  height?: number;
}

@InputType()
export class UpdateImageRenditionInput {
  /**
   * Image rendition ID to update
   */
  @Field({
    description: 'Image rendition ID to update',
  })
  id!: string;

  /**
   * Image rendition type for different image sizes
   * @example 'MAIN'
   */
  @Field(() => ImageRenditionType, {
    nullable: true,
    description: 'Image rendition type for different image sizes (e.g. "MAIN")',
  })
  type?: ImageRenditionType;

  /**
   * Image rendition URL
   * @example 'https://cdn.hicetnunc.xyz/objkt/1234/1.jpg'
   */
  @Field({
    nullable: true,
    description: 'Image rendition URL (e.g. "https://cdn.hicetnunc.xyz/objkt/1234/1.jpg")',
  })
  url?: string;

  /**
   * Image rendition metadata
   */
  @Field(() => UpdateImageRenditionMetaInput, {
    nullable: true,
  })
  meta?: UpdateImageRenditionMetaInput;
}
