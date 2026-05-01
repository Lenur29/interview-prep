import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class HandleInvitationLinkOpenInput {
  /**
   * User id who opened the invitation link
   */
  @Field({
    description: 'User id who opened the invitation link',
  })
  userId!: string;
}
