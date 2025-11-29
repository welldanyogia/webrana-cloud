import * as path from 'path';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';

import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { AuthClientModule } from '../modules/auth-client/auth-client.module';
import { EmailModule } from '../modules/email/email.module';
import { NotificationModule } from '../modules/notification/notification.module';
import { QueueModule } from '../modules/queue/queue.module';
import { TelegramModule } from '../modules/telegram/telegram.module';
import { PrismaModule } from '../prisma/prisma.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.join(__dirname, '..', '..', '.env'),
    }),
    PrismaModule,
    EmailModule,
    TelegramModule,
    AuthClientModule,
    QueueModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
