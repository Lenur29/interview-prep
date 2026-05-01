import { Field, InputType } from '@nestjs/graphql';

export interface ISendInvitationPayload<U> {
  user: U;
}

@InputType()
export class SendInvitationInput {
  /**
   * User ID to send invitation to
   */
  @Field(() => String)
  userId!: string;
}
