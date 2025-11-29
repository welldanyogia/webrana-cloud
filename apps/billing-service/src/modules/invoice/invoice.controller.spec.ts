import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import {
  InvoiceNotFoundException,
  InvoiceAccessDeniedException,
  InvoiceAlreadyPaidException,
  InvoiceExpiredException,
} from '../../common/exceptions/billing.exceptions';

import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';

describe('InvoiceController', () => {
  let controller: InvoiceController;
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

  const mockUserId = 'user-uuid-1';

  const mockInvoiceService = {
    getInvoicesByUserId: jest.fn(),
    getInvoiceById: jest.fn(),
    getInvoiceByOrderId: jest.fn(),
    initiatePayment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [
        {
          provide: InvoiceService,
          useValue: mockInvoiceService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => defaultValue),
          },
        },
      ],
    }).compile();

    controller = module.get<InvoiceController>(InvoiceController);
    invoiceService = module.get(InvoiceService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyInvoices', () => {
    it('should return paginated invoices for user', async () => {
      const expectedResult = {
        data: [mockInvoice],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockInvoiceService.getInvoicesByUserId.mockResolvedValue(expectedResult);

      const result = await controller.getMyInvoices(mockUserId, {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({ data: expectedResult.data, meta: expectedResult.meta });
      expect(mockInvoiceService.getInvoicesByUserId).toHaveBeenCalledWith(mockUserId, {
        page: 1,
        limit: 10,
      });
    });

    it('should filter invoices by status', async () => {
      const expectedResult = {
        data: [mockInvoice],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockInvoiceService.getInvoicesByUserId.mockResolvedValue(expectedResult);

      await controller.getMyInvoices(mockUserId, {
        page: 1,
        limit: 10,
        status: 'PENDING',
      });

      expect(mockInvoiceService.getInvoicesByUserId).toHaveBeenCalledWith(mockUserId, {
        page: 1,
        limit: 10,
        status: 'PENDING',
      });
    });

    it('should return empty array when no invoices found', async () => {
      const expectedResult = {
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };

      mockInvoiceService.getInvoicesByUserId.mockResolvedValue(expectedResult);

      const result = await controller.getMyInvoices(mockUserId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getInvoiceById', () => {
    it('should return invoice by ID', async () => {
      mockInvoiceService.getInvoiceById.mockResolvedValue(mockInvoice);

      const result = await controller.getInvoiceById(mockInvoice.id, mockUserId);

      expect(result).toEqual({ data: mockInvoice });
      expect(mockInvoiceService.getInvoiceById).toHaveBeenCalledWith(
        mockInvoice.id,
        mockUserId
      );
    });

    it('should throw InvoiceNotFoundException when not found', async () => {
      mockInvoiceService.getInvoiceById.mockRejectedValue(
        new InvoiceNotFoundException('non-existent')
      );

      await expect(
        controller.getInvoiceById('non-existent', mockUserId)
      ).rejects.toThrow(InvoiceNotFoundException);
    });

    it('should throw InvoiceAccessDeniedException when user does not own invoice', async () => {
      mockInvoiceService.getInvoiceById.mockRejectedValue(
        new InvoiceAccessDeniedException(mockInvoice.id)
      );

      await expect(
        controller.getInvoiceById(mockInvoice.id, 'different-user')
      ).rejects.toThrow(InvoiceAccessDeniedException);
    });
  });

  describe('getInvoiceByOrderId', () => {
    it('should return invoice by order ID', async () => {
      mockInvoiceService.getInvoiceByOrderId.mockResolvedValue(mockInvoice);

      const result = await controller.getInvoiceByOrderId(mockInvoice.orderId, mockUserId);

      expect(result).toEqual({ data: mockInvoice });
      expect(mockInvoiceService.getInvoiceByOrderId).toHaveBeenCalledWith(
        mockInvoice.orderId,
        mockUserId
      );
    });

    it('should throw when order not found', async () => {
      mockInvoiceService.getInvoiceByOrderId.mockRejectedValue(
        new InvoiceNotFoundException('non-existent')
      );

      await expect(
        controller.getInvoiceByOrderId('non-existent', mockUserId)
      ).rejects.toThrow(InvoiceNotFoundException);
    });
  });

  describe('initiatePayment', () => {
    const initiateDto = {
      channel: 'BRIVA',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
    };

    const paymentResult = {
      invoice: {
        ...mockInvoice,
        paymentMethod: 'VIRTUAL_ACCOUNT',
        paymentChannel: 'BRI_VA',
        paymentCode: '8077800001234567',
        paymentUrl: 'https://tripay.co.id/checkout/T0001',
        paymentName: 'BRI Virtual Account',
        paymentFee: 2000,
        tripayReference: 'T0001',
      },
      payment: {
        channel: 'BRIVA',
        channelName: 'BRI Virtual Account',
        paymentCode: '8077800001234567',
        paymentUrl: 'https://tripay.co.id/checkout/T0001',
        totalAmount: 102000,
        fee: 2000,
        expiredAt: new Date().toISOString(),
        instructions: [],
      },
    };

    it('should initiate payment successfully', async () => {
      mockInvoiceService.initiatePayment.mockResolvedValue(paymentResult);

      const result = await controller.initiatePayment(
        mockInvoice.id,
        initiateDto,
        mockUserId
      );

      expect(result).toEqual({ data: paymentResult });
      expect(mockInvoiceService.initiatePayment).toHaveBeenCalledWith(
        mockInvoice.id,
        initiateDto,
        mockUserId
      );
    });

    it('should throw InvoiceNotFoundException when invoice not found', async () => {
      mockInvoiceService.initiatePayment.mockRejectedValue(
        new InvoiceNotFoundException('non-existent')
      );

      await expect(
        controller.initiatePayment('non-existent', initiateDto, mockUserId)
      ).rejects.toThrow(InvoiceNotFoundException);
    });

    it('should throw InvoiceAlreadyPaidException when invoice already paid', async () => {
      mockInvoiceService.initiatePayment.mockRejectedValue(
        new InvoiceAlreadyPaidException(mockInvoice.id)
      );

      await expect(
        controller.initiatePayment(mockInvoice.id, initiateDto, mockUserId)
      ).rejects.toThrow(InvoiceAlreadyPaidException);
    });

    it('should throw InvoiceExpiredException when invoice expired', async () => {
      mockInvoiceService.initiatePayment.mockRejectedValue(
        new InvoiceExpiredException(mockInvoice.id)
      );

      await expect(
        controller.initiatePayment(mockInvoice.id, initiateDto, mockUserId)
      ).rejects.toThrow(InvoiceExpiredException);
    });

    it('should throw InvoiceAccessDeniedException when user does not own invoice', async () => {
      mockInvoiceService.initiatePayment.mockRejectedValue(
        new InvoiceAccessDeniedException(mockInvoice.id)
      );

      await expect(
        controller.initiatePayment(mockInvoice.id, initiateDto, 'different-user')
      ).rejects.toThrow(InvoiceAccessDeniedException);
    });
  });
});
