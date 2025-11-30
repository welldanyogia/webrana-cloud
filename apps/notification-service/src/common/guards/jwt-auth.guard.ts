import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string; // userId
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT Authentication Guard for User-Facing Endpoints
 * 
 * Validates JWT tokens for protected routes (e.g., /api/v1/notifications).
 * 
 * Supports:
 * - RS256 (production): Verify with JWT_PUBLIC_KEY
 * - HS256 (development): Verify with JWT_SECRET
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
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

    if (this.algorithm === 'HS256') {
      this.logger.warn(
        'JwtAuthGuard using HS256 algorithm. This should ONLY be used for development!'
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('No token provided in request');
      throw new UnauthorizedException({
        code: 'TOKEN_MISSING',
        message: 'Token tidak ditemukan',
      });
    }

    try {
      const payload = this.verifyToken(token);
      
      // Attach user info to request for @CurrentUser decorator
      request.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      return true;
    } catch (error) {
      this.logger.warn(
        `Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: 'Token tidak valid atau sudah expired',
      });
    }
  }

  /**
   * Extract Bearer token from Authorization header
   */
  private extractTokenFromHeader(request: any): string | null {
    const authorization = request.headers?.authorization;
    if (!authorization) return null;

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : null;
  }

  /**
   * Verify JWT token
   */
  private verifyToken(token: string): JwtPayload {
    if (this.algorithm === 'HS256') {
      if (!this.secret) {
        throw new UnauthorizedException(
          'JWT_SECRET tidak dikonfigurasi untuk HS256 mode'
        );
      }
      return jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
      }) as JwtPayload;
    }

    // RS256 Mode (Production Default)
    if (!this.publicKey) {
      throw new UnauthorizedException(
        'JWT_PUBLIC_KEY tidak dikonfigurasi untuk RS256 mode'
      );
    }
    return jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
    }) as JwtPayload;
  }
}
