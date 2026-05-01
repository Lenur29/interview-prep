import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SetMyPushNotificationsInput {
  /**
   * FCM registration token. Pass a string to enable push notifications and
   * remember the token, or omit / pass null to disable and clear the saved
   * token.
   */
  @Field(() => String, {
    nullable: true,
  })
  token?: string | null;
}
