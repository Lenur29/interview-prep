import { validateEnv } from '@/tools/validate-env.js';
import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';

class FrontendEnvironmentVariables {
  @IsString()
  LEMUR_APP_URL!: string;

  @IsOptional()
  @IsString()
  LEMUR_WEBAPP_URL?: string;
}

export const FrontendConfig = registerAs('FrontendConfig', () => {
  const env = validateEnv(FrontendEnvironmentVariables);

  return {
    adminUrl: env.LEMUR_APP_URL,
    webappUrl: env.LEMUR_WEBAPP_URL,
  };
});
