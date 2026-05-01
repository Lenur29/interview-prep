import { Field, ObjectType } from '@nestjs/graphql';

import { RoleType, SystemRole } from '@/permissions/roles.js';

@ObjectType()
export class Role {
  @Field(() => SystemRole)
  id!: SystemRole;

  @Field()
  title!: string;

  @Field(() => RoleType)
  type!: RoleType;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String])
  permissions!: string[];
}
