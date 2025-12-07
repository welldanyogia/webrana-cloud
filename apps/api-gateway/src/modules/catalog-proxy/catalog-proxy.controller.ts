import {
  Controller,
  Get,
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

@Controller('catalog')
@UseGuards(UserThrottlerGuard)
export class CatalogProxyController {
  private readonly logger = new Logger(CatalogProxyController.name);
  private readonly catalogServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.catalogServiceUrl = this.configService.get<string>('CATALOG_SERVICE_URL') || 'http://catalog-service:3004';
  }

  @Get('plans')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getPlans(@Headers('authorization') auth: string) {
    this.logger.log('Get plans request - proxying to catalog-service');
    
    try {
      const response = await axios.get(
        `${this.catalogServiceUrl}/api/v1/catalog/plans`,
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
      this.logger.error('Failed to proxy get plans request', error);
      throw new HttpException('Catalog service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Get('plans/:id')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getPlan(@Param('id') id: string, @Headers('authorization') auth: string) {
    this.logger.log(`Get plan ${id} request - proxying to catalog-service`);
    
    try {
      const response = await axios.get(
        `${this.catalogServiceUrl}/api/v1/catalog/plans/${id}`,
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
      this.logger.error('Failed to proxy get plan request', error);
      throw new HttpException('Catalog service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Get('images')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getImages(@Headers('authorization') auth: string) {
    this.logger.log('Get images request - proxying to catalog-service');
    
    try {
      const response = await axios.get(
        `${this.catalogServiceUrl}/api/v1/catalog/images`,
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
      this.logger.error('Failed to proxy get images request', error);
      throw new HttpException('Catalog service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
