import {
  Field, InputType, ObjectType,
} from '@nestjs/graphql';

@InputType()
export class DeleteUserInput {
  /**
   * User ID to delete
   */
  @Field()
  id!: string;
}

@ObjectType()
export class DeleteUserPayload {
  /**
   * Deleted user ID
   */
  @Field()
  id!: string;
}
