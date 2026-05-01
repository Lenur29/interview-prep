import { type Type } from '@nestjs/common';
import {
  Field, Int,
  ObjectType,
} from '@nestjs/graphql';

@ObjectType()
export class OffsetPaginationPageInfo {
  /**
   * The total amount of pages
   * (total items / limit)
   */
  @Field(() => Int, {
    description: 'The total amount of pages (total items / limit)',
  })
  totalPages!: number;

  /**
   * The total amount of items
   */
  @Field(() => Int, {
    description: 'The total amount of items',
  })
  totalItems!: number;

  /**
   * The current page
   */
  @Field(() => Int, {
    description: 'The current page',
  })
  page!: number;

  /**
   * The amount of items to be requested per page
   */
  @Field(() => Int, {
    description: 'The amount of items to be requested per page',
  })
  limit!: number;
}

export interface IOffsetPaginated<T> {
  items: T[];
  pageInfo: OffsetPaginationPageInfo;
}

/**
 * Creates a new GraphQL object type with the name `Paginated${classRef.name}`
 * that implements the `IOffsetPaginated` interface
 * @param classRef The class reference of the items
 *
 * @example Create PaginatedUsers type
 * ```ts
 * @ObjectType()
 * class PaginatedUsers extends OffsetPaginated(User) {}
 * ```
 */
export function OffsetPaginated<T>(classRef: Type<T>): Type<IOffsetPaginated<T>> {
  @ObjectType({
    isAbstract: true,
  })
  abstract class OffsetPaginatedType implements IOffsetPaginated<T> {
    /**
     * The items of the current page
     */
    @Field(() => [classRef], {
      description: 'The items of the current page',
    })
    items!: T[];

    /**
     * The pagination information
     * (total pages, total items, current page, limit)
     */
    @Field(() => OffsetPaginationPageInfo)
    pageInfo!: OffsetPaginationPageInfo;
  }

  return OffsetPaginatedType as Type<IOffsetPaginated<T>>;
}
