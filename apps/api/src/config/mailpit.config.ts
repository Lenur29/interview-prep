import { registerAs } from '@nestjs/config';
import { IsString, ValidateIf } from 'class-validator';

import { validateEnv } from '@/tools/validate-env.js';
import { EmailTransport } from '@/enums/email-transport.enum.js';

class MailpitEnvironmentVariables {
  @ValidateIf(() => process.env.EMAIL_TRANSPORT === EmailTransport.MAILPIT)
  @IsString()
  MAILPIT_URL!: string;
}

export const MailpitConfig = registerAs('mailpit', () => {
  const env = validateEnv(MailpitEnvironmentVariables);

  return {
    url: env.MAILPIT_URL ?? 'http://localhost:8025',
  };
});
