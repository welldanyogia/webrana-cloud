/* eslint-disable no-redeclare, @typescript-eslint/no-explicit-any, no-undef */
// Mock Prisma Client for testing

export const TransactionType = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const ReferenceType = {
  DEPOSIT: 'DEPOSIT',
  DEPOSIT_BONUS: 'DEPOSIT_BONUS',
  WELCOME_BONUS: 'WELCOME_BONUS',
  VPS_ORDER: 'VPS_ORDER',
  VPS_RENEWAL: 'VPS_RENEWAL',
  PROVISION_FAILED_REFUND: 'PROVISION_FAILED_REFUND',
  ADMIN_ADJUSTMENT: 'ADMIN_ADJUSTMENT',
} as const;
export type ReferenceType = (typeof ReferenceType)[keyof typeof ReferenceType];

export const DepositStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  EXPIRED: 'EXPIRED',
  FAILED: 'FAILED',
} as const;
export type DepositStatus = (typeof DepositStatus)[keyof typeof DepositStatus];

export const InvoiceStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const PaymentMethod = {
  VIRTUAL_ACCOUNT: 'VIRTUAL_ACCOUNT',
  EWALLET: 'EWALLET',
  QRIS: 'QRIS',
  CONVENIENCE_STORE: 'CONVENIENCE_STORE',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentChannel = {
  BCA_VA: 'BCA_VA',
  BNI_VA: 'BNI_VA',
  BRI_VA: 'BRI_VA',
  MANDIRI_VA: 'MANDIRI_VA',
  PERMATA_VA: 'PERMATA_VA',
  BSI_VA: 'BSI_VA',
  CIMB_VA: 'CIMB_VA',
  MUAMALAT_VA: 'MUAMALAT_VA',
  OVO: 'OVO',
  GOPAY: 'GOPAY',
  DANA: 'DANA',
  SHOPEEPAY: 'SHOPEEPAY',
  LINKAJA: 'LINKAJA',
  QRIS: 'QRIS',
  QRISC: 'QRISC',
  ALFAMART: 'ALFAMART',
  INDOMARET: 'INDOMARET',
  ALFAMIDI: 'ALFAMIDI',
} as const;
export type PaymentChannel = (typeof PaymentChannel)[keyof typeof PaymentChannel];

// Prisma namespace with TransactionIsolationLevel
export const Prisma = {
  TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable',
  },
  InputJsonValue: {} as any,
} as const;

// Type exports for models
export interface UserWallet {
  id: string;
  userId: string;
  balance: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: ReferenceType;
  referenceId: string | null;
  description: string | null;
  metadata: any | null;
  createdAt: Date;
}

export interface Deposit {
  id: string;
  userId: string;
  amount: number;
  bonusAmount: number;
  totalCredit: number;
  status: DepositStatus;
  paymentMethod: string | null;
  paymentCode: string | null;
  tripayReference: string | null;
  processedAt: Date | null;
  idempotencyKey: string;
  expiresAt: Date;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  orderId: string;
  userId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  paymentMethod: PaymentMethod | null;
  paymentChannel: PaymentChannel | null;
  paymentCode: string | null;
  paymentUrl: string | null;
  paymentName: string | null;
  paymentFee: number | null;
  tripayReference: string | null;
  paidAt: Date | null;
  paidAmount: number | null;
  paidChannel: string | null;
  callbackPayload: any | null;
  expiredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  channel: string;
  reference: string;
  status: string;
  rawPayload: any | null;
  processedAt: Date;
  createdAt: Date;
}

// Mock PrismaClient class
export class PrismaClient {
  userWallet = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  walletTransaction = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };

  deposit = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  invoice = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };

  payment = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  };

  $connect = jest.fn();
  $disconnect = jest.fn();
  $transaction = jest.fn();
}
