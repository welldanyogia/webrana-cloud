# PRD: VPS Order & Provisioning Service v1.0

## 1. Introduction / Overview

**VPS Order & Provisioning Service** (`order-service`) adalah service baru yang mengorkestrasi alur pemesanan VPS dari pemilihan plan hingga droplet aktif di DigitalOcean.

### Problem Statement

Saat ini catalog-service menyediakan data plan, image, pricing, dan coupon, namun belum ada service yang:

- Menangani proses order dari user
- Menghitung final price dengan promo & coupon
- Melakukan provisioning droplet ke DigitalOcean
- Melacak status order dari PENDING sampai ACTIVE

### Solution

Order-service menjadi penghubung antara **catalog-service** (sumber data pricing) dan **DigitalOcean API** (provisioning), dengan fitur:

- Order creation dengan validasi real-time ke catalog-service
- Payment mock via admin override endpoint
- Asynchronous provisioning dengan polling status
- Full droplet metadata storage
- User order monitoring

## 2. Goals

| # | Goal | Measurable Target |
|---|------|-------------------|
| G1 | User dapat membuat order VPS | Order berhasil dibuat dengan status PENDING_PAYMENT |
| G2 | Harga selalu real-time dari catalog-service | 0% hardcoded price di order-service |
| G3 | Admin dapat override payment status | Endpoint functional untuk mark PAID/FAILED |
| G4 | Provisioning droplet ke DigitalOcean | Droplet terbuat dengan metadata lengkap tersimpan |
| G5 | User dapat monitor order mereka | List & detail order accessible via API |
| G6 | State machine order yang konsisten | Transisi status terdokumentasi dan idempotent |

## 3. User Stories

### As a User (Authenticated)

- **US1**: Sebagai user, saya ingin memilih plan & image VPS dari catalog sehingga bisa memesan VPS baru.
- **US2**: Sebagai user, saya ingin memasukkan kode kupon opsional dan melihat breakdown harga (base + promo + coupon = final) sebelum konfirmasi order.
- **US3**: Sebagai user, saya ingin melihat daftar order saya beserta statusnya (PENDING_PAYMENT, PAID, PROVISIONING, ACTIVE, FAILED).
- **US4**: Sebagai user, saya ingin melihat detail order termasuk informasi droplet (IP, region, status) setelah provisioning selesai.

### As an Admin/Ops

- **US5**: Sebagai admin, saya ingin menandai order sebagai PAID atau FAILED ketika pembayaran mock selesai.
- **US6**: Sebagai admin, saya ingin melihat semua order dengan filter status/userId untuk monitoring.

### As System

- **US7**: Sebagai sistem, setelah order PAID, saya perlu create droplet ke DigitalOcean dan polling status sampai ACTIVE atau FAILED.
- **US8**: Sebagai sistem, saya perlu menyimpan semua metadata droplet untuk referensi dan operasi lanjutan.

## 4. Functional Requirements

### 4.1 Catalog Integration

| FR | Requirement | Priority |
|----|-------------|----------|
| FR1 | Order-service HARUS memanggil catalog-service via HTTP untuk mendapatkan detail plan beserta pricing aktif. Tidak boleh ada cache harga. | HIGH |
| FR2 | Order-service HARUS memanggil `POST /api/v1/catalog/coupons/validate` untuk validasi coupon. **Semua perhitungan diskon (promo + coupon) dilakukan oleh catalog-service; order-service TIDAK menghitung ulang, hanya menyimpan hasil sebagai snapshot.** | HIGH |
| FR3 | Order-service HARUS memanggil catalog-service untuk mendapatkan detail image (slug, regions). | HIGH |

### 4.2 Order Management

| FR | Requirement | Priority |
|----|-------------|----------|
| FR4 | API `POST /api/v1/orders` menerima `planId`, `imageId`, `duration`, optional `couponCode`, dan membuat Order dengan status `PENDING_PAYMENT`. | HIGH |
| FR5 | Order HARUS menyimpan snapshot harga: `basePrice`, `promoDiscount`, `couponDiscount`, `finalPrice`, `currency`. | HIGH |
| FR6 | Setiap Order memiliki satu atau lebih OrderItem yang mencatat referensi plan/image yang digunakan saat order dibuat. | MEDIUM |
| FR7 | Order HARUS menyimpan `userId` dari JWT token (logical foreign key ke auth-service). | HIGH |

