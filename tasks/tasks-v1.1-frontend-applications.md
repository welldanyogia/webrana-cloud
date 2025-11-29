# Tasks: WeBrana Cloud v1.1 - Frontend Applications (Next.js)

> PRD Reference: `prd-webrana-cloud-platform-v1.md` Section 6.7, 6.8
> Target: Q1 2025
> Priority: P1 (customer-web), P2 (admin-web)
> **Tech Stack: Next.js 16 + TailwindCSS 4 + TypeScript**

---

## Overview

v1.1 Frontend delivers customer portal for self-service ordering and admin dashboard for platform management.

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Styling**: TailwindCSS 4
- **State Management**: Zustand (client), React Query (server)
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Notifications**: Sonner
- **Charts** (admin): Recharts

### Dependencies
- ✅ auth-service (v1.0)
- ✅ catalog-service (v1.0)
- ✅ order-service (v1.0)
- 🔄 billing-service (v1.1)
- 🔄 notification-service (v1.1)

### Deliverables
1. **customer-web**: Customer portal (Next.js + TailwindCSS)
2. **admin-web**: Admin dashboard (Next.js + TailwindCSS)

---

## Application 1: customer-web

### FE-101: Project Setup & Configuration ✅ DONE

- [x] 101.1 Create Next.js app with TypeScript and TailwindCSS
- [x] 101.2 Install dependencies:
  - @tanstack/react-query
  - react-hook-form + @hookform/resolvers + zod
  - axios
  - zustand
  - lucide-react
  - sonner
- [x] 101.3 TailwindCSS 4 configured with PostCSS
- [x] 101.4 Setup folder structure:
  ```
  src/
  ├── app/                    # Next.js App Router
  │   ├── (auth)/             # Auth routes group
  │   │   ├── login/
  │   │   ├── register/
  │   │   ├── forgot-password/
  │   │   └── reset-password/
  │   ├── (dashboard)/        # Protected routes group
  │   │   ├── dashboard/
  │   │   ├── catalog/
  │   │   ├── order/
  │   │   ├── vps/
  │   │   ├── invoices/
  │   │   └── profile/
  │   ├── layout.tsx          # Root layout
  │   ├── page.tsx            # Landing page
  │   └── providers.tsx       # Client providers
  ├── components/
  │   ├── ui/                 # Reusable UI components
  │   ├── forms/              # Form components
  │   └── layouts/            # Layout components
  ├── lib/
  │   ├── api-client.ts       # Axios instance
  │   ├── validations.ts      # Zod schemas
  │   └── utils.ts            # Utility functions
  ├── hooks/                  # Custom hooks
  ├── stores/                 # Zustand stores
  └── types/                  # TypeScript types
  ```
- [x] 101.5 Setup environment variables (configured in api-client.ts)
- [x] 101.6 Verify app runs and builds successfully

### FE-102: API Client & Auth ✅ DONE

- [x] 102.1 Create `lib/api-client.ts`:
  - Axios instance with base URL from env
  - Request interceptor for JWT token (from cookie/localStorage)
  - Response interceptor for 401 handling (redirect to login)
- [x] 102.2 Create `stores/auth-store.ts` with Zustand:
  - State: user, token, isAuthenticated, isLoading
  - Actions: setUser, setToken, logout, checkAuth
  - Persist token to localStorage (or use httpOnly cookie)
- [x] 102.3 Create `hooks/use-auth.ts` with React Query:
  - [x] 102.3.1 `useLogin()` mutation
  - [x] 102.3.2 `useRegister()` mutation
  - [x] 102.3.3 `useLogout()` mutation
  - [x] 102.3.4 `useCurrentUser()` query
  - [x] 102.3.5 `useForgotPassword()` mutation
  - [x] 102.3.6 `useResetPassword()` mutation
- [x] 102.4 Create `lib/validations.ts` with Zod schemas:
  - loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema

### FE-103: Layout & Navigation ✅ DONE

- [x] 103.1 Create `app/layout.tsx` (Root Layout):
  - HTML lang="id"
  - Font (Inter from next/font)
  - Metadata (title, description)
  - Providers wrapper
