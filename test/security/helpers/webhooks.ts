/**
 * Security Test Webhook Helpers
 *
 * Provides utilities for testing webhook security including
 * signature verification and replay attack prevention.
 */

import { createHmac } from 'crypto';

// Test Tripay private key (for generating valid signatures in tests)
// This is intentionally a test fixture, NOT a real key
const TEST_TRIPAY_PRIVATE_KEY = process.env.TEST_TRIPAY_PRIVATE_KEY || 'test-tripay-key-fixture';

export interface TripayCallbackPayload {
  reference: string;
  merchant_ref: string;
  payment_selection_type: string;
  payment_method: string;
  payment_method_code: string;
  total_amount: number;
  fee_merchant: number;
  fee_customer: number;
  total_fee: number;
  amount_received: number;
  is_closed_payment: number;
  status: 'PAID' | 'EXPIRED' | 'FAILED' | 'REFUND' | 'UNPAID';
  paid_at: number | null;
  note: string;
  created_at?: number;
}

/**
 * Generate a valid Tripay callback signature
 */
export function generateTripaySignature(payload: TripayCallbackPayload): string {
  const rawBody = JSON.stringify(payload);
  return createHmac('sha256', TEST_TRIPAY_PRIVATE_KEY)
    .update(rawBody)
    .digest('hex');
}

/**
 * Create a Tripay callback payload for testing
 */
export function createTripayCallback(
  merchantRef: string,
  status: TripayCallbackPayload['status'] = 'PAID',
  options: {
    amount?: number;
    reference?: string;
    paidAt?: number;
  } = {}
): { payload: TripayCallbackPayload; signature: string } {
  const now = Math.floor(Date.now() / 1000);
  const amount = options.amount || 150000;

  const payload: TripayCallbackPayload = {
    reference: options.reference || `T${now}${Math.random().toString(36).substring(7).toUpperCase()}`,
    merchant_ref: merchantRef,
    payment_selection_type: 'static',
    payment_method: 'BRIVA',
    payment_method_code: 'BRIVA',
    total_amount: amount + 4000,
    fee_merchant: 0,
    fee_customer: 4000,
    total_fee: 4000,
    amount_received: status === 'PAID' ? amount : 0,
    is_closed_payment: 1,
    status,
    paid_at: status === 'PAID' ? (options.paidAt || now) : null,
    note: '',
    created_at: now,
  };

  const signature = generateTripaySignature(payload);

  return { payload, signature };
}

/**
 * Create a webhook callback with invalid signature
 */
export function createWebhookWithInvalidSignature(
  merchantRef: string,
  status: TripayCallbackPayload['status'] = 'PAID'
): { payload: TripayCallbackPayload; signature: string } {
  const { payload } = createTripayCallback(merchantRef, status);
  
  // Generate a completely wrong signature
  const invalidSignature = createHmac('sha256', 'wrong-secret-key')
    .update(JSON.stringify(payload))
    .digest('hex');

  return { payload, signature: invalidSignature };
}

/**
 * Create a webhook callback with tampered signature
 */
export function createWebhookWithTamperedSignature(
  merchantRef: string,
  status: TripayCallbackPayload['status'] = 'PAID'
): { payload: TripayCallbackPayload; signature: string } {
  const { payload, signature } = createTripayCallback(merchantRef, status);
  
  // Tamper with the signature by changing a few characters
  const tamperedSignature = signature.substring(0, 10) + 
    'TAMPERED' + 
    signature.substring(18);

  return { payload, signature: tamperedSignature };
}

/**
 * Create a webhook callback with old timestamp (replay attack simulation)
 */
export function createWebhookWithOldTimestamp(
  merchantRef: string,
  hoursOld: number = 24
): { payload: TripayCallbackPayload; signature: string } {
  const oldTimestamp = Math.floor(Date.now() / 1000) - (hoursOld * 60 * 60);

  const payload: TripayCallbackPayload = {
    reference: `T${oldTimestamp}OLD`,
    merchant_ref: merchantRef,
    payment_selection_type: 'static',
    payment_method: 'BRIVA',
    payment_method_code: 'BRIVA',
    total_amount: 154000,
    fee_merchant: 0,
    fee_customer: 4000,
    total_fee: 4000,
    amount_received: 150000,
    is_closed_payment: 1,
    status: 'PAID',
    paid_at: oldTimestamp,
    note: '',
    created_at: oldTimestamp,
  };

  const signature = generateTripaySignature(payload);

  return { payload, signature };
}

/**
 * Create a webhook callback with modified payload after signing
 */
export function createWebhookWithModifiedPayload(
  merchantRef: string
): { payload: TripayCallbackPayload; signature: string; originalPayload: TripayCallbackPayload } {
  const { payload: originalPayload, signature } = createTripayCallback(merchantRef, 'PAID', {
    amount: 150000,
  });

  // Modify the payload after getting the signature
  const modifiedPayload: TripayCallbackPayload = {
    ...originalPayload,
    amount_received: 1500000, // Changed from 150000 to 1500000
    total_amount: 1504000,
  };

  return { payload: modifiedPayload, signature, originalPayload };
}

/**
 * Various malformed signatures for testing
 */
export const MALFORMED_SIGNATURES = {
  empty: '',
  spaces: '   ',
  tooShort: 'abc123',
  tooLong: 'a'.repeat(128),
  invalidCharacters: 'signature-with-invalid-chars!@#$%',
  sqlInjection: "'; DROP TABLE webhooks; --",
  nullByte: 'valid\x00signature',
};

/**
 * Generate duplicate webhook payloads for replay testing
 */
export function createDuplicateWebhooks(
  merchantRef: string,
  count: number = 3
): Array<{ payload: TripayCallbackPayload; signature: string }> {
  const { payload, signature } = createTripayCallback(merchantRef, 'PAID');
  
  return Array(count).fill(null).map(() => ({
    payload: { ...payload },
    signature,
  }));
}
