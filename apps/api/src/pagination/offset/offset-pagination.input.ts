import {
  ArgsType,
  Field, Int,
} from '@nestjs/graphql';

import { PAGINATION_DEFAULT_LIMIT } from '../constants.js';

@ArgsType()
export class OffsetPaginationInput {
  /**
   * the amount of items to be requested per page
   */
  @Field(() => Int, {
    description: 'the amount of items to be requested per page',
    defaultValue: PAGINATION_DEFAULT_LIMIT,
    nullable: true,
  })
  limit?: number;

  /**
   * @default 1
   * the page that is requested
   */
  @Field(() => Int, {
    defaultValue: 1,
    description: 'the page that is requested',
  })
  page?: number = 1;
}
