# Tasks: Product & Plan Catalog (v1.0)

## Relevant Files

- `apps/auth-service/prisma/schema.prisma` - Database schema definitions.
- `apps/auth-service/src/modules/catalog/catalog.module.ts` - Module definition for Catalog.
- `apps/auth-service/src/modules/catalog/vps-plan.service.ts` - Service for managing VPS Plans, Pricing, and Promos.
- `apps/auth-service/src/modules/catalog/vps-image.service.ts` - Service for managing VPS Images.
- `apps/auth-service/src/modules/catalog/catalog.controller.ts` - Public API for Catalog.
- `apps/auth-service/src/modules/catalog/admin-catalog.controller.ts` - Admin API for Catalog.
- `apps/auth-service/src/modules/coupon/coupon.module.ts` - Module definition for Coupons.
- `apps/auth-service/src/modules/coupon/coupon.service.ts` - Service for Coupon validation and redemption.
- `apps/auth-service/src/modules/coupon/coupon.controller.ts` - Public API for Coupons.
- `apps/auth-service/src/modules/coupon/admin-coupon.controller.ts` - Admin API for Coupons.
- `apps/auth-service/test/integration/catalog.integration.spec.ts` - Integration tests for Catalog.
- `apps/auth-service/test/integration/coupon.integration.spec.ts` - Integration tests for Coupons.

### Notes

- Use `npx nx test auth-service` to run tests.
- Ensure all new endpoints are protected by appropriate guards (Admin vs Public).

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Create and checkout a new branch for this feature (e.g., `git checkout -b feature/product-plan-catalog`)

- [ ] 1.0 Database Schema & Migration
  - [ ] 1.1 Update `prisma/schema.prisma` with `VpsPlan`, `PlanPricing`, `PlanPromo` models
  - [ ] 1.2 Update `prisma/schema.prisma` with `Coupon`, `CouponPlan`, `CouponUser`, `CouponRedemption` models
  - [ ] 1.3 Update `prisma/schema.prisma` with `VpsImage`, `VpsPlanImage` models
  - [ ] 1.4 Generate migration `npx prisma migrate dev --name add_catalog_full`
  - [ ] 1.5 Create/Update seed script `prisma/seed.ts` with default images and plans

- [ ] 2.0 Catalog Module Implementation
  - [ ] 2.1 Generate module `nest g module modules/catalog`
  - [ ] 2.2 Create `VpsImageService` (CRUD for images)
  - [ ] 2.3 Create `VpsPlanService` (CRUD for plans, handle relations with Pricing/Promo/Images)
  - [ ] 2.4 Create `CatalogController` (Public API: list plans, list images)
  - [ ] 2.5 Implement `getPlans` with active promo calculation logic
  - [ ] 2.6 Implement `getImages` with plan filtering logic

- [ ] 3.0 Coupon Module Implementation
  - [ ] 3.1 Generate module `nest g module modules/coupon`
  - [ ] 3.2 Create `CouponService` (CRUD)
  - [ ] 3.3 Implement `validateCoupon` logic (check dates, limits, plan/user restrictions)
  - [ ] 3.4 Implement `redeemCoupon` logic (transactional, update counts)
  - [ ] 3.5 Create `CouponController` (Public: validate endpoint)

- [ ] 4.0 Admin API Implementation
  - [ ] 4.1 Create `AdminCatalogController`
  - [ ] 4.2 Implement endpoints for managing Plans (Deep insert/update)
  - [ ] 4.3 Implement endpoints for managing Images
  - [ ] 4.4 Create `AdminCouponController`
  - [ ] 4.5 Implement endpoints for managing Coupons

- [ ] 5.0 Testing & Verification
  - [ ] 5.1 Create `catalog.integration.spec.ts` (Public API tests)
  - [ ] 5.2 Create `coupon.integration.spec.ts` (Validation & Redemption tests)
  - [ ] 5.3 Create `admin-catalog.integration.spec.ts` (CRUD tests)
  - [ ] 5.4 Run full test suite `npx nx test auth-service`
