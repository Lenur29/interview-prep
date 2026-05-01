import { type GraphQLResolveInfo, Kind } from 'graphql';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

import { PAGINATION_MAX_LIMIT } from './constants.js';
import { type CreateListMetaOptions, type ListMeta } from './types.js';

export const truncPaginationLimit = (limit: number, maxLimit = PAGINATION_MAX_LIMIT) =>
  Math.min(limit, maxLimit);

/**
 * Determines whether the GraphQL query requires a total count of items.
 * @param info - The GraphQLResolveInfo object containing information about the query.
 * @returns A boolean indicating whether the query requires a total count of items.
 */
export const requiresTotalCount = (info: GraphQLResolveInfo): boolean => {
  const fieldNode = info.fieldNodes[0];

  if (!fieldNode.selectionSet) {
    return false;
  }

  for (const selection of fieldNode.selectionSet.selections) {
    if (selection.kind === Kind.FIELD && selection.name.value === 'pageInfo') {
      if (selection.selectionSet) {
        for (const pageInfoSelection of selection.selectionSet.selections) {
          if (
            pageInfoSelection.kind === Kind.FIELD
            && (pageInfoSelection.name.value === 'totalPages' || pageInfoSelection.name.value === 'totalItems')
          ) {
            return true;
          }
        }
      }
    }
  }

  const fragments = Object.values(info.fragments);
  for (const fragment of fragments) {
    for (const pageInfoSelection of fragment.selectionSet.selections) {
      if (
        pageInfoSelection.kind === Kind.FIELD
        && (pageInfoSelection.name.value === 'totalPages' || pageInfoSelection.name.value === 'totalItems')
      ) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Returns total count of items with typeorm query
 * @param query - typeorm query builder
 * @returns total count of items
 */
export const fetchTotalWithQuery = async <T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
): Promise<number> => {
  const totalQueryBuilder = query.clone();

  // Clear any pagination settings
  totalQueryBuilder
    .offset(undefined)
    .limit(undefined)
    .skip(undefined)
    .take(undefined)
    .orderBy();

  const hasDistinctOn = totalQueryBuilder.expressionMap.selectDistinctOn.length > 0;
  const isGrouped = totalQueryBuilder.expressionMap.groupBys.length > 0;

  // Check if the original query has DISTINCT ON or GROUP BY
  if (hasDistinctOn || isGrouped) {
    // Wrap the query (either with DISTINCT ON or GROUP BY) in a subquery and count the results
    const subQuery = totalQueryBuilder.getQuery();

    const result = await query.connection
      .createQueryBuilder()
      .select('COUNT(*)', 'rowsCount')
      .from(`(${subQuery})`, 'subQuery')
      .setParameters(totalQueryBuilder.getParameters())
      .getRawOne<{
      rowsCount: number;
    }>();

    return result?.rowsCount ?? 0;
  }

  // If no DISTINCT ON or GROUP BY, just get the count directly
  return await totalQueryBuilder.getCount();
};

/**
 * Create list meta object
 * @returns list meta object
 * @example
 * class UsersService {
 *  async getMany(opts: GetManyUsersOptions): Promise<[User[], ListMeta]> {
 *    ...
 *   return Promise.all([
 *     query.getMany(),
 *     createListMeta<User>({
 *       query,
 *       needCountTotal,
 *       limit,
 *       offset,
 *     }),
 *   ]);
 * }
 */
export const createListMeta = async <T extends ObjectLiteral>(
  {
    query,
    needCountTotal = false,
    limit,
    offset,
  }: CreateListMetaOptions<T>,
): Promise<ListMeta> => {
  const meta: ListMeta = {
    limit,
    offset,
  };

  if (needCountTotal) {
    meta.total = await fetchTotalWithQuery(query);
  }

  return meta;
};
