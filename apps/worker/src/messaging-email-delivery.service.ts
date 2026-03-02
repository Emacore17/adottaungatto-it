import { loadWorkerEnv } from '@adottaungatto/config';
import type { MessageEmailNotificationPayload } from '@adottaungatto/types';
import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import nodemailer from 'nodemailer';

type MailTransport = {
  close?: () => void;
  sendMail: (message: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }) => Promise<unknown>;
  verify?: () => Promise<unknown>;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const sanitizeHeader = (value: string): string => value.replace(/[\r\n]+/g, ' ').trim();

const buildDefaultTransport = (env: ReturnType<typeof loadWorkerEnv>): MailTransport =>
  nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth:
      env.SMTP_USERNAME.trim().length > 0
        ? {
            user: env.SMTP_USERNAME,
            pass: env.SMTP_PASSWORD,
          }
        : undefined,
  });

@Injectable()
export class MessagingEmailDeliveryService implements OnModuleDestroy {
  private readonly env = loadWorkerEnv();
  private readonly logger = new Logger(MessagingEmailDeliveryService.name);
  private readonly transport: MailTransport;

  constructor(transport?: MailTransport) {
    this.transport = transport ?? buildDefaultTransport(this.env);
  }

  async onModuleDestroy(): Promise<void> {
    this.transport.close?.();
  }

  async verifyConnection(): Promise<void> {
    if (typeof this.transport.verify !== 'function') {
      return;
    }

    await this.transport.verify();
    this.logger.log(`SMTP connection verified on ${this.env.SMTP_HOST}:${this.env.SMTP_PORT}`);
  }

  async sendMessageNotification(payload: MessageEmailNotificationPayload): Promise<void> {
    const threadUrl = new URL(`/messaggi/${payload.threadId}`, this.env.WEB_APP_URL).toString();
    const listingTitle = sanitizeHeader(payload.listingTitle);
    const senderEmail = sanitizeHeader(payload.senderEmail);
    const preview = payload.messagePreview.trim();
    const subject = sanitizeHeader(`Nuovo messaggio per "${listingTitle}"`);

    await this.transport.sendMail({
      from: `"${sanitizeHeader(this.env.SMTP_FROM_NAME)}" <${this.env.SMTP_FROM_EMAIL}>`,
      to: payload.recipientEmail,
      subject,
      text: this.buildTextBody({
        listingTitle,
        senderEmail,
        preview,
        threadUrl,
        messageCreatedAt: payload.messageCreatedAt,
      }),
      html: this.buildHtmlBody({
        listingTitle,
        senderEmail,
        preview,
        threadUrl,
        messageCreatedAt: payload.messageCreatedAt,
      }),
    });
  }

  private buildTextBody(input: {
    listingTitle: string;
    senderEmail: string;
    preview: string;
    threadUrl: string;
    messageCreatedAt: string;
  }): string {
    return [
      'Hai ricevuto un nuovo messaggio su Adotta un Gatto.',
      '',
      `Annuncio: ${input.listingTitle}`,
      `Da: ${input.senderEmail}`,
      `Ricevuto il: ${this.formatDate(input.messageCreatedAt)}`,
      '',
      'Anteprima:',
      input.preview,
      '',
      `Apri la conversazione: ${input.threadUrl}`,
    ].join('\n');
  }

  private buildHtmlBody(input: {
    listingTitle: string;
    senderEmail: string;
    preview: string;
    threadUrl: string;
    messageCreatedAt: string;
  }): string {
    return [
      '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;">',
      '<p style="margin:0 0 16px;">Hai ricevuto un nuovo messaggio su <strong>Adotta un Gatto</strong>.</p>',
      `<p style="margin:0 0 8px;"><strong>Annuncio:</strong> ${escapeHtml(input.listingTitle)}</p>`,
      `<p style="margin:0 0 8px;"><strong>Da:</strong> ${escapeHtml(input.senderEmail)}</p>`,
      `<p style="margin:0 0 16px;"><strong>Ricevuto il:</strong> ${escapeHtml(this.formatDate(input.messageCreatedAt))}</p>`,
      '<div style="margin:0 0 20px;padding:16px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;">',
      `<p style="margin:0;font-size:14px;white-space:pre-wrap;">${escapeHtml(input.preview)}</p>`,
      '</div>',
      `<a href="${escapeHtml(input.threadUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#111827;color:#ffffff;text-decoration:none;font-weight:600;">Apri la conversazione</a>`,
      '</div>',
    ].join('');
  }

  private formatDate(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('it-IT', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed);
  }
}
