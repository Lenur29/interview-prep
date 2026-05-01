import { truncPaginationLimit } from '../tools.js';
import { CursorErrorMessage, InvalidCursorError } from './cursor-pagination.exception.js';
import { type CursorPaginationInput } from './cursor-pagination.input.js';
import {
  CursorOrderBy, CursorPaginationPageInfo, type ICursorPaginated,
} from './cursor-pagination.types.js';

/**
 * Encode cursor string to base64.
 * @param str - Cursor string.
 * @example
 * const cursor = '2020-01-01T00:00:00.000Z';
 * // encoded = 'MjAyMC0wMS0wMVQwMDowMDowMC4wMDBa';
 */
const encodeCursor = (str: string): string => {
  return Buffer
    .from(str)
    .toString('base64');
};

/**
 * Decode cursor string from base64.
 * @param encoded - Encoded cursor string (base64).
 * @example
 * const encoded = 'MjAyMC0wMS0wMVQwMDowMDowMC4wMDBa';
 * // cursor = '2020-01-01T00:00:00.000Z';
 */
const decodeCursor = (encoded: string): string => {
  return Buffer
    .from(encoded, 'base64')
    .toString('binary');
};

export interface CursorPaginationFilter {
  /**
   * Return only items created after this date.
   **/
  createdAfter?: Date;

  /**
   * Return only items created before this date.
   * */
  createdBefore?: Date;
}

export interface CursorPaginationOptions {
  /**
   * Limit of items to return.
   */
  limit?: number;

  /**
   * Filter options.
   */
  filter: CursorPaginationFilter;

  /**
   * Order by options.
   */
  orderBy: CursorOrderBy;

  /**
   * If true, the total count of items will be returned.
   */
  needCountTotal: false;
}

export const createCursorPaginationOptions = (meta: CursorPaginationInput): CursorPaginationOptions => {
  const {
    first,
    last,
    before,
    after,
  } = meta;

  if ((!first && !last) || (first && last)) {
    throw new InvalidCursorError(CursorErrorMessage.FIRST_OR_LAST);
  }

  const options: CursorPaginationOptions = {
    filter: {
    },
    needCountTotal: false,

    // If first is provided, we need to sort in ascending order, otherwise descending.
    orderBy: first ? CursorOrderBy.createdAt_ASC : CursorOrderBy.createdAt_DESC,
  };

  /**
   * If first or last is provided, we need to add 1 to the limit to determine if there is a next or previous page.
   */
  options.limit = truncPaginationLimit(first ?? last!) + 1;

  if (after) {
    options.filter.createdAfter = new Date(decodeCursor(after));
  }

  if (before) {
    options.filter.createdBefore = new Date(decodeCursor(before));
  }

  return options;
};

export const cursorPaginationOutput = <T extends { createdAt: Date }>(nodes: T[], meta: CursorPaginationInput): ICursorPaginated<T> => {
  const {
    first,
    last,
    after,
    before,
  } = meta;
  const pageInfo: CursorPaginationPageInfo = new CursorPaginationPageInfo();
  const limit = truncPaginationLimit(first ?? last ?? 0);
  const hasOneMorePage: boolean = nodes.length > limit;

  pageInfo.hasPreviousPage = !!(last && hasOneMorePage) || !!after;
  pageInfo.hasNextPage = !!(first && hasOneMorePage) || !!before;

  if (hasOneMorePage) {
    nodes.pop();
  }

  if (last) {
    nodes.reverse();
  }

  const edges = nodes.map((value) => {
    const createdAtStr = value.createdAt instanceof Date
      ? value.createdAt.toISOString()
      : value.createdAt;

    return {
      node: value,
      cursor: encodeCursor(createdAtStr),
    };
  });

  pageInfo.startCursor = edges.length > 0 ? edges[0].cursor : null;
  pageInfo.endCursor = edges.length > 0 ? edges.at(-1)?.cursor ?? null : null;

  return {
    edges,
    pageInfo,
  };
};
