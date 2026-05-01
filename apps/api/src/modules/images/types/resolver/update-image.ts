import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateImageInput {
  /**
   * Image ID to update
   */
  @Field()
  id!: string;
}
