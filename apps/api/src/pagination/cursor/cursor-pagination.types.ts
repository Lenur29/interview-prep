import { type Type } from '@nestjs/common';
import { Field, ObjectType } from '@nestjs/graphql';
import type { MaybeNull } from '@pcg/predicates';

@ObjectType()
export class CursorPaginationPageInfo {
  /**
   * The cursor to the first item in the list
   */
  @Field(() => String, {
    nullable: true,
  })
  startCursor!: MaybeNull<string>;

  /**
   * The cursor to the last item in the list
   */
  @Field(() => String, {
    nullable: true,
  })
  endCursor!: MaybeNull<string>;

  /**
   * Whether there are more items in the list before the start cursor
   */
  @Field(() => Boolean, {
    nullable: true,
  })
  hasPreviousPage?: boolean;

  /**
   * Whether there are more items in the list after the end cursor
   */
  @Field(() => Boolean, {
    nullable: true,
  })
  hasNextPage?: boolean;
}

/**
 * The edge type for cursor pagination
 */
export interface IEdge<T> {
  /**
   * The cursor for the item
   */
  cursor: string;

  /**
   * The item
   */
  node: T;
}

export interface ICursorPaginated<T> {
  /**
   * The list of edges
   */
  edges: IEdge<T>[];

  /**
   * The pagination info
   */
  pageInfo: CursorPaginationPageInfo;
}

/**
 * Creates a new GraphQL object type with the name `Paginated${classRef.name}`
 * that implements the `ICursorPaginated` interface
 * @param classRef The class reference of the items
 *
 * @example Create PaginatedMessages type
 * ```ts
 * @ObjectType()
 * class PaginatedMessages extends CursorPaginated(Message) {}
 * ```
 */
export function CursorPaginated<T>(classRef: Type<T>): Type<ICursorPaginated<T>> {
  @ObjectType(`${classRef.name}Edge`)
  abstract class EdgeType implements IEdge<T> {
    /**
     * The cursor for the item
     */
    @Field(() => String, {
      description: 'The cursor for the item',
    })
    cursor!: string;

    /**
     * The item
     */
    @Field(() => classRef, {
      description: 'The item',
    })
    node!: T;
  }

  @ObjectType({
    isAbstract: true,
  })
  abstract class CursorPaginatedType implements ICursorPaginated<T> {
    /**
     * The list of edges
     */
    @Field(() => [EdgeType], {
      description: 'The list of edges',
    })
    edges!: EdgeType[];

    /**
     * The pagination info
     */
    @Field(() => CursorPaginationPageInfo, {
      description: 'The pagination info',
    })
    pageInfo!: CursorPaginationPageInfo;
  }

  return CursorPaginatedType as Type<ICursorPaginated<T>>;
}

export enum CursorOrderBy {
  createdAt_ASC = 'createdAt_ASC',
  createdAt_DESC = 'createdAt_DESC',
}
