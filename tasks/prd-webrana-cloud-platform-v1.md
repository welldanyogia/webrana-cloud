# PRD: WeBrana Cloud VPS Platform v1.x

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-11-29 | Product Manager | Initial platform-level PRD |

---

## 1. Overview & Scope

### 1.1 Problem Statement

**Bisnis hosting VPS di Indonesia** membutuhkan platform yang dapat:
1. Menyediakan layanan VPS dengan harga kompetitif dalam **Rupiah (IDR)**
2. Mengotomatisasi proses dari order hingga droplet aktif (tanpa intervensi manual berlebihan)
3. Menyediakan dashboard untuk customer self-service dan admin monitoring
4. Memungkinkan model **reseller/agency** untuk partner bisnis
5. Terintegrasi dengan payment gateway lokal (Tripay) dan notifikasi lokal (Telegram, Email)

### 1.2 Target Users

| Persona | Deskripsi | Persentase Target |
|---------|-----------|-------------------|
| **End Customer** | Developer, startup, bisnis kecil yang butuh VPS cepat & mudah | 70% |
| **Reseller / Agency** | Partner yang menjual kembali VPS dengan margin sendiri | 20% |
| **Internal Ops / Support** | Tim WeBrana yang mengelola platform & customer | 10% |

### 1.3 Goals v1.x

| # | Goal | Measurable Target |
|---|------|-------------------|
| G1 | Customer dapat membeli VPS dalam < 5 menit (end-to-end) | Provisioning time < 3 menit |
| G2 | Admin dapat override payment dan monitor semua order | 100% visibility via admin panel |
| G3 | Pricing selalu real-time & konsisten (no hardcoded) | 0% price discrepancy |
| G4 | Notifikasi otomatis untuk status penting | Email/Telegram notification on order events |
| G5 | Platform scalable untuk multi-provider (v1.2+) | Architecture ready for Vultr, Linode |

### 1.4 Non-Goals v1.x

| Item | Reason |
|------|--------|
| Multi-region selection per order | Kompleksitas UX, v2+ |
| Reseller white-label dashboard | Belum ada kebutuhan partner, v2+ |
| Auto-scaling / load balancing VPS | Enterprise feature, v2+ |
| Managed database / managed Kubernetes | Scope berbeda, separate product |
| Cancel order + refund by user | Kompleksitas billing, v2+ |

### 1.5 Value Proposition

> **WeBrana Cloud** – VPS Indonesia yang cepat, mudah, dan terjangkau.
> Order dalam hitungan menit, bayar dengan Rupiah, VPS langsung aktif.

---

## 2. Personas

### 2.1 End Customer (Developer/Startup)

**Profile:**
- Developer Indonesia usia 22-35 tahun
- Butuh VPS untuk project, staging, atau production kecil
- Familiar dengan SSH, basic Linux
- Prefer bayar via transfer bank / e-wallet

**Pain Points:**
- Proses order lama dan manual (harus chat admin)
- Harga bingung antara USD dan IDR
- Tidak ada notifikasi status real-time
- Sulit track history order

**Needs:**
- Self-service ordering tanpa perlu chat admin
- Harga transparan dalam IDR
- Status provisioning real-time
- Dashboard untuk manage VPS

### 2.2 Reseller / Agency

**Profile:**
- Agency digital atau freelancer yang menyediakan hosting untuk client
- Butuh margin profit dari resell
- Ingin manage multiple VPS untuk beberapa client

**Pain Points:**
- Harus order satu-satu untuk tiap client
- Tidak ada invoice/history yang rapi
- Tidak ada dashboard khusus reseller

**Needs:**
- Batch ordering atau project-based grouping
- Invoice history per client
- Pricing tier untuk reseller (discount volume)

### 2.3 Internal Ops / Support

**Profile:**
- Tim WeBrana yang handle support ticket
- Perlu akses untuk override payment, check status, troubleshoot

**Pain Points:**
- Harus manual SSH ke server untuk cek status
- Tidak ada audit trail siapa yang approve payment
- Sulit track order bermasalah

**Needs:**
- Admin dashboard dengan full visibility
- Audit trail untuk semua aksi
- Filter & search order by status/user

---

## 3. Core Use Cases & User Stories

