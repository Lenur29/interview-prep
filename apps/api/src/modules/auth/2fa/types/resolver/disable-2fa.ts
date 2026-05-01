import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class Disable2faInput {
  /**
   * User ID to disable 2FA for
   */
  @Field()
  userId!: string;
}
