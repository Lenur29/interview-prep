import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ValidateOtpInput {
  /**
   * User ID to validate OTP for
   */
  @Field()
  userId!: string;

  /**
   * The OTP code to validate
   */
  @Field()
  token!: string;
}
