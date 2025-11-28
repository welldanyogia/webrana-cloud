# PRD – Product & Plan Catalog (VPS Packages) v1.0

## 1. Tujuan

Menyediakan katalog paket VPS yang:

- Terstruktur dan gampang di-query (untuk web, bot, marketplace).
- Bisa di-manage lewat Admin API (CRUD).
- Aman: tidak leak info sensitif (misal harga modal DO bisa disembunyikan dari public API).
- Siap diintegrasikan dengan modul Order & Provisioning.
- **Support Multi-duration**: Harga bulanan, tahunan, dll.
- **Support Dynamic Promo**: Diskon terjadwal per paket.
- **Support Global Coupons**: Kode voucher saat checkout.
- **Dynamic Image Selection**: Pilihan OS/App yang terkurasi.

---

## 2. Scope v1.0

### 2.1. Entity Utama

1.  **VpsPlan**: Produk utama (misal: "VPS Starter").
2.  **PlanPricing**: Variasi harga berdasarkan durasi (Monthly, Yearly).
3.  **PlanPromo**: Diskon/promo otomatis per plan.
4.  **Coupon**: Kode voucher global/spesifik.
5.  **VpsImage**: Katalog OS/App images (Ubuntu, CentOS, WordPress).

### 2.2. Field yang dibutuhkan

#### A. VpsPlan (Parent)
- `id` (string, cuid)
- `code` (string, unique)
- `name` (string)
- `slug` (string, unique)
- **Spesifikasi**: `cpu`, `memoryMb`, `diskGb`, `bandwidthTb`
- **Provider Mapping**:
  - `provider` (string)
  - `providerSizeSlug` (string)
  - *Note: `providerImageSlug` dipindah ke VpsImage*
- **Meta**: `isActive`, `sortOrder`, `tags`

#### B. PlanPricing (Child)
- `id`, `planId`
- `duration` (MONTHLY, YEARLY)
- `price` (IDR), `cost` (IDR)

#### C. PlanPromo (Child)
- `id`, `planId`
- `name`, `discountType` (PERCENT/FIXED), `discountValue`
- `startDate`, `endDate`

#### D. Coupon (New)
- `id` (string, cuid)
- `code` (string, unique, uppercase)
- `description` (string?)
- `discountType` (PERCENT/FIXED)
- `discountValue` (int)
- `startAt` (DateTime), `endAt` (DateTime)
- `isActive` (boolean)
- **Limits**:
  - `maxTotalRedemptions` (int?) – Global limit.
  - `maxRedemptionsPerUser` (int?) – Limit per user.

#### E. VpsImage (New)
- `id` (string, cuid)
- `provider` (string) – mis: "digitalocean"
- `providerSlug` (string) – mis: "ubuntu-22-04-x64"
- `displayName` (string) – mis: "Ubuntu 22.04 LTS"
- `category` (string?) – "linux", "panel", "app"
- `isActive` (boolean)

---

## 3. Database (Prisma)

### 3.1. Model Prisma

Update `prisma/schema.prisma`:

```prisma
enum PlanDuration {
  MONTHLY
  YEARLY
}

enum DiscountType {
  PERCENT   // diskon persen
  FIXED     // diskon nominal
}

model VpsPlan {
  id               String    @id @default(cuid())
  code             String    @unique
  name             String
  slug             String    @unique
  description      String?
  
  // Specs
  cpu              Int
  memoryMb         Int
  diskGb           Int
  bandwidthTb      Float?

  // Provider Mapping
  provider         String    // e.g. "digitalocean"
  providerSizeSlug String    // e.g. "s-1vcpu-2gb"

  // Relations
  pricings         PlanPricing[]
  promos           PlanPromo[]
  allowedImages    VpsPlanImage[] // Optional restriction

  // Meta
  isActive         Boolean   @default(true)
  sortOrder        Int       @default(100)
  tags             String[]  @default([])

  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}

model PlanPricing {
  id        String        @id @default(cuid())
  planId    String
  plan      VpsPlan       @relation(fields: [planId], references: [id], onDelete: Cascade)

  duration  PlanDuration  // "MONTHLY", "YEARLY"
  price     Int           // IDR
  cost      Int           // IDR

  isActive  Boolean       @default(true)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  @@unique([planId, duration])
}

model PlanPromo {
  id            String        @id @default(cuid())
  planId        String
  plan          VpsPlan       @relation(fields: [planId], references: [id], onDelete: Cascade)
  name          String
  discountType  DiscountType  // "PERCENT", "FIXED"
  discountValue Int
  startDate     DateTime
  endDate       DateTime?
  isActive      Boolean       @default(true)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

// --- New: Coupons ---

model Coupon {
  id                    String        @id @default(cuid())
  code                  String        @unique
  description           String?
  discountType          DiscountType  // "PERCENT", "FIXED"
  discountValue         Int

  startAt               DateTime
  endAt                 DateTime?     // null = no end date
  isActive              Boolean       @default(true)

  maxTotalRedemptions   Int?
  maxRedemptionsPerUser Int?

  plans                 CouponPlan[]
  users                 CouponUser[]
  redemptions           CouponRedemption[]

  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
}

model CouponPlan {
  id       String  @id @default(cuid())
  couponId String
  planId   String
  coupon   Coupon  @relation(fields: [couponId], references: [id], onDelete: Cascade)
  plan     VpsPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  @@unique([couponId, planId])
}

model CouponUser {
  id       String @id @default(cuid())
  couponId String
  userId   String
  coupon   Coupon @relation(fields: [couponId], references: [id], onDelete: Cascade)
  // Assumes User model exists
  user     User   @relation(fields: [userId], references: [id]) 
  @@unique([couponId, userId])
}

model CouponRedemption {
  id         String   @id @default(cuid())
  couponId   String
  userId     String
  orderId    String   // Can be relation to Order model if preferred
  coupon     Coupon   @relation(fields: [couponId], references: [id])
  user       User     @relation(fields: [userId], references: [id])
  redeemedAt DateTime @default(now())
}

// --- New: Images ---

model VpsImage {
  id           String        @id @default(cuid())
  provider     String        // "digitalocean"
  providerSlug String        // "ubuntu-22-04-x64"
  displayName  String        // "Ubuntu 22.04 LTS"
  category     String?       // "linux", "panel", "app"
  isActive     Boolean       @default(true)

  plans        VpsPlanImage[]

  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@index([provider, providerSlug])
}

model VpsPlanImage {
  id      String   @id @default(cuid())
  planId  String
  imageId String

  plan    VpsPlan  @relation(fields: [planId], references: [id], onDelete: Cascade)
  image   VpsImage @relation(fields: [imageId], references: [id], onDelete: Cascade)

  @@unique([planId, imageId])
}
```

