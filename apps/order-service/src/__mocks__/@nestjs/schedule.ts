/**
 * Mock for @nestjs/schedule
 * Used in tests when the actual package is not installed
 */

export const Cron = () => {
  return (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  };
};

export const CronExpression = {
  EVERY_MINUTE: '* * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_10_MINUTES: '*/10 * * * *',
  EVERY_30_MINUTES: '*/30 * * * *',
  EVERY_HOUR: '0 * * * *',
  EVERY_DAY_AT_MIDNIGHT: '0 0 * * *',
};

export const ScheduleModule = {
  forRoot: () => ({
    module: class MockScheduleModule {},
    providers: [],
    exports: [],
  }),
};

export const Interval = () => {
  return (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  };
};

export const Timeout = () => {
  return (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  };
};
