import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import axios from 'axios';

import { AuthThrottlerGuard } from '../../common/guards/auth-throttle.guard';

/**
 * Auth Proxy Controller
 * 
 * Proxies authentication requests to auth-service with rate limiting.
 * 
 * Rate Limits:
 * - POST /auth/login: 5 per minute per IP
 * - POST /auth/register: 3 per minute per IP
 * - POST /auth/forgot-password: 3 per minute per IP
 */
@Controller('auth')
@UseGuards(AuthThrottlerGuard)
export class AuthProxyController {
  private readonly logger = new Logger(AuthProxyController.name);
  private readonly authServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL') || 'http://auth-service:3001';
  }

  /**
   * Login endpoint - 5 requests per minute per IP
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() loginDto: unknown) {
    this.logger.log('Login request received - proxying to auth-service');
    
    try {
      const response = await axios.post(
        `${this.authServiceUrl}/api/v1/auth/login`,
        loginDto,
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error('Failed to proxy login request', error);
      throw new HttpException('Auth service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * Register endpoint - 3 requests per minute per IP
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async register(@Body() registerDto: unknown) {
    this.logger.log('Register request received - proxying to auth-service');
    
    try {
      const response = await axios.post(
        `${this.authServiceUrl}/api/v1/auth/register`,
        registerDto,
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error('Failed to proxy register request', error);
      throw new HttpException('Auth service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * Forgot password endpoint - 3 requests per minute per IP
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async forgotPassword(@Body() forgotPasswordDto: unknown) {
    this.logger.log('Forgot password request received - proxying to auth-service');
    
    try {
      const response = await axios.post(
        `${this.authServiceUrl}/api/v1/auth/forgot-password`,
        forgotPasswordDto,
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error('Failed to proxy forgot-password request', error);
      throw new HttpException('Auth service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
