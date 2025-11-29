import { Module } from '@nestjs/common';

import { AuthClientModule } from '../auth-client/auth-client.module';
import { EmailModule } from '../email/email.module';
import { TelegramModule } from '../telegram/telegram.module';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    EmailModule,
    TelegramModule,
    AuthClientModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
