// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
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
  userEmail?: string;
  userName?: string;
  planId: string;
  imageId: string;
  status: OrderStatus;
  totalAmount: number;
  couponCode?: string;
  duration: number;
  hostname?: string;
  paidAt?: string;
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

// Order detail with related data
export interface OrderDetail extends Order {
  plan?: VpsPlan;
  image?: OsImage;
  orderItems?: OrderItem[];
  provisioningTask?: ProvisioningTask;
  statusHistory?: StatusHistory[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  itemType: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ProvisioningTask {
  id: string;
  orderId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  dropletId?: string;
  dropletIp?: string;
  dropletName?: string;
  dropletRegion?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface StatusHistory {
  id: string;
  orderId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  changedBy?: string;
  reason?: string;
  createdAt: string;
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
  description?: string;
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

// Admin Stats types
export interface AdminStats {
  ordersToday: number;
  pendingPayment: number;
  revenueToday: number;
  activeVps: number;
  totalUsers?: number;
  totalOrders?: number;
}

// Payment status update types
export interface UpdatePaymentStatusRequest {
  status: 'PAID' | 'FAILED';
  reason?: string;
}

// User list for admin
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  ordersCount: number;
  totalSpent: number;
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

// Filter types
export interface OrderFilters {
  status?: OrderStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface UserFilters {
  search?: string;
  page?: number;
  limit?: number;
}
