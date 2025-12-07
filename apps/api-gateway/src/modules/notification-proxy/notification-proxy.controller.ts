import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  HttpException,
  Headers,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import axios from 'axios';

import { UserThrottlerGuard } from '../../common/guards/user-throttle.guard';

@Controller('notifications')
@UseGuards(UserThrottlerGuard)
export class NotificationProxyController {
  private readonly logger = new Logger(NotificationProxyController.name);
  private readonly notificationServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.notificationServiceUrl = this.configService.get<string>('NOTIFICATION_SERVICE_URL') || 'http://notification-service:3006';
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getNotifications(@Query() query: any, @Headers('authorization') auth: string) {
    this.logger.log('Get notifications request - proxying to notification-service');
    
    try {
      const queryString = new URLSearchParams(query).toString();
      const response = await axios.get(
        `${this.notificationServiceUrl}/api/v1/notifications${queryString ? '?' + queryString : ''}`,
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...(auth && { 'Authorization': auth }),
          }, 
          timeout: 10000 
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error('Failed to proxy get notifications request', error);
      throw new HttpException('Notification service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getUnreadCount(@Headers('authorization') auth: string) {
    this.logger.log('Get unread count request - proxying to notification-service');
    
    try {
      const response = await axios.get(
        `${this.notificationServiceUrl}/api/v1/notifications/unread-count`,
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...(auth && { 'Authorization': auth }),
          }, 
          timeout: 10000 
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error('Failed to proxy get unread count request', error);
      throw new HttpException('Notification service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async markAsRead(@Param('id') id: string, @Headers('authorization') auth: string) {
    this.logger.log(`Mark notification ${id} as read - proxying to notification-service`);
    
    try {
      const response = await axios.patch(
        `${this.notificationServiceUrl}/api/v1/notifications/${id}/read`,
        {},
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...(auth && { 'Authorization': auth }),
          }, 
          timeout: 10000 
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error('Failed to proxy mark as read request', error);
      throw new HttpException('Notification service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async markAllAsRead(@Headers('authorization') auth: string) {
    this.logger.log('Mark all notifications as read - proxying to notification-service');
    
    try {
      const response = await axios.post(
        `${this.notificationServiceUrl}/api/v1/notifications/mark-all-read`,
        {},
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...(auth && { 'Authorization': auth }),
          }, 
          timeout: 10000 
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error('Failed to proxy mark all as read request', error);
      throw new HttpException('Notification service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
