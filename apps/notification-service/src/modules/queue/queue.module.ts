import { Module, Global, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { NotificationModule } from '../notification/notification.module';

import { QueueController } from './queue.controller';
import { QueueProcessor } from './queue.processor';
import { QueueService } from './queue.service';

@Global()
@Module({
  imports: [ConfigModule, forwardRef(() => NotificationModule)],
  controllers: [QueueController],
  providers: [QueueService, QueueProcessor],
  exports: [QueueService],
})
export class QueueModule {}
