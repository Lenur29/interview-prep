import { Module } from '@nestjs/common';

import { openaiClient } from './openai.providers.js';

@Module({
  providers: [openaiClient],
  exports: [openaiClient],
})
export class OpenAIModule {}
