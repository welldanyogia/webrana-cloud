import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { NotificationLog, NotificationChannel, NotificationStatus, NotificationEvent } from '@prisma/client';

import { InvalidNotificationEventException } from '../../common/exceptions/notification.exceptions';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthClientService, UserInfo } from '../auth-client/auth-client.service';
import { EmailService } from '../email/email.service';
import {
  orderCreatedTemplate,
  paymentConfirmedTemplate,
  vpsActiveTemplate,
  provisioningFailedTemplate,
  OrderCreatedData,
  PaymentConfirmedData,
  VpsActiveData,
  ProvisioningFailedData,
} from '../email/templates/email-templates';
import { QueueService } from '../queue/queue.service';
import {
  paymentConfirmedTelegramTemplate,
  vpsActiveTelegramTemplate,
  provisioningFailedTelegramTemplate,
} from '../telegram/telegram-templates';
import { TelegramService } from '../telegram/telegram.service';

import {
  NotificationEventType,
  OrderCreatedNotificationData,
  PaymentConfirmedNotificationData,
  VpsActiveNotificationData,
  ProvisioningFailedNotificationData,
  ListNotificationLogsDto,
  NotificationLogListResponseDto,
  NotificationLogResponseDto,
  SendNotificationResponseDto,
} from './dto/notification.dto';

