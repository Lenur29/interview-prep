import { ArgsType, Field, ObjectType } from '@nestjs/graphql';

@ArgsType()
export class SessionLoggedOutSubscriptionInput {
  @Field({ description: 'Session hash (SHA256) to filter logout events' })
  sessionHash!: string;
}

@ObjectType()
export class SessionLoggedOutPayload {
  @Field({ description: 'SHA256 hash of the logged out session ID' })
  sessionHash!: string;

  @Field()
  logoutAt!: Date;
}

export interface SessionLoggedOutSubscriptionPayload {
  sessionLoggedOut: SessionLoggedOutPayload;
}

export const sessionLoggedOutSubscriptionFilter = (
  payload: SessionLoggedOutSubscriptionPayload,
  variables: SessionLoggedOutSubscriptionInput,
): boolean => {
  return payload.sessionLoggedOut.sessionHash === variables.sessionHash;
};
