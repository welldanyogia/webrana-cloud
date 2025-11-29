import { EmailService } from '../../src/modules/email/email.service';
import { TelegramService } from '../../src/modules/telegram/telegram.service';
import { AuthClientService, UserInfo } from '../../src/modules/auth-client/auth-client.service';

/**
 * Create a mock user info
 */
export function createMockUserInfo(userId: string, overrides?: Partial<UserInfo>): UserInfo {
  return {
    id: userId,
    email: `${userId}@test.com`,
    name: 'Test User',
    telegramChatId: null,
    ...overrides,
  };
}

/**
 * Create a mock EmailService
 */
export function createMockEmailService(): Partial<EmailService> {
  return {
    sendEmail: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'mock-message-id',
    }),
  };
}

/**
 * Create a mock TelegramService
 */
export function createMockTelegramService(): Partial<TelegramService> {
  return {
    sendMessage: jest.fn().mockResolvedValue({
      success: true,
      messageId: 123456,
    }),
  };
}

/**
 * Create a mock AuthClientService
 */
export function createMockAuthClientService(
  users?: Map<string, UserInfo>
): Partial<AuthClientService> {
  const userMap = users || new Map<string, UserInfo>();

  return {
    getUserById: jest.fn().mockImplementation((userId: string) => {
      const user = userMap.get(userId);
      if (user) {
        return Promise.resolve(user);
      }
      // Return default user if not found
      return Promise.resolve(createMockUserInfo(userId));
    }),
  };
}