### 3.1 Customer Buys New VPS

**Epic:** Order VPS Baru

| ID | User Story | Priority |
|----|------------|----------|
| UC-001 | Sebagai customer, saya ingin browse catalog plan VPS dengan harga IDR | P1 |
| UC-002 | Sebagai customer, saya ingin memilih OS image untuk VPS saya | P1 |
| UC-003 | Sebagai customer, saya ingin memasukkan kode kupon untuk diskon | P1 |
| UC-004 | Sebagai customer, saya ingin melihat breakdown harga sebelum bayar | P1 |
| UC-005 | Sebagai customer, saya ingin bayar via transfer bank / e-wallet | P1 |
| UC-006 | Sebagai customer, saya ingin menerima notifikasi saat VPS aktif | P1 |

### 3.2 Customer Manages VPS

**Epic:** Manage VPS Instance

| ID | User Story | Priority |
|----|------------|----------|
| UC-010 | Sebagai customer, saya ingin melihat list VPS aktif saya | P1 |
| UC-011 | Sebagai customer, saya ingin melihat detail VPS (IP, specs, status) | P1 |
| UC-012 | Sebagai customer, saya ingin reboot VPS | P2 |
| UC-013 | Sebagai customer, saya ingin reset root password VPS | P2 |
| UC-014 | Sebagai customer, saya ingin melihat console/VNC VPS | P3 |

### 3.3 Admin Payment Override

**Epic:** Admin Approval Flow

| ID | User Story | Priority |
|----|------------|----------|
| UC-020 | Sebagai admin, saya ingin melihat list order pending payment | P1 |
| UC-021 | Sebagai admin, saya ingin approve payment (mark as PAID) | P1 |
| UC-022 | Sebagai admin, saya ingin reject payment (mark as FAILED) | P1 |
| UC-023 | Sebagai admin, saya ingin melihat audit trail status changes | P1 |

### 3.4 Admin Views Provisioning Status

**Epic:** Admin Monitoring

| ID | User Story | Priority |
|----|------------|----------|
| UC-030 | Sebagai admin, saya ingin melihat order yang sedang provisioning | P1 |
| UC-031 | Sebagai admin, saya ingin melihat detail error jika provisioning gagal | P1 |
| UC-032 | Sebagai admin, saya ingin manual retry provisioning (v1.2+) | P2 |

### 3.5 Reseller Invoice/History

**Epic:** Reseller Dashboard

| ID | User Story | Priority |
|----|------------|----------|
| UC-040 | Sebagai reseller, saya ingin melihat semua order saya | P2 |
| UC-041 | Sebagai reseller, saya ingin export invoice PDF | P2 |
| UC-042 | Sebagai reseller, saya ingin group orders by project/client | P3 |

---

## 4. End-to-End Flows

### 4.1 Flow 1: Customer Order VPS (Full Journey)

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Browse  │────▶│ Select Plan  │────▶│ Select Image │────▶│ Apply Coupon │
│  Catalog │     │   & Duration │     │   (OS/App)   │     │  (Optional)  │
└──────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                  │
                                                                  ▼
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Receive │◀────│ VPS Active   │◀────│ Provisioning │◀────│ Confirm &    │
│  Notif   │     │   (ACTIVE)   │     │  (2-3 min)   │     │   Pay        │
└──────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

**Service Interactions:**
1. **customer-web** → **api-gateway** → **catalog-service**: Browse plans, images, validate coupon
2. **customer-web** → **api-gateway** → **order-service**: Create order (PENDING_PAYMENT)
3. **customer-web** → **billing-service** → **Tripay**: Generate payment link/VA
4. **Tripay callback** → **billing-service** → **order-service**: Mark PAID (internal API)
5. **order-service** → **DigitalOcean API**: Provision droplet
6. **order-service** → **notification-service**: Send status update
7. **notification-service** → **Email/Telegram**: Notify customer

### 4.2 Flow 2: Admin Payment Override

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Admin Login  │────▶│ View Pending │────▶│ Select Order │
│ (admin-web)  │     │   Orders     │     │   Detail     │
└──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Provisioning │◀────│ Order PAID   │◀────│ Approve      │
│   Triggered  │     │  + paidAt    │     │  Payment     │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Service Interactions:**
1. **admin-web** → **api-gateway** → **order-service** (internal API): List pending orders
2. **admin-web** → **api-gateway** → **order-service** (internal API): Update payment status
3. **order-service**: Auto-trigger provisioning after PAID