### 4.3 Payment (Mock)

| FR | Requirement | Priority |
|----|-------------|----------|
| FR8 | Admin endpoint `POST /internal/orders/{orderId}/payment-status` untuk update status ke `PAID` atau `PAYMENT_FAILED`. | HIGH |
| FR9 | Transisi ke `PAID` HARUS memvalidasi status sebelumnya adalah `PENDING_PAYMENT`. | HIGH |
| FR10 | Setelah status `PAID`, sistem HARUS otomatis trigger provisioning process. | HIGH |

> **Catatan v1 - Perilaku `PAYMENT_FAILED`:**
>
> Pada v1, `PAYMENT_FAILED` diperlakukan sebagai **payment event**, bukan perubahan `OrderStatus`.
>
> - Ketika admin menandai payment sebagai `PAYMENT_FAILED`, status `Order.status` **tetap `PENDING_PAYMENT`** (tidak berubah).
> - Event ini dicatat di `StatusHistory` dengan `newStatus = 'PAYMENT_FAILED'` untuk audit trail.
> - Dengan demikian, user/admin masih bisa retry payment di kemudian hari tanpa harus membuat order baru.
>
> Jika di masa depan diputuskan bahwa "payment failed = order FAILED permanen" (terminal state), behavior ini akan direvisi di PRD v1.1 atau v2.

### 4.4 Provisioning (Async Polling)

| FR | Requirement | Priority |
|----|-------------|----------|
| FR11 | Setelah `PAID`, sistem membuat ProvisioningTask dengan status `PENDING` dan mengirim request create droplet ke DigitalOcean API. | HIGH |
| FR11a | **Region Selection (v1)**: Provisioning selalu menggunakan region default dari konfigurasi (`DIGITALOCEAN_DEFAULT_REGION`). User tidak memilih region di v1. Support multi-region per user akan dibahas di v2. | HIGH |
| FR12 | Sistem HARUS polling status droplet ke DigitalOcean sampai status `active` atau error. Interval polling: 5 detik, max attempts: 60 (5 menit). | HIGH |
| FR13 | Jika droplet `active`, update ProvisioningTask ke `SUCCESS` dan Order ke `ACTIVE`. | HIGH |
| FR14 | Jika provisioning gagal (timeout/error), update ProvisioningTask ke `FAILED` dengan error message, dan Order ke `FAILED`. | HIGH |

### 4.5 Droplet Metadata Storage

| FR | Requirement | Priority |
|----|-------------|----------|
| FR15 | ProvisioningTask HARUS menyimpan metadata droplet: `dropletId`, `dropletName`, `region`, `sizeSlug`, `imageSlug`, `ipv4Public`, `ipv4Private`, `status`, `tags`, `createdAt`. | HIGH |
| FR16 | Metadata droplet HARUS diupdate setiap kali polling mendapat response dari DigitalOcean. | MEDIUM |

### 4.6 User APIs

| FR | Requirement | Priority |
|----|-------------|----------|
| FR17 | `GET /api/v1/orders` - List order milik user (dari JWT), dengan pagination. | HIGH |
| FR18 | `GET /api/v1/orders/{id}` - Detail order termasuk OrderItems dan ProvisioningTask (jika ada). User hanya bisa akses order miliknya. | HIGH |

### 4.7 Admin/Internal APIs

| FR | Requirement | Priority |
|----|-------------|----------|
| FR19 | `GET /internal/orders` - List semua order dengan filter `status`, `userId`, pagination. | MEDIUM |
| FR20 | `GET /internal/orders/{id}` - Detail order untuk admin (tanpa ownership check). | MEDIUM |

### 4.8 Auth Integration

| FR | Requirement | Priority |
|----|-------------|----------|
| FR21 | Semua API `/api/v1/*` HARUS validasi JWT dari auth-service (public key verification). | HIGH |
| FR22 | API `/internal/*` HARUS menggunakan API key atau role-based guard (ADMIN role). | HIGH |

