import { Inject, type Provider } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { OpenAI } from 'openai';

import { OpenAIConfig } from '@/config/index.js';

export const OPENAI_CLIENT = Symbol('OPENAI_CLIENT');

export const InjectOpenAI = () => Inject(OPENAI_CLIENT);

export const openaiClient: Provider = {
  inject: [OpenAIConfig.KEY],
  provide: OPENAI_CLIENT,
  useFactory: (openaiConfig: ConfigType<typeof OpenAIConfig>) => new OpenAI({
    apiKey: openaiConfig.apiKey,
  }),
};
