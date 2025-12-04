import { ExecutionContext, CallHandler, Logger, HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';

import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
    let interceptor: LoggingInterceptor;
    let loggerSpy: jest.SpyInstance;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [LoggingInterceptor],
        }).compile();

        interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
        // Spy on the private logger instance
        loggerSpy = jest.spyOn((interceptor as any).logger, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const createMockContext = (method: string, url: string, body: any = {}, statusCode = 200) => {
        return {
            switchToHttp: () => ({
                getRequest: () => ({
                    method,
                    url,
                    body,
                    ip: '127.0.0.1',
                    headers: { 'user-agent': 'TestAgent' },
                    socket: { remoteAddress: '127.0.0.1' },
                    user: { id: 'user-123' },
                }),
                getResponse: () => ({
                    statusCode,
                }),
            }),
        } as unknown as ExecutionContext;
    };

    const mockCallHandler: CallHandler = {
        handle: () => of('response'),
    };

    it('should be defined', () => {
        expect(interceptor).toBeDefined();
    });

    it('should log success event with masked email', (done) => {
        const context = createMockContext('POST', '/api/v1/auth/login', { email: 'test@example.com' });

        interceptor.intercept(context, mockCallHandler).subscribe({
            next: () => {
                expect(loggerSpy).toHaveBeenCalled();
                const logPayload = JSON.parse(loggerSpy.mock.calls[0][0]);

                expect(logPayload.event).toBe('auth.login.success');
                expect(logPayload.email).toBe('t***@example.com');
                expect(logPayload.userId).toBe('user-123');
                expect(logPayload.statusCode).toBe(200);
                expect(logPayload.password).toBeUndefined();
                done();
            },
            error: (err) => done(err),
        });
    });

    it('should log failure event', (done) => {
        const context = createMockContext('POST', '/api/v1/auth/login', { email: 'test@example.com' });
        const error = new HttpException('Unauthorized', 401);

        const failHandler: CallHandler = {
            handle: () => throwError(() => error),
        };

        interceptor.intercept(context, failHandler).subscribe({
            error: () => {
                expect(loggerSpy).toHaveBeenCalled();
                const logPayload = JSON.parse(loggerSpy.mock.calls[0][0]);

                expect(logPayload.event).toBe('auth.login.failed');
                expect(logPayload.statusCode).toBe(401);
                expect(logPayload.error).toBeDefined();
                done();
            },
        });
    });

    it('should log rate limit exceeded', (done) => {
        const context = createMockContext('POST', '/api/v1/auth/login');
        const error = new HttpException('Too Many Requests', 429);

        const failHandler: CallHandler = {
            handle: () => throwError(() => error),
        };

        interceptor.intercept(context, failHandler).subscribe({
            error: () => {
                expect(loggerSpy).toHaveBeenCalled();
                const logPayload = JSON.parse(loggerSpy.mock.calls[0][0]);

                expect(logPayload.event).toBe('auth.rate_limit.exceeded');
                expect(logPayload.statusCode).toBe(429);
                done();
            },
        });
    });
});
