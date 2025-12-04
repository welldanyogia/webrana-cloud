import { OrderClientService } from '../../src/modules/order-client/order-client.service';
import { TripayPaymentChannel, TripayTransaction } from '../../src/modules/tripay/dto/tripay.dto';
import { TripayService } from '../../src/modules/tripay/tripay.service';

/**
 * Mock Tripay payment channels for testing
 */
export const MOCK_PAYMENT_CHANNELS: TripayPaymentChannel[] = [
  {
    group: 'Virtual Account',
    code: 'BRIVA',
    name: 'BRI Virtual Account',
    type: 'virtual_account',
    icon_url: 'https://tripay.co.id/images/payment-icon/BRI.png',
    active: true,
    total_fee: {
      flat: 4000,
      percent: 0,
    },
    minimum_fee: 4000,
    maximum_fee: 4000,
  },
  {
    group: 'E-Wallet',
    code: 'OVO',
    name: 'OVO',
    type: 'ewallet',
    icon_url: 'https://tripay.co.id/images/payment-icon/OVO.png',
    active: true,
    total_fee: {
      flat: 0,
      percent: 2.5,
    },
    minimum_fee: 500,
    maximum_fee: null,
  },
  {
    group: 'QRIS',
    code: 'QRIS',
    name: 'QRIS',
    type: 'qris',
    icon_url: 'https://tripay.co.id/images/payment-icon/QRIS.png',
    active: true,
    total_fee: {
      flat: 0,
      percent: 0.7,
    },
    minimum_fee: 100,
    maximum_fee: null,
  },
];

/**
 * Create a mock transaction response
 */
export function createMockTransaction(params: {
  merchantRef: string;
  amount: number;
  method: string;
}): TripayTransaction {
  return {
    reference: `T${Date.now()}`,
    merchant_ref: params.merchantRef,
    payment_selection_type: 'static',
    payment_method: params.method,
    payment_name: MOCK_PAYMENT_CHANNELS.find((c) => c.code === params.method)?.name || 'Test Payment',
    customer_name: 'Test Customer',
    customer_email: 'test@example.com',
    customer_phone: '',
    callback_url: '',
    return_url: '',
    amount: params.amount,
    fee_merchant: 0,
    fee_customer: 4000,
    total_fee: 4000,
    amount_received: params.amount,
    pay_code: '123456789012345',
    pay_url: null,
    checkout_url: 'https://tripay.co.id/checkout/T123',
    status: 'UNPAID',
    expired_time: Math.floor(Date.now() / 1000) + 86400,
    order_items: [
      {
        sku: null,
        name: `Invoice ${params.merchantRef}`,
        price: params.amount,
        quantity: 1,
        product_url: null,
        image_url: null,
      },
    ],
    instructions: [
      {
        title: 'Payment Instructions',
        steps: ['Step 1', 'Step 2'],
      },
    ],
  };
}

/**
 * Create a mock TripayService
 */
export function createMockTripayService(): Partial<TripayService> {
  return {
    getPaymentChannels: jest.fn().mockResolvedValue(MOCK_PAYMENT_CHANNELS),
    createTransaction: jest.fn().mockImplementation((dto) => {
      return Promise.resolve(
        createMockTransaction({
          merchantRef: dto.merchantRef,
          amount: dto.amount,
          method: dto.method,
        })
      );
    }),
    calculateFee: jest.fn().mockImplementation((channel, amount) => {
      const flatFee = channel.total_fee.flat;
      const percentFee = Math.round((amount * channel.total_fee.percent) / 100);
      return flatFee + percentFee;
    }),
    verifyCallbackSignatureRaw: jest.fn().mockImplementation(() => {
      // By default, signature is valid
    }),
    generateSignature: jest.fn().mockReturnValue('mock-signature'),
  };
}

/**
 * Create a mock OrderClientService
 */
export function createMockOrderClientService(): Partial<OrderClientService> {
  return {
    updatePaymentStatus: jest.fn().mockResolvedValue(undefined),
  };
}
