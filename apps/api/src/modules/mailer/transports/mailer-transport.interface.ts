export interface Attachment {
  name: string;
  content: string; // Base64-encoded
  contentType: string;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  from?: { name: string; email: string };
  replyTo?: string;
  attachments?: Attachment[];
}

export interface MailerTransport {
  send(options: SendMailOptions): Promise<void>;
}
