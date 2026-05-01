import { registerAs } from '@nestjs/config';
import {
  IsEnum, IsOptional, IsString,
} from 'class-validator';

import { validateEnv } from '@/tools/validate-env.js';
import { S3Provider } from '@/types/s3.js';

class S3EnvironmentVariables {
  @IsOptional()
  @IsString()
  AWS_S3_ACCESS_KEY_ID?: string;

  @IsOptional()
  @IsString()
  AWS_S3_SECRET_ACCESS_KEY?: string;

  @IsString()
  AWS_S3_REGION!: string;

  @IsString()
  AWS_S3_BUCKET!: string;

  @IsString()
  AWS_S3_PRIVATE_BUCKET!: string;

  @IsOptional()
  @IsEnum(S3Provider)
  AWS_S3_PROVIDER?: S3Provider;

  @IsOptional()
  @IsString()
  AWS_S3_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  AWS_S3_FORCE_PATH_STYLE?: string;

  @IsOptional()
  @IsString()
  AWS_S3_CDN_URL?: string;
}

export const S3Config = registerAs('S3Config', () => {
  const env = validateEnv(S3EnvironmentVariables);

  return {
    accessKeyId: env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_S3_SECRET_ACCESS_KEY,
    region: env.AWS_S3_REGION,
    bucket: env.AWS_S3_BUCKET,
    privateBucket: env.AWS_S3_PRIVATE_BUCKET,
    provider: env.AWS_S3_PROVIDER ?? S3Provider.AWS,
    endpoint: env.AWS_S3_ENDPOINT,
    forcePathStyle: env.AWS_S3_FORCE_PATH_STYLE === 'true',
    cdnUrl: env.AWS_S3_CDN_URL,
  };
});
