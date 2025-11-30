import { Module, forwardRef } from '@nestjs/common';

import { NotificationGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';

@Module({
  providers: [NotificationGateway, WebsocketService],
  exports: [NotificationGateway, WebsocketService],
})
export class WebsocketModule {}