> **Catatan Implementasi - JWT Authentication (v1)**
>
> **Production (Default)**: RS256 + Public Key
> - JWT ditandatangani oleh auth-service menggunakan RSA private key
> - order-service verify menggunakan `JWT_PUBLIC_KEY` (asymmetric verification)
> - Algoritma default: `RS256`
>
> **Development/Local (Optional)**: HS256 + Secret
> - Untuk kemudahan testing lokal tanpa setup key pair
> - Set `JWT_ALGORITHM=HS256` dan `JWT_SECRET`
> - **HANYA untuk development, JANGAN dipakai di production!**
>
> Environment variables:
> - `JWT_ALGORITHM`: `RS256` (default) atau `HS256`
> - `JWT_PUBLIC_KEY`: RSA public key dalam format PEM (untuk RS256)
> - `JWT_SECRET`: Shared secret (untuk HS256, dev only)

### 4.9 Error Handling

| FR | Requirement | Priority |
|----|-------------|----------|
| FR23 | Semua error response menggunakan format standar dengan error code yang terdefinisi. | HIGH |
| FR24 | Jika catalog-service tidak tersedia, return `503 CATALOG_SERVICE_UNAVAILABLE`. | HIGH |
| FR25 | Jika DigitalOcean API gagal, simpan error detail di ProvisioningTask dan return error code yang sesuai. | HIGH |

## 5. Data Model

### 5.1 Order

```prisma
model Order {
  id                  String        @id @default(cuid())
  userId              String        // Logical FK to auth-service
  
  // Plan & Image Reference
  planId              String
  planName            String        // Snapshot
  imageId             String
  imageName           String        // Snapshot
  duration            PlanDuration  // MONTHLY, QUARTERLY, etc.
  
  // Pricing Snapshot
  basePrice           Int           // In cents/smallest unit
  promoDiscount       Int           @default(0)
  couponCode          String?
  couponDiscount      Int           @default(0)
  finalPrice          Int
  currency            String        @default("IDR")
  
  // Status
  status              OrderStatus   @default(PENDING_PAYMENT)
  
  // Timestamps
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
  paidAt              DateTime?
  
  // Relations
  items               OrderItem[]
  provisioningTask    ProvisioningTask?
  statusHistory       StatusHistory[]
}

enum OrderStatus {
  PENDING_PAYMENT
  PAID
  PROVISIONING
  ACTIVE
  FAILED
  CANCELED
}

enum PlanDuration {
  MONTHLY
  QUARTERLY
  SEMI_ANNUAL
  ANNUAL
}

// NOTE: For v1, catalog-service only guarantees MONTHLY and ANNUAL pricing.
// QUARTERLY and SEMI_ANNUAL are prepared for v2+, but not used in v1 integration.
```

### 5.2 OrderItem

```prisma
model OrderItem {
  id            String    @id @default(cuid())
  orderId       String
  order         Order     @relation(fields: [orderId], references: [id])
  
  itemType      ItemType
  referenceId   String    // planId or imageId
  description   String
  unitPrice     Int
  quantity      Int       @default(1)
  totalPrice    Int
  
  createdAt     DateTime  @default(now())
}

enum ItemType {
  PLAN
  IMAGE
  ADDON
}
```

### 5.3 ProvisioningTask

```prisma
model ProvisioningTask {
  id              String              @id @default(cuid())
  orderId         String              @unique
  order           Order               @relation(fields: [orderId], references: [id])
  
  status          ProvisioningStatus  @default(PENDING)
  
  // DigitalOcean Request
  doRegion        String?
  doSize          String?             // e.g., "s-1vcpu-1gb"
  doImage         String?             // e.g., "ubuntu-22-04-x64"
  
  // DigitalOcean Response (Full Metadata)
  dropletId       String?
  dropletName     String?
  ipv4Public      String?
  ipv4Private     String?
  dropletStatus   String?             // "new", "active", "off", etc.
  dropletTags     String[]            @default([])
  dropletCreatedAt DateTime?
  
  // Error Tracking
  errorCode       String?
  errorMessage    String?
  attempts        Int                 @default(0)
  
  // Timestamps
  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
}

enum ProvisioningStatus {
  PENDING
  IN_PROGRESS
  SUCCESS
  FAILED
}
```

