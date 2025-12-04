/**
 * E2E Test Mock Data Generators
 *
 * Provides utilities for generating mock payloads for external services
 * like Tripay payment callbacks, DigitalOcean responses, etc.
 */

import { createHmac } from 'crypto';

import { v4 as uuidv4 } from 'uuid';

// Test Tripay credentials (should match test environment)
const TRIPAY_PRIVATE_KEY =
  process.env.TRIPAY_PRIVATE_KEY || 'test-tripay-private-key';

/**
 * Tripay callback status values
 */
export type TripayCallbackStatus =
  | 'PAID'
  | 'EXPIRED'
  | 'FAILED'
  | 'REFUND'
  | 'UNPAID';

/**
 * Tripay callback payload structure
 */
export interface TripayCallbackPayload {
  reference: string;
  merchant_ref: string;
  payment_selection_type: string;
  payment_method: string;
  payment_method_code: string;
  payment_name: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  callback_url: string;
  return_url: string;
  amount: number;
  fee_merchant: number;
  fee_customer: number;
  total_fee: number;
  amount_received: number;
  total_amount: number;
  pay_code: string;
  checkout_url: string;
  status: TripayCallbackStatus;
  paid_at: number | null;
  expired_time: number;
  created_at: number;
  note: string;
  instructions: Array<{
    title: string;
    steps: string[];
  }>;
}

/**
 * Create a Tripay callback payload for testing
 */
export function createTripayCallback(
  merchantRef: string,
  status: TripayCallbackStatus,
  options: {
    amount?: number;
    paymentMethod?: string;
    customerName?: string;
    customerEmail?: string;
    paidAt?: number;
  } = {}
): TripayCallbackPayload {
  const now = Math.floor(Date.now() / 1000);
  const reference = `T${now}${uuidv4().substring(0, 8).toUpperCase()}`;
  const amount = options.amount || 150000;
  const feeCustomer = Math.round(amount * 0.01); // 1% fee example

  return {
    reference,
    merchant_ref: merchantRef,
    payment_selection_type: 'static',
    payment_method: options.paymentMethod || 'BRIVA',
    payment_method_code: options.paymentMethod || 'BRIVA',
    payment_name: 'BRI Virtual Account',
    customer_name: options.customerName || 'Test Customer',
    customer_email: options.customerEmail || 'customer@test.com',
    customer_phone: '08123456789',
    callback_url: 'http://localhost:3004/api/v1/webhooks/tripay',
    return_url: 'http://localhost:4200/orders',
    amount,
    fee_merchant: 0,
    fee_customer: feeCustomer,
    total_fee: feeCustomer,
    amount_received: status === 'PAID' ? amount : 0,
    total_amount: amount + feeCustomer,
    pay_code: '100200012345678901',
    checkout_url: `https://tripay.co.id/checkout/${reference}`,
    status,
    paid_at: status === 'PAID' ? (options.paidAt || now) : null,
    expired_time: now + 24 * 60 * 60, // 24 hours from now
    created_at: now,
    note: '',
    instructions: [
      {
        title: 'ATM BRI',
        steps: [
          'Masukkan PIN Anda',
          'Pilih menu Transaksi Lain',
          'Pilih menu Pembayaran',
          'Pilih menu Lainnya',
          'Pilih menu BRIVA',
          'Masukkan Nomor Virtual Account',
          'Konfirmasi pembayaran Anda',
        ],
      },
    ],
  };
}

/**
 * Generate Tripay callback signature
 */
export function generateTripaySignature(payload: TripayCallbackPayload): string {
  const dataToSign = JSON.stringify(payload);
  return createHmac('sha256', TRIPAY_PRIVATE_KEY)
    .update(dataToSign)
    .digest('hex');
}

/**
 * Create Tripay callback with valid signature
 */
export function createSignedTripayCallback(
  merchantRef: string,
  status: TripayCallbackStatus,
  options: {
    amount?: number;
    paymentMethod?: string;
    customerName?: string;
    customerEmail?: string;
    paidAt?: number;
  } = {}
): { payload: TripayCallbackPayload; signature: string } {
  const payload = createTripayCallback(merchantRef, status, options);
  const signature = generateTripaySignature(payload);
  return { payload, signature };
}

/**
 * DigitalOcean Droplet mock response
 */
export interface MockDropletResponse {
  id: number;
  name: string;
  status: 'new' | 'active' | 'off' | 'archive';
  memory: number;
  vcpus: number;
  disk: number;
  region: { slug: string; name: string };
  image: { id: number; name: string; distribution: string };
  networks: {
    v4: Array<{
      ip_address: string;
      netmask: string;
      gateway: string;
      type: 'public' | 'private';
    }>;
  };
  created_at: string;
}

/**
 * Create a mock DigitalOcean droplet response
 */