### 4.3 Flow 3: Customer View VPS List & Status

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Login to     │────▶│ Dashboard    │────▶│ View VPS     │
│ customer-web │     │  Home        │     │   Detail     │
└──────────────┘     └──────────────┘     └──────────────┘
                           │                    │
                           │                    ▼
                           │              ┌──────────────┐
                           │              │ Actions:     │
                           └─────────────▶│ Reboot, PWD  │
                                          └──────────────┘
```

**Service Interactions:**
1. **customer-web** → **api-gateway** → **auth-service**: Login, get JWT
2. **customer-web** → **api-gateway** → **order-service**: List orders (filter: ACTIVE)
3. **customer-web** → **api-gateway** → **instance-service**: Get VPS actions, status

### 4.4 Flow 4: Notifications

```
                                   ┌─────────────────┐
                                   │ notification-   │
                                   │    service      │
                                   └────────┬────────┘
                                            │
           ┌────────────────────────────────┼────────────────────────────────┐
           │                                │                                │
           ▼                                ▼                                ▼
    ┌─────────────┐               ┌─────────────┐                 ┌─────────────┐
    │   Email     │               │  Telegram   │                 │  In-App     │
    │  (SMTP/SES) │               │    Bot      │                 │ (v1.2+)     │
    └─────────────┘               └─────────────┘                 └─────────────┘
```

**Notification Triggers:**
| Event | Channel | Priority |
|-------|---------|----------|
| Order Created | Email | P1 |
| Payment Confirmed | Email + Telegram | P1 |
| VPS Active | Email + Telegram | P1 |
| Provisioning Failed | Email + Telegram | P1 |
| VPS Expiring Soon | Email | P2 |

---

## 5. System Architecture (High-Level)

### 5.1 Services Overview

```
                                    ┌─────────────────────────────────────────────┐
                                    │              EXTERNAL WORLD                 │
                                    │  (Customers, Resellers, Admin)              │
                                    └─────────────────────────────────────────────┘
                                                        │
                                                        ▼
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                              customer-web / admin-web (React + Vite)                  │
└───────────────────────────────────────────────────────────────────────────────────────┘
                                                        │
                                                        ▼
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                                     api-gateway (NestJS)                              │
│  - Request routing                                                                    │
│  - Rate limiting (v1.2+)                                                              │
│  - JWT validation passthrough                                                          │
└───────────────────────────────────────────────────────────────────────────────────────┘
                                                        │
                    ┌───────────────┬───────────────────┼───────────────────┬───────────┐
                    │               │                   │                   │           │
                    ▼               ▼                   ▼                   ▼           ▼
           ┌─────────────┐  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ ┌─────────────┐
           │   auth-     │  │  catalog-   │    │   order-    │    │  billing-   │ │notification-│
           │  service    │  │   service   │    │   service   │    │   service   │ │   service   │
           │  (NestJS)   │  │  (NestJS)   │    │  (NestJS)   │    │  (NestJS)   │ │  (NestJS)   │
           └──────┬──────┘  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘ └──────┬──────┘
                  │                │                  │                  │              │
                  ▼                ▼                  ▼                  ▼              ▼
           ┌─────────────┐  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ ┌─────────────┐
           │  Postgres   │  │  Postgres   │    │  Postgres   │    │  Postgres   │ │    Redis    │
           │  (auth_db)  │  │ (catalog_db)│    │ (order_db)  │    │(billing_db) │ │  (queue)    │
           └─────────────┘  └─────────────┘    └─────────────┘    └─────────────┘ └─────────────┘
                                                        │
                                                        │
                    ┌───────────────────────────────────┴───────────────────────────────┐
                    │                                                                   │
                    ▼                                                                   ▼
           ┌─────────────────────┐                                    ┌─────────────────────────┐
           │   instance-service  │                                    │   provider-service      │
           │   (VPS Management)  │                                    │ (Cloud Provider Adapter)│
           └──────────┬──────────┘                                    └────────────┬────────────┘
                      │                                                            │
                      └────────────────────────┬───────────────────────────────────┘
                                               │
                                               ▼
                               ┌───────────────────────────────┐
                               │      EXTERNAL INTEGRATIONS    │
                               │  - DigitalOcean API           │
                               │  - Tripay Payment Gateway     │
                               │  - Telegram Bot API           │
                               │  - Email (SMTP/SES)           │
                               │  - Vultr, Linode (v1.2+)      │
                               └───────────────────────────────┘