- [x] 103.2 Create `app/providers.tsx` (Client Component):
  - QueryClientProvider
  - Toaster (sonner)
- [x] 103.3 Create `components/layouts/main-layout.tsx`:
  - Header with logo, nav links, user menu
  - Responsive sidebar (mobile: sheet/drawer)
  - Footer
- [x] 103.4 Create `components/layouts/auth-layout.tsx`:
  - Centered card layout for auth pages
  - Logo and branding
- [x] 103.5 Create navigation structure:
  - Dashboard
  - Beli VPS (Catalog)
  - VPS Saya (My VPS)
  - Tagihan (Invoices)
  - Profil (Profile)
- [x] 103.6 Create responsive navbar with mobile menu in main-layout:
  - Responsive navbar with mobile menu
  - User dropdown (profile, logout)
- [x] 103.7 Create protected route middleware:
  - `middleware.ts` for route protection
  - Auth layout checks for authentication
  - Dashboard layout redirects if not authenticated

### FE-104: Authentication Pages ✅ DONE

- [x] 104.1 Create `app/(auth)/login/page.tsx`:
  - Form: email, password
  - Remember me checkbox
  - "Lupa password?" link
  - "Belum punya akun?" link
  - Form validation with Zod
  - Loading state on submit
  - Error toast on failure
  - Redirect to dashboard on success
- [x] 104.2 Create `app/(auth)/register/page.tsx`:
  - Form: name, email, password, confirm password
  - Terms & conditions checkbox
  - Form validation with Zod
  - Password strength indicator
  - "Sudah punya akun?" link
- [x] 104.3 Create `app/(auth)/forgot-password/page.tsx`:
  - Form: email
  - Success message after submit
  - "Kembali ke login" link
- [x] 104.4 Create `app/(auth)/reset-password/[token]/page.tsx`:
  - Form: new password, confirm password
  - Token from URL params
  - Success redirect to login
- [x] 104.5 Create reusable UI components in `components/ui/`:
  - `button.tsx`
  - `input.tsx`
  - `checkbox.tsx`
  - `card.tsx`
  - `badge.tsx`
  - `skeleton.tsx`

### FE-105: Dashboard Page ✅ DONE

- [x] 105.1 Create `app/(dashboard)/dashboard/page.tsx`:
  - Welcome message with user name
  - Quick stats cards:
    - Active VPS count
    - Pending orders
    - Total spent (IDR)
  - Recent orders list (5 items)
  - Quick action buttons ("Pesan VPS Baru")
- [x] 105.2 Create API hooks in `hooks/use-dashboard.ts`:
  - [x] 105.2.1 `useOrderStats()` - Get user order statistics
  - [x] 105.2.2 `useRecentOrders()` - Get 5 most recent orders
- [x] 105.3 Create `components/ui/stat-card.tsx`
- [x] 105.4 Recent orders displayed inline in dashboard page

### FE-106: Catalog & Order Flow

- [ ] 106.1 Create `app/(dashboard)/catalog/page.tsx`:
  - Grid of VPS plan cards
  - Filter by: specs range
  - Sort by: price (low-high, high-low)
  - Plan card shows: name, CPU, RAM, SSD, bandwidth, price/month
  - "Pesan Sekarang" button → /order?plan={id}
- [ ] 106.2 Create API hooks in `hooks/use-catalog.ts`:
  - [ ] 106.2.1 `usePlans()` - List all active plans
  - [ ] 106.2.2 `usePlanDetail(id)` - Get plan detail
  - [ ] 106.2.3 `useImages()` - List all OS images
  - [ ] 106.2.4 `useValidateCoupon()` - Validate coupon code
- [ ] 106.3 Create `app/(dashboard)/order/page.tsx` (Multi-step):
  - Step indicator component
  - **Step 1: Pilih Plan** (pre-selected from catalog or choose here)
  - **Step 2: Pilih OS** (image selection with icons)
  - **Step 3: Durasi & Kupon** (duration dropdown, coupon input)
  - **Step 4: Konfirmasi** (order summary, price breakdown)
  - "Lanjut ke Pembayaran" button
