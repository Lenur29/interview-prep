import {
  ArgsType, Field, InputType, registerEnumType,
} from '@nestjs/graphql';

import { OffsetPaginationInput } from '@/pagination/offset/offset-pagination.input.js';
import { type ExtractSortFields } from '@/sorting/sorting.types.js';

import { UserStatus, UserType } from '../common.js';

@InputType()
export class UsersFilter {
  /**
   * Search query (search by email, first name, last name)
   * @example 'John'
   */
  @Field({
    nullable: true,
    description: 'Search query (search by email, first name, last name)',
  })
  search?: string;

  /**
   * List of certain users ids
   */
  @Field(() => [String], {
    nullable: true,
    description: 'List of certain users ids',
  })
  ids?: string[];

  /**
   * List of users ids to exclude
   */
  @Field(() => [String], {
    nullable: true,
  })
  exceptIds?: string[];

  /**
   * User type. Can be USER or SA (service account)
   */
  @Field(() => UserType, {
    defaultValue: UserType.USER,
    description: 'Find USER or SA (service account)',
  })
  type?: UserType;

  /**
   * Find users by statuses
   */
  @Field(() => [UserStatus], {
    description: 'Find users by statuses',
    nullable: true,
  })
  statuses?: UserStatus[];
}

export enum UsersOrderBy {
  createdAt_ASC = 'createdAt_ASC',
  createdAt_DESC = 'createdAt_DESC',
  fullName_ASC = 'fullName_ASC',
  fullName_DESC = 'fullName_DESC',
  email_ASC = 'email_ASC',
  email_DESC = 'email_DESC',
}

export type UsersOrderFields = ExtractSortFields<UsersOrderBy>;

registerEnumType(UsersOrderBy, {
  name: 'UsersOrderBy',
});

@ArgsType()
export class FetchUsersInput extends OffsetPaginationInput {
  @Field(() => UsersOrderBy, {
    defaultValue: UsersOrderBy.createdAt_DESC,
  })
  orderBy!: UsersOrderBy;

  @Field(() => UsersFilter, {
    nullable: true,
  })
  filter?: UsersFilter;
}
