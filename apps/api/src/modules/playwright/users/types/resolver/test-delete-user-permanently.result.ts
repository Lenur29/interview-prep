import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Result for testDeleteUserPermanently mutation.
 */
@ObjectType()
export class TestDeleteUserPermanentlyResult {
  @Field()
  success!: boolean;

  @Field()
  userId!: string;

  @Field()
  userRolesDeleted!: number;

  @Field()
  sessionsDeleted!: number;
}
