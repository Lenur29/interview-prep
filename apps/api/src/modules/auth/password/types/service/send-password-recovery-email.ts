import { InputType } from '@nestjs/graphql';

@InputType()
export class SendPasswordRecoveryEmailOptions {
  email!: string;
  requestSecurityToken!: string;
}
