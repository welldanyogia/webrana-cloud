import * as path from 'path';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';


import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { DigitalOceanModule } from '../modules/digitalocean/digitalocean.module';
import { InstanceModule } from '../modules/instance/instance.module';
import { OrderClientModule } from '../modules/order-client/order-client.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.join(__dirname, '..', '..', '.env'),
    }),
    DigitalOceanModule,
    OrderClientModule,
    InstanceModule,
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
