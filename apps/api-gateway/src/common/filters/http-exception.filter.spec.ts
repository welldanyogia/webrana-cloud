import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      method: 'GET',
      url: '/api/v1/test',
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
    it('should handle BadRequestException', () => {
      const exception = new BadRequestException('Invalid input');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid input',
        },
      });
    });

    it('should handle UnauthorizedException', () => {
      const exception = new UnauthorizedException('Token expired');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token expired',
        },
      });
    });

    it('should handle NotFoundException', () => {
      const exception = new NotFoundException('Resource not found');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      });
    });

    it('should handle HttpException with custom code', () => {
      const exception = new HttpException(
        { code: 'CUSTOM_ERROR', message: 'Custom error message' },
        HttpStatus.CONFLICT,
      );
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'CUSTOM_ERROR',
          message: 'Custom error message',
        },
      });
    });

    it('should include details when provided', () => {
      const exception = new HttpException(
        {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { field: 'email', error: 'Invalid format' },
        },
        HttpStatus.BAD_REQUEST,
      );
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { field: 'email', error: 'Invalid format' },
        },
      });
    });

    it('should handle generic Error', () => {
      const exception = new Error('Something went wrong');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Something went wrong',
        },
      });
    });

    it('should handle unknown exception types', () => {
      const exception = 'Unknown error string';
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });

    it('should handle ForbiddenException', () => {
      const { ForbiddenException } = require('@nestjs/common');
      const exception = new ForbiddenException('Access denied');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    });

    it('should handle ConflictException', () => {
      const { ConflictException } = require('@nestjs/common');
      const exception = new ConflictException('Resource already exists');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'CONFLICT',
          message: 'Resource already exists',
        },
      });
    });

    it('should handle ServiceUnavailableException', () => {
      const { ServiceUnavailableException } = require('@nestjs/common');
      const exception = new ServiceUnavailableException('Service is down');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service is down',
        },
      });
    });

    it('should handle GatewayTimeoutException', () => {
      const { GatewayTimeoutException } = require('@nestjs/common');
      const exception = new GatewayTimeoutException('Gateway timeout');
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.GATEWAY_TIMEOUT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'GATEWAY_TIMEOUT',
          message: 'Gateway timeout',
        },
      });
    });

    it('should handle TooManyRequestsException', () => {
      const exception = new HttpException(
        'Rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
        },
      });
    });

    it('should handle HttpException with string response', () => {
      const exception = new HttpException('Simple error message', HttpStatus.BAD_REQUEST);
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'BAD_REQUEST',
          message: 'Simple error message',
        },
      });
    });

    it('should handle HttpException with object but no code', () => {
      const exception = new HttpException(
        { message: 'Error without code' },
        HttpStatus.BAD_REQUEST,
      );
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'BAD_REQUEST',
          message: 'Error without code',
        },
      });
    });

    it('should handle HttpException with null response', () => {
      const exception = new HttpException(null as any, HttpStatus.INTERNAL_SERVER_ERROR);
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should handle number as exception', () => {
      filter.catch(12345, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });

    it('should handle undefined as exception', () => {
      filter.catch(undefined, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });

    it('should handle null as exception', () => {
      filter.catch(null, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });

    it('should handle empty object as exception', () => {
      filter.catch({}, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });

    it('should handle HttpException with empty object response', () => {
      const exception = new HttpException({}, HttpStatus.BAD_REQUEST);
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Status code mappings', () => {
    it('should map status codes correctly', () => {
      const statusCodes = [
        { status: HttpStatus.BAD_REQUEST, code: 'BAD_REQUEST' },
        { status: HttpStatus.UNAUTHORIZED, code: 'UNAUTHORIZED' },
        { status: HttpStatus.FORBIDDEN, code: 'FORBIDDEN' },
        { status: HttpStatus.NOT_FOUND, code: 'NOT_FOUND' },
        { status: HttpStatus.CONFLICT, code: 'CONFLICT' },
        { status: HttpStatus.TOO_MANY_REQUESTS, code: 'RATE_LIMIT_EXCEEDED' },
        { status: HttpStatus.SERVICE_UNAVAILABLE, code: 'SERVICE_UNAVAILABLE' },
        { status: HttpStatus.GATEWAY_TIMEOUT, code: 'GATEWAY_TIMEOUT' },
      ];

      for (const { status, code } of statusCodes) {
        const exception = new HttpException('Test', status);
        filter.catch(exception, mockHost);
        
        expect(mockResponse.status).toHaveBeenCalledWith(status);
        const lastCall = mockResponse.json.mock.calls[mockResponse.json.mock.calls.length - 1][0];
        expect(lastCall.error.code).toBe(code);
      }
    });

    it('should default to INTERNAL_SERVER_ERROR for unknown status codes', () => {
      const exception = new HttpException('Test', 418); // I'm a teapot
      
      filter.catch(exception, mockHost);
      
      expect(mockResponse.status).toHaveBeenCalledWith(418);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Test',
        },
      });
    });
  });
});