```

### 5.2 Data Stores

| Service | Database | Purpose |
|---------|----------|---------|
| auth-service | PostgreSQL (auth_db) | Users, tokens, MFA |
| catalog-service | PostgreSQL (catalog_db) | Plans, pricing, images, coupons |
| order-service | PostgreSQL (order_db) | Orders, items, provisioning tasks |
| billing-service | PostgreSQL (billing_db) | Invoices, payments, transactions |
| notification-service | Redis (queue) | Message queue for async notifications |

### 5.3 External Integrations

| System | Type | Purpose | Owner |
|--------|------|---------|-------|
| DigitalOcean API | Cloud Provider | VPS provisioning | order-service / provider-service |
| Tripay | Payment Gateway | IDR payment processing | billing-service |
| Telegram Bot | Notification | User notifications | notification-service |
| Email (SMTP/SES) | Notification | Transactional emails | notification-service |
| Vultr API | Cloud Provider (v1.2+) | Multi-provider support | provider-service |
| Linode API | Cloud Provider (v1.2+) | Multi-provider support | provider-service |

---

## 6. Service-by-Service Requirements

### 6.1 auth-service (EXISTING)

**Purpose:** Authentication dan authorization untuk semua user platform.

**Core Features v1.x:**
- [x] User registration (email, password)
- [x] User login dengan JWT (RS256 default, HS256 untuk dev)
- [x] Refresh token rotation
- [x] Password reset flow
- [x] Email verification
- [ ] MFA (TOTP) - prepared, belum aktif

**Non-Goals:**
- Social login (Google, GitHub) - v2+
- SSO integration - v2+

**API Responsibility:**
- `POST /api/v1/auth/register` - Register user baru
- `POST /api/v1/auth/login` - Login, return JWT + refresh token
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Revoke refresh token
- `POST /api/v1/auth/forgot-password` - Request password reset
- `GET /internal/users/{id}` - Get user info (internal)

### 6.2 catalog-service (EXISTING)

**Purpose:** Sumber kebenaran untuk VPS plans, pricing, images, dan coupons.

**Core Features v1.x:**
- [x] VPS Plan CRUD dengan specs (CPU, RAM, disk, bandwidth)
- [x] Plan Pricing per duration (MONTHLY, YEARLY) dalam IDR
- [x] Plan Promo (time-limited discounts)
- [x] VPS Image catalog (OS & App images)
- [x] Coupon management & validation

**Non-Goals:**
- Dynamic pricing based on usage - v2+
- Custom plan builder - v2+

**API Responsibility:**
- `GET /api/v1/catalog/plans` - List all active plans
- `GET /api/v1/catalog/plans/{id}` - Get plan detail + active pricing
- `GET /api/v1/catalog/images` - List all active images
- `GET /api/v1/catalog/images/{id}` - Get image detail
- `POST /api/v1/catalog/coupons/validate` - Validate coupon + calculate discount

### 6.3 order-service (EXISTING - v1.0)

**Purpose:** Orkestrasi order lifecycle dari creation sampai provisioning complete.

**Existing Spec:** Lihat `prd-vps-order-provisioning-service-v1-0.md`

**Core Features v1.0:**
- [x] Order creation dengan real-time pricing dari catalog-service
- [x] Pricing snapshot (base, promo, coupon, final) dalam IDR
- [x] Payment mock via admin override (POST internal/orders/{id}/payment-status)
- [x] Auto-provisioning setelah PAID
- [x] Async polling ke DigitalOcean API
- [x] Full droplet metadata storage
- [x] User APIs (list orders, order detail)
- [x] Admin APIs (list all, payment override)

**Non-Goals v1.0:**
- Cancel order by user
- Retry provisioning
- Job queue (using async polling)
- Auto-cleanup failed droplets

**API Responsibility:**
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders` - List user orders
- `GET /api/v1/orders/{id}` - Order detail
- `POST /internal/orders/{id}/payment-status` - Admin payment override
- `GET /internal/orders` - Admin list all orders

