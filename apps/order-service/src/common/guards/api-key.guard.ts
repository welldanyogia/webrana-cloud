import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * API Key Guard for Internal/Admin Endpoints
 * 
 * Validates `X-API-Key` header against `INTERNAL_API_KEY` environment variable.
 * Used to protect `/internal/*` endpoints (PRD FR22).
 * 
 * Usage:
 * ```typescript
 * @Controller('internal/orders')
 * @UseGuards(ApiKeyGuard)
 * export class InternalOrderController { ... }
 * ```
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('INTERNAL_API_KEY', '');

    if (!this.apiKey) {
      this.logger.warn(
        'INTERNAL_API_KEY is not configured. All internal endpoints will reject requests.'
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedKey = this.extractApiKey(request);

    if (!providedKey) {
      this.logger.warn('API key not provided in request');
      throw new UnauthorizedException({
        code: 'API_KEY_MISSING',
        message: 'API key tidak ditemukan. Sertakan header X-API-Key.',
      });
    }

    if (!this.apiKey) {
      this.logger.error('INTERNAL_API_KEY not configured on server');
      throw new UnauthorizedException({
        code: 'API_KEY_NOT_CONFIGURED',
        message: 'Server tidak dikonfigurasi untuk menerima API key.',
      });
    }

    if (providedKey !== this.apiKey) {
      this.logger.warn('Invalid API key provided');
      throw new UnauthorizedException({
        code: 'API_KEY_INVALID',
        message: 'API key tidak valid.',
      });
    }

    return true;
  }

  /**
   * Extract API key from X-API-Key header
   */
  private extractApiKey(request: any): string | null {
    return request.headers?.['x-api-key'] || null;
  }
}
