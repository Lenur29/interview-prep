import { Injectable, Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import Handlebars from 'handlebars';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { MailerConfig } from '@/config/mailer.config.js';
import { MAILER_TRANSPORT } from './mailer.constants.js';
import type { MailerTransport } from './transports/mailer-transport.interface.js';
import { type BinaryFile } from '@/modules/binary-files/binary-file.entity.js';

export interface SendMailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
  replyTo?: string;
  attachments?: BinaryFile[];
}

@Injectable()
export class MailerService {
  private templates = new Map<string, Handlebars.TemplateDelegate>();

  constructor(
    @Inject(MAILER_TRANSPORT) private readonly transport: MailerTransport,
    @Inject(MailerConfig.KEY) private readonly config: ConfigType<typeof MailerConfig>,
    // private readonly s3Service: S3Service,
  ) {
    this.registerPartials();
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    const html = this.renderTemplate(options.template, options.context);

    // const attachments = options.attachments?.length
    //   ? await this.prepareAttachments(options.attachments)
    //   : undefined;

    await this.transport.send({
      to: options.to,
      subject: options.subject,
      html,
      replyTo: options.replyTo,
      // attachments,
    });
  }

  // private async prepareAttachments(files: BinaryFile[]): Promise<Attachment[]> {
  //   return Promise.all(files.map((file) => this.downloadAndConvert(file)));
  // }

  // private async downloadAndConvert(file: BinaryFile): Promise<Attachment> {
  //   let buffer: Buffer;

  //   if (isS3FileLocation(file.location)) {
  //     // buffer = await this.s3Service.downloadLargeFileByChunks(
  //     //   file.location.bucket,
  //     //   file.location.path,
  //     // );
  //   } else if (isCustomFileLocation(file.location)) {
  //     const response = await fetch(file.location.url);
  //     buffer = Buffer.from(await response.arrayBuffer());
  //   } else {
  //     throw new Error('Unsupported file location type');
  //   }

  //   return {
  //     name: file.meta.name || 'attachment',
  //     content: buffer.toString('base64'),
  //     contentType: file.meta.mimeType || 'application/octet-stream',
  //   };
  // }

  private renderTemplate(name: string, context: Record<string, unknown>): string {
    let template = this.templates.get(name);

    if (!template) {
      const templatePath = path.join(this.config.templatesDir, `${name}.hbs`);
      const source = fs.readFileSync(templatePath, 'utf-8');
      template = Handlebars.compile(source);
      this.templates.set(name, template);
    }

    return template(context);
  }

  private registerPartials(): void {
    const partialsDir = path.join(this.config.templatesDir, 'partials');

    if (!fs.existsSync(partialsDir)) {
      return;
    }

    const files = fs.readdirSync(partialsDir);

    for (const file of files) {
      if (file.endsWith('.hbs')) {
        const name = path.basename(file, '.hbs');
        const content = fs.readFileSync(path.join(partialsDir, file), 'utf-8');
        Handlebars.registerPartial(name, content);
      }
    }
  }
}