### 6.4 billing-service (NEW - v1.1)

**Purpose:** Handle pembayaran, invoice generation, dan integrasi payment gateway.

**Core Features v1.1:**
- [ ] Invoice generation dari order
- [ ] Tripay integration (VA, e-wallet)
- [ ] Payment status webhook receiver
- [ ] Payment history per user
- [ ] Auto-trigger order-service setelah payment confirmed

**Non-Goals v1.x:**
- Subscription/recurring billing - v2+
- Multi-currency (USD) - v2+
- Refund processing - v2+

**API Responsibility:**
- `POST /api/v1/billing/invoices` - Create invoice untuk order
- `GET /api/v1/billing/invoices` - List invoices
- `GET /api/v1/billing/invoices/{id}` - Invoice detail + payment link
- `POST /api/v1/billing/invoices/{id}/pay` - Generate payment link
- `POST /internal/billing/webhooks/tripay` - Tripay callback
- `GET /internal/billing/transactions` - Admin transaction history

### 6.5 notification-service (NEW - v1.1)

**Purpose:** Handle semua notifikasi ke user (email, Telegram, in-app).

**Core Features v1.1:**
- [ ] Email notification (SMTP atau SES)
- [ ] Telegram bot notification
- [ ] Template management (order created, payment confirmed, VPS active, etc.)
- [ ] Notification queue (Redis-based)
- [ ] Notification history/log

**Non-Goals v1.x:**
- In-app notification - v1.2+
- SMS notification - v2+
- Push notification - v2+

**API Responsibility:**
- `POST /internal/notifications/send` - Send notification (internal)
- `GET /internal/notifications/templates` - List templates
- `PUT /internal/notifications/templates/{id}` - Update template

### 6.6 instance-service (PLANNED - v1.2)

**Purpose:** VPS instance management setelah provisioning (reboot, resize, etc.).

**Core Features v1.2:**
- [ ] Get VPS status real-time
- [ ] Reboot VPS
- [ ] Power on/off VPS
- [ ] Reset root password
- [ ] VNC console access (v1.3+)

**Non-Goals v1.x:**
- Resize VPS - v2+
- Snapshot/backup - v2+
- Firewall management - v2+

**API Responsibility:**
- `GET /api/v1/instances` - List user instances
- `GET /api/v1/instances/{id}` - Instance detail
- `POST /api/v1/instances/{id}/actions` - Trigger action (reboot, power-off, reset-password)

### 6.7 customer-web (PLANNED - v1.1)

**Purpose:** Customer portal untuk self-service ordering dan VPS management.

**Core Features v1.1:**
- [ ] Registration & login
- [ ] Browse catalog plans
- [ ] Order flow (plan → image → coupon → pay)
- [ ] Order history
- [ ] VPS dashboard (list, detail)
- [ ] Profile & settings

**Tech Stack:** React + Vite + TailwindCSS

### 6.8 admin-web (PLANNED - v1.1)

**Purpose:** Admin dashboard untuk platform management.

**Core Features v1.1:**
- [ ] Admin login
- [ ] Order management (list, detail, payment override)
- [ ] User management (list, detail)
- [ ] Basic analytics (orders per day, revenue)

**Tech Stack:** React + Vite + TailwindCSS

---

## 7. Data Model & Key Entities (Conceptual)

### 7.1 Entity Relationship (High-Level)

