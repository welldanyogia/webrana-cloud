import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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

@Controller('wallet')
@UseGuards(UserThrottlerGuard)
export class BillingProxyController {
  private readonly logger = new Logger(BillingProxyController.name);
  private readonly billingServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.billingServiceUrl = this.configService.get<string>('BILLING_SERVICE_URL') || 'http://billing-service:3003';
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getWallet(@Headers('authorization') auth: string) {
    this.logger.log('Get wallet request - proxying to billing-service');
    
    try {
      const response = await axios.get(
        `${this.billingServiceUrl}/api/v1/wallet`,
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
      this.logger.error('Failed to proxy get wallet request', error);
      throw new HttpException('Billing service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Get('balance')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getBalance(@Headers('authorization') auth: string) {
    this.logger.log('Get balance request - proxying to billing-service');
    
    try {
      const response = await axios.get(
        `${this.billingServiceUrl}/api/v1/wallet/balance`,
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
      this.logger.error('Failed to proxy get balance request', error);
      throw new HttpException('Billing service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Get('transactions')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getTransactions(@Headers('authorization') auth: string) {
    this.logger.log('Get transactions request - proxying to billing-service');
    
    try {
      const response = await axios.get(
        `${this.billingServiceUrl}/api/v1/wallet/transactions`,
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
      this.logger.error('Failed to proxy get transactions request', error);
      throw new HttpException('Billing service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Post('topup')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async topup(@Body() topupDto: unknown, @Headers('authorization') auth: string) {
    this.logger.log('Topup request - proxying to billing-service');
    
    try {
      const response = await axios.post(
        `${this.billingServiceUrl}/api/v1/wallet/topup`,
        topupDto,
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
      this.logger.error('Failed to proxy topup request', error);
      throw new HttpException('Billing service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
