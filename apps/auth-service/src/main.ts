import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app/app.module';
import { SanitizePipe } from './common/pipes/sanitize.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security headers
  app.use(
    helmet({
      frameguard: { action: 'deny' }, // X-Frame-Options: DENY
      contentSecurityPolicy: false, // CSP can be added later if needed
    })
  );

  // Custom security headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  app.use(compression());

  // CORS
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:4200,http://localhost:4201');
  app.enableCors({
    origin: corsOrigins.split(',').map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global pipes: Sanitize first, then validate
  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Global prefix
  app.setGlobalPrefix('api/v1/auth');

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);

  logger.log(`
========================================
  Auth Service started successfully
========================================
  Environment: ${configService.get('NODE_ENV', 'development')}
  Port: ${port}
  URL: http://localhost:${port}
  Health: http://localhost:${port}/api/v1/auth/health
========================================
  `);
}

bootstrap();
