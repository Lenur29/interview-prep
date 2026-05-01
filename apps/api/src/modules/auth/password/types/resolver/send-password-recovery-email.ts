import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SendPasswordRecoveryEmailInput {
  @Field()
  email!: string;
}
