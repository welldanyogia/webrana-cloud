import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import {
  InvoiceAlreadyExistsException,
} from '../../common/exceptions/billing.exceptions';

import { InternalInvoiceController } from './internal-invoice.controller';
import { InvoiceService } from './invoice.service';

describe('InternalInvoiceController', () => {
  let controller: InternalInvoiceController;
  let invoiceService: jest.Mocked<InvoiceService>;

  const mockInvoice = {
    id: 'invoice-uuid-1',
    orderId: 'order-uuid-1',
    invoiceNumber: 'INV-20241129-ABC123',
    amount: 100000,
    currency: 'IDR',
    status: 'PENDING',
    paymentMethod: undefined,
    paymentChannel: undefined,
    paymentCode: undefined,
    paymentUrl: undefined,
    paymentName: undefined,
    paymentFee: undefined,
    tripayReference: undefined,
    expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    paidAt: undefined,
    paidAmount: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockInvoiceService = {
    createInvoice: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalInvoiceController],
      providers: [
        {
          provide: InvoiceService,
          useValue: mockInvoiceService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'INTERNAL_API_KEY') return 'test-api-key';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<InternalInvoiceController>(InternalInvoiceController);
    invoiceService = module.get(InvoiceService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createInvoice', () => {
    const createInvoiceDto = {
      orderId: 'order-uuid-1',
      userId: 'user-uuid-1',
      amount: 100000,
    };

    it('should create invoice successfully', async () => {
      mockInvoiceService.createInvoice.mockResolvedValue(mockInvoice);

      const result = await controller.createInvoice(createInvoiceDto);

      expect(result).toEqual({ data: mockInvoice });
      expect(mockInvoiceService.createInvoice).toHaveBeenCalledWith(createInvoiceDto);
    });

    it('should create invoice with generated invoice number', async () => {
      mockInvoiceService.createInvoice.mockResolvedValue(mockInvoice);

      const result = await controller.createInvoice(createInvoiceDto);

      expect(result.data.invoiceNumber).toMatch(/^INV-\d{8}-[A-Z0-9]{6}$/);
    });

    it('should create invoice with default currency IDR', async () => {
      mockInvoiceService.createInvoice.mockResolvedValue(mockInvoice);

      const result = await controller.createInvoice(createInvoiceDto);

      expect(result.data.currency).toBe('IDR');
    });

    it('should create invoice with PENDING status', async () => {
      mockInvoiceService.createInvoice.mockResolvedValue(mockInvoice);

      const result = await controller.createInvoice(createInvoiceDto);

      expect(result.data.status).toBe('PENDING');
    });

    it('should create invoice with future expiry date', async () => {
      mockInvoiceService.createInvoice.mockResolvedValue(mockInvoice);

      const result = await controller.createInvoice(createInvoiceDto);

      const expiredAt = new Date(result.data.expiredAt);
      expect(expiredAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should throw InvoiceAlreadyExistsException when order already has invoice', async () => {
      mockInvoiceService.createInvoice.mockRejectedValue(
        new InvoiceAlreadyExistsException(createInvoiceDto.orderId)
      );

      await expect(controller.createInvoice(createInvoiceDto)).rejects.toThrow(
        InvoiceAlreadyExistsException
      );
    });

    it('should handle different amounts correctly', async () => {
      const largeAmountDto = {
        ...createInvoiceDto,
        amount: 10000000, // 10 million IDR
      };

      const largeInvoice = {
        ...mockInvoice,
        amount: 10000000,
      };

      mockInvoiceService.createInvoice.mockResolvedValue(largeInvoice);

      const result = await controller.createInvoice(largeAmountDto);

      expect(result.data.amount).toBe(10000000);
      expect(mockInvoiceService.createInvoice).toHaveBeenCalledWith(largeAmountDto);
    });

    it('should handle minimum amount correctly', async () => {
      const minAmountDto = {
        ...createInvoiceDto,
        amount: 10000, // Minimum typical amount
      };

      const minInvoice = {
        ...mockInvoice,
        amount: 10000,
      };

      mockInvoiceService.createInvoice.mockResolvedValue(minInvoice);

      const result = await controller.createInvoice(minAmountDto);

      expect(result.data.amount).toBe(10000);
    });

    it('should pass userId to service correctly', async () => {
      const dtoWithDifferentUser = {
        ...createInvoiceDto,
        userId: 'different-user-uuid',
      };

      mockInvoiceService.createInvoice.mockResolvedValue({
        ...mockInvoice,
        userId: 'different-user-uuid',
      } as any);

      await controller.createInvoice(dtoWithDifferentUser);

      expect(mockInvoiceService.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'different-user-uuid' })
      );
    });

    it('should handle service errors gracefully', async () => {
      mockInvoiceService.createInvoice.mockRejectedValue(
        new Error('Database connection error')
      );

      await expect(controller.createInvoice(createInvoiceDto)).rejects.toThrow(
        'Database connection error'
      );
    });
  });

  describe('Guard validation scenarios', () => {
    it('should be protected by ApiKeyGuard decorator', () => {
      // Verify the controller class has guards applied
      const metadata = Reflect.getMetadata('__guards__', InternalInvoiceController);
      expect(metadata).toBeDefined();
      expect(metadata.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('HTTP method validation', () => {
    it('should have route path decorator', () => {
      // Verify the method has path decorator
      const path = Reflect.getMetadata('path', InternalInvoiceController.prototype.createInvoice);
      expect(path).toBe('invoices');
    });

    it('should return HTTP 201 Created', () => {
      // Verify HTTP status code decorator
      const statusCode = Reflect.getMetadata(
        '__httpCode__',
        InternalInvoiceController.prototype.createInvoice
      );
      expect(statusCode).toBe(201);
    });
  });
});