```
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│    User     │───────▶│    Order    │───────▶│  OrderItem  │
│  (auth-db)  │1      *│  (order-db) │1      *│  (order-db) │
└─────────────┘        └──────┬──────┘        └─────────────┘
                              │1
                              │
                              ▼1
                       ┌──────────────────┐
                       │ ProvisioningTask │
                       │    (order-db)    │
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Droplet (DO)    │
                       │  (external)      │
                       └──────────────────┘

┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│   VpsPlan   │◀──────▶│ PlanPricing │        │  PlanPromo  │
│ (catalog-db)│1      *│ (catalog-db)│        │ (catalog-db)│
└──────┬──────┘        └─────────────┘        └─────────────┘
       │1
       │
       ▼*
┌─────────────┐        ┌─────────────┐
│  VpsImage   │◀──────▶│VpsPlanImage │
│ (catalog-db)│       *│ (catalog-db)│
└─────────────┘        └─────────────┘

┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│   Coupon    │───────▶│ CouponPlan  │        │CouponRedemp │
│ (catalog-db)│1      *│ (catalog-db)│        │ (catalog-db)│
└─────────────┘        └─────────────┘        └─────────────┘

┌─────────────┐        ┌─────────────┐
│   Invoice   │───────▶│  Payment    │
│ (billing-db)│1      *│ (billing-db)│
└─────────────┘        └─────────────┘
```

### 7.2 Key Entities

| Entity | Service | Description |
|--------|---------|-------------|
| **User** | auth-service | Customer, reseller, admin accounts |
| **RefreshToken** | auth-service | JWT refresh token storage |
| **VpsPlan** | catalog-service | VPS plan definition (specs, provider slug) |
| **PlanPricing** | catalog-service | Price per duration (IDR) |
| **PlanPromo** | catalog-service | Time-limited discount |
| **VpsImage** | catalog-service | OS/App image catalog |
| **Coupon** | catalog-service | Discount coupon rules |
| **Order** | order-service | Customer order with pricing snapshot |
| **OrderItem** | order-service | Line items (plan, image) |
| **ProvisioningTask** | order-service | DO provisioning state & metadata |
| **StatusHistory** | order-service | Audit trail of order status changes |
| **Invoice** | billing-service | Invoice linked to order |
| **Payment** | billing-service | Payment transaction record |

### 7.3 Cross-Service Relationships

| Source | Target | Relationship | Method |
|--------|--------|--------------|--------|
| Order → User | order-db → auth-db | userId (logical FK) | Internal API call if needed |
| Order → Plan | order-db → catalog-db | planId + snapshot fields | Catalog called at order creation |
| Order → Image | order-db → catalog-db | imageId + snapshot fields | Catalog called at order creation |
| Invoice → Order | billing-db → order-db | orderId (logical FK) | Internal API call |
| Notification → User | Redis → auth-db | userId | Internal API call |

---

## 8. Security & Compliance

### 8.1 Authentication

| Component | Method | Details |
|-----------|--------|---------|
| User JWT | RS256 (production) | Public key distributed to all services |
| User JWT | HS256 (development only) | Shared secret for local dev |
| Admin JWT | Same as user | Role claim: `admin` or `super_admin` |
| Token Expiry | 15 min access, 7 days refresh | Refresh token rotation |

### 8.2 Authorization

| Endpoint Type | Method | Guard |
|---------------|--------|-------|
| User APIs (`/api/v1/*`) | JWT Bearer token | JwtAuthGuard |
| Internal APIs (`/internal/*`) | API Key header | ApiKeyGuard |
| Admin APIs | JWT + Role check | JwtAuthGuard + RolesGuard |

### 8.3 Role-Based Access

| Role | Access |
|------|--------|
| `customer` | Own orders, own VPS instances |
| `admin` | All orders, payment override |
| `super_admin` | All admin + user management |

### 8.4 Secrets Management

| Secret | Storage | Access |
|--------|---------|--------|
| JWT Private Key | Environment variable / Secrets Manager | auth-service only |
| JWT Public Key | Environment variable | All services |
| Internal API Key | Environment variable | Backend services |
| DO Access Token | Environment variable | order-service |
| Tripay Secret | Environment variable | billing-service |
| Telegram Bot Token | Environment variable | notification-service |

### 8.5 Data Security

- **Encryption at rest:** PostgreSQL dengan encryption (if managed service)
- **Encryption in transit:** HTTPS untuk semua traffic
- **PII Handling:** Email, phone stored encrypted (v1.2+)
- **Password:** bcrypt dengan cost factor 12

### 8.6 Rate Limiting (v1.2+)

| Endpoint | Limit |
|----------|-------|
| Login | 5 per minute per IP |
| Register | 3 per minute per IP |
| Order creation | 10 per minute per user |
| General API | 100 per minute per user |

---

## 9. SLO, Monitoring & Ops