### 5.4 StatusHistory

```prisma
model StatusHistory {
  id              String    @id @default(cuid())
  orderId         String
  order           Order     @relation(fields: [orderId], references: [id])
  
  previousStatus  String
  newStatus       String
  actor           String    // "system", "admin:{userId}", "user:{userId}"
  reason          String?
  metadata        Json?
  
  createdAt       DateTime  @default(now())
}
```

## 6. API Endpoints

### 6.1 Public APIs (JWT Protected)

#### Create Order

```
POST /api/v1/orders
Authorization: Bearer {jwt}

Request:
{
  "planId": "plan_abc123",
  "imageId": "img_xyz789",
  "duration": "MONTHLY",
  "couponCode": "HEMAT20"  // optional
}

Response 201:
{
  "data": {
    "id": "order_123",
    "status": "PENDING_PAYMENT",
    "planName": "VPS Basic",
    "imageName": "Ubuntu 22.04",
    "duration": "MONTHLY",
    "pricing": {
      "basePrice": 150000,
      "promoDiscount": 15000,
      "couponDiscount": 27000,
      "finalPrice": 108000,
      "currency": "IDR"
    },
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

#### List User Orders

```
GET /api/v1/orders?page=1&limit=10&status=ACTIVE
Authorization: Bearer {jwt}

Response 200:
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

#### Get Order Detail

```
GET /api/v1/orders/{orderId}
Authorization: Bearer {jwt}

Response 200:
{
  "data": {
    "id": "order_123",
    "status": "ACTIVE",
    "planName": "VPS Basic",
    "imageName": "Ubuntu 22.04",
    "pricing": {...},
    "provisioning": {
      "status": "SUCCESS",
      "dropletId": "12345678",
      "ipv4Public": "104.236.32.182",
      "ipv4Private": "10.132.0.2",
      "region": "sgp1",
      "completedAt": "2024-01-15T10:05:00Z"
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "paidAt": "2024-01-15T10:01:00Z"
  }
}
```

### 6.2 Internal/Admin APIs

#### Update Payment Status

```
POST /internal/orders/{orderId}/payment-status
X-API-Key: {internal_api_key}

Request:
{
  "status": "PAID",  // or "PAYMENT_FAILED"
  "notes": "Manual verification completed"
}

Response 200:
{
  "data": {
    "id": "order_123",
    "status": "PAID",
    "paidAt": "2024-01-15T10:01:00Z"
  }
}
```

#### List All Orders (Admin)

```
GET /internal/orders?status=FAILED&userId=user_123&page=1&limit=20
X-API-Key: {internal_api_key}

Response 200:
{
  "data": [...],
  "meta": {...}
}
```

## 7. Service Integration Contracts

### 7.1 Catalog Service

| Endpoint | Purpose | When Called |
|----------|---------|-------------|
| `GET /api/v1/catalog/plans/{id}` | Get plan details + active pricing | Order creation |
| `GET /api/v1/catalog/images/{id}` | Get image details (slug, regions) | Order creation |
| `POST /api/v1/catalog/coupons/validate` | Validate coupon for plan/user | Order creation (if coupon provided) |

**Expected Response from Catalog Service:**

```typescript
// GET /api/v1/catalog/plans/{id}
{
  "data": {
    "id": "plan_abc",
    "name": "VPS Basic",
    "slug": "vps-basic",
    "specs": { "cpu": 1, "ram": 1024, "storage": 25 },
    "doSizeSlug": "s-1vcpu-1gb",
    "activePricing": {
      "duration": "MONTHLY",
      "basePrice": 150000,
      "promoPrice": 135000,  // null if no promo
      "currency": "IDR"
    }
  }
}

// POST /api/v1/catalog/coupons/validate
{
  "data": {
    "valid": true,
    "discountAmount": 27000,
    "finalPrice": 108000,
    "coupon": {
      "code": "HEMAT20",
      "name": "Diskon 20%",
      "discountType": "PERCENT",
      "discountValue": 20
    }
  }
}
```

### 7.2 Auth Service

