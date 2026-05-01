import { registerEnumType } from '@nestjs/graphql';

export enum User2faMethod {
  AUTHENTICATOR = 'AUTHENTICATOR',
  PASSKEY = 'PASSKEY',
}

registerEnumType(User2faMethod, {
  name: 'User2faMethod',
});
