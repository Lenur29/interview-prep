import { type ImageRenditionType } from '../common.js';

export class GetImageRenditionUrlOptions {
  /**
   * Image ID which this rendition belongs to
   */
  imageId!: string;

  /**
   * Image rendition type for different image sizes
   */
  type!: ImageRenditionType;
}
