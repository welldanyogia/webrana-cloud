import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // CORS
  const corsOrigins = configService.get<string>(
    'CORS_ORIGINS',
    'http://localhost:4200,http://localhost:4201'
  );
  app.enableCors({
    origin: corsOrigins.split(',').map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  });

  // Global pipes
  app.useGlobalPipes(
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
  app.setGlobalPrefix('api/v1');

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Instance Service API')
    .setDescription('VPS instance management service - Handles instance listing, details, and actions (reboot, power on/off)')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer'
    )
    .addTag('Instances', 'VPS instance management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT', 3005);
  await app.listen(port);

  logger.log(`
========================================
  Instance Service started successfully
========================================
  Environment: ${configService.get('NODE_ENV', 'development')}
  Port: ${port}
  URL: http://localhost:${port}
  Health: http://localhost:${port}/api/v1/health
  API Docs: http://localhost:${port}/api/docs
========================================
  `);
}

bootstrap();
