import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { TelegramService } from './telegram.service';

describe('TelegramService', () => {
  let service: TelegramService;
  let _configService: ConfigService;

  describe('when configured', () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          TELEGRAM_BOT_TOKEN: 'test-bot-token',
          TELEGRAM_ENABLED: 'true',
        };
        return config[key] ?? defaultValue;
      }),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TelegramService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<TelegramService>(TelegramService);
      _configService = module.get<ConfigService>(ConfigService);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return true for isTelegramConfigured when bot token exists and enabled', () => {
      expect(service.isTelegramConfigured()).toBe(true);
    });
  });

  describe('when not configured', () => {
    const unconfiguredMock = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'TELEGRAM_BOT_TOKEN') return undefined;
        if (key === 'TELEGRAM_ENABLED') return 'false';
        return defaultValue;
      }),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TelegramService,
          {
            provide: ConfigService,
            useValue: unconfiguredMock,
          },
        ],
      }).compile();

      service = module.get<TelegramService>(TelegramService);
    });

    it('should return false for isTelegramConfigured when not configured', () => {
      expect(service.isTelegramConfigured()).toBe(false);
    });

    it('should return error when sending message without configuration', async () => {
      const result = await service.sendMessage({
        chatId: '123456',
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Telegram service not configured');
    });
  });

  describe('when disabled', () => {
    const disabledMock = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          TELEGRAM_BOT_TOKEN: 'test-token',
          TELEGRAM_ENABLED: 'false',
        };
        return config[key] ?? defaultValue;
      }),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TelegramService,
          {
            provide: ConfigService,
            useValue: disabledMock,
          },
        ],
      }).compile();

      service = module.get<TelegramService>(TelegramService);
    });

    it('should return false for isTelegramConfigured when disabled', () => {
      expect(service.isTelegramConfigured()).toBe(false);
    });
  });

  describe('sendMessageOrFail', () => {
    const unconfiguredMock = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'TELEGRAM_BOT_TOKEN') return undefined;
        return defaultValue;
      }),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TelegramService,
          {
            provide: ConfigService,
            useValue: unconfiguredMock,
          },
        ],
      }).compile();

      service = module.get<TelegramService>(TelegramService);
    });

    it('should throw TelegramConfigurationException when not configured', async () => {
      await expect(
        service.sendMessageOrFail({
          chatId: '123456',
          message: 'Test message',
        })
      ).rejects.toThrow('Telegram bot tidak dikonfigurasi');
    });
  });
});