- [ ] 106.4 Create `components/ui/step-indicator.tsx`
- [ ] 106.5 Create `components/ui/plan-card.tsx` (selectable)
- [ ] 106.6 Create `components/ui/image-card.tsx` (OS selection)
- [ ] 106.7 Create `components/ui/price-breakdown.tsx`:
  - Base price
  - Promo discount (if any)
  - Coupon discount (if any)
  - Final price
- [ ] 106.8 Create `hooks/use-order.ts`:
  - [ ] 106.8.1 `useCreateOrder()` mutation
- [ ] 106.9 Redirect to payment page after order created

### FE-107: Payment Flow

- [ ] 107.1 Create `app/(dashboard)/order/[orderId]/payment/page.tsx`:
  - Invoice summary (order details, amount)
  - Payment channel selection:
    - Virtual Account section (BCA, BNI, BRI, Mandiri)
    - E-Wallet section (OVO, GoPay, Dana)
    - QRIS section
  - "Bayar Sekarang" button
- [ ] 107.2 Create API hooks in `hooks/use-billing.ts`:
  - [ ] 107.2.1 `useInvoice(orderId)` - Get invoice detail
  - [ ] 107.2.2 `usePaymentChannels()` - List available channels
  - [ ] 107.2.3 `useInitiatePayment()` mutation
- [ ] 107.3 Create `app/(dashboard)/order/[orderId]/payment/instructions/page.tsx`:
  - Payment code / VA number (with copy button)
  - QR code image (for QRIS)
  - Expiry countdown timer
  - Payment instructions accordion
  - "Cek Status Pembayaran" button (polling)
- [ ] 107.4 Create `components/ui/countdown-timer.tsx`
- [ ] 107.5 Create `components/ui/copy-button.tsx`
- [ ] 107.6 Implement payment status polling (useQuery with refetchInterval)
- [ ] 107.7 Create success page or redirect to VPS detail on payment success

### FE-108: VPS Management

- [ ] 108.1 Create `app/(dashboard)/vps/page.tsx`:
  - Table/Grid of user's VPS instances
  - Columns: Name, IP Address, Status, Plan, Created
  - Status badges (Active, Provisioning, Failed)
  - Search by name
  - Click row → VPS detail page
- [ ] 108.2 Create API hooks in `hooks/use-vps.ts`:
  - [ ] 108.2.1 `useMyVps()` - List orders with ACTIVE status
  - [ ] 108.2.2 `useVpsDetail(orderId)` - Get order + provisioning detail
- [ ] 108.3 Create `app/(dashboard)/vps/[id]/page.tsx`:
  - VPS info card (name, IP, specs, region)
  - Status indicator (live dot for active)
  - Connection info:
    - SSH command: `ssh root@{ip}` (copyable)
    - Root password (if available, hidden by default)
  - Order info (created date, expiry date)
  - Droplet metadata (DO droplet ID, image, region)
  - Actions placeholder (v1.2): Reboot, Reset Password
- [ ] 108.4 Create `components/ui/status-badge.tsx`
- [ ] 108.5 Create `components/ui/info-card.tsx`

### FE-109: Invoice & Billing History

- [ ] 109.1 Create `app/(dashboard)/invoices/page.tsx`:
  - Table of invoices
  - Columns: Invoice #, Order ID, Amount, Status, Created
  - Status badges (Pending, Paid, Expired)
  - Filter by status
  - Click row → Invoice detail
- [ ] 109.2 Create API hooks:
  - [ ] 109.2.1 `useInvoices()` - List user invoices
  - [ ] 109.2.2 `useInvoiceDetail(id)` - Get invoice detail
- [ ] 109.3 Create `app/(dashboard)/invoices/[id]/page.tsx`:
  - Invoice detail
  - If pending: "Bayar Sekarang" button
  - If paid: Payment receipt info

### FE-110: Profile & Settings

- [ ] 110.1 Create `app/(dashboard)/profile/page.tsx`:
  - User info display (name, email, joined date)
  - Edit profile section (name only for now)
  - Change password section
  - Telegram linking placeholder (v1.2)
- [ ] 110.2 Create API hooks:
  - [ ] 110.2.1 `useProfile()` - Get current user profile
  - [ ] 110.2.2 `useUpdateProfile()` mutation
  - [ ] 110.2.3 `useChangePassword()` mutation

