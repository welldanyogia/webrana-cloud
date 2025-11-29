// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Order types
export interface Order {
  id: string;
  userId: string;
  planId: string;
  imageId: string;
  status: OrderStatus;
  totalAmount: number;
  couponCode?: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_RECEIVED'
  | 'PROVISIONING'
  | 'ACTIVE'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

// Stats types
export interface OrderStats {
  activeVps: number;
  pendingOrders: number;
  totalSpent: number;
}

// Duration types
export type DurationUnit = 'MONTHLY' | 'YEARLY';

// VPS Plan types
export interface PlanPricing {
  id: string;
  planId: string;
  duration: DurationUnit;
  price: number;
  isActive: boolean;
}

export interface VpsPlan {
  id: string;
  name: string;
  cpu: number;
  ram: number;
  ssd: number;
  bandwidth: number;
  priceMonthly: number;
  description?: string;
  isActive: boolean;
  pricing?: PlanPricing[];
}

// OS Image types
export interface OsImage {
  id: string;
  name: string;
  slug: string;
  distribution: string;
  version: string;
  isActive: boolean;
}

// Coupon types
export interface CouponValidationResponse {
  valid: boolean;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  discountAmount: number;
  message?: string;
}

// Order request types
export interface CreateOrderRequest {
  planId: string;
  imageId: string;
  duration: number;
  durationUnit: DurationUnit;
  hostname: string;
  couponCode?: string;
}

// Order detail types (with related data)
export interface OrderDetail extends Order {
  plan?: VpsPlan;
  image?: OsImage;
  invoice?: Invoice;
  vps?: VpsInstance;
}

// Invoice types
export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  paymentUrl?: string;
  expiredAt: string;
  paidAt?: string;
  createdAt: string;
}

// VPS Instance types
export interface VpsInstance {
  id: string;
  orderId: string;
  hostname: string;
  ipAddress?: string;
  status: 'PROVISIONING' | 'ACTIVE' | 'STOPPED' | 'DELETED';
  createdAt: string;
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Payment types
export interface PaymentChannel {
  code: string;
  name: string;
  group: string;
  type: 'virtual_account' | 'ewallet' | 'qris' | 'convenience_store';
  fee: {
    flat: number;
    percent: number;
  };
  iconUrl: string;
}

export interface InitiatePaymentRequest {
  channel: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  returnUrl?: string;
}

export interface PaymentInstruction {
  title: string;
  steps: string[];
}

export interface InitiatePaymentResponse {
  invoice: Invoice;
  payment: {
    channel: string;
    channelName: string;
    paymentCode: string;
    paymentUrl: string;
    totalAmount: number;
    fee: number;
    expiredAt: string;
    instructions?: PaymentInstruction[];
  };
}

// Extended Invoice with payment details
export interface InvoiceDetail extends Invoice {
  paymentMethod?: string;
  paymentChannel?: string;
  paymentCode?: string;
  paymentUrl?: string;
  paymentName?: string;
  paymentFee?: number;
  tripayReference?: string;
}

// Instance types (VPS Management)
export type InstanceStatus = 'active' | 'off' | 'new' | 'archive';

export interface InstancePlan {
  name: string;
  cpu: number;
  ram: number;
  ssd: number;
}

export interface InstanceImage {
  name: string;
  distribution: string;
}

export interface Instance {
  id: string;
  orderId: string;
  hostname: string;
  ipAddress: string | null;
  status: InstanceStatus;
  plan: InstancePlan;
  image: InstanceImage;
  region: string;
  createdAt: string;
}

export interface InstanceDetail extends Instance {
  ipAddressPrivate: string | null;
  vcpus: number;
  memory: number;
  disk: number;
  doDropletId: string;
}

export type InstanceActionType = 'reboot' | 'power_off' | 'power_on' | 'reset_password';

export type InstanceActionStatus = 'in-progress' | 'completed' | 'errored';

export interface InstanceAction {
  id: number;
  type: string;
  status: InstanceActionStatus;
  startedAt: string;
  completedAt: string | null;
}

export interface InstancePaginatedResult {
  data: Instance[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