| Integration | Purpose | Method |
|-------------|---------|--------|
| JWT Verification | Validate user token | Public key verification (no HTTP call) |
| User Info (optional) | Get user email for notifications | `GET /internal/users/{id}` |

### 7.3 DigitalOcean API

| Endpoint | Purpose |
|----------|---------|
| `POST /v2/droplets` | Create new droplet |
| `GET /v2/droplets/{id}` | Poll droplet status |

## 8. Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `ORDER_NOT_FOUND` | 404 | Order dengan ID tersebut tidak ditemukan |
| `ORDER_ACCESS_DENIED` | 403 | User tidak memiliki akses ke order ini |
| `INVALID_PLAN` | 400 | Plan ID tidak valid atau tidak aktif |
| `INVALID_IMAGE` | 400 | Image ID tidak valid atau tidak tersedia untuk plan |
| `INVALID_COUPON` | 400 | Coupon tidak valid (expired, limit reached, dll) |
| `INVALID_DURATION` | 400 | Duration tidak valid untuk plan ini |
| `PAYMENT_STATUS_CONFLICT` | 409 | Order tidak dalam status yang valid untuk transisi payment |
| `CATALOG_SERVICE_UNAVAILABLE` | 503 | Tidak dapat menghubungi catalog-service |
| `PROVISIONING_FAILED` | 500 | Gagal membuat droplet di DigitalOcean |
| `DIGITALOCEAN_UNAVAILABLE` | 503 | Tidak dapat menghubungi DigitalOcean API |
| `PROVISIONING_TIMEOUT` | 504 | Droplet tidak ready dalam waktu yang ditentukan |

### 8.1 Error Response Format

All error responses follow the same envelope as auth-service for consistency:

```json
{
  "error": {
    "code": "INVALID_PLAN",
    "message": "Plan dengan ID tersebut tidak ditemukan atau tidak aktif",
    "details": {
      "planId": "plan_xyz",
      "reason": "Plan is inactive"
    }
  }
}
```

**Fields:**
- `code` (required): Error code dari tabel di atas
- `message` (required): Human-readable message dalam Bahasa Indonesia
- `details` (optional): Object dengan informasi tambahan untuk debugging

## 9. Non-Goals (Out of Scope v1)

| Item | Reason |
|------|--------|
| Payment gateway integration | v1 menggunakan mock payment dengan admin override |
| Cancel order by user | Kompleksitas refund, akan di v2 |
| Retry provisioning | Akan ditambahkan setelah flow dasar stabil |
| Job queue untuk provisioning | v1 menggunakan async polling sederhana |
| Multi-cloud support | v1 hanya DigitalOcean |
| Post-ACTIVE lifecycle (suspend, resize, terminate) | Scope v2 |
| Email/notification system | Akan di-integrate terpisah |
| Frontend UI | Order-service hanya menyediakan API |
| Auto-cleanup droplet saat FAILED | Jika provisioning FAILED dan droplet sudah tercipta di DO, sistem TIDAK akan auto-delete. Cleanup manual oleh admin. Akan dipertimbangkan di v2. |
| User region selection | v1 menggunakan default region dari env. Multi-region support di v2. |

## 10. Technical Considerations

### 10.1 Technology Stack

- **Framework**: NestJS (konsisten dengan auth-service & catalog-service)
- **ORM**: Prisma
- **Database**: PostgreSQL
- **HTTP Client**: Axios atau NestJS HttpModule
- **Testing**: Jest + Testcontainers

### 10.2 Configuration (Environment Variables)

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/order_service

# Service URLs
CATALOG_SERVICE_URL=http://localhost:3001
AUTH_SERVICE_URL=http://localhost:3000

# Auth
JWT_PUBLIC_KEY=...
INTERNAL_API_KEY=...

# DigitalOcean
DIGITALOCEAN_API_TOKEN=...
DIGITALOCEAN_DEFAULT_REGION=sgp1

# Provisioning
PROVISIONING_POLL_INTERVAL_MS=5000
PROVISIONING_MAX_ATTEMPTS=60

