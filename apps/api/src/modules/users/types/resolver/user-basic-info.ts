import { Field, ObjectType } from '@nestjs/graphql';

/**
 * User basic info object type with limited fields.
 * Used for public queries where full user info is not needed.
 */
@ObjectType()
export class UserBasicInfo {
  @Field()
  id!: string;

  @Field()
  email!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;
}
