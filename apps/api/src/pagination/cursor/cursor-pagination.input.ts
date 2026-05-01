import {
  ArgsType,
  Field, Int,
} from '@nestjs/graphql';
import { IsOptional, Min } from 'class-validator';

@ArgsType()
export class CursorPaginationInput {
  /**
   * The amount of items to be requested per page from the start
   * @example
   * ```graphql
   * query {
   *  messages(first: 3) {
   *   edges {
   *    cursor
   *    node {
   *     id
   *    }
   *   }
   *  }
   * }
   * ```
   */
  @Field(() => Int, {
    nullable: true,
  })
  @Min(1)
  @IsOptional()
  first?: number;

  /**
   * The cursor to start the pagination
   * @example
   * ```graphql
   * query {
   *  messages(first: 3, after: "xxx") {
   *   edges {
   *    cursor
   *    node {
   *     id
   *    }
   *   }
   *  }
   * }
   * ```
   */
  @Field(() => String, {
    nullable: true,
  })
  after?: string;

  /**
   * The amount of items to be requested per page from the end
   * @example
   * ```graphql
   * query {
   *  messages(last: 2) {
   *   edges {
   *    cursor
   *    node {
   *     id
   *    }
   *   }
   *  }
   * }
   * ```
   */
  @Field(() => Int, {
    nullable: true,
  })
  @Min(1)
  @IsOptional()
  last?: number;

  /**
   * The cursor to end the pagination
   * @example
   * ```graphql
   * query {
   *  messages(last: 2, before: "xxx") {
   *   edges {
   *    cursor
   *    node {
   *     id
   *    }
   *   }
   *  }
   * }
   * ```
   */
  @Field(() => String, {
    nullable: true,
  })
  before?: string;
}
