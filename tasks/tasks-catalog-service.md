# Tasks: Product & Plan Catalog Service (v1.0)

## Repo Context

- Monorepo Nx
- Service baru: `apps/catalog-service`
- Tech stack:
  - NestJS (HTTP REST)
  - PostgreSQL + Prisma
  - Jest + Testcontainers (Postgres) untuk integration test

## Relevant Paths (Target)

- `apps/catalog-service/prisma/schema.prisma`          ← schema DB khusus catalog
- `apps/catalog-service/prisma/seed.ts`                ← seed default plans/images/coupons
- `apps/catalog-service/src/main.ts`                   ← bootstrap Nest app
- `apps/catalog-service/src/app/app.module.ts`         ← root module
- `apps/catalog-service/src/modules/catalog/...`       ← modul VPS Plan & Images
- `apps/catalog-service/src/modules/coupon/...`        ← modul Coupons
- `apps/catalog-service/test/helpers/test-app.ts`      ← helper bikin TestingModule (mirip main.ts)
- `apps/catalog-service/test/integration/catalog.integration.spec.ts`
- `apps/catalog-service/test/integration/coupon.integration.spec.ts`
- `apps/catalog-service/test/integration/admin-catalog.integration.spec.ts`

> Catatan: `auth-service` tetap jalan sendiri dan **tidak diubah** untuk fitur catalog ini.

---

## 0.0 Create catalog-service app

- [ ] 0.1 Create feature branch
  - `git checkout -b feature/catalog-service-v1`

- [ ] 0.2 Generate Nest app via Nx
  - `npx nx g @nrwl/nest:application catalog-service`
  - Pastikan output path jadi `apps/catalog-service`

- [ ] 0.3 Tambah Prisma di catalog-service
  - Folder: `apps/catalog-service/prisma/`
    - `schema.prisma`
    - optional: `.env` khusus catalog-service (kalau mau DB terpisah)

---

## 1.0 Database Schema & Migration (Catalog Service)

> Semua model di bawah ini ada di **schema.prisma milik catalog-service**, bukan auth-service.

- [ ] 1.1 Tambah model `VpsPlan`, `PlanPricing`, `PlanPromo`

- [ ] 1.2 Tambah model `Coupon`, `CouponPlan`, `CouponUser`, `CouponRedemption`

- [ ] 1.3 Tambah model `VpsImage`, `VpsPlanImage`

- [ ] 1.4 Tambah enums:
  - `PlanDuration` = `MONTHLY`, `YEARLY`
  - `DiscountType` = `PERCENT`, `FIXED`

- [ ] 1.5 Jalankan migration & generate
  ```bash
  cd apps/catalog-service
  npx prisma migrate dev --name init_catalog
  npx prisma generate
  ```

- [ ] 1.6 Seed script `prisma/seed.ts`
  - Minimal:
    - 2–3 VpsPlan + PlanPricing (MONTHLY & YEARLY)
    - Beberapa VpsImage (Ubuntu, Debian)
    - 1 sample Coupon aktif

---

## 2.0 Catalog Module Implementation (VpsPlan & VpsImage)

- [ ] 2.1 Buat module `CatalogModule`
  - File: `src/modules/catalog/catalog.module.ts`

- [ ] 2.2 `VpsImageService`
  - File: `src/modules/catalog/vps-image.service.ts`
  - Fitur:
    - CRUD basic (untuk Admin)
    - Public list (filter `isActive = true`)

- [ ] 2.3 `VpsPlanService`
  - File: `src/modules/catalog/vps-plan.service.ts`
  - Fitur:
    - CRUD Plan
    - Manage `PlanPricing` & `PlanPromo` (nested create/update)
    - Relasi `VpsPlanImage` ke `VpsImage`
    - Helper:
      - `getActivePlans()` dengan:
        - join pricing (duration)
        - apply promo aktif (PlanPromo dengan date & isActive)

