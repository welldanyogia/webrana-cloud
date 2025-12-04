import { Module, Global } from '@nestjs/common';
import { SentryService } from './sentry.service.js';

@Global()
@Module({
  providers: [SentryService],
  exports: [SentryService],
})
export class SentryModule {}
