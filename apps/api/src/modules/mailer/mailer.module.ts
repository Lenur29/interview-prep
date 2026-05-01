import { Global, Module } from '@nestjs/common';

import { MAILER_TRANSPORT } from './mailer.constants.js';
import { MailerService } from './mailer.service.js';
import { MailpitTransport } from './transports/mailpit.transport.js';

@Global()
@Module({
  providers: [
    {
      provide: MAILER_TRANSPORT,
      useClass: MailpitTransport,
    },
    MailerService,
  ],
  exports: [MailerService],
})
export class MailerModule {}
