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
      setHeader: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      method: 'POST',
      url: '/api/v1/auth/login',
      path: '/auth/login',
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
      
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Try again in 60 seconds.',
          retryAfter: 60,
          details: expect.objectContaining({
            code: 'RATE_LIMIT_EXCEEDED',
            endpoint: '/api/v1/auth/login',
          }),
        }),
      );
    }

    it('should set rate limit headers', () => {
      const exception = new ThrottlerException('Rate limit exceeded');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', '60');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
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

    it('should handle x-forwarded-for as array', () => {
      mockRequest.headers = {
        'x-forwarded-for': ['203.0.113.195', '70.41.3.18'],
      };
      
      const exception = new ThrottlerException('Rate limit exceeded');
      
      expect(() => filter.catch(exception, mockHost)).not.toThrow();
      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });

    it('should use socket.remoteAddress when ip is not available', () => {
      mockRequest.ip = undefined;
      mockRequest.socket.remoteAddress = '10.0.0.100';
      
      const exception = new ThrottlerException('Rate limit exceeded');
      
      expect(() => filter.catch(exception, mockHost)).not.toThrow();
    });

    it('should return "unknown" when no IP is available', () => {
      mockRequest.ip = undefined;
      mockRequest.socket.remoteAddress = undefined;
      
      const exception = new ThrottlerException('Rate limit exceeded');
      
      expect(() => filter.catch(exception, mockHost)).not.toThrow();
    });

    it('should include endpoint URL in response details', () => {
      mockRequest.url = '/api/v1/orders';
      mockRequest.path = '/orders';
      
      const exception = new ThrottlerException('Rate limit exceeded');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            endpoint: '/api/v1/orders',
          }),
        }),
      );
    });

    it('should include retryAfter at root level', () => {
      const exception = new ThrottlerException('Rate limit exceeded');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          retryAfter: 60,
        }),
      );
    });
    
    it('should return correct rate limit for order POST endpoint', () => {
      mockRequest.path = '/orders';
      mockRequest.method = 'POST';
      
      const exception = new ThrottlerException('Rate limit exceeded');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '20');
    });
    
    it('should return correct rate limit for instance actions', () => {
      mockRequest.path = '/instances/123/reboot';
      mockRequest.method = 'POST';
      
      const exception = new ThrottlerException('Rate limit exceeded');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '1');
    });

    it('should handle GET requests', () => {
      mockRequest.method = 'GET';
      mockRequest.url = '/api/v1/instances';
      
      const exception = new ThrottlerException('Rate limit exceeded');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });

    it('should handle DELETE requests', () => {
      mockRequest.method = 'DELETE';
      mockRequest.url = '/api/v1/orders/123';
      
      const exception = new ThrottlerException('Rate limit exceeded');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });

    it('should return correct error code in details', () => {
      const exception = new ThrottlerException('Rate limit exceeded');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            code: 'RATE_LIMIT_EXCEEDED',
          }),
        }),
      );
    });

    it('should return English error message', () => {
      const exception = new ThrottlerException('Rate limit exceeded');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Rate limit exceeded'),
        }),
      );
    });
    
    it('should include resetAt in ISO format in details', () => {
      const exception = new ThrottlerException('Rate limit exceeded');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            resetAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
          }),
        }),
      );
    });
  });
});
