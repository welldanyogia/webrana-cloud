import { Module } from '@nestjs/common';

import { NotificationProxyController } from './notification-proxy.controller';

@Module({
  controllers: [NotificationProxyController],
})
export class NotificationProxyModule {}
