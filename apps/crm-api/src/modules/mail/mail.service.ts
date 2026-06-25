import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * SMTP email sender (req 5). Configured via SMTP_HOST/PORT/USER/PASS/FROM.
 * When SMTP is not configured the service logs and no-ops, so local/dev
 * environments work without credentials.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    this.from = this.config.get<string>('SMTP_FROM') ?? 'CRM <no-reply@crm.local>';
    if (!host) {
      this.transporter = null;
      this.logger.warn('SMTP not configured — emails will be logged, not sent.');
      return;
    }
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  /** Whether real SMTP delivery is active. */
  get enabled(): boolean {
    return this.transporter !== null;
  }

  async send(msg: MailMessage): Promise<void> {
    const recipients = Array.isArray(msg.to) ? msg.to.filter(Boolean) : msg.to;
    if (!recipients || (Array.isArray(recipients) && recipients.length === 0)) return;
    if (!this.transporter) {
      this.logger.log(`[mail:stub] to=${recipients} subject="${msg.subject}"`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: recipients,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      });
    } catch (err) {
      // Email is best-effort — never fail the calling request because of it.
      this.logger.error(`Failed to send email "${msg.subject}": ${(err as Error).message}`);
    }
  }
}
