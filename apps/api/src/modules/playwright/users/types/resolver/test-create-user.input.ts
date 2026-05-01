import { Field, InputType } from '@nestjs/graphql';

import { SystemRole } from '@/permissions/roles.js';

/**
 * Input for testCreateUser mutation.
 * Only available when APP_ENV=local.
 *
 * User data (firstName, lastName, email) is auto-generated using faker.
 * If roleId is provided, a matching UserRole row is created.
 * If password is provided, it is bcrypt-hashed so the user can log in via the UI form.
 */
@InputType()
export class TestCreateUserInput {
  @Field(() => SystemRole, { nullable: true })
  roleId?: SystemRole;

  @Field(() => String, { nullable: true })
  password?: string;
}
