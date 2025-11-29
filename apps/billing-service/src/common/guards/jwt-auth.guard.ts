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
 * JWT Authentication Guard
 * 
 * Validates JWT tokens for protected routes.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Authentication Strategy
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * **Production (Default)**: RS256 + Public Key
 * - JWT ditandatangani oleh auth-service menggunakan RSA private key
 * - billing-service verify menggunakan JWT_PUBLIC_KEY (asymmetric)
 * - Algoritma: RS256 (default)
 * 
 * **Development/Local (Optional)**: HS256 + Secret
 * - Untuk kemudahan testing lokal tanpa setup key pair
 * - Set JWT_ALGORITHM=HS256 dan JWT_SECRET di environment
 * - HANYA untuk development, JANGAN dipakai di production
 * 
 * Environment Variables:
 * - JWT_ALGORITHM: 'RS256' (default, production) atau 'HS256' (dev only)
 * - JWT_PUBLIC_KEY: RSA public key dalam format PEM (untuk RS256)
 * - JWT_SECRET: Shared secret (untuk HS256, dev only)
 * ═══════════════════════════════════════════════════════════════════════════════
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

    // Log warning if using HS256 (dev mode)
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
      throw new UnauthorizedException('Token tidak ditemukan');
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
      throw new UnauthorizedException('Token tidak valid atau sudah expired');
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
   * 
   * Strategy berdasarkan JWT_ALGORITHM:
   * - RS256 (default, production): Verify dengan JWT_PUBLIC_KEY
   * - HS256 (dev only): Verify dengan JWT_SECRET
   */
  private verifyToken(token: string): JwtPayload {
    if (this.algorithm === 'HS256') {
      // ═══════════════════════════════════════════════════════════════════════
      // HS256 Mode (Development Only)
      // ═══════════════════════════════════════════════════════════════════════
      if (!this.secret) {
        throw new UnauthorizedException(
          'JWT_SECRET tidak dikonfigurasi untuk HS256 mode'
        );
      }
      return jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
      }) as JwtPayload;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RS256 Mode (Production Default)
    // ═══════════════════════════════════════════════════════════════════════
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
