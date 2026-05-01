import { type GraphQLResolveInfo } from 'graphql';

import { type ListMeta } from '../types.js';
import { PAGINATION_DEFAULT_LIMIT } from '../constants.js';
import { requiresTotalCount, truncPaginationLimit } from '../tools.js';
import { OffsetErrorMessage, OffsetPaginationError } from './offset-pagination.exception.js';
import { type OffsetPaginationInput } from './offset-pagination.input.js';
import { type IOffsetPaginated } from './offset-pagination.types.js';

export interface OffsetPaginationOptions {
  limit?: number;
  offset?: number;

  /**
   * If true, total count will be calculated by additional SELECT COUNT.
   * @default true
   */
  needCountTotal: boolean;
}

export interface CreateOffsetPaginationOptionsParams {
  maxLimit?: number;
  defaultLimit?: number;
}

export const createOffsetPaginationOptions = (
  input: OffsetPaginationInput,
  info: GraphQLResolveInfo,
  params?: CreateOffsetPaginationOptionsParams,
): OffsetPaginationOptions => {
  const options: OffsetPaginationOptions = {
    needCountTotal: requiresTotalCount(info),
    limit: params?.defaultLimit ?? PAGINATION_DEFAULT_LIMIT,
  };

  if (input.limit) {
    options.limit = truncPaginationLimit(input.limit, params?.maxLimit);

    if (input.page) {
      options.offset = (input.page - 1) * options.limit;
    }
  }

  return options;
};

export const offsetPaginatedOutput = <T>(items: T[], {
  limit,
  offset = 0,
  total = 0,
}: ListMeta): IOffsetPaginated<T> => {
  if (!limit) {
    throw new OffsetPaginationError(OffsetErrorMessage.OUTPUT_LIMIT);
  }

  return {
    items,
    pageInfo: {
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      page: (offset / limit) + 1,
      limit,
    },
  };
};
