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

// VPS Plan types
export interface VpsPlan {
  id: string;
  name: string;
  cpu: number;
  ram: number;
  ssd: number;
  bandwidth: number;
  priceMonthly: number;
  isActive: boolean;
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