### FE-111: UI Components Library

- [ ] 111.1 Create base components in `components/ui/`:
  - [ ] 111.1.1 `button.tsx` (variants: primary, secondary, outline, ghost, danger)
  - [ ] 111.1.2 `input.tsx` (with label, error state, icon support)
  - [ ] 111.1.3 `select.tsx` (dropdown with options)
  - [ ] 111.1.4 `checkbox.tsx`
  - [ ] 111.1.5 `card.tsx` (container with header, body, footer)
  - [ ] 111.1.6 `badge.tsx` (status indicators)
  - [ ] 111.1.7 `modal.tsx` (dialog with backdrop)
  - [ ] 111.1.8 `table.tsx` (with pagination support)
  - [ ] 111.1.9 `skeleton.tsx` (loading placeholder)
  - [ ] 111.1.10 `alert.tsx` (info, warning, error, success)
  - [ ] 111.1.11 `tabs.tsx` (tab navigation)
  - [ ] 111.1.12 `accordion.tsx` (collapsible sections)
- [ ] 111.2 Setup sonner toast notifications
- [ ] 111.3 Create loading spinner component

### FE-112: Testing & Quality

- [ ] 112.1 Setup testing (Jest or Vitest)
- [ ] 112.2 Write tests for:
  - [ ] 112.2.1 Auth store
  - [ ] 112.2.2 API client interceptors
  - [ ] 112.2.3 Zod validation schemas
- [ ] 112.3 Run Next.js build to check for errors
- [ ] 112.4 Test responsive design (mobile, tablet, desktop)
- [ ] 112.5 Test SSR/hydration issues

### FE-113: Build & Documentation

- [ ] 113.1 Configure production build
- [ ] 113.2 Setup environment variable handling for deployment
- [ ] 113.3 Create README.md with:
  - Project overview
  - Setup instructions
  - Available scripts
  - Environment variables
  - Folder structure

---

## Application 2: admin-web

### FE-201: Project Setup & Configuration ✅ DONE

- [x] 201.1 Create Next.js app with TypeScript and TailwindCSS
- [x] 201.2 Install dependencies (same as customer-web + recharts)
- [ ] 201.3 Setup folder structure (similar to customer-web)
- [ ] 201.4 Setup environment variables:
  ```
  NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
  INTERNAL_API_KEY=xxx
  ```

### FE-202: API Client & Auth

- [ ] 202.1 Create `lib/api-client.ts`:
  - Same as customer-web
  - Add internal API key header for internal endpoints
- [ ] 202.2 Create `stores/auth-store.ts`:
  - Admin role validation
  - Super admin check
- [ ] 202.3 Create admin auth hooks
- [ ] 202.4 Create admin middleware (role check)

### FE-203: Admin Layout & Navigation

- [ ] 203.1 Create `components/layouts/admin-layout.tsx`:
  - Sidebar navigation (always visible on desktop)
  - Top header with user menu
  - Breadcrumbs
- [ ] 203.2 Create navigation structure:
  - Dashboard
  - Orders (management)
  - Users (management)
  - Analytics
  - Settings
- [ ] 203.3 Create collapsible sidebar for mobile

### FE-204: Admin Authentication

- [ ] 204.1 Create `app/(auth)/login/page.tsx`:
  - Admin login form
  - Role validation (reject non-admin)
- [ ] 204.2 Implement admin session handling

### FE-205: Admin Dashboard

- [ ] 205.1 Create `app/(admin)/dashboard/page.tsx`:
  - Stat cards:
    - Total orders today
    - Pending payment count
    - Revenue today (IDR)
    - Active VPS count
  - Recent orders table (10 items)
  - Quick actions
- [ ] 205.2 Create API hooks:
  - [ ] 205.2.1 `useAdminStats()` - Platform statistics
  - [ ] 205.2.2 `useAdminRecentOrders()` - Recent orders
- [ ] 205.3 Create simple charts (optional for v1.1)

### FE-206: Order Management

