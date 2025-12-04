import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import {
  InvoiceNotFoundException,
  InvoiceAlreadyExistsException,
  InvoiceAccessDeniedException,
  InvoiceExpiredException,
  InvoiceAlreadyPaidException,
} from '../../common/exceptions/billing.exceptions';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderClientService } from '../order-client/order-client.service';
import { TripayService } from '../tripay/tripay.service';

import { InvoiceService } from './invoice.service';


describe('InvoiceService', () => {
  let service: InvoiceService;
  let prismaService: PrismaService;
  let tripayService: TripayService;
  let orderClientService: OrderClientService;

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
    paidChannel: null,
    callbackPayload: null,
    expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    invoice: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
  };

  const mockTripayService = {
    getPaymentChannels: jest.fn(),
    createTransaction: jest.fn(),
    calculateFee: jest.fn(),
  };

  const mockOrderClientService = {
    updatePaymentStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TripayService,
          useValue: mockTripayService,
        },
        {
          provide: OrderClientService,
          useValue: mockOrderClientService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'INVOICE_EXPIRY_HOURS') return 24;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    prismaService = module.get<PrismaService>(PrismaService);
    tripayService = module.get<TripayService>(TripayService);
    orderClientService = module.get<OrderClientService>(OrderClientService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('createInvoice', () => {
    const createDto = {
      orderId: 'order-uuid-1',
      userId: 'user-uuid-1',
      amount: 100000,
    };

    it('should create invoice successfully', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);
      mockPrismaService.invoice.create.mockResolvedValue(mockInvoice);

      const result = await service.createInvoice(createDto);

      expect(result.orderId).toBe(createDto.orderId);
      expect(result.amount).toBe(createDto.amount);
      expect(result.status).toBe('PENDING');
      expect(mockPrismaService.invoice.create).toHaveBeenCalled();
    });

    it('should throw InvoiceAlreadyExistsException if invoice exists for order', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      await expect(service.createInvoice(createDto)).rejects.toThrow(
        InvoiceAlreadyExistsException
      );
    });
  });

  describe('getInvoiceById', () => {
    it('should return invoice by ID', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.getInvoiceById(mockInvoice.id);

      expect(result.id).toBe(mockInvoice.id);
      expect(result.invoiceNumber).toBe(mockInvoice.invoiceNumber);
    });

    it('should throw InvoiceNotFoundException if not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(service.getInvoiceById('non-existent')).rejects.toThrow(
        InvoiceNotFoundException
      );
    });

    it('should throw InvoiceAccessDeniedException if userId does not match', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      await expect(
        service.getInvoiceById(mockInvoice.id, 'different-user')
      ).rejects.toThrow(InvoiceAccessDeniedException);
    });

    it('should return invoice if userId matches', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.getInvoiceById(mockInvoice.id, mockInvoice.userId);

      expect(result.id).toBe(mockInvoice.id);
    });
  });

  describe('getInvoiceByOrderId', () => {
    it('should return invoice by order ID', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.getInvoiceByOrderId(mockInvoice.orderId);

      expect(result?.orderId).toBe(mockInvoice.orderId);
    });

    it('should return null if not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      const result = await service.getInvoiceByOrderId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getInvoicesByUserId', () => {
    it('should return paginated invoices', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([mockInvoice]);
      mockPrismaService.invoice.count.mockResolvedValue(1);

      const result = await service.getInvoicesByUserId(mockInvoice.userId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([mockInvoice]);
      mockPrismaService.invoice.count.mockResolvedValue(1);

      await service.getInvoicesByUserId(mockInvoice.userId, {
        page: 1,
        limit: 10,
        status: 'PENDING',
      });

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: mockInvoice.userId,
            status: 'PENDING',
          },
        })
      );
    });
  });

  describe('initiatePayment', () => {
    const initiateDto = {
      channel: 'BRIVA',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
    };

    const mockChannels = [
      {
        group: 'Virtual Account',
        code: 'BRIVA',
        name: 'BRI Virtual Account',
        type: 'virtual_account',
        fee_merchant: { flat: 2000, percent: 0 },
        fee_customer: { flat: 0, percent: 0 },
        total_fee: { flat: 2000, percent: 0 },
        minimum_fee: 2000,
        maximum_fee: 2000,
        icon_url: 'https://tripay.co.id/images/bri.png',
        active: true,
      },
    ];

    const mockTransaction = {
      reference: 'T0001',
      merchant_ref: mockInvoice.invoiceNumber,
      payment_selection_type: 'static',
      payment_method: 'BRIVA',
      payment_name: 'BRI Virtual Account',
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      customer_phone: '',
      callback_url: '',
      return_url: '',
      amount: 100000,
      fee_merchant: 2000,
      fee_customer: 0,
      total_fee: 2000,
      amount_received: 98000,
      pay_code: '8077800001234567',
      pay_url: 'https://tripay.co.id/checkout/T0001',
      checkout_url: 'https://tripay.co.id/checkout/T0001',
      status: 'UNPAID',
      expired_time: Math.floor(Date.now() / 1000) + 86400,
      order_items: [],
      instructions: [],
    };

    beforeEach(() => {
      mockTripayService.getPaymentChannels.mockResolvedValue(mockChannels);
      mockTripayService.createTransaction.mockResolvedValue(mockTransaction);
      mockTripayService.calculateFee.mockReturnValue(2000);
    });

    it('should initiate payment successfully', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrismaService.invoice.update.mockResolvedValue({
        ...mockInvoice,
        paymentMethod: 'VIRTUAL_ACCOUNT',
        paymentChannel: 'BRI_VA',
        paymentCode: mockTransaction.pay_code,
        paymentUrl: mockTransaction.checkout_url,
        paymentName: mockTransaction.payment_name,
        paymentFee: 2000,
        tripayReference: mockTransaction.reference,
      });

      const result = await service.initiatePayment(mockInvoice.id, initiateDto);

      expect(result.invoice.tripayReference).toBe(mockTransaction.reference);
      expect(result.payment.paymentCode).toBe(mockTransaction.pay_code);
      expect(mockTripayService.createTransaction).toHaveBeenCalled();
    });

    it('should throw InvoiceNotFoundException if not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(
        service.initiatePayment('non-existent', initiateDto)
      ).rejects.toThrow(InvoiceNotFoundException);
    });

    it('should throw InvoiceAlreadyPaidException if already paid', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID',
      });

      await expect(
        service.initiatePayment(mockInvoice.id, initiateDto)
      ).rejects.toThrow(InvoiceAlreadyPaidException);
    });

    it('should throw InvoiceExpiredException if expired', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        status: 'EXPIRED',
      });

      await expect(
        service.initiatePayment(mockInvoice.id, initiateDto)
      ).rejects.toThrow(InvoiceExpiredException);
    });

    it('should throw InvoiceAccessDeniedException if user does not own invoice', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      await expect(
        service.initiatePayment(mockInvoice.id, initiateDto, 'different-user')
      ).rejects.toThrow(InvoiceAccessDeniedException);
    });
  });

  describe('processCallback', () => {
    const paidCallback = {
      reference: 'T0001',
      merchant_ref: mockInvoice.invoiceNumber,
      payment_method: 'BRIVA',
      payment_method_code: 'BRIVA',
      total_amount: 100000,
      fee_merchant: 2000,
      fee_customer: 0,
      total_fee: 2000,
      amount_received: 98000,
      is_closed_payment: 1,
      status: 'PAID' as const,
      paid_at: Math.floor(Date.now() / 1000),
    };

    it('should process PAID callback successfully', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrismaService.payment.create.mockResolvedValue({});
      mockPrismaService.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID',
      });
      mockOrderClientService.updatePaymentStatus.mockResolvedValue({});

      await service.processCallback(paidCallback);

      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PAID',
          }),
        })
      );
      expect(mockOrderClientService.updatePaymentStatus).toHaveBeenCalledWith(
        mockInvoice.orderId,
        'PAID',
        paidCallback.reference
      );
    });

    it('should skip if invoice not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await service.processCallback(paidCallback);

      expect(mockPrismaService.invoice.update).not.toHaveBeenCalled();
    });

    it('should skip if invoice already in final status', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID',
      });

      await service.processCallback(paidCallback);

      expect(mockPrismaService.invoice.update).not.toHaveBeenCalled();
    });

    it('should process EXPIRED callback', async () => {
      const expiredCallback = {
        ...paidCallback,
        status: 'EXPIRED' as const,
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrismaService.payment.create.mockResolvedValue({});
      mockPrismaService.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'EXPIRED',
      });

      await service.processCallback(expiredCallback);

      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'EXPIRED',
          }),
        })
      );
    });
  });

  describe('expireInvoice', () => {
    it('should expire pending invoice', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrismaService.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'EXPIRED',
      });

      await service.expireInvoice(mockInvoice.id);

      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: mockInvoice.id },
        data: { status: 'EXPIRED' },
      });
    });

    it('should not expire non-pending invoice', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID',
      });

      await service.expireInvoice(mockInvoice.id);

      expect(mockPrismaService.invoice.update).not.toHaveBeenCalled();
    });

    it('should throw InvoiceNotFoundException if not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(service.expireInvoice('non-existent')).rejects.toThrow(
        InvoiceNotFoundException
      );
    });
  });

  describe('generatePdf', () => {
    it('should generate PDF for valid invoice', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.generatePdf(mockInvoice.id);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      // Check PDF header
      expect(result.toString('utf8', 0, 5)).toBe('%PDF-');
    });

    it('should generate PDF with payment details for paid invoice', async () => {
      const paidInvoice = {
        ...mockInvoice,
        status: 'PAID',
        paidAt: new Date(),
        paidAmount: 100000,
        paymentChannel: 'BRI_VA',
        paymentMethod: 'VIRTUAL_ACCOUNT',
        tripayReference: 'T0001',
        paymentFee: 2000,
      };
      mockPrismaService.invoice.findUnique.mockResolvedValue(paidInvoice);

      const result = await service.generatePdf(paidInvoice.id);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw InvoiceNotFoundException if not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(service.generatePdf('non-existent')).rejects.toThrow(
        InvoiceNotFoundException
      );
    });

    it('should throw InvoiceAccessDeniedException if user does not own invoice', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      await expect(
        service.generatePdf(mockInvoice.id, 'different-user')
      ).rejects.toThrow(InvoiceAccessDeniedException);
    });

    it('should generate PDF when userId matches', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.generatePdf(mockInvoice.id, mockInvoice.userId);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
