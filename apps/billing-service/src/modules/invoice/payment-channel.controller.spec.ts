import { Test, TestingModule } from '@nestjs/testing';

import { TripayApiException } from '../../common/exceptions/billing.exceptions';

import { InvoiceService } from './invoice.service';
import { PaymentChannelController } from './payment-channel.controller';

describe('PaymentChannelController', () => {
  let controller: PaymentChannelController;
  let invoiceService: jest.Mocked<InvoiceService>;

  const mockPaymentChannels = [
    {
      code: 'BRIVA',
      name: 'BRI Virtual Account',
      group: 'Virtual Account',
      type: 'virtual_account',
      fee: {
        flat: 4000,
        percent: 0,
      },
      iconUrl: 'https://tripay.co.id/images/payment-icon/briva.png',
    },
    {
      code: 'BCAVA',
      name: 'BCA Virtual Account',
      group: 'Virtual Account',
      type: 'virtual_account',
      fee: {
        flat: 5000,
        percent: 0,
      },
      iconUrl: 'https://tripay.co.id/images/payment-icon/bcava.png',
    },
    {
      code: 'QRIS',
      name: 'QRIS',
      group: 'QRIS',
      type: 'qris',
      fee: {
        flat: 0,
        percent: 0.7,
      },
      iconUrl: 'https://tripay.co.id/images/payment-icon/qris.png',
    },
    {
      code: 'OVO',
      name: 'OVO',
      group: 'E-Wallet',
      type: 'ewallet',
      fee: {
        flat: 0,
        percent: 2.5,
      },
      iconUrl: 'https://tripay.co.id/images/payment-icon/ovo.png',
    },
  ];

  const mockInvoiceService = {
    getPaymentChannels: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentChannelController],
      providers: [
        {
          provide: InvoiceService,
          useValue: mockInvoiceService,
        },
      ],
    }).compile();

    controller = module.get<PaymentChannelController>(PaymentChannelController);
    invoiceService = module.get(InvoiceService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPaymentChannels', () => {
    it('should return all available payment channels', async () => {
      mockInvoiceService.getPaymentChannels.mockResolvedValue(mockPaymentChannels);

      const result = await controller.getPaymentChannels();

      expect(result).toEqual({ data: mockPaymentChannels });
      expect(mockInvoiceService.getPaymentChannels).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no payment channels available', async () => {
      mockInvoiceService.getPaymentChannels.mockResolvedValue([]);

      const result = await controller.getPaymentChannels();

      expect(result).toEqual({ data: [] });
      expect(mockInvoiceService.getPaymentChannels).toHaveBeenCalledTimes(1);
    });

    it('should return channels with different types', async () => {
      mockInvoiceService.getPaymentChannels.mockResolvedValue(mockPaymentChannels);

      const result = await controller.getPaymentChannels();

      // Verify different channel types are returned
      const types = result.data.map((ch: any) => ch.type);
      expect(types).toContain('virtual_account');
      expect(types).toContain('qris');
      expect(types).toContain('ewallet');
    });

    it('should include fee information for each channel', async () => {
      mockInvoiceService.getPaymentChannels.mockResolvedValue(mockPaymentChannels);

      const result = await controller.getPaymentChannels();

      // Verify each channel has fee information
      result.data.forEach((channel: any) => {
        expect(channel.fee).toBeDefined();
        expect(channel.fee.flat).toBeGreaterThanOrEqual(0);
        expect(channel.fee.percent).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle Tripay API errors gracefully', async () => {
      mockInvoiceService.getPaymentChannels.mockRejectedValue(
        new TripayApiException('Service unavailable')
      );

      await expect(controller.getPaymentChannels()).rejects.toThrow(TripayApiException);
    });

    it('should handle generic errors', async () => {
      mockInvoiceService.getPaymentChannels.mockRejectedValue(
        new Error('Unexpected error')
      );

      await expect(controller.getPaymentChannels()).rejects.toThrow('Unexpected error');
    });
  });

  describe('Public endpoint behavior', () => {
    it('should not require authentication (no guards)', () => {
      // Verify no guards are applied to the controller
      const metadata = Reflect.getMetadata('__guards__', PaymentChannelController);
      expect(metadata).toBeUndefined();
    });
  });
});
