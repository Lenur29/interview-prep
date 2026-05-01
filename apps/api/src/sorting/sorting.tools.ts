import { snakeCase } from '@pcg/text-kit';

import { type SortOrder, type SortParams } from './sorting.types.js';

/**
 * Extract sort field name and sort direction from orderBy string.
 * @example
 * const orderBy = 'createdAt_ASC';
 *
 * // sort.fieldName = 'createdAt', sort.direction = 'ASC'; sort.columnName = 'created_at';
 * const sort = extractSortParams(orderBy);
 */
export const extractSortParams = <T>(orderBy: string): SortParams<T> => {
  const slices = orderBy.split('_');

  if (slices.length !== 2) {
    throw new Error('Invalid orderBy argument');
  }

  return {
    fieldName: slices[0] as unknown as T,
    direction: slices[1] as unknown as SortOrder,
    columnName: snakeCase(slices[0]),
  };
};
