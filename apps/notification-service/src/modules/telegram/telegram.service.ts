import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';

import {
  TelegramSendFailedException,
  TelegramConfigurationException,
} from '../../common/exceptions/notification.exceptions';

export interface SendTelegramOptions {
  chatId: string;
  message: string;
  parseMode?: 'MarkdownV2' | 'HTML' | 'Markdown';
}

export interface TelegramResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;
  private readonly isConfigured: boolean;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.isEnabled = this.configService.get<string>('TELEGRAM_ENABLED', 'false') === 'true';
    
    this.isConfigured = !!token;

    if (this.isConfigured && this.isEnabled) {
      this.bot = new Telegraf(token!);
      this.logger.log('Telegram bot initialized');
    } else if (!this.isConfigured) {
      this.logger.warn('Telegram bot not configured. TELEGRAM_BOT_TOKEN missing.');
    } else {
      this.logger.log('Telegram bot disabled via TELEGRAM_ENABLED=false');
    }
  }

  async onModuleInit() {
    if (this.bot && this.isEnabled) {
      try {
        const botInfo = await this.bot.telegram.getMe();
        this.logger.log(`Telegram bot connected: @${botInfo.username}`);
      } catch (error) {
        this.logger.error('Failed to connect Telegram bot', error);
      }
    }
  }

  async onModuleDestroy() {
    if (this.bot) {
      this.bot.stop();
    }
  }

  /**
   * Check if Telegram service is configured
   */
  isTelegramConfigured(): boolean {
    return this.isConfigured && this.isEnabled;
  }

  /**
   * Send a Telegram message
   */
  async sendMessage(options: SendTelegramOptions): Promise<TelegramResult> {
    const { chatId, message, parseMode = 'MarkdownV2' } = options;

    this.logger.log(`Sending Telegram message to chatId: ${chatId}`);

    if (!this.isConfigured || !this.bot) {
      this.logger.warn('Telegram not configured, skipping send');
      return {
        success: false,
        error: 'Telegram service not configured',
      };
    }

    if (!this.isEnabled) {
      this.logger.warn('Telegram disabled, skipping send');
      return {
        success: false,
        error: 'Telegram service disabled',
      };
    }

    try {
      const result = await this.bot.telegram.sendMessage(chatId, message, {
        parse_mode: parseMode,
      });

      this.logger.log(`Telegram message sent successfully. MessageId: ${result.message_id}`);

      return {
        success: true,
        messageId: result.message_id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send Telegram message to ${chatId}: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send Telegram message with exception on failure
   */
  async sendMessageOrFail(options: SendTelegramOptions): Promise<number> {
    if (!this.isConfigured) {
      throw new TelegramConfigurationException('Bot token not configured');
    }

    if (!this.isEnabled) {
      throw new TelegramConfigurationException('Telegram disabled');
    }

    const result = await this.sendMessage(options);

    if (!result.success) {
      throw new TelegramSendFailedException(options.chatId, result.error);
    }

    return result.messageId!;
  }

  /**
   * Send plain text message (no formatting)
   */
  async sendPlainMessage(chatId: string, message: string): Promise<TelegramResult> {
    if (!this.bot) {
      return { success: false, error: 'Telegram service not configured' };
    }

    try {
      const result = await this.bot.telegram.sendMessage(chatId, message);
      return { success: true, messageId: result.message_id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }
}
