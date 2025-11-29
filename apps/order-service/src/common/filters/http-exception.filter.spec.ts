import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import {
  OrderNotFoundException,
  OrderAccessDeniedException,
  PaymentStatusConflictException,
  CatalogServiceUnavailableException,
  ProvisioningFailedException,
  DigitalOceanUnavailableException,
  ProvisioningTimeoutException,
  InvalidPlanException,
  InvalidImageException,
  InvalidCouponException,
} from '../exceptions';

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
      url: '/api/v1/orders/123',
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;
  });

  describe('OrderException handling', () => {
    it('should handle OrderNotFoundException', () => {
      const exception = new OrderNotFoundException('order-123');
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order dengan ID tersebut tidak ditemukan',
          details: { orderId: 'order-123' },
        },
      });
    });

    it('should handle OrderAccessDeniedException', () => {
      const exception = new OrderAccessDeniedException('order-123');
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'ORDER_ACCESS_DENIED',
          message: 'User tidak memiliki akses ke order ini',
          details: { orderId: 'order-123' },
        },
      });
    });

    it('should handle PaymentStatusConflictException', () => {
      const exception = new PaymentStatusConflictException('ACTIVE', 'PAID');
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'PAYMENT_STATUS_CONFLICT',
          message: 'Order tidak dalam status yang valid untuk transisi payment',
          details: { currentStatus: 'ACTIVE', requestedStatus: 'PAID' },
        },
      });
    });

    it('should handle CatalogServiceUnavailableException', () => {
      const exception = new CatalogServiceUnavailableException({
        method: 'getPlanById',
      });
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.SERVICE_UNAVAILABLE
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'CATALOG_SERVICE_UNAVAILABLE',
          message: 'Tidak dapat menghubungi catalog-service',
          details: { method: 'getPlanById' },
        },
      });
    });

    it('should handle ProvisioningFailedException', () => {
      const exception = new ProvisioningFailedException(
        'order-123',
        'Droplet creation failed'
      );
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'PROVISIONING_FAILED',
          message: 'Gagal membuat droplet di DigitalOcean',
          details: { orderId: 'order-123', reason: 'Droplet creation failed' },
        },
      });
    });

    it('should handle DigitalOceanUnavailableException', () => {
      const exception = new DigitalOceanUnavailableException({
        method: 'createDroplet',
        errorCode: 'TIMEOUT',
      });
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.SERVICE_UNAVAILABLE
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'DIGITALOCEAN_UNAVAILABLE',
          message: 'Tidak dapat menghubungi DigitalOcean API',
          details: { method: 'createDroplet', errorCode: 'TIMEOUT' },
        },
      });
    });

    it('should handle ProvisioningTimeoutException', () => {
      const exception = new ProvisioningTimeoutException('order-123', 60);
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.GATEWAY_TIMEOUT
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'PROVISIONING_TIMEOUT',
          message: 'Droplet tidak ready dalam waktu yang ditentukan',
          details: { orderId: 'order-123', attempts: 60 },
        },
      });
    });

    it('should handle InvalidPlanException', () => {
      const exception = new InvalidPlanException('plan-123', 'Plan not active');
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_PLAN',
          message: 'Plan ID tidak valid atau tidak aktif',
          details: { planId: 'plan-123', reason: 'Plan not active' },
        },
      });
    });

    it('should handle InvalidImageException', () => {
      const exception = new InvalidImageException('image-123', 'Image not found');
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_IMAGE',
          message: 'Image ID tidak valid atau tidak tersedia untuk plan',
          details: { imageId: 'image-123', reason: 'Image not found' },
        },
      });
    });

    it('should handle InvalidCouponException', () => {
      const exception = new InvalidCouponException('BADCODE', 'Coupon expired');
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_COUPON',
          message: 'Coupon tidak valid',
          details: { couponCode: 'BADCODE', reason: 'Coupon expired' },
        },
      });
    });
  });

  describe('Generic HttpException handling', () => {
    it('should handle HttpException with code and message', () => {
      const exception = new HttpException(
        { code: 'CUSTOM_ERROR', message: 'Custom error message' },
        HttpStatus.BAD_REQUEST
      );
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'CUSTOM_ERROR',
          message: 'Custom error message',
        },
      });
    });

    it('should handle HttpException with string message', () => {
      const exception = new HttpException(
        'Simple error message',
        HttpStatus.BAD_REQUEST
      );
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'BAD_REQUEST',
          message: 'Simple error message',
        },
      });
    });
  });

  describe('Generic Error handling', () => {
    it('should handle generic Error', () => {
      const exception = new Error('Unexpected error');
      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Unexpected error',
        },
      });
    });

    it('should handle unknown exception type', () => {
      filter.catch('unknown error type', mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR
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
