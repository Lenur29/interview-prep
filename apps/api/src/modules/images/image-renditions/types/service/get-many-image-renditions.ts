import { type ExtractSortFields } from '@/sorting/sorting.types.js';
import { type ImageRenditionType } from '../common.js';
import { type ListMethodOptions } from '@/pagination/types.js';

export class ImageRenditionsFilter {
  /**
   * Image rendition type for different image sizes (e.g. "MAIN")
   */
  type?: ImageRenditionType;

  /**
   * Image ID which this rendition belongs to (e.g. "hcimg:289gjfhslertu")
   */
  imageId?: string;
}

/**
 * Image rendition order by fields
 */
export enum ImageRenditionsOrderBy {
  type_ASC = 'type_ASC',
  type_DESC = 'type_DESC',
}

export type ImageRenditionsFields = ExtractSortFields<ImageRenditionsOrderBy>;

export interface GetManyImageRenditionsOptions extends ListMethodOptions<ImageRenditionsFilter, ImageRenditionsOrderBy> {}
