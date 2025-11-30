import { ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { SentryInterceptor } from './sentry.interceptor';
import * as Sentry from '@sentry/node';

jest.mock('@sentry/node', () => ({
  setContext: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  captureException: jest.fn(),
}));

describe('SentryInterceptor', () => {
  let interceptor: SentryInterceptor;

  const mockRequest = {
    method: 'POST',
    url: '/api/v1/orders',
    query: { page: '1' },
    headers: {
      'user-agent': 'test-agent',
      'x-forwarded-for': '127.0.0.1',
      'x-request-id': 'req-123',
    },
    ip: '192.168.1.1',
    user: {
      userId: 'user-123',
      email: 'test@example.com',
    },
    body: {
      planId: 'plan-123',
      password: 'secret123',
      token: 'bearer-token',
    },
  };

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
    }),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    interceptor = new SentryInterceptor();
  });

  describe('intercept', () => {
    it('should set request context', (done) => {
      const mockCallHandler: CallHandler = {
        handle: () => of({ success: true }),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(Sentry.setContext).toHaveBeenCalledWith('request', {
            method: 'POST',
            url: '/api/v1/orders',
            query: { page: '1' },
            userAgent: 'test-agent',
            ip: '192.168.1.1',
          });
          done();
        },
      });
    });

    it('should set user context when user is present', (done) => {
      const mockCallHandler: CallHandler = {
        handle: () => of({ success: true }),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(Sentry.setUser).toHaveBeenCalledWith({
            id: 'user-123',
            email: 'test@example.com',
          });
          done();
        },
      });
    });

    it('should set request ID tag when present', (done) => {
      const mockCallHandler: CallHandler = {
        handle: () => of({ success: true }),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(Sentry.setTag).toHaveBeenCalledWith('request_id', 'req-123');
          done();
        },
      });
    });

    it('should capture 5xx errors to Sentry', (done) => {
      const error = new HttpException('Internal error', HttpStatus.INTERNAL_SERVER_ERROR);
      const mockCallHandler: CallHandler = {
        handle: () => throwError(() => error),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(Sentry.captureException).toHaveBeenCalledWith(error, {
            extra: {
              path: '/api/v1/orders',
              method: 'POST',
              body: {
                planId: 'plan-123',
                password: '[REDACTED]',
                token: '[REDACTED]',
              },
            },
          });
          done();
        },
      });
    });

    it('should not capture 4xx errors to Sentry', (done) => {
      const error = new HttpException('Not found', HttpStatus.NOT_FOUND);
      const mockCallHandler: CallHandler = {
        handle: () => throwError(() => error),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(Sentry.captureException).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should sanitize sensitive fields in request body', (done) => {
      const error = new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
      const mockCallHandler: CallHandler = {
        handle: () => throwError(() => error),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          const captureCall = (Sentry.captureException as jest.Mock).mock.calls[0];
          const body = captureCall[1].extra.body;

          expect(body.password).toBe('[REDACTED]');
          expect(body.token).toBe('[REDACTED]');
          expect(body.planId).toBe('plan-123');
          done();
        },
      });
    });

    it('should handle request without user', (done) => {
      const requestWithoutUser = { ...mockRequest, user: undefined };
      const contextWithoutUser = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(requestWithoutUser),
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler: CallHandler = {
        handle: () => of({ success: true }),
      };

      interceptor.intercept(contextWithoutUser, mockCallHandler).subscribe({
        complete: () => {
          expect(Sentry.setUser).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should handle request without body', (done) => {
      const requestWithoutBody = { ...mockRequest, body: null };
      const contextWithoutBody = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(requestWithoutBody),
        }),
      } as unknown as ExecutionContext;

      const error = new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
      const mockCallHandler: CallHandler = {
        handle: () => throwError(() => error),
      };

      interceptor.intercept(contextWithoutBody, mockCallHandler).subscribe({
        error: () => {
          const captureCall = (Sentry.captureException as jest.Mock).mock.calls[0];
          expect(captureCall[1].extra.body).toEqual({});
          done();
        },
      });
    });

    it('should use x-forwarded-for when ip is not available', (done) => {
      const requestWithForwardedFor = { ...mockRequest, ip: undefined };
      const context = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(requestWithForwardedFor),
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler: CallHandler = {
        handle: () => of({ success: true }),
      };

      interceptor.intercept(context, mockCallHandler).subscribe({
        complete: () => {
          expect(Sentry.setContext).toHaveBeenCalledWith('request', expect.objectContaining({
            ip: '127.0.0.1',
          }));
          done();
        },
      });
    });
  });
});
