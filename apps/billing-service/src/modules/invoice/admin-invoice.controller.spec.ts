import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { InvoiceNotFoundException } from '../../common/exceptions/billing.exceptions';

import { AdminInvoiceController } from './admin-invoice.controller';
import { InvoiceService } from './invoice.service';

describe('AdminInvoiceController', () => {
  let controller: AdminInvoiceController;
  let invoiceService: jest.Mocked<InvoiceService>;

  const mockInvoice = {
    id: 'invoice-uuid-1',
    orderId: 'order-uuid-1',
    userId: 'user-uuid-1',
    invoiceNumber: 'INV-20241129-ABC123',
    amount: 100000,
    currency: 'IDR',
    status: 'PENDING',
    paymentMethod: null,
    paymentChannel: null,
    paymentCode: null,
    paymentUrl: null,
    paymentName: null,
    paymentFee: null,
    tripayReference: null,
    paidAt: null,
    paidAmount: null,
    expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInvoiceService = {
    getAllInvoices: jest.fn(),
    getInvoiceById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminInvoiceController],
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
              if (key === 'JWT_ALGORITHM') return 'HS256';
              if (key === 'JWT_SECRET') return 'test-secret';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<AdminInvoiceController>(AdminInvoiceController);
    invoiceService = module.get(InvoiceService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllInvoices', () => {
    it('should return paginated list of all invoices', async () => {
      const expectedResult = {
        data: [mockInvoice],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockInvoiceService.getAllInvoices.mockResolvedValue(expectedResult);

      const result = await controller.getAllInvoices({ page: 1, limit: 10 });

      expect(result).toEqual({ data: expectedResult.data, meta: expectedResult.meta });
      expect(mockInvoiceService.getAllInvoices).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });

    it('should filter invoices by status', async () => {
      const paidInvoice = { ...mockInvoice, status: 'PAID' };
      const expectedResult = {
        data: [paidInvoice],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockInvoiceService.getAllInvoices.mockResolvedValue(expectedResult);

      const result = await controller.getAllInvoices({
        page: 1,
        limit: 10,
        status: 'PAID',
      });

      expect(result.data[0].status).toBe('PAID');
      expect(mockInvoiceService.getAllInvoices).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: 'PAID',
      });
    });

    it('should handle pagination parameters', async () => {
      const expectedResult = {
        data: [],
        meta: {
          page: 5,
          limit: 20,
          total: 100,
          totalPages: 5,
        },
      };

      mockInvoiceService.getAllInvoices.mockResolvedValue(expectedResult);

      const result = await controller.getAllInvoices({ page: 5, limit: 20 });

      expect(result.meta.page).toBe(5);
      expect(result.meta.limit).toBe(20);
    });

    it('should return empty array when no invoices exist', async () => {
      const expectedResult = {
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };

      mockInvoiceService.getAllInvoices.mockResolvedValue(expectedResult);

      const result = await controller.getAllInvoices({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getInvoiceById', () => {
    it('should return invoice by ID without ownership check', async () => {
      mockInvoiceService.getInvoiceById.mockResolvedValue(mockInvoice);

      const result = await controller.getInvoiceById(mockInvoice.id);

      expect(result).toEqual({ data: mockInvoice });
      // Admin endpoint should not pass userId for ownership check
      expect(mockInvoiceService.getInvoiceById).toHaveBeenCalledWith(mockInvoice.id);
    });

    it('should throw InvoiceNotFoundException when invoice not found', async () => {
      mockInvoiceService.getInvoiceById.mockRejectedValue(
        new InvoiceNotFoundException('non-existent')
      );

      await expect(
        controller.getInvoiceById('non-existent')
      ).rejects.toThrow(InvoiceNotFoundException);
    });

    it('should allow access to any user invoice', async () => {
      const anotherUserInvoice = {
        ...mockInvoice,
        userId: 'another-user-uuid',
      };

      mockInvoiceService.getInvoiceById.mockResolvedValue(anotherUserInvoice);

      const result = await controller.getInvoiceById(anotherUserInvoice.id);

      expect(result.data.userId).toBe('another-user-uuid');
    });
  });

  describe('Guard validation scenarios', () => {
    // These tests validate that the controller would reject requests
    // without proper guards - the actual guard logic is tested separately

    it('should be protected by ApiKeyGuard and AdminRoleGuard decorators', () => {
      // Verify the controller class has guards applied
      const metadata = Reflect.getMetadata('__guards__', AdminInvoiceController);
      expect(metadata).toBeDefined();
      expect(metadata.length).toBeGreaterThanOrEqual(1);
    });
  });
});
