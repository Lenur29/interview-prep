import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class VerifyOtpInput {
  /**
   * User ID to verify OTP for
   */
  @Field()
  userId!: string;

  /**
   * The OTP code to verify
   */
  @Field()
  token!: string;
}