- [ ] 206.1 Create `app/(admin)/orders/page.tsx`:
  - Table with all orders
  - Columns: ID, User Email, Amount, Status, Created, Actions
  - Filters: status, date range
  - Search by user email or order ID
  - Pagination
  - Click row → Order detail
- [ ] 206.2 Create API hooks:
  - [ ] 206.2.1 `useAdminOrders(filters)` - List all orders
- [ ] 206.3 Create `app/(admin)/orders/[id]/page.tsx`:
  - Full order info
  - Order items list
  - Provisioning task details
  - Status history timeline
  - **Payment Override Actions**:
    - "Mark as Paid" button (with confirmation modal)
    - "Mark as Failed" button (with confirmation modal)
  - Audit trail
- [ ] 206.4 Create API hooks:
  - [ ] 206.4.1 `useAdminOrderDetail(id)` - Get order detail
  - [ ] 206.4.2 `useUpdatePaymentStatus()` mutation
- [ ] 206.5 Create `components/ui/status-timeline.tsx`
- [ ] 206.6 Create `components/ui/confirmation-modal.tsx`

### FE-207: User Management

- [ ] 207.1 Create `app/(admin)/users/page.tsx`:
  - Table with all users
  - Columns: ID, Name, Email, Orders Count, Created
  - Search by name/email
  - Pagination
  - Click row → User detail
- [ ] 207.2 Create API hooks:
  - [ ] 207.2.1 `useAdminUsers(search)` - List users
- [ ] 207.3 Create `app/(admin)/users/[id]/page.tsx`:
  - User info
  - User's orders list
  - User's invoices
  - Account status

### FE-208: Analytics (Basic)

- [ ] 208.1 Create `app/(admin)/analytics/page.tsx`:
  - Orders per day chart (line/bar)
  - Revenue per day chart
  - Popular plans chart (pie)
  - Date range selector
- [ ] 208.2 Create chart components using Recharts

### FE-209: Testing & Quality

- [ ] 209.1 Setup testing
- [ ] 209.2 Test admin-specific flows
- [ ] 209.3 Test responsive design

### FE-210: Build & Documentation

- [ ] 210.1 Configure production build
- [ ] 210.2 Create README.md

---

## Acceptance Criteria Summary

### customer-web
- [ ] User dapat register dan login
- [ ] User dapat browse catalog dan order VPS
- [ ] User dapat melihat dan bayar invoice
- [ ] User dapat melihat status VPS aktif
- [ ] Responsive design (mobile-first)
- [ ] SSR untuk landing & catalog pages

### admin-web
- [ ] Admin dapat login dengan role validation
- [ ] Admin dapat melihat semua orders
- [ ] Admin dapat override payment status
- [ ] Admin dapat melihat user list
- [ ] Basic analytics dashboard

---

## Timeline

| Week | Focus |
|------|-------|
| Week 1 | FE-101 to FE-105 (customer foundation + auth + dashboard) |
| Week 2 | FE-106 to FE-108 (catalog, order, payment, VPS) |
| Week 3 | FE-109 to FE-113 (invoices, profile, UI components, testing) |
| Week 4 | FE-201 to FE-210 (admin-web complete) |

---

## Design System

### Color Palette
```css
/* Primary */
--primary: #2563EB;        /* Blue-600 */
--primary-hover: #1D4ED8;  /* Blue-700 */

/* Secondary */
--secondary: #10B981;      /* Emerald-500 */

/* Background */
--background: #F9FAFB;     /* Gray-50 */
--card: #FFFFFF;

/* Text */
--foreground: #111827;     /* Gray-900 */
--muted: #6B7280;          /* Gray-500 */

/* Status */
--success: #22C55E;        /* Green-500 */
--warning: #F59E0B;        /* Amber-500 */
--error: #EF4444;          /* Red-500 */
--info: #3B82F6;           /* Blue-500 */
```

### Typography
```css
/* Font Family */
font-family: 'Inter', sans-serif;

/* Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
```

### Spacing
```css
/* Use Tailwind spacing scale */
/* 4px increments: p-1 (4px), p-2 (8px), p-4 (16px), etc. */
```

---

**Created:** 2024-11-29
**Updated:** 2024-11-29 (Migrated to Next.js)
**Author:** Product Manager
**Status:** Ready for Delegation