---

## 4. API Design

### 4.1. Admin API

1.  **Manage Coupons**
    *   `POST /api/v1/admin/coupons`
    *   `GET /api/v1/admin/coupons`
    *   `PATCH /api/v1/admin/coupons/:id` (Deactivate, update limits)

2.  **Manage Images**
    *   `POST /api/v1/admin/vps-images`
    *   `GET /api/v1/admin/vps-images`

3.  **Plan Image Restriction**
    *   `POST /api/v1/admin/vps-plans/:id/images` (Link image to plan)
    *   `DELETE /api/v1/admin/vps-plans/:id/images/:imageId`

### 4.2. Public Catalog API

1.  **List Images**
    *   `GET /api/v1/catalog/vps-images`
    *   Query: `planId?` (If provided, return only allowed images for that plan. If not, return all active global images).

2.  **Validate Coupon**
    *   `POST /api/v1/catalog/coupons/validate`
    *   Body: `{ code, planId?, userId? }`
    *   Response: `{ valid: true, discountAmount: ..., finalPrice: ... }` or `{ valid: false, reason: "EXPIRED" }`

### 4.3. Coupon Validation Logic (`validateCoupon`)

**Steps:**

1.  **Find coupon by code (case-insensitive)**
    *   If not found → `valid = false`, reason: `"NOT_FOUND"`.

2.  **Status & Date Check**
    *   If `isActive = false` → `valid = false`, reason: `"INACTIVE"`.
    *   If `now < startAt` → `valid = false`, reason: `"NOT_STARTED"`.
    *   If `endAt != null` AND `now > endAt` → `valid = false`, reason: `"EXPIRED"`.

3.  **Plan Restriction**
    *   If `CouponPlan` is **empty** → valid for all plans.
    *   If **not empty** AND `planId` is NOT in the list → `valid = false`, reason: `"PLAN_NOT_ELIGIBLE"`.

4.  **User Restriction**
    *   If `CouponUser` is **empty** → valid for all users.
    *   If **not empty** AND `userId` is NOT in the list → `valid = false`, reason: `"USER_NOT_ELIGIBLE"`.

5.  **Usage Limits**
    *   **Global**: Count `CouponRedemption` where `couponId = ...`.
        *   If `maxTotalRedemptions != null` AND count >= max → `valid = false`, reason: `"MAX_REDEMPTIONS_REACHED"`.
    *   **Per User**: Count `CouponRedemption` where `couponId = ...` AND `userId = ...`.
        *   If `maxRedemptionsPerUser != null` AND count >= max → `valid = false`, reason: `"MAX_PER_USER_REACHED"`.

6.  **Calculate Discount**
    *   If `discountType = PERCENT`: `discountAmount = floor(orderAmount * discountValue / 100)`.
    *   If `discountType = FIXED`: `discountAmount = min(discountValue, orderAmount)`.

7.  **Return**
    *   `valid = true`, `discountAmount`, `finalPrice = orderAmount - discountAmount`.

---

## 6. Task Breakdown

### Task 0.0 – Database
*   [ ] Update `schema.prisma` with `PlanDuration`, `DiscountType` enums and all new models.
*   [ ] Migration: `npx prisma migrate dev --name add_catalog_full`.
*   [ ] Seed: Add default images (Ubuntu 22.04, CentOS 7) and 1 global coupon.

### Task 1.0 – Catalog Module (Plans & Images)
*   [ ] `VpsPlanService`: Add logic for `VpsPlanImage` relation.
*   [ ] `VpsImageService`: CRUD for images.
*   [ ] `CatalogController`: Add `getImages` endpoint.

### Task 2.0 – Coupon Module
*   [ ] `CouponService`:
    *   CRUD.
    *   `validateCoupon(code, user, plan, orderAmount)`: Implement the 7-step logic defined above.
    *   `redeemCoupon(code, user, orderId)`: Record redemption transactionally.

### Task 3.0 – Admin API
*   [ ] Endpoints for Coupons and Images.

### Task 4.0 – Testing
*   [ ] Unit test `CouponService`:
    *   Test expiry, max redemptions (global & user), plan restrictions.
*   [ ] Integration test: Full checkout flow simulation (Validate -> Redeem).
