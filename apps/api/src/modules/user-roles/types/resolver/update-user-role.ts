import { Field, InputType } from '@nestjs/graphql';

import { SystemRole } from '@/permissions/roles.js';

@InputType()
export class UpdateUserRoleInput {
  @Field()
  id!: string;

  @Field(() => SystemRole, { nullable: true })
  roleId?: SystemRole;
}