interface NotificationResult {
  channel: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED' | 'QUEUED';
  recipient?: string;
  error?: string;
  logId?: string;
  jobId?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly telegramService: TelegramService,
    private readonly authClientService: AuthClientService,
    @Inject(forwardRef(() => QueueService))
    private readonly queueService: QueueService
  ) {}

  /**
   * Main notification entry point
   * Routes to queue for async processing, or processes synchronously if queue unavailable
   */
  async notify(
    event: NotificationEventType,
    userId: string,
    data: Record<string, any>,
    options?: { sync?: boolean }
  ): Promise<SendNotificationResponseDto> {
    this.logger.log(`Processing notification: event=${event}, userId=${userId}`);

    // Try to queue the notification for async processing
    if (!options?.sync && this.queueService.isQueueAvailable()) {
      const jobId = await this.queueService.addJob(event, userId, data);
      
      if (jobId) {
        this.logger.log(`Notification queued with jobId: ${jobId}`);
        return {
          success: true,
          message: 'Notification queued for processing',
          notifications: [{
            channel: 'QUEUE',
            status: 'QUEUED',
            jobId,
          }],
        };
      }
    }

    // Fallback to synchronous processing
    return this.processNotificationSync(event, userId, data);
  }

  /**
   * Process notification job from queue
   * Called by QueueProcessor
   */
  async processNotificationJob(
    event: string,
    userId: string,
    data: Record<string, any>
  ): Promise<void> {
    this.logger.log(`Processing queued notification: event=${event}, userId=${userId}`);
    await this.processNotificationSync(event as NotificationEventType, userId, data);
  }

  /**
   * Process notification synchronously
   */
  private async processNotificationSync(
    event: NotificationEventType,
    userId: string,
    data: Record<string, any>
  ): Promise<SendNotificationResponseDto> {
    let results: NotificationResult[];

    switch (event) {
      case NotificationEventType.ORDER_CREATED:
        results = await this.notifyOrderCreated(userId, data as OrderCreatedNotificationData);
        break;
      case NotificationEventType.PAYMENT_CONFIRMED:
        results = await this.notifyPaymentConfirmed(userId, data as PaymentConfirmedNotificationData);
        break;
      case NotificationEventType.VPS_ACTIVE:
        results = await this.notifyVpsActive(userId, data as VpsActiveNotificationData);
        break;
      case NotificationEventType.PROVISIONING_FAILED:
        results = await this.notifyProvisioningFailed(userId, data as ProvisioningFailedNotificationData);
        break;
      default:
        throw new InvalidNotificationEventException(event);
    }

    const successCount = results.filter((r) => r.status === 'SENT').length;
    const totalCount = results.length;

    return {
      success: successCount > 0,
      message: `${successCount}/${totalCount} notifications sent successfully`,
      notifications: results.map((r) => ({
        channel: r.channel,
        status: r.status,
        recipient: r.recipient,
        error: r.error,
      })),
    };
  }

  /**
   * Notify user about order creation
   * Channels: Email only
   */
  async notifyOrderCreated(
    userId: string,
    data: OrderCreatedNotificationData
  ): Promise<NotificationResult[]> {
    this.logger.log(`Sending ORDER_CREATED notification for order: ${data.orderNumber}`);

    const results: NotificationResult[] = [];
    const user = await this.getUserInfo(userId);

    if (!user) {
      this.logger.warn(`User ${userId} not found, skipping notification`);
      results.push({
        channel: 'EMAIL',
        status: 'SKIPPED',
        error: 'User not found',
      });
      return results;
    }

    // Email notification
    const emailData: OrderCreatedData = {
      orderNumber: data.orderNumber,
      customerName: user.name,
      planName: data.planName,
      duration: data.duration,
      durationUnit: data.durationUnit,
      basePrice: data.basePrice,
      discount: data.discount,
      finalPrice: data.finalPrice,
      invoiceUrl: data.invoiceUrl,
    };

    const emailTemplate = orderCreatedTemplate(emailData);
    const emailResult = await this.sendEmailNotification(
      userId,
      NotificationEvent.ORDER_CREATED,
      user.email,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text,
      data
    );
    results.push(emailResult);

    return results;
  }

  /**
   * Notify user about payment confirmation
   * Channels: Email + Telegram
   */
  async notifyPaymentConfirmed(
    userId: string,
    data: PaymentConfirmedNotificationData
  ): Promise<NotificationResult[]> {
    this.logger.log(`Sending PAYMENT_CONFIRMED notification for order: ${data.orderNumber}`);

    const results: NotificationResult[] = [];
    const user = await this.getUserInfo(userId);

    if (!user) {
      this.logger.warn(`User ${userId} not found, skipping notification`);
      results.push({
        channel: 'EMAIL',
        status: 'SKIPPED',
        error: 'User not found',
      });
      return results;
    }

    // Email notification
    const emailData: PaymentConfirmedData = {
      orderNumber: data.orderNumber,
      customerName: user.name,
      planName: data.planName,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paidAt: data.paidAt,
    };

    const emailTemplate = paymentConfirmedTemplate(emailData);
    const emailResult = await this.sendEmailNotification(
      userId,
      NotificationEvent.PAYMENT_CONFIRMED,
      user.email,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text,
      data
    );
    results.push(emailResult);

    // Telegram notification (if user has chatId)
    if (user.telegramChatId) {
      const telegramMessage = paymentConfirmedTelegramTemplate({
        orderNumber: data.orderNumber,
        planName: data.planName,
        amount: data.amount,
        paidAt: data.paidAt,
      });

      const telegramResult = await this.sendTelegramNotification(
        userId,
        NotificationEvent.PAYMENT_CONFIRMED,
        user.telegramChatId,
        telegramMessage,
        data
      );
      results.push(telegramResult);
    }

    return results;
  }

  /**
   * Notify user about VPS activation
   * Channels: Email + Telegram
   */
  async notifyVpsActive(
    userId: string,
    data: VpsActiveNotificationData
  ): Promise<NotificationResult[]> {
    this.logger.log(`Sending VPS_ACTIVE notification for order: ${data.orderNumber}`);

    const results: NotificationResult[] = [];
    const user = await this.getUserInfo(userId);

    if (!user) {
      this.logger.warn(`User ${userId} not found, skipping notification`);
      results.push({
        channel: 'EMAIL',
        status: 'SKIPPED',
        error: 'User not found',
      });
      return results;
    }

    // Email notification
    const emailData: VpsActiveData = {
      orderNumber: data.orderNumber,
      customerName: user.name,
      planName: data.planName,
      ipAddress: data.ipAddress,
      hostname: data.hostname,
      username: data.username,
      password: data.password,
      osName: data.osName,
      region: data.region,
      expiresAt: data.expiresAt,
    };

    const emailTemplate = vpsActiveTemplate(emailData);
    const emailResult = await this.sendEmailNotification(
      userId,
      NotificationEvent.VPS_ACTIVE,
      user.email,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text,
      data
    );
    results.push(emailResult);

    // Telegram notification (if user has chatId)
    if (user.telegramChatId) {
      const telegramMessage = vpsActiveTelegramTemplate({
        orderNumber: data.orderNumber,
        planName: data.planName,
        ipAddress: data.ipAddress,
        hostname: data.hostname,
        username: data.username,
        password: data.password,
        expiresAt: data.expiresAt,
      });

      const telegramResult = await this.sendTelegramNotification(
        userId,
        NotificationEvent.VPS_ACTIVE,
        user.telegramChatId,
        telegramMessage,
        data
      );
      results.push(telegramResult);
    }

    return results;
  }

  /**
   * Notify user about provisioning failure
   * Channels: Email + Telegram
   */
  async notifyProvisioningFailed(
    userId: string,
    data: ProvisioningFailedNotificationData
  ): Promise<NotificationResult[]> {
    this.logger.log(`Sending PROVISIONING_FAILED notification for order: ${data.orderNumber}`);

    const results: NotificationResult[] = [];
    const user = await this.getUserInfo(userId);

    if (!user) {
      this.logger.warn(`User ${userId} not found, skipping notification`);
      results.push({
        channel: 'EMAIL',
        status: 'SKIPPED',
        error: 'User not found',
      });
      return results;
    }

    // Email notification
    const emailData: ProvisioningFailedData = {
      orderNumber: data.orderNumber,
      customerName: user.name,
      planName: data.planName,
      errorMessage: data.errorMessage,
      supportEmail: data.supportEmail,
    };

    const emailTemplate = provisioningFailedTemplate(emailData);
    const emailResult = await this.sendEmailNotification(
      userId,
      NotificationEvent.PROVISIONING_FAILED,
      user.email,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text,
      data
    );
    results.push(emailResult);

    // Telegram notification (if user has chatId)
    if (user.telegramChatId) {
      const telegramMessage = provisioningFailedTelegramTemplate({
        orderNumber: data.orderNumber,
        planName: data.planName,
        errorMessage: data.errorMessage,
      });

      const telegramResult = await this.sendTelegramNotification(
        userId,
        NotificationEvent.PROVISIONING_FAILED,
        user.telegramChatId,
        telegramMessage,
        data
      );
      results.push(telegramResult);
    }

    return results;
  }

  /**
   * Get notification logs
   */
  async getNotificationLogs(
    query: ListNotificationLogsDto
  ): Promise<NotificationLogListResponseDto> {
    const { page = 1, limit = 20, userId, event, channel, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (event) where.event = event as NotificationEvent;
    if (channel) where.channel = channel as NotificationChannel;
    if (status) where.status = status as NotificationStatus;

    const [logs, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return {
      data: logs.map((log) => this.toLogResponseDto(log)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // Private helper methods
  // ============================================

  /**
   * Get user info from auth service
   */
  private async getUserInfo(userId: string): Promise<UserInfo | null> {
    try {
      return await this.authClientService.getUserById(userId);
    } catch (error) {
      this.logger.error(`Failed to get user info for ${userId}: ${error}`);
      return null;
    }
  }

  /**
   * Send email notification and log result
   */
  private async sendEmailNotification(
    userId: string,
    event: NotificationEvent,
    email: string,
    subject: string,
    html: string,
    text: string,
    payload: Record<string, any>
  ): Promise<NotificationResult> {
    // Create log entry first
    const log = await this.prisma.notificationLog.create({
      data: {
        userId,
        event,
        channel: 'EMAIL',
        status: 'QUEUED',
        recipient: email,
        subject,
        content: html,
        payload: payload as any,
      },
    });

    // Send email
    const result = await this.emailService.sendEmail({
      to: email,
      subject,
      html,
      text,
    });

    // Update log with result
    await this.prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: result.success ? 'SENT' : 'FAILED',
        error: result.error,
        sentAt: result.success ? new Date() : null,
      },
    });

    return {
      channel: 'EMAIL',
      status: result.success ? 'SENT' : 'FAILED',
      recipient: email,
      error: result.error,
      logId: log.id,
    };
  }

  /**
   * Send Telegram notification and log result
   */
  private async sendTelegramNotification(
    userId: string,
    event: NotificationEvent,
    chatId: string,
    message: string,
    payload: Record<string, any>
  ): Promise<NotificationResult> {
    // Create log entry first
    const log = await this.prisma.notificationLog.create({
      data: {
        userId,
        event,
        channel: 'TELEGRAM',
        status: 'QUEUED',
        recipient: chatId,
        content: message,
        payload: payload as any,
      },
    });

    // Send Telegram message
    const result = await this.telegramService.sendMessage({
      chatId,
      message,
    });

    // Update log with result
    await this.prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: result.success ? 'SENT' : 'FAILED',
        error: result.error,
        sentAt: result.success ? new Date() : null,
      },
    });

    return {
      channel: 'TELEGRAM',
      status: result.success ? 'SENT' : 'FAILED',
      recipient: chatId,
      error: result.error,
      logId: log.id,
    };
  }

  /**
   * Map NotificationLog to response DTO
   */
  private toLogResponseDto(log: NotificationLog): NotificationLogResponseDto {
    return {
      id: log.id,
      userId: log.userId,
      event: log.event,
      channel: log.channel,
      status: log.status,
      recipient: log.recipient,
      subject: log.subject ?? undefined,
      error: log.error ?? undefined,
      sentAt: log.sentAt?.toISOString(),
      createdAt: log.createdAt.toISOString(),
    };
  }
}
