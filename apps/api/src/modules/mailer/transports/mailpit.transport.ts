import { Injectable, Inject } from '@nestjs/common';
import { MailpitClient } from 'mailpit-api';
import type { ConfigType } from '@nestjs/config';

import { MailpitConfig } from '@/config/mailpit.config.js';
import { MailerConfig } from '@/config/mailer.config.js';
import type { MailerTransport, SendMailOptions } from './mailer-transport.interface.js';

@Injectable()
export class MailpitTransport implements MailerTransport {
  private readonly client: MailpitClient;

  constructor(
    @Inject(MailpitConfig.KEY) private readonly mailpitConfig: ConfigType<typeof MailpitConfig>,
    @Inject(MailerConfig.KEY) private readonly mailerConfig: ConfigType<typeof MailerConfig>,
  ) {
    this.client = new MailpitClient(mailpitConfig.url);
  }

  async send(options: SendMailOptions): Promise<void> {
    const from = options.from ?? this.mailerConfig.defaultFrom;

    await this.client.sendMessage({
      From: { Name: from.name, Email: from.email },
      To: [{ Email: options.to }],
      Subject: options.subject,
      HTML: options.html,
      Headers: options.replyTo ? { 'Reply-To': options.replyTo } : undefined,
      Attachments: options.attachments?.map((att) => ({
        Filename: att.name,
        Content: att.content,
        ContentType: att.contentType,
      })),
    });
  }
}