- [ ] 2.4 Public `CatalogController`
  - File: `src/modules/catalog/catalog.controller.ts`
  - Endpoint minimal:
    - `GET /api/v1/catalog/plans`
      - return list plan aktif + pricing + promo aktif
    - `GET /api/v1/catalog/images`
      - query: `planId?`
      - kalau ada `planId` → hanya gambar yang diizinkan untuk plan tsb
      - kalau tidak → semua `VpsImage.isActive = true`

- [ ] 2.5 Wiring di `AppModule`
  - File: `src/app/app.module.ts`
  - Import:
    - `CatalogModule`
    - `PrismaModule` (kalau pakai pattern sama seperti auth-service)

---

## 3.0 Coupon Module Implementation

- [ ] 3.1 Buat `CouponModule`
  - File: `src/modules/coupon/coupon.module.ts`

- [ ] 3.2 `CouponService` (CRUD + core logic)
  - File: `src/modules/coupon/coupon.service.ts`
  - Fungsi:
    - `create/update/deactivate` coupon
    - `validateCoupon(code, userId?, planId?, amount)`:
      - cek:
        - `isActive`
        - `startAt <= now <= endAt`
        - restriction plan (`CouponPlan`) kalau ada
        - restriction user (`CouponUser`) kalau ada
        - limit global (`maxTotalRedemptions`)
        - limit per user (`maxRedemptionsPerUser`)
      - hitung:
        - `discountAmount`
        - `finalPrice`
    - `redeemCoupon(code, userId, orderId)`:
      - transaksi:
        - insert `CouponRedemption`
        - dipakai untuk hitung usage berikutnya

- [ ] 3.3 Public `CouponController`
  - File: `src/modules/coupon/coupon.controller.ts`
  - Endpoint:
    - `POST /api/v1/catalog/coupons/validate`
      - body: `{ code, planId?, userId?, amount }`
      - response:
        - success: `{ valid: true, discountAmount, finalPrice, coupon: {...} }`
        - fail: `{ valid: false, reason: 'EXPIRED' | 'NOT_FOUND' | 'LIMIT_REACHED' | ... }`

---

## 4.0 Admin API Implementation

> Guarding (role ADMIN / API key) bisa diset belakangan, minimal endpoint dulu.

- [ ] 4.1 `AdminCatalogController`
  - File: `src/modules/catalog/admin-catalog.controller.ts`
  - Endpoint:
    - CRUD `VpsPlan` (+ nested pricing & promo)
    - CRUD `VpsImage`
    - manage mapping:
      - `POST /api/v1/admin/catalog/plans/:id/images`
      - `DELETE /api/v1/admin/catalog/plans/:id/images/:imageId`

- [ ] 4.2 `AdminCouponController`
  - File: `src/modules/coupon/admin-coupon.controller.ts`
  - Endpoint:
    - CRUD `Coupon`
    - manage `CouponPlan` mapping
    - manage `CouponUser` mapping
    - list redemptions (optional)

---

## 5.0 Testing & Verification (Catalog Service)

> Pola test mirip auth-service: Jest + Testcontainers.

- [ ] 5.1 Setup Test Helpers
  - `test/helpers/test-database.ts` (boleh copy dari auth-service & adapt)
  - `test/helpers/test-app.ts`
    - create Nest TestingModule dari `AppModule`
    - apply global pipes & filters seperlunya (boleh lebih sederhana dari auth-service)

- [ ] 5.2 `catalog.integration.spec.ts`
  - Test:
    - `GET /catalog/plans`:
      - hanya plan `isActive = true`
      - promo aktif dihitung benar
    - `GET /catalog/images`:
      - tanpa `planId` → semua active images
      - dengan `planId` → hanya images yang ter-link

- [ ] 5.3 `coupon.integration.spec.ts`
  - Test validasi coupon:
    - success case
    - expired
    - belum mulai (startAt > now)
    - limit global tercapai
    - limit per user tercapai
    - restricted ke plan tertentu
    - restricted ke user tertentu

- [ ] 5.4 `admin-catalog.integration.spec.ts` (optional tapi bagus)
  - CRUD plan + pricing + promo
  - Link/unlink images ke plan

- [ ] 5.5 Run full test suite:
  ```bash
  npx nx test catalog-service
  ```
