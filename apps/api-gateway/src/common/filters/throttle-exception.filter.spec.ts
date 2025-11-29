import { ArgumentsHost } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ThrottleExceptionFilter } from './throttle-exception.filter';

describe('ThrottleExceptionFilter', () => {
  let filter: ThrottleExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new ThrottleExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      method: 'POST',
      url: '/api/v1/auth/login',
      ip: '192.168.1.100',
      headers: {},
      socket: { remoteAddress: '192.168.1.100' },
      user: undefined,
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should return 429 status code', () => {
      const exception = new ThrottlerException('Rate limit exceeded');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });

    it('should return correct error format', () => {
      const exception = new ThrottlerException('Rate limit exceeded');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.',
          details: {
            retryAfter: 60,
            retryAfterUnit: 'seconds',
            endpoint: '/api/v1/auth/login',
          },
        },
      });
    });

    it('should extract IP from x-forwarded-for header', () => {
      mockRequest.headers = {
        'x-forwarded-for': '203.0.113.195, 70.41.3.18',
      };
      
      const exception = new ThrottlerException('Rate limit exceeded');
      
      // The filter logs the IP, we're just verifying it runs without error
      expect(() => filter.catch(exception, mockHost)).not.toThrow();
    });

    it('should include user ID in logs for authenticated users', () => {
      mockRequest.user = { sub: 'user-123' };
      
      const exception = new ThrottlerException('Rate limit exceeded');
      
      // The filter logs the user ID, we're just verifying it runs without error
      expect(() => filter.catch(exception, mockHost)).not.toThrow();
    });
  });
});