# Server
PORT=3002
NODE_ENV=development
```

### 10.3 Async Polling Implementation

```typescript
// Pseudocode for provisioning flow
async function provisionDroplet(order: Order) {
  // 1. Update task status to IN_PROGRESS
  await updateProvisioningStatus(task.id, 'IN_PROGRESS');
  
  // 2. Create droplet request
  const droplet = await digitalOceanClient.createDroplet({
    name: `vps-${order.id}`,
    region: plan.doRegion,
    size: plan.doSizeSlug,
    image: image.doImageSlug,
    tags: ['webrana', `order-${order.id}`]
  });
  
  // 3. Save initial droplet info
  await saveDropletMetadata(task.id, droplet);
  
  // 4. Start polling (non-blocking)
  pollDropletStatus(task.id, droplet.id);
}

async function pollDropletStatus(taskId: string, dropletId: string) {
  let attempts = 0;
  const maxAttempts = 60;
  const interval = 5000;
  
  while (attempts < maxAttempts) {
    const droplet = await digitalOceanClient.getDroplet(dropletId);
    await updateDropletMetadata(taskId, droplet);
    
    if (droplet.status === 'active') {
      await markProvisioningSuccess(taskId);
      return;
    }
    
    if (droplet.status === 'errored') {
      await markProvisioningFailed(taskId, 'Droplet creation failed');
      return;
    }
    
    attempts++;
    await sleep(interval);
  }
  
  await markProvisioningFailed(taskId, 'Provisioning timeout');
}
```

### 10.4 State Machine

```
PENDING_PAYMENT ──[admin mark PAID]──► PAID
       │                                │
       │                                ▼
       │                          PROVISIONING
       │                           │       │
       │            [success]◄─────┘       └─────►[failed]
       │                │                            │
       ▼                ▼                            ▼
   CANCELED          ACTIVE                       FAILED

Valid Transitions:
- PENDING_PAYMENT → PAID (admin override)
- PENDING_PAYMENT → CANCELED (admin/future: user)
- PAID → PROVISIONING (automatic)
- PROVISIONING → ACTIVE (system)
- PROVISIONING → FAILED (system)
```

## 11. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Order creation success rate | ≥99% | Orders created / API calls |
| Provisioning success rate | ≥95% | Droplets ACTIVE / Orders PAID |
| Avg provisioning time | <3 minutes | Time from PAID to ACTIVE |
| Zero hardcoded prices | 100% | Code review & audit |
| API response time (p95) | <500ms | Monitoring |

## 12. Timeline (3-4 Weeks)

| Week | Deliverables |
|------|--------------|
| 1 | Project setup, Prisma schema, basic CRUD, catalog integration |
| 2 | Payment mock endpoint, provisioning trigger, DO API integration |
| 3 | Async polling, full metadata storage, user APIs, error handling |
| 4 | Admin APIs, integration testing, documentation, bug fixes |

## 13. Open Questions

1. **Droplet naming convention**: `vps-{orderId}` atau format lain yang lebih user-friendly?
2. ~~**Region selection**: User pilih region atau auto-select berdasarkan image availability?~~ → **RESOLVED**: v1 menggunakan `DIGITALOCEAN_DEFAULT_REGION` dari env. User tidak pilih region.
3. **Credential rotation**: Bagaimana handle jika DO API token perlu di-rotate?
4. **Rate limiting**: Perlu rate limit untuk order creation per user?
5. **Webhook consideration**: Apakah v1.1 perlu webhook untuk notify status change ke service lain?

### Resolved in This Version

| Question | Resolution |
|----------|------------|
| PlanDuration support | v1 hanya MONTHLY & ANNUAL. QUARTERLY/SEMI_ANNUAL disiapkan untuk v2. |
| Source of truth harga | Catalog-service menghitung semua diskon. Order-service hanya menyimpan snapshot. |
| Region selection | v1 menggunakan default region dari env, bukan user selection. |
| Failed droplet cleanup | Out of scope v1. Tidak ada auto-delete droplet saat FAILED. |
| Error response format | Mengikuti envelope auth-service: `{ "error": { "code", "message", "details?" } }` |

---

**Document Version**: 1.1  
**Created**: 2024-01-15  
**Last Updated**: 2024-11-29  
**Author**: System  
**Status**: Ready for Implementation
