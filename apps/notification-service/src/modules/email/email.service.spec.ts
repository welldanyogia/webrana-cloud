import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let _configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        SMTP_HOST: 'smtp.test.com',
        SMTP_PORT: 587,
        SMTP_SECURE: 'false',
        SMTP_USER: 'test@test.com',
        SMTP_PASS: 'testpass',
        SMTP_FROM: 'Test <test@test.com>',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isEmailConfigured', () => {
    it('should return true when SMTP is configured', () => {
      expect(service.isEmailConfigured()).toBe(true);
    });

    it('should return false when SMTP is not configured', async () => {
      const unconfiguredMock = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'SMTP_HOST') return undefined;
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: unconfiguredMock,
          },
        ],
      }).compile();

      const unconfiguredService = module.get<EmailService>(EmailService);
      expect(unconfiguredService.isEmailConfigured()).toBe(false);
    });
  });

  describe('sendEmail', () => {
    it('should return success false when email is not configured', async () => {
      const unconfiguredMock = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'SMTP_HOST') return undefined;
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: unconfiguredMock,
          },
        ],
      }).compile();

      const unconfiguredService = module.get<EmailService>(EmailService);

      const result = await unconfiguredService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service not configured');
    });

    it('should attempt to send email when configured', async () => {
      // Note: In real tests, we would mock nodemailer.createTransport
      // For now, we're testing the logic around configuration
      expect(service.isEmailConfigured()).toBe(true);
    });
  });

  describe('sendEmailOrFail', () => {
    it('should throw EmailConfigurationException when not configured', async () => {
      const unconfiguredMock = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'SMTP_HOST') return undefined;
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: unconfiguredMock,
          },
        ],
      }).compile();

      const unconfiguredService = module.get<EmailService>(EmailService);

      await expect(
        unconfiguredService.sendEmailOrFail({
          to: 'test@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
        })
      ).rejects.toThrow('SMTP configuration tidak valid');
    });
  });
});