export function createMockDroplet(
  options: {
    id?: number;
    name?: string;
    status?: 'new' | 'active' | 'off' | 'archive';
    ipv4Public?: string;
    ipv4Private?: string;
    region?: string;
    memory?: number;
    vcpus?: number;
    disk?: number;
  } = {}
): MockDropletResponse {
  const dropletId = options.id || Math.floor(Math.random() * 1000000000);

  return {
    id: dropletId,
    name: options.name || `test-droplet-${dropletId}`,
    status: options.status || 'active',
    memory: options.memory || 1024,
    vcpus: options.vcpus || 1,
    disk: options.disk || 25,
    region: {
      slug: options.region || 'sgp1',
      name: 'Singapore 1',
    },
    image: {
      id: 12345,
      name: 'Ubuntu 22.04 LTS',
      distribution: 'Ubuntu',
    },
    networks: {
      v4: [
        {
          ip_address: options.ipv4Public || '103.123.45.67',
          netmask: '255.255.255.0',
          gateway: '103.123.45.1',
          type: 'public',
        },
        {
          ip_address: options.ipv4Private || '10.0.0.10',
          netmask: '255.255.0.0',
          gateway: '10.0.0.1',
          type: 'private',
        },
      ],
    },
    created_at: new Date().toISOString(),
  };
}

/**
 * Create a mock DigitalOcean action response
 */
export function createMockDropletAction(
  actionType: string,
  status: 'in-progress' | 'completed' | 'errored' = 'completed',
  options: {
    id?: number;
    dropletId?: number;
  } = {}
): {
  id: number;
  status: string;
  type: string;
  started_at: string;
  completed_at: string | null;
  resource_id: number;
  resource_type: string;
} {
  const actionId = options.id || Math.floor(Math.random() * 1000000);
  const dropletId = options.dropletId || Math.floor(Math.random() * 1000000000);

  return {
    id: actionId,
    status,
    type: actionType,
    started_at: new Date(Date.now() - 60000).toISOString(),
    completed_at: status === 'completed' ? new Date().toISOString() : null,
    resource_id: dropletId,
    resource_type: 'droplet',
  };
}

/**
 * Test plan data for catalog-service mocking
 */
export const TEST_PLANS = {
  basic: {
    id: 'plan-basic-test',
    name: 'VPS Basic',
    displayName: 'VPS Basic - 1 vCPU',
    slug: 'vps-basic',
    cpu: 1,
    memoryMb: 1024,
    diskGb: 25,
    bandwidthGb: 1000,
    doSize: 's-1vcpu-1gb',
    isActive: true,
    pricings: [
      {
        duration: 'MONTHLY',
        price: 75000,
        cost: 50000,
        isActive: true,
      },
      {
        duration: 'QUARTERLY',
        price: 210000,
        cost: 140000,
        isActive: true,
      },
    ],
    promos: [],
  },
  standard: {
    id: 'plan-standard-test',
    name: 'VPS Standard',
    displayName: 'VPS Standard - 2 vCPU',
    slug: 'vps-standard',
    cpu: 2,
    memoryMb: 2048,
    diskGb: 50,
    bandwidthGb: 2000,
    doSize: 's-2vcpu-2gb',
    isActive: true,
    pricings: [
      {
        duration: 'MONTHLY',
        price: 150000,
        cost: 100000,
        isActive: true,
      },
    ],
    promos: [],
  },
};

/**
 * Test image data for catalog-service mocking
 */
export const TEST_IMAGES = {
  ubuntu: {
    id: 'image-ubuntu-22-04',
    name: 'ubuntu-22-04-x64',
    displayName: 'Ubuntu 22.04 LTS',
    distribution: 'Ubuntu',
    version: '22.04',
    doImage: 'ubuntu-22-04-x64',
    isActive: true,
    isDefault: true,
  },
  debian: {
    id: 'image-debian-12',
    name: 'debian-12-x64',
    displayName: 'Debian 12',
    distribution: 'Debian',
    version: '12',
    doImage: 'debian-12-x64',
    isActive: true,
    isDefault: false,
  },
};

/**
 * Create a valid order request payload
 */
export function createOrderPayload(options: {
  planId?: string;
  imageId?: string;
  duration?: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  couponCode?: string;
} = {}): {
  planId: string;
  imageId: string;
  duration: string;
  couponCode?: string;
} {
  return {
    planId: options.planId || TEST_PLANS.basic.id,
    imageId: options.imageId || TEST_IMAGES.ubuntu.id,
    duration: options.duration || 'MONTHLY',
    ...(options.couponCode && { couponCode: options.couponCode }),
  };
}

/**
 * Email notification mock data
 */
export interface MockNotification {
  type: 'order_created' | 'payment_received' | 'vps_ready' | 'order_failed';
  recipient: string;
  subject: string;
  sent: boolean;
  sentAt?: Date;
}

/**
 * Track notifications sent during E2E tests
 */
export class NotificationTracker {
  private notifications: MockNotification[] = [];

  record(notification: MockNotification): void {
    this.notifications.push(notification);
  }

  getAll(): MockNotification[] {
    return [...this.notifications];
  }

  getByType(type: MockNotification['type']): MockNotification[] {
    return this.notifications.filter((n) => n.type === type);
  }

  getByRecipient(email: string): MockNotification[] {
    return this.notifications.filter((n) => n.recipient === email);
  }

  clear(): void {
    this.notifications = [];
  }

  count(): number {
    return this.notifications.length;
  }
}
