import { Module, Global, DynamicModule } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { SentryService, SentryModuleOptions, SENTRY_OPTIONS } from './sentry.service';
import { SentryInterceptor } from './sentry.interceptor';
import { SentryExceptionFilter } from './sentry.filter';

@Global()
@Module({})
export class SentryModule {
  static forRoot(options: SentryModuleOptions): DynamicModule {
    return {
      module: SentryModule,
      providers: [
        {
          provide: SENTRY_OPTIONS,
          useValue: options,
        },
        SentryService,
        {
          provide: APP_INTERCEPTOR,
          useClass: SentryInterceptor,
        },
        {
          provide: APP_FILTER,
          useClass: SentryExceptionFilter,
        },
      ],
      exports: [SentryService],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: unknown[]) => SentryModuleOptions | Promise<SentryModuleOptions>;
    inject?: unknown[];
  }): DynamicModule {
    return {
      module: SentryModule,
      providers: [
        {
          provide: SENTRY_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        SentryService,
        {
          provide: APP_INTERCEPTOR,
          useClass: SentryInterceptor,
        },
        {
          provide: APP_FILTER,
          useClass: SentryExceptionFilter,
        },
      ],
      exports: [SentryService],
    };
  }
}
