import { Global, Module } from '@nestjs/common';

import { CookieService } from './cookie.service.js';

@Global()
@Module({
  providers: [CookieService],
  exports: [CookieService],
})
export class CookieModule {}