### 9.1 Service Level Objectives

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Availability | 99.9% uptime | Health check endpoint |
| API Response Time (p95) | < 500ms | APM monitoring |
| Order Creation Success | ≥99% | Success vs error ratio |
| Provisioning Success | ≥95% | VPS ACTIVE vs FAILED |
| Provisioning Time | < 3 minutes | PAID → ACTIVE duration |
| Payment Callback | < 30 seconds | Tripay → billing-service |

### 9.2 Logging & Tracing

| Component | Tool | Format |
|-----------|------|--------|
| Application Logs | Structured JSON | `{ timestamp, level, service, message, context }` |
| Request Logging | Morgan/Pino | HTTP method, path, status, duration |
| Error Tracking | Sentry (v1.2+) | Stack trace, context |
| Distributed Tracing | OpenTelemetry (v1.2+) | Request correlation |

### 9.3 Critical Alerts

| Condition | Alert | Channel |
|-----------|-------|---------|
| Service down | CRITICAL | PagerDuty/Telegram |
| Error rate > 5% | WARNING | Slack |
| Provisioning failure spike | CRITICAL | Telegram |
| Database connection failed | CRITICAL | PagerDuty |
| DO API unreachable | WARNING | Slack |

### 9.4 Health Checks

| Service | Endpoint | Checks |
|---------|----------|--------|
| All services | `GET /health` | Basic alive |
| All services | `GET /health/ready` | DB connection, deps |
| order-service | `GET /health` | DB + catalog-service reachable |

---

## 10. Phasing & Roadmap

### 10.1 v1.0 (MVP) - COMPLETED

**Focus:** Core ordering dan provisioning via DigitalOcean.

| Component | Status |
|-----------|--------|
| auth-service | ✅ Done |
| catalog-service | ✅ Done |
| order-service | ✅ Done |
| DigitalOcean provisioning | ✅ Done |
| Admin payment override | ✅ Done |

### 10.2 v1.1 (Target: Q1 2025)

**Focus:** Billing integration dan notifications.

| Component | Priority | Effort |
|-----------|----------|--------|
| billing-service (Tripay) | P1 | 2 weeks |
| notification-service (Email + Telegram) | P1 | 1 week |
| customer-web (Basic UI) | P1 | 2 weeks |
| admin-web (Basic UI) | P2 | 1 week |

**Dependencies:**
- Tripay account & API credentials
- SMTP/SES setup
- Telegram bot token

### 10.3 v1.2 (Target: Q2 2025)

**Focus:** VPS management dan UX improvements.

| Component | Priority | Effort |
|-----------|----------|--------|
| instance-service (reboot, power, password) | P1 | 2 weeks |
| Rate limiting di api-gateway | P2 | 3 days |
| In-app notifications | P2 | 1 week |
| Error tracking (Sentry) | P2 | 2 days |

### 10.4 v1.3 (Target: Q3 2025)

**Focus:** Multi-provider dan enterprise features.

| Component | Priority | Effort |
|-----------|----------|--------|
| provider-service abstraction | P1 | 2 weeks |
| Vultr integration | P2 | 1 week |
| Linode integration | P2 | 1 week |
| VNC console access | P3 | 2 weeks |

### 10.5 Roadmap Diagram

```
2024 Q4        2025 Q1         2025 Q2         2025 Q3         2025 Q4
   │              │               │               │               │
   ▼              ▼               ▼               ▼               ▼
┌──────┐     ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ v1.0 │────▶│  v1.1    │───▶│  v1.2    │───▶│  v1.3    │───▶│  v2.0    │
│ MVP  │     │ Billing  │    │ Instance │    │ Multi    │    │ Enterprise│
│      │     │ + Notif  │    │ Mgmt     │    │ Provider │    │ Features │
└──────┘     └──────────┘    └──────────┘    └──────────┘    └──────────┘
   │              │               │               │
   └──────────────┴───────────────┴───────────────┘
                 All v1.x compatible
```

---

## 11. Appendix

### 11.1 Reference Documents

