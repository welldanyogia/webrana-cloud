import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * Admin Role Guard
 * 
 * Provides additional layer of security for admin endpoints by validating
 * that the request comes from a user with admin role.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Usage
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This guard is designed to work alongside ApiKeyGuard for admin endpoints:
 * 
 * - If only API key is provided (service-to-service): ApiKeyGuard validates
 * - If both API key and JWT are provided: Both guards validate, and role is checked
 * 
 * ```typescript
 * @Controller('internal/invoices')
 * @UseGuards(ApiKeyGuard, AdminRoleGuard)
 * export class AdminInvoiceController { ... }
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Behavior
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * - No Authorization header: Pass through (rely on ApiKeyGuard)
 * - Valid JWT with ADMIN/SUPER_ADMIN role: Pass
 * - Valid JWT with non-admin role: Reject with 403
 * - Invalid JWT: Reject with 403
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  private readonly logger = new Logger(AdminRoleGuard.name);
  private readonly algorithm: jwt.Algorithm;
  private readonly publicKey: string;
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.algorithm = this.configService.get<jwt.Algorithm>(
      'JWT_ALGORITHM',
      'RS256'
    );
    this.publicKey = this.configService.get<string>('JWT_PUBLIC_KEY', '');
    this.secret = this.configService.get<string>('JWT_SECRET', '');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers?.authorization;

    // If no auth header, rely on API key guard (for service-to-service)
    if (!authorization) {
      this.logger.debug('No Authorization header - relying on API key guard');
      return true;
    }

    // If auth header present, validate admin role
    const token = authorization.replace('Bearer ', '');
    
    try {
      const payload = this.verifyToken(token);
      
      // Check for admin role
      const role = payload.role?.toUpperCase();
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        this.logger.warn(
          `User ${payload.sub} attempted admin access with role: ${payload.role}`
        );
        throw new ForbiddenException({
          code: 'ADMIN_ACCESS_REQUIRED',
          message: 'Admin access required for this endpoint',
        });
      }

      // Attach user info to request
      request.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      this.logger.debug(
        `Admin access granted for user ${payload.sub} with role ${payload.role}`
      );
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.warn(
        `Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw new ForbiddenException({
        code: 'INVALID_TOKEN',
        message: 'Invalid token or insufficient permissions',
      });
    }
  }

  /**
   * Verify JWT token based on configured algorithm
   */
  private verifyToken(token: string): JwtPayload {
    if (this.algorithm === 'HS256') {
      if (!this.secret) {
        throw new Error('JWT_SECRET not configured for HS256 mode');
      }
      return jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
      }) as JwtPayload;
    }

    // RS256 (default)
    if (!this.publicKey) {
      throw new Error('JWT_PUBLIC_KEY not configured for RS256 mode');
    }
    return jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
    }) as JwtPayload;
  }
}
