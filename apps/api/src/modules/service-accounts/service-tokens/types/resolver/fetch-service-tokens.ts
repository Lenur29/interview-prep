import {
  ArgsType,
  Field,
  InputType,
  registerEnumType,
} from '@nestjs/graphql';

import { OffsetPaginationInput } from '@/pagination/offset/offset-pagination.input.js';
import { ExtractSortFields } from '@/sorting/sorting.types.js';

export enum ServiceTokensOrderBy {
  name_ASC = 'name_ASC',
  name_DESC = 'name_DESC',
  createdAt_ASC = 'createdAt_ASC',
  createdAt_DESC = 'createdAt_DESC',
}

export type ServiceTokensOrderFields = ExtractSortFields<ServiceTokensOrderBy>;

registerEnumType(ServiceTokensOrderBy, {
  name: 'ServiceTokensOrderBy',
});

@InputType()
export class ServiceTokensFilter {
  @Field(() => String, {
    nullable: true,
  })
  serviceAccountId?: string;

  /**
   * Search query
   * @example 'Token01'
   */
  @Field(() => String, {
    nullable: true,
  })
  search?: string;
}

@ArgsType()
export class FetchServiceTokensInput extends OffsetPaginationInput {
  @Field(() => ServiceTokensOrderBy, {
    defaultValue: ServiceTokensOrderBy.createdAt_ASC,
  })
  orderBy!: ServiceTokensOrderBy;

  @Field(() => ServiceTokensFilter, {
    nullable: true,
  })
  filter?: ServiceTokensFilter;
}
