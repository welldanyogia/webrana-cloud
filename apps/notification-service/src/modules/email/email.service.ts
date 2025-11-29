import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

import {
  EmailSendFailedException,
  EmailConfigurationException,
} from '../../common/exceptions/notification.exceptions';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const secure = this.configService.get<string>('SMTP_SECURE', 'false') === 'true';
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.from = this.configService.get<string>('SMTP_FROM', 'WeBrana Cloud <noreply@webrana.id>');

    this.isConfigured = !!(host && user && pass);

    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });

      this.logger.log(`Email service configured with SMTP: ${host}:${port}`);
    } else {
      this.transporter = null;
      this.logger.warn(
        'Email service not configured. SMTP_HOST, SMTP_USER, or SMTP_PASS missing.'
      );
    }
  }

  /**
   * Check if email service is configured
   */
  isEmailConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Send an email
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    const { to, subject, html, text } = options;

    this.logger.log(`Sending email to: ${to}, subject: ${subject}`);

    if (!this.isConfigured || !this.transporter) {
      this.logger.warn('Email not configured, skipping send');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      });

      this.logger.log(`Email sent successfully. MessageId: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email to ${to}: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send email with exception on failure
   */
  async sendEmailOrFail(options: SendEmailOptions): Promise<string> {
    if (!this.isConfigured) {
      throw new EmailConfigurationException('SMTP not configured');
    }

    const result = await this.sendEmail(options);

    if (!result.success) {
      throw new EmailSendFailedException(options.to, result.error);
    }

    return result.messageId!;
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection verification failed', error);
      return false;
    }
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
