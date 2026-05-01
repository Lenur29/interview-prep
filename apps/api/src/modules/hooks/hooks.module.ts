import { Global, Module } from '@nestjs/common';

import { HooksService } from './hooks.service.js';

@Global()
@Module({
  providers: [HooksService],
  exports: [HooksService],
})
export class HooksModule {}
