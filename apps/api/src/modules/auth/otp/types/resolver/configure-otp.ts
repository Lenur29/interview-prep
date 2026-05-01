import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ConfigureOtpInput {
  /**
   * User ID to configure OTP for
   */
  @Field()
  userId!: string;
}
