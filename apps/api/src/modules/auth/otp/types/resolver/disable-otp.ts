import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DisableOtpInput {
  /**
   * User ID to disable OTP for
   */
  @Field()
  userId!: string;
}
