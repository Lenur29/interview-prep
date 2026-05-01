import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/**
 * List metadata for pagination
 */
export interface ListMeta {
  total?: number;
  limit?: number;
  offset?: number;
}

/**
 * Options for list method (getMany)
 */
export interface ListMethodOptions<F, O> {
  /**
   * List filter options
   */
  filter: F;

  /**
   * List order options
   * @example
   * UsersOrderBy.CREATED_AT_DESC = 'createdAt_DESC'
   */
  orderBy?: O;

  /**
   * Limit of items per page
   */
  limit?: number;

  /**
   * Offset of items per page
   */
  offset?: number;

  /**
   * If true, total count will be calculated by additional SELECT COUNT.
   * @default true
   */
  needCountTotal?: boolean;
}

/**
 * Options for creating list meta
 */
export interface CreateListMetaOptions<T extends ObjectLiteral> {
  /**
   * Typeorm query builder
   */
  query: SelectQueryBuilder<T>;

  /**
   * If true, total count will be calculated by additional SELECT COUNT.
   */
  needCountTotal?: boolean;

  /**
   * Limit of items
   */
  limit?: number;

  /**
   * Offset of items
   */
  offset?: number;
}
