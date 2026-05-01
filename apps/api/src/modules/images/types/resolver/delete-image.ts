import {
  Field, InputType, ObjectType,
} from '@nestjs/graphql';

@InputType()
export class DeleteImageInput {
  /**
   * Image ID to delete
   */
  @Field()
  id!: string;
}

@ObjectType()
export class DeleteImagePayload {
  /**
   * Deleted image ID
   */
  @Field()
  id!: string;
}
