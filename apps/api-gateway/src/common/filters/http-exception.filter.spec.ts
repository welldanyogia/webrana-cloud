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
  });
});
