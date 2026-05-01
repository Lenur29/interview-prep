export type SortOrder = 'ASC' | 'DESC';

export interface SortParams<T> {
  /**
   * Original sort field name.
   * @example
   * const orderBy = 'createdAt_ASC';
   * const sort = extractSortParams(orderBy); // sort.fieldName = 'uploaderName';
   * if (sort.fieldName === uploaderName) {
   *  ...
   * }
   */
  fieldName: T;

  /**
   * Database column name. Camel cased fieldName.
   * @example
   * const orderBy = 'createdAt_ASC';
   * const sort = extractSortParams(orderBy); // sort.columnName = 'created_at';
   * query.orderBy(`v.${sort.columnName}`, sort.direction);
   */
  columnName: string;

  /**
   * Sort direction (or order) (ASC | DESC)
   * @example
   * const orderBy = 'createdAt_ASC';
   * const sort = extractSortParams(orderBy); // sort.direction = 'ASC';
   * query.orderBy(`v.${sort.columnName}`, sort.direction);
   */
  direction: SortOrder;
}

/**
 * Extracts the field name from an orderBy string like 'fieldName_ASC' or 'fieldName_DESC'.
 * @example
 * type Fields = ExtractSortFields<'createdAt_ASC' | 'updatedAt_DESC'>; // 'createdAt' | 'updatedAt'
 */
export type ExtractSortFields<S extends string> = S extends `${infer F}_${string}` ? F : unknown;