| Document | Location | Description |
|----------|----------|-------------|
| Order Service PRD | `tasks/prd-vps-order-provisioning-service-v1-0.md` | Detailed order-service spec |
| Order Service Tasks | `tasks/tasks-order-service-v1.md` | Implementation checklist |
| Order Service API Guide | `apps/order-service/docs/api-consumer.md` | API consumer documentation |
| Catalog Service Schema | `apps/catalog-service/prisma/schema.prisma` | Catalog data model |
| Auth Service Schema | `apps/auth-service/prisma/schema.prisma` | Auth data model |

### 11.2 Global Error Codes

Error codes standar yang digunakan di semua service:

| Code | HTTP | Description |
|------|------|-------------|
| `BAD_REQUEST` | 400 | Request body/params invalid |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | No permission for this action |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | State conflict (e.g., duplicate) |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Dependency unavailable |
| `GATEWAY_TIMEOUT` | 504 | Upstream timeout |

### 11.3 Service-Specific Error Codes

**Order Service:**
- `ORDER_NOT_FOUND`, `ORDER_ACCESS_DENIED`
- `INVALID_PLAN`, `INVALID_IMAGE`, `INVALID_COUPON`, `INVALID_DURATION`
- `PAYMENT_STATUS_CONFLICT`
- `CATALOG_SERVICE_UNAVAILABLE`, `DIGITALOCEAN_UNAVAILABLE`
- `PROVISIONING_FAILED`, `PROVISIONING_TIMEOUT`

**Auth Service:**
- `INVALID_CREDENTIALS`, `USER_NOT_FOUND`
- `EMAIL_ALREADY_EXISTS`
- `TOKEN_EXPIRED`, `TOKEN_INVALID`

**Billing Service (planned):**
- `INVOICE_NOT_FOUND`, `PAYMENT_FAILED`
- `GATEWAY_ERROR`

### 11.4 Naming Guidelines

| Aspect | Convention | Example |
|--------|------------|---------|
| Currency | Always IDR for Indonesia | `finalPrice: 100000` (IDR) |
| Date/Time | ISO 8601 with timezone | `2024-01-15T10:00:00.000Z` |
| IDs | UUID v4 | `6f0429ea-4344-496d-bd40-1f4e47a6220c` |
| Enums | UPPER_SNAKE_CASE | `PENDING_PAYMENT`, `MONTHLY` |
| API Paths | kebab-case | `/api/v1/orders`, `/payment-status` |
| Table Names | snake_case plural | `orders`, `order_items` |
| Column Names | snake_case | `created_at`, `final_price` |

### 11.5 Environment Variables Template

```env
# ===== Common =====
NODE_ENV=development
PORT=3333

# ===== Database =====
DATABASE_URL=postgresql://user:pass@localhost:5432/db_name

# ===== Auth =====
JWT_ALGORITHM=RS256
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
# For dev only:
# JWT_ALGORITHM=HS256
# JWT_SECRET=super-secret-dev-token

# ===== Internal =====
INTERNAL_API_KEY=super-secret-internal-key

# ===== Service URLs =====
AUTH_SERVICE_BASE_URL=http://localhost:3001
CATALOG_SERVICE_BASE_URL=http://localhost:3002
ORDER_SERVICE_BASE_URL=http://localhost:3003
BILLING_SERVICE_BASE_URL=http://localhost:3004

# ===== DigitalOcean =====
DO_ACCESS_TOKEN=dop_v1_xxx
DIGITALOCEAN_DEFAULT_REGION=sgp1

# ===== Tripay (billing-service) =====
TRIPAY_API_KEY=xxx
TRIPAY_PRIVATE_KEY=xxx
TRIPAY_MERCHANT_CODE=xxx

# ===== Notification =====
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=xxx
SMTP_PASS=xxx
TELEGRAM_BOT_TOKEN=xxx
```

### 11.6 Glossary

| Term | Definition |
|------|------------|
| Droplet | DigitalOcean VPS instance |
| Provisioning | Process of creating VPS from order |
| Pricing Snapshot | Copy of price at order time (immutable) |
| Promo | Time-limited automatic discount on plan |
| Coupon | User-entered discount code |
| VA | Virtual Account for bank transfer payment |
| JWT | JSON Web Token for authentication |

---

**Document Version:** 1.0  
**Created:** 2024-11-29  
**Author:** Product Manager  
**Status:** Ready for Implementation

---

*Next steps: Use this PRD as reference for sprint planning. Break down v1.1 features into individual task lists per service.*
