import { type ImageRenditionType } from '../common.js';

export class GetOneImageRenditionByImageIdOptions {
  /**
   * Image ID which this rendition belongs to (e.g. "hcimg:289gjfhslertu")
   */
  imageId!: string;

  /**
   * Image rendition type for different image sizes (e.g. "MAIN")
   */
  type!: ImageRenditionType;
}
