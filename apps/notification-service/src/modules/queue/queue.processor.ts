import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { NotificationService } from '../notification/notification.service';

import { NotificationJob, QueueService } from './queue.service';

/**
 * Queue Processor
 * 
 * Processes notification jobs from the Redis queue.
 * Automatically starts processing when the module initializes.
 */
@Injectable()
export class QueueProcessor implements OnModuleInit {
  private readonly logger = new Logger(QueueProcessor.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly notificationService: NotificationService
  ) {}

  async onModuleInit() {
    // Register the handler
    this.queueService.registerHandler(this.handleJob.bind(this));

    // Start processing if queue is available
    if (this.queueService.isQueueAvailable()) {
      this.logger.log('Starting notification queue processor');
      this.queueService.startProcessing();
    } else {
      this.logger.warn(
        'Queue not available, notifications will be processed synchronously'
      );
    }
  }

  /**
   * Handle a notification job from the queue
   */
  private async handleJob(job: NotificationJob): Promise<void> {
    this.logger.log(
      `Processing notification job: id=${job.id}, event=${job.event}, userId=${job.userId}`
    );

    // Call the notification service to process the notification
    // The service will send emails/telegram based on the event type
    await this.notificationService.processNotificationJob(
      job.event,
      job.userId,
      job.data
    );
  }
}
