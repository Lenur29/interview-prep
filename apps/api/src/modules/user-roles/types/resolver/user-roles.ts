import {
  ArgsType,
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

import { OffsetPaginated } from '@/pagination/offset/offset-pagination.types.js';
import { OffsetPaginationInput } from '@/pagination/offset/offset-pagination.input.js';
import { ExtractSortFields } from '@/sorting/sorting.types.js';
import { SystemRole } from '@/permissions/roles.js';
import { UserRole } from '../../user-role.entity.js';

@InputType()
export class UserRolesFilter {
  @Field(() => [String], { nullable: true })
  ids?: string[];

  @Field(() => [String], { nullable: true })
  userIds?: string[];

  @Field(() => [SystemRole], { nullable: true })
  roleIds?: SystemRole[];
}

export enum UserRolesOrderBy {
  createdAt_ASC = 'createdAt_ASC',
  createdAt_DESC = 'createdAt_DESC',
}

export type UserRolesOrderFields = ExtractSortFields<UserRolesOrderBy>;

registerEnumType(UserRolesOrderBy, { name: 'UserRolesOrderBy' });

@ArgsType()
export class FetchUserRolesInput extends OffsetPaginationInput {
  @Field(() => UserRolesOrderBy, { defaultValue: UserRolesOrderBy.createdAt_DESC })
  orderBy!: UserRolesOrderBy;

  @Field(() => UserRolesFilter, { nullable: true })
  filter?: UserRolesFilter;
}

@ObjectType()
export class PaginatedUserRoles extends OffsetPaginated(UserRole) {}
