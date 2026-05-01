import { Field, InputType } from '@nestjs/graphql';

import { SystemRole } from '@/permissions/roles.js';

@InputType()
export class CreateUserRoleInput {
  @Field()
  userId!: string;

  @Field(() => SystemRole)
  roleId!: SystemRole;
}
