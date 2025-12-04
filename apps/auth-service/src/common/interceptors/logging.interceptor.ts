import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

import { maskEmail } from '../utils/email-mask.util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const startTime = Date.now();

        return next.handle().pipe(
            tap(() => {
                const durationMs = Date.now() - startTime;
                const statusCode = context.switchToHttp().getResponse().statusCode;
                this.logRequest(
                    request,
                    statusCode,
                    durationMs,
                    null
                );
            }),
            catchError((error) => {
                const durationMs = Date.now() - startTime;
                const statusCode =
                    error instanceof HttpException
                        ? error.getStatus()
                        : HttpStatus.INTERNAL_SERVER_ERROR;

                this.logRequest(
                    request,
                    statusCode,
                    durationMs,
                    error
                );
                return throwError(() => error);
            }),
        );
    }

    private logRequest(
        request: Request,
        statusCode: number,
        durationMs: number,
        error: any,
    ) {
        const { method, url, body, ip, headers } = request;
        const userAgent = headers['user-agent'] || '';

        // Determine event name
        let event = 'auth.request';
        const path = url.replace('/api/v1/auth', '').split('?')[0]; // Remove prefix and query params

        if (method === 'POST') {
            if (path === '/register') event = 'auth.register';
            else if (path === '/login') event = 'auth.login';
            else if (path === '/logout') event = 'auth.logout';
            else if (path === '/verify-email') event = 'auth.verify_email';
            else if (path === '/resend-verification') event = 'auth.verification.resend';
            else if (path === '/forgot-password') event = 'auth.password.forgot';
            else if (path === '/reset-password') event = 'auth.password.reset';
            else if (path === '/change-password') event = 'auth.password.change';
            else if (path === '/refresh') event = 'auth.token.refresh';
        }

        // Append status
        if (error) {
            event += '.failed';
            // Check for rate limit error
            if (statusCode === HttpStatus.TOO_MANY_REQUESTS) {
                event = 'auth.rate_limit.exceeded';
            }
        } else {
            event += '.success';
        }

        // Extract user ID if available
        const userId = (request as any).user?.id || (request as any).user?.sub;

        // Prepare log payload
        const logPayload = {
            event,
            method,
            url,
            statusCode,
            durationMs,
            userId,
            ipAddress: ip || (request.socket ? request.socket.remoteAddress : null),
            userAgent,
            email: body?.email ? maskEmail(body.email) : undefined,
            error: error ? {
                message: error.message,
                name: error.name,
                response: error.response,
            } : undefined,
        };

        // Remove undefined fields
        Object.keys(logPayload).forEach(key =>
            logPayload[key] === undefined && delete logPayload[key]
        );

        // Log as JSON string
        this.logger.log(JSON.stringify(logPayload));
    }
}
