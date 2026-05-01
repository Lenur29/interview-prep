import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';

import { validateEnv } from '@/tools/validate-env.js';

export class OpenAIConfigEnvironmentVariables {
  @IsString()
  OPENAI_API_KEY!: string;

  @IsString()
  @IsOptional()
  OPENAI_CHAT_MODEL?: string;

  @IsString()
  @IsOptional()
  OPENAI_EMBEDDING_MODEL?: string;
}

export const OpenAIConfig = registerAs('openai', () => {
  const env = validateEnv(OpenAIConfigEnvironmentVariables);

  return {
    apiKey: env.OPENAI_API_KEY,
    chatModel: env.OPENAI_CHAT_MODEL ?? 'gpt-5',
    embeddingModel: env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-large',
  };
});
