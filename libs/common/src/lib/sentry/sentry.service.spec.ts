import { Test, TestingModule } from '@nestjs/testing';
import { SentryService, SENTRY_OPTIONS, SentryModuleOptions } from './sentry.service';
import * as Sentry from '@sentry/node';

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn().mockReturnValue('event-id-123'),
  captureMessage: jest.fn().mockReturnValue('event-id-456'),
  setUser: jest.fn(),
  setContext: jest.fn(),
  setTag: jest.fn(),
  addBreadcrumb: jest.fn(),
  startInactiveSpan: jest.fn().mockReturnValue({
    end: jest.fn(),
    setStatus: jest.fn(),
  }),
}));

describe('SentryService', () => {
  let service: SentryService;

  const mockOptions: SentryModuleOptions = {
    dsn: 'https://test@sentry.io/123',
    environment: 'test',
    release: '1.0.0',
    tracesSampleRate: 0.5,
    debug: false,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentryService,
        {
          provide: SENTRY_OPTIONS,
          useValue: mockOptions,
        },
      ],
    }).compile();

    service = module.get<SentryService>(SentryService);
  });

  describe('onModuleInit', () => {
    it('should initialize Sentry with provided options', () => {
      service.onModuleInit();

      expect(Sentry.init).toHaveBeenCalledWith({
        dsn: mockOptions.dsn,
        environment: mockOptions.environment,
        release: mockOptions.release,
        tracesSampleRate: mockOptions.tracesSampleRate,
        debug: mockOptions.debug,
      });
    });

    it('should not initialize Sentry if dsn is not provided', async () => {
      const moduleWithoutDsn: TestingModule = await Test.createTestingModule({
        providers: [
          SentryService,
          {
            provide: SENTRY_OPTIONS,
            useValue: { environment: 'test' },
          },
        ],
      }).compile();

      const serviceWithoutDsn = moduleWithoutDsn.get<SentryService>(SentryService);
      jest.clearAllMocks();

      serviceWithoutDsn.onModuleInit();

      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it('should only initialize once', () => {
      service.onModuleInit();
      service.onModuleInit();

      expect(Sentry.init).toHaveBeenCalledTimes(1);
    });
  });

  describe('captureException', () => {
    it('should capture exception with context', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'test' };

      const eventId = service.captureException(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        extra: context,
      });
      expect(eventId).toBe('event-id-123');
    });

    it('should capture exception without context', () => {
      const error = new Error('Test error');

      service.captureException(error);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        extra: undefined,
      });
    });
  });

  describe('captureMessage', () => {
    it('should capture message with default level', () => {
      const eventId = service.captureMessage('Test message');

      expect(Sentry.captureMessage).toHaveBeenCalledWith('Test message', 'info');
      expect(eventId).toBe('event-id-456');
    });

    it('should capture message with custom level', () => {
      service.captureMessage('Warning message', 'warning');

      expect(Sentry.captureMessage).toHaveBeenCalledWith('Warning message', 'warning');
    });
  });

  describe('setUser', () => {
    it('should set user context', () => {
      const user = { id: 'user-123', email: 'test@example.com' };

      service.setUser(user);

      expect(Sentry.setUser).toHaveBeenCalledWith(user);
    });
  });

  describe('clearUser', () => {
    it('should clear user context', () => {
      service.clearUser();

      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });

  describe('setContext', () => {
    it('should set context', () => {
      service.setContext('order', { orderId: '123', status: 'pending' });

      expect(Sentry.setContext).toHaveBeenCalledWith('order', {
        orderId: '123',
        status: 'pending',
      });
    });
  });

  describe('setTag', () => {
    it('should set tag', () => {
      service.setTag('service', 'order-service');

      expect(Sentry.setTag).toHaveBeenCalledWith('service', 'order-service');
    });
  });

  describe('addBreadcrumb', () => {
    it('should add breadcrumb', () => {
      const breadcrumb = {
        category: 'http',
        message: 'API call',
        level: 'info' as const,
      };

      service.addBreadcrumb(breadcrumb);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(breadcrumb);
    });
  });

  describe('startTransaction', () => {
    it('should start a transaction', () => {
      const context = {
        name: 'test-transaction',
        op: 'task',
        data: { key: 'value' },
      };

      const span = service.startTransaction(context);

      expect(Sentry.startInactiveSpan).toHaveBeenCalledWith({
        name: context.name,
        op: context.op,
        attributes: context.data,
      });
      expect(span).toBeDefined();
    });
  });

  describe('isInitialized', () => {
    it('should return false before initialization', async () => {
      const moduleNew: TestingModule = await Test.createTestingModule({
        providers: [
          SentryService,
          {
            provide: SENTRY_OPTIONS,
            useValue: mockOptions,
          },
        ],
      }).compile();

      const newService = moduleNew.get<SentryService>(SentryService);

      expect(newService.isInitialized()).toBe(false);
    });

    it('should return true after initialization', () => {
      service.onModuleInit();

      expect(service.isInitialized()).toBe(true);
    });
  });
});

describe('SentryService without options', () => {
  it('should work without options injection', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SentryService],
    }).compile();

    const service = module.get<SentryService>(SentryService);

    expect(() => service.onModuleInit()).not.toThrow();
    expect(service.isInitialized()).toBe(false);
  });
});
