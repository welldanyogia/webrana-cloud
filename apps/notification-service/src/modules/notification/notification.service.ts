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
  vpsExpiringSoonTemplate,
  vpsSuspendedTemplate,
  vpsDestroyedTemplate,
  renewalSuccessTemplate,
  renewalFailedTemplate,
  OrderCreatedData,
  PaymentConfirmedData,
  VpsActiveData,
  ProvisioningFailedData,
  VpsExpiringSoonData,
  VpsSuspendedData,
  VpsDestroyedData,
  RenewalSuccessData,
  RenewalFailedData,
} from '../email/templates/email-templates';
import { QueueService } from '../queue/queue.service';
import {
  paymentConfirmedTelegramTemplate,
  vpsActiveTelegramTemplate,
  provisioningFailedTelegramTemplate,
  vpsExpiringSoonTelegramTemplate,
  vpsSuspendedTelegramTemplate,
  vpsDestroyedTelegramTemplate,
  renewalSuccessTelegramTemplate,
  renewalFailedTelegramTemplate,
} from '../telegram/telegram-templates';
import { TelegramService } from '../telegram/telegram.service';
import { UserNotificationService, InAppNotificationType } from '../user-notification';
import { WebsocketService } from '../websocket/websocket.service';

import {
  NotificationEventType,
  OrderCreatedNotificationData,
  PaymentConfirmedNotificationData,
  VpsActiveNotificationData,
  ProvisioningFailedNotificationData,
  VpsExpiringSoonNotificationData,
  VpsSuspendedNotificationData,
  VpsDestroyedNotificationData,
  RenewalSuccessNotificationData,
  RenewalFailedNotificationData,
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
    private readonly queueService: QueueService,
    private readonly userNotificationService: UserNotificationService,
    private readonly websocketService: WebsocketService
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
      case NotificationEventType.VPS_EXPIRING_SOON:
        results = await this.notifyVpsExpiringSoon(userId, data as VpsExpiringSoonNotificationData);
        break;
      case NotificationEventType.VPS_SUSPENDED:
        results = await this.notifyVpsSuspended(userId, data as VpsSuspendedNotificationData);
        break;
      case NotificationEventType.VPS_DESTROYED:
        results = await this.notifyVpsDestroyed(userId, data as VpsDestroyedNotificationData);
        break;
      case NotificationEventType.RENEWAL_SUCCESS:
        results = await this.notifyRenewalSuccess(userId, data as RenewalSuccessNotificationData);
        break;
      case NotificationEventType.RENEWAL_FAILED:
        results = await this.notifyRenewalFailed(userId, data as RenewalFailedNotificationData);
        break;
      default:
        throw new InvalidNotificationEventException(event);
    }

    // Create in-app notification and push via WebSocket
    const inAppResult = await this.createInAppNotification(event, userId, data);
    if (inAppResult) {
      results.push(inAppResult);
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
   * Notify user about VPS expiring soon
   * Channels: Email + Telegram
   */
  async notifyVpsExpiringSoon(
    userId: string,
    data: VpsExpiringSoonNotificationData
  ): Promise<NotificationResult[]> {
    this.logger.log(`Sending VPS_EXPIRING_SOON notification for order: ${data.orderId}`);

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
    const emailData: VpsExpiringSoonData = {
      orderId: data.orderId,
      customerName: user.name,
      planName: data.planName,
      expiresAt: data.expiresAt,
      hoursRemaining: data.hoursRemaining,
      autoRenew: data.autoRenew,
    };

    const emailTemplate = vpsExpiringSoonTemplate(emailData);
    const emailResult = await this.sendEmailNotification(
      userId,
      NotificationEvent.VPS_EXPIRING_SOON,
      user.email,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text,
      data
    );
    results.push(emailResult);

    // Telegram notification (if user has chatId)
    if (user.telegramChatId) {
      const telegramMessage = vpsExpiringSoonTelegramTemplate({
        orderId: data.orderId,
        planName: data.planName,
        expiresAt: data.expiresAt,
        hoursRemaining: data.hoursRemaining,
        autoRenew: data.autoRenew,
      });

      const telegramResult = await this.sendTelegramNotification(
        userId,
        NotificationEvent.VPS_EXPIRING_SOON,
        user.telegramChatId,
        telegramMessage,
        data
      );
      results.push(telegramResult);
    }

    return results;
  }

  /**
   * Notify user about VPS being suspended
   * Channels: Email + Telegram
   */
  async notifyVpsSuspended(
    userId: string,
    data: VpsSuspendedNotificationData
  ): Promise<NotificationResult[]> {
    this.logger.log(`Sending VPS_SUSPENDED notification for order: ${data.orderId}`);

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
    const emailData: VpsSuspendedData = {
      orderId: data.orderId,
      customerName: user.name,
      planName: data.planName,
      suspendedAt: data.suspendedAt,
      gracePeriodHours: data.gracePeriodHours,
    };

    const emailTemplate = vpsSuspendedTemplate(emailData);
    const emailResult = await this.sendEmailNotification(
      userId,
      NotificationEvent.VPS_SUSPENDED,
      user.email,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text,
      data
    );
    results.push(emailResult);

    // Telegram notification (if user has chatId)
    if (user.telegramChatId) {
      const telegramMessage = vpsSuspendedTelegramTemplate({
        orderId: data.orderId,
        planName: data.planName,
        suspendedAt: data.suspendedAt,
        gracePeriodHours: data.gracePeriodHours,
      });

      const telegramResult = await this.sendTelegramNotification(
        userId,
        NotificationEvent.VPS_SUSPENDED,
        user.telegramChatId,
        telegramMessage,
        data
      );
      results.push(telegramResult);
    }

    return results;
  }

  /**
   * Notify user about VPS being destroyed/terminated
   * Channels: Email + Telegram
   */
  async notifyVpsDestroyed(
    userId: string,
    data: VpsDestroyedNotificationData
  ): Promise<NotificationResult[]> {
    this.logger.log(`Sending VPS_DESTROYED notification for order: ${data.orderId}`);

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
    const emailData: VpsDestroyedData = {
      orderId: data.orderId,
      customerName: user.name,
      planName: data.planName,
      reason: data.reason,
      terminatedAt: data.terminatedAt,
    };

    const emailTemplate = vpsDestroyedTemplate(emailData);
    const emailResult = await this.sendEmailNotification(
      userId,
      NotificationEvent.VPS_DESTROYED,
      user.email,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text,
      data
    );
    results.push(emailResult);

    // Telegram notification (if user has chatId)
    if (user.telegramChatId) {
      const telegramMessage = vpsDestroyedTelegramTemplate({
        orderId: data.orderId,
        planName: data.planName,
        reason: data.reason,
        terminatedAt: data.terminatedAt,
      });

      const telegramResult = await this.sendTelegramNotification(
        userId,
        NotificationEvent.VPS_DESTROYED,
        user.telegramChatId,
        telegramMessage,
        data
      );
      results.push(telegramResult);
    }

    return results;
  }

  /**
   * Notify user about successful VPS renewal
   * Channels: Email + Telegram
   */
  async notifyRenewalSuccess(
    userId: string,
    data: RenewalSuccessNotificationData
  ): Promise<NotificationResult[]> {
    this.logger.log(`Sending RENEWAL_SUCCESS notification for order: ${data.orderId}`);

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
    const emailData: RenewalSuccessData = {
      orderId: data.orderId,
      customerName: user.name,
      planName: data.planName,
      newExpiry: data.newExpiry,
      amount: data.amount,
    };

    const emailTemplate = renewalSuccessTemplate(emailData);
    const emailResult = await this.sendEmailNotification(
      userId,
      NotificationEvent.RENEWAL_SUCCESS,
      user.email,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text,
      data
    );
    results.push(emailResult);

    // Telegram notification (if user has chatId)
    if (user.telegramChatId) {
      const telegramMessage = renewalSuccessTelegramTemplate({
        orderId: data.orderId,
        planName: data.planName,
        newExpiry: data.newExpiry,
        amount: data.amount,
      });

      const telegramResult = await this.sendTelegramNotification(
        userId,
        NotificationEvent.RENEWAL_SUCCESS,
        user.telegramChatId,
        telegramMessage,
        data
      );
      results.push(telegramResult);
    }

    return results;
  }

  /**
   * Notify user about failed VPS renewal (insufficient balance)
   * Channels: Email + Telegram
   */
  async notifyRenewalFailed(
    userId: string,
    data: RenewalFailedNotificationData
  ): Promise<NotificationResult[]> {
    this.logger.log(`Sending RENEWAL_FAILED notification for order: ${data.orderId}`);

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
    const emailData: RenewalFailedData = {
      orderId: data.orderId,
      customerName: user.name,
      planName: data.planName,
      required: data.required,
    };

    const emailTemplate = renewalFailedTemplate(emailData);
    const emailResult = await this.sendEmailNotification(
      userId,
      NotificationEvent.RENEWAL_FAILED,
      user.email,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text,
      data
    );
    results.push(emailResult);

    // Telegram notification (if user has chatId)
    if (user.telegramChatId) {
      const telegramMessage = renewalFailedTelegramTemplate({
        orderId: data.orderId,
        planName: data.planName,
        required: data.required,
      });

      const telegramResult = await this.sendTelegramNotification(
        userId,
        NotificationEvent.RENEWAL_FAILED,
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

  // ============================================
  // In-App Notification Methods
  // ============================================

  /**
   * Create an in-app notification and push via WebSocket
   */
  private async createInAppNotification(
    event: NotificationEventType,
    userId: string,
    data: Record<string, any>
  ): Promise<NotificationResult | null> {
    try {
      const title = this.getInAppTitle(event, data);
      const message = this.getInAppMessage(event, data);
      const actionUrl = this.getInAppActionUrl(event, data);

      // Create in-app notification
      const notification = await this.userNotificationService.create({
        userId,
        type: event as unknown as InAppNotificationType,
        title,
        message,
        actionUrl,
        metadata: data,
      });

      // Push via WebSocket
      await this.websocketService.pushNotification(userId, notification);

      // Update unread count via WebSocket
      const unreadCount = await this.userNotificationService.getUnreadCount(userId);
      await this.websocketService.updateUnreadCount(userId, unreadCount.count);

      this.logger.log(`Created in-app notification ${notification.id} for user ${userId}`);

      return {
        channel: 'IN_APP',
        status: 'SENT',
        recipient: userId,
        logId: notification.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create in-app notification for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return {
        channel: 'IN_APP',
        status: 'FAILED',
        recipient: userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get in-app notification title based on event type
   */
  private getInAppTitle(event: NotificationEventType, data: Record<string, any>): string {
    switch (event) {
      case NotificationEventType.ORDER_CREATED:
        return 'Order Baru Dibuat';
      case NotificationEventType.PAYMENT_CONFIRMED:
        return 'Pembayaran Dikonfirmasi';
      case NotificationEventType.VPS_ACTIVE:
        return 'VPS Anda Aktif!';
      case NotificationEventType.PROVISIONING_FAILED:
        return 'Gagal Membuat VPS';
      case NotificationEventType.VPS_EXPIRING:
        return 'VPS Akan Berakhir';
      case NotificationEventType.VPS_EXPIRING_SOON:
        return data.hoursRemaining <= 8 ? '🚨 VPS Segera Berakhir!' : '⚠️ VPS Akan Berakhir';
      case NotificationEventType.VPS_SUSPENDED:
        return '🔴 VPS Disuspend';
      case NotificationEventType.VPS_DESTROYED:
        return 'VPS Telah Dihapus';
      case NotificationEventType.RENEWAL_SUCCESS:
        return '✅ Perpanjangan Berhasil';
      case NotificationEventType.RENEWAL_FAILED:
        return '❌ Perpanjangan Gagal';
      default:
        return 'Notifikasi';
    }
  }

  /**
   * Get in-app notification message based on event type
   */
  private getInAppMessage(event: NotificationEventType, data: Record<string, any>): string {
    switch (event) {
      case NotificationEventType.ORDER_CREATED:
        return `Order ${data.orderNumber || ''} berhasil dibuat untuk ${data.planName || 'VPS'}. Silakan lakukan pembayaran.`;
      case NotificationEventType.PAYMENT_CONFIRMED:
        return `Pembayaran untuk order ${data.orderNumber || ''} telah dikonfirmasi. VPS Anda sedang dipersiapkan.`;
      case NotificationEventType.VPS_ACTIVE:
        return `VPS ${data.planName || ''} Anda sudah aktif dengan IP ${data.ipAddress || ''}. Silakan cek email untuk detail akses.`;
      case NotificationEventType.PROVISIONING_FAILED:
        return `Maaf, terjadi kesalahan saat membuat VPS untuk order ${data.orderNumber || ''}. Tim kami akan segera menghubungi Anda.`;
      case NotificationEventType.VPS_EXPIRING:
        return `VPS ${data.planName || ''} Anda akan berakhir pada ${data.expiresAt || ''}. Perpanjang sekarang untuk menghindari penonaktifan.`;
      case NotificationEventType.VPS_EXPIRING_SOON:
        return `VPS ${data.planName || ''} akan berakhir dalam ${data.hoursRemaining || ''} jam. ${data.autoRenew ? 'Auto-renewal aktif.' : 'Perpanjang sekarang!'}`;
      case NotificationEventType.VPS_SUSPENDED:
        return `VPS ${data.planName || ''} telah disuspend. Anda memiliki ${data.gracePeriodHours || ''} jam untuk memperpanjang sebelum dihapus permanen.`;
      case NotificationEventType.VPS_DESTROYED:
        return `VPS ${data.planName || ''} telah dihapus. Terima kasih telah menggunakan layanan kami.`;
      case NotificationEventType.RENEWAL_SUCCESS:
        return `VPS ${data.planName || ''} berhasil diperpanjang. Berlaku sampai ${data.newExpiry || ''}.`;
      case NotificationEventType.RENEWAL_FAILED:
        return `Perpanjangan VPS ${data.planName || ''} gagal karena saldo tidak cukup. Segera top up untuk menghindari suspend.`;
      default:
        return 'Anda memiliki notifikasi baru.';
    }
  }

  /**
   * Get in-app notification action URL based on event type
   */
  private getInAppActionUrl(event: NotificationEventType, data: Record<string, any>): string | undefined {
    const orderId = data.orderId || data.orderNumber;
    const instanceId = data.instanceId;

    switch (event) {
      case NotificationEventType.ORDER_CREATED:
        return orderId ? `/orders/${orderId}` : '/orders';
      case NotificationEventType.PAYMENT_CONFIRMED:
        return orderId ? `/orders/${orderId}` : '/orders';
      case NotificationEventType.VPS_ACTIVE:
        return instanceId ? `/instances/${instanceId}` : '/instances';
      case NotificationEventType.PROVISIONING_FAILED:
        return orderId ? `/orders/${orderId}` : '/orders';
      case NotificationEventType.VPS_EXPIRING:
        return instanceId ? `/instances/${instanceId}/renew` : '/instances';
      case NotificationEventType.VPS_EXPIRING_SOON:
        return orderId ? `/orders/${orderId}` : '/instances';
      case NotificationEventType.VPS_SUSPENDED:
        return orderId ? `/orders/${orderId}` : '/instances';
      case NotificationEventType.VPS_DESTROYED:
        return '/orders';
      case NotificationEventType.RENEWAL_SUCCESS:
        return orderId ? `/orders/${orderId}` : '/instances';
      case NotificationEventType.RENEWAL_FAILED:
        return '/wallet/topup';
      default:
        return undefined;
    }
  }
}
