# Tasks: VPS Order & Provisioning Service v1.0

> Generated from: `prd-vps-order-provisioning-service-v1-0.md`

## Relevant Files

### Core Application

- `apps/order-service/src/main.ts` - Application entry point with global config
- `apps/order-service/src/app/app.module.ts` - Root module importing all feature modules
- `apps/order-service/src/app/app.controller.ts` - Health check endpoint
- `apps/order-service/.env` - Environment variables (DATABASE_URL, DO token, etc.)
- `apps/order-service/.env.example` - Environment template

### Prisma & Database

- `apps/order-service/prisma/schema.prisma` - Database schema (Order, OrderItem, ProvisioningTask, StatusHistory)
- `apps/order-service/prisma/seed.ts` - Seed script for development data
- `apps/order-service/src/prisma/prisma.module.ts` - Prisma module
- `apps/order-service/src/prisma/prisma.service.ts` - Prisma service wrapper

### Catalog Client Module

- `apps/order-service/src/modules/catalog-client/catalog-client.module.ts` - HTTP client module for catalog-service
- `apps/order-service/src/modules/catalog-client/catalog-client.service.ts` - Methods: getPlanById, getImageById, validateCoupon
- `apps/order-service/src/modules/catalog-client/catalog-client.service.spec.ts` - Unit tests

### Order Module

- `apps/order-service/src/modules/order/order.module.ts` - Order feature module
- `apps/order-service/src/modules/order/order.service.ts` - Core order logic, state machine
- `apps/order-service/src/modules/order/order.service.spec.ts` - Unit tests
- `apps/order-service/src/modules/order/order.controller.ts` - User APIs (POST/GET /api/v1/orders)
- `apps/order-service/src/modules/order/internal-order.controller.ts` - Admin APIs (/internal/orders)
- `apps/order-service/src/modules/order/dto/create-order.dto.ts` - Create order request DTO
- `apps/order-service/src/modules/order/dto/order-response.dto.ts` - Order response DTO
- `apps/order-service/src/modules/order/dto/update-payment-status.dto.ts` - Payment status update DTO
- `apps/order-service/src/modules/order/dto/index.ts` - DTO barrel export

### Provisioning Module

- `apps/order-service/src/modules/provisioning/provisioning.module.ts` - Provisioning feature module
- `apps/order-service/src/modules/provisioning/provisioning.service.ts` - Provisioning orchestration, polling logic
- `apps/order-service/src/modules/provisioning/provisioning.service.spec.ts` - Unit tests
- `apps/order-service/src/modules/provisioning/digitalocean-client.service.ts` - DigitalOcean API wrapper
- `apps/order-service/src/modules/provisioning/digitalocean-client.service.spec.ts` - Unit tests

### Auth & Guards

- `apps/order-service/src/common/guards/jwt-auth.guard.ts` - JWT validation guard
- `apps/order-service/src/common/guards/api-key.guard.ts` - Internal API key guard
- `apps/order-service/src/common/decorators/current-user.decorator.ts` - Extract user from JWT

### Error Handling

- `apps/order-service/src/common/exceptions/index.ts` - Custom exceptions barrel
- `apps/order-service/src/common/exceptions/order.exceptions.ts` - Order-related exceptions
- `apps/order-service/src/common/exceptions/provisioning.exceptions.ts` - Provisioning exceptions
- `apps/order-service/src/common/filters/http-exception.filter.ts` - Global exception filter

### Integration Tests

- `apps/order-service/test/helpers/test-database.ts` - Testcontainers setup
- `apps/order-service/test/helpers/mock-catalog-service.ts` - Mock catalog responses
- `apps/order-service/test/integration/order.integration.spec.ts` - Order creation & retrieval tests
- `apps/order-service/test/integration/payment.integration.spec.ts` - Payment status tests
- `apps/order-service/test/integration/provisioning.integration.spec.ts` - Provisioning flow tests
- `apps/order-service/test/integration/admin.integration.spec.ts` - Admin API tests

### Documentation

- `apps/order-service/README.md` - Service documentation

### Notes

- Follow NestJS + Prisma + Jest + Testcontainers pattern from catalog-service
- Unit tests placed alongside code files (e.g., `order.service.ts` and `order.service.spec.ts`)
- Use `npx nx test order-service` to run tests
- Use `npx nx serve order-service` to run development server
- Integration tests use Testcontainers for PostgreSQL
- Mock DigitalOcean API in tests (do not call real API)

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:

- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

---

## Tasks

### Week 1: Foundation

- [x] 0.0 Create feature branch
  - [x] 0.1 Checkout from main/develop: `git checkout -b feature/order-service-v1`

- [x] 1.0 Project Setup & Configuration
  - [x] 1.1 Generate NestJS app using Nx: `npx nx g @nx/nest:app order-service`
  - [x] 1.2 Install dependencies: `@nestjs/axios`, `axios`, `@nestjs/config`, `class-validator`, `class-transformer`
  - [x] 1.3 Create `.env.example` with all required environment variables from PRD Section 10.2
  - [x] 1.4 Create `.env` for local development (copy from .env.example)
  - [x] 1.5 Configure `AppModule` with `ConfigModule.forRoot({ isGlobal: true })`
  - [x] 1.6 Setup `main.ts` with global prefix `/api/v1`, validation pipe, and port from env
  - [x] 1.7 Verify app starts: `npx nx serve order-service`

- [x] 2.0 Database Schema & Prisma Setup
  - [x] 2.1 Initialize Prisma: `cd apps/order-service && npx prisma init`
  - [x] 2.2 Create enums: `OrderStatus`, `PlanDuration`, `ItemType`, `ProvisioningStatus`
  - [x] 2.3 Create `Order` model with all fields from PRD Section 5.1
  - [x] 2.4 Create `OrderItem` model with relation to Order
  - [x] 2.5 Create `ProvisioningTask` model with all droplet metadata fields
  - [x] 2.6 Create `StatusHistory` model for audit logging
  - [x] 2.7 Run migration: `npx prisma migrate dev --name init` *(docker-compose.yml added)*
  - [x] 2.8 Create `PrismaModule` and `PrismaService` (copy pattern from catalog-service)
  - [x] 2.9 Create `seed.ts` with sample order data for testing
  - [x] 2.10 Test seed: `npx prisma db seed` *(3 orders created successfully)*

- [x] 3.0 Catalog Service Integration Module
  - [x] 3.1 Create `CatalogClientModule` with `HttpModule.registerAsync()`
  - [x] 3.2 Create `CatalogClientService` with injected `HttpService`
  - [x] 3.3 Implement `getPlanById(planId: string)` - calls `GET /api/v1/catalog/plans/{id}`
  - [x] 3.4 Implement `getImageById(imageId: string)` - calls `GET /api/v1/catalog/images/{id}`
  - [x] 3.5 Implement `validateCoupon(dto: ValidateCouponDto)` - calls `POST /api/v1/catalog/coupons/validate`
  - [x] 3.6 Add error handling: throw `CatalogServiceUnavailableException` on connection failure
  - [x] 3.7 Add timeout configuration from env: `CATALOG_SERVICE_TIMEOUT_MS`
  - [x] 3.8 Write unit tests for `CatalogClientService` (mock HttpService)

### Week 2: Core Order & Payment Flow

- [x] 4.0 Order Module - Core CRUD & State Machine
  - [x] 4.1 Create `OrderModule` importing `PrismaModule` and `CatalogClientModule`
  - [x] 4.2 Create `OrderService` with injected `PrismaService` and `CatalogClientService`
  - [x] 4.3 Implement `createOrder(userId, dto)`:
    - [x] 4.3.1 Fetch plan from catalog-service, validate active
    - [x] 4.3.2 Fetch image from catalog-service, validate available
    - [x] 4.3.3 If couponCode provided, validate via catalog-service
    - [x] 4.3.4 Calculate pricing snapshot (basePrice, promoDiscount, couponDiscount, finalPrice)
    - [x] 4.3.5 Create Order with status `PENDING_PAYMENT`
    - [x] 4.3.6 Create OrderItem(s) for plan
    - [x] 4.3.7 Record initial StatusHistory
  - [x] 4.4 Implement `getOrderById(orderId, userId?)` with optional ownership check
  - [x] 4.5 Implement `getOrdersByUserId(userId, pagination)` with filtering
  - [x] 4.6 Implement `updateOrderStatus(orderId, newStatus, actor)` with state machine validation
  - [x] 4.7 Create state machine validator: define valid transitions per PRD Section 10.4
  - [x] 4.8 Implement `recordStatusHistory(orderId, prevStatus, newStatus, actor, reason?)`
  - [x] 4.9 Create DTOs: `CreateOrderDto`, `OrderResponseDto`, `OrderListResponseDto`, `PaginationQueryDto`
  - [x] 4.10 Write unit tests for `OrderService`

- [x] 5.0 Payment Module - Mock Payment Override
  - [x] 5.1 Add payment methods to `OrderService` (or create separate `PaymentService`)
  - [x] 5.2 Implement `updatePaymentStatus(orderId, status, actor, notes?)`:
    - [x] 5.2.1 Validate current status is `PENDING_PAYMENT`
    - [x] 5.2.2 If status = `PAID`: update order, set `paidAt`, record history
    - [x] 5.2.3 If status = `PAYMENT_FAILED`: update order, record history
    - [x] 5.2.4 Throw `PaymentStatusConflictException` if invalid transition
  - [x] 5.3 Create `UpdatePaymentStatusDto` with validation
  - [x] 5.4 Wire provisioning trigger: after `PAID`, call `ProvisioningService.startProvisioning()`
  - [x] 5.5 Write unit tests for payment status flow

### Week 3: Provisioning & User APIs

- [x] 6.0 Provisioning Module - DigitalOcean Integration
  - [x] 6.1 Create `ProvisioningModule` importing `PrismaModule`
  - [x] 6.2 Create `DigitalOceanClientService` with axios instance
  - [x] 6.3 Implement `createDroplet(config)` - POST to DO API `/v2/droplets`
  - [x] 6.4 Implement `getDroplet(dropletId)` - GET from DO API `/v2/droplets/{id}`
  - [x] 6.5 Add DO API error handling and response mapping
  - [x] 6.6 Create `ProvisioningService` with injected `PrismaService` and `DigitalOceanClientService`
  - [x] 6.7 Implement `startProvisioning(orderId)`:
    - [x] 6.7.1 Get order and plan details
    - [x] 6.7.2 Create ProvisioningTask with status `PENDING`
    - [x] 6.7.3 Update order status to `PROVISIONING`
    - [x] 6.7.4 Call DO API to create droplet
    - [x] 6.7.5 Save initial droplet metadata (dropletId, name)
    - [x] 6.7.6 Update task status to `IN_PROGRESS`
    - [x] 6.7.7 Start async polling (non-blocking)
  - [x] 6.8 Implement `pollDropletStatus(taskId, dropletId)`:
    - [x] 6.8.1 Loop with interval from env `PROVISIONING_POLL_INTERVAL_MS` (default 5000)
    - [x] 6.8.2 Max attempts from env `PROVISIONING_MAX_ATTEMPTS` (default 60)
    - [x] 6.8.3 On each poll: update droplet metadata in DB
    - [x] 6.8.4 If droplet status = `active`: call `markProvisioningSuccess()`
    - [x] 6.8.5 If droplet status = `errored`: call `markProvisioningFailed()`
    - [x] 6.8.6 If max attempts reached: call `markProvisioningFailed()` with timeout
  - [x] 6.9 Implement `markProvisioningSuccess(taskId)`: update task to `SUCCESS`, order to `ACTIVE`
  - [x] 6.10 Implement `markProvisioningFailed(taskId, errorCode, errorMessage)`: update task to `FAILED`, order to `FAILED`
  - [x] 6.11 Write unit tests for `ProvisioningService` (mock DO client)
  - [x] 6.12 Write unit tests for `DigitalOceanClientService` (mock axios)

- [x] 7.0 User APIs (JWT Protected)
  - [x] 7.1 Create `JwtAuthGuard` that validates JWT using public key from env
  - [x] 7.2 Create `@CurrentUser()` decorator to extract userId from JWT payload
  - [x] 7.3 Create `OrderController` with route prefix `orders`
  - [x] 7.4 Implement `POST /api/v1/orders`:
    - [x] 7.4.1 Apply `@UseGuards(JwtAuthGuard)`
    - [x] 7.4.2 Get userId from `@CurrentUser()`
    - [x] 7.4.3 Validate request body with `CreateOrderDto`
    - [x] 7.4.4 Call `OrderService.createOrder()`
    - [x] 7.4.5 Return 201 with order data
  - [x] 7.5 Implement `GET /api/v1/orders`:
    - [x] 7.5.1 Apply `@UseGuards(JwtAuthGuard)`
    - [x] 7.5.2 Accept query params: `page`, `limit`, `status`
    - [x] 7.5.3 Call `OrderService.getOrdersByUserId()`
    - [x] 7.5.4 Return paginated response with meta
  - [x] 7.6 Implement `GET /api/v1/orders/:id`:
    - [x] 7.6.1 Apply `@UseGuards(JwtAuthGuard)`
    - [x] 7.6.2 Validate ownership (userId must match order.userId)
    - [x] 7.6.3 Include ProvisioningTask data in response
    - [x] 7.6.4 Throw `OrderAccessDeniedException` if not owner
  - [x] 7.7 Write integration tests for user endpoints

### Week 3 Revision: Config Alignment

- [x] 7.8 Currency & JWT Config Alignment
  - [x] 7.8.1 Fix currency default to IDR (not USD) in all test files
  - [x] 7.8.2 Update JwtAuthGuard: RS256 + PUBLIC_KEY as default (production)
  - [x] 7.8.3 Support HS256 + SECRET for development only
  - [x] 7.8.4 Update `.env.example` with JWT documentation
  - [x] 7.8.5 Add RS256 test cases to `jwt-auth.guard.spec.ts`
  - [x] 7.8.6 Update PRD Section 4.8 with JWT implementation notes

- [x] 7.9 Align success response envelope (user APIs) to `{ data: ... }`
  - [x] 7.9.1 Update `POST /api/v1/orders` response to `{ data: {...} }`
  - [x] 7.9.2 Update `GET /api/v1/orders/:id` response to `{ data: {...} }`
  - [x] 7.9.3 Verify `GET /api/v1/orders` already uses `{ data: [...], meta: {...} }`
  - [x] 7.9.4 Update unit tests to verify `data` property exists

### Week 4: Admin APIs & Testing

- [x] 8.0 Admin/Internal APIs
  - [x] 8.1 Create `ApiKeyGuard` that validates `X-API-Key` header against env `INTERNAL_API_KEY`
  - [x] 8.2 Create `InternalOrderController` with route prefix `internal/orders`
  - [x] 8.3 Implement `POST /internal/orders/:id/payment-status`:
    - [x] 8.3.1 Apply `@UseGuards(ApiKeyGuard)`
    - [x] 8.3.2 Validate request body with `UpdatePaymentStatusDto`
    - [x] 8.3.3 Call `PaymentService.updatePaymentStatus()`
    - [x] 8.3.4 Return updated order data
  - [x] 8.4 Implement `GET /internal/orders`:
    - [x] 8.4.1 Accept query params: `status`, `userId`, `page`, `limit`
    - [x] 8.4.2 No ownership filter (admin sees all)
    - [x] 8.4.3 Return paginated response
  - [x] 8.5 Implement `GET /internal/orders/:id`:
    - [x] 8.5.1 No ownership check
    - [x] 8.5.2 Include full details: OrderItems, ProvisioningTask, StatusHistory
  - [x] 8.6 Write unit tests for admin endpoints

- [x] 9.0 Error Handling & Common Infrastructure
  - [x] 9.1 Create custom exceptions in `common/exceptions/`:
    - [x] 9.1.1 `OrderNotFoundException` (404)
    - [x] 9.1.2 `OrderAccessDeniedException` (403)
    - [x] 9.1.3 `InvalidPlanException` (400)
    - [x] 9.1.4 `InvalidImageException` (400)
    - [x] 9.1.5 `InvalidCouponException` (400)
    - [x] 9.1.6 `InvalidDurationException` (400)
    - [x] 9.1.7 `PaymentStatusConflictException` (409)
    - [x] 9.1.8 `CatalogServiceUnavailableException` (503)
    - [x] 9.1.9 `ProvisioningFailedException` (500)
    - [x] 9.1.10 `DigitalOceanUnavailableException` (503)
    - [x] 9.1.11 `ProvisioningTimeoutException` (504)
  - [x] 9.2 Create `HttpExceptionFilter` with error envelope format: `{ error: { code, message, details? } }`
  - [x] 9.3 Register global exception filter in `AppModule`
  - [x] 9.4 Create common DTOs: `PaginationQueryDto`, `PaginatedResponseDto`
  - [x] 9.5 Write unit tests for exception filter (14 tests)

- [x] 10.0 Integration Testing & Documentation
  - [x] 10.1 Setup Testcontainers: create `test/helpers/test-database.ts`
  - [x] 10.2 Create `test/helpers/test-app.ts` (NestJS test app bootstrap, JWT generation)
  - [x] 10.3 Create `test/helpers/mock-catalog-service.ts` with mock responses for plan/image/coupon
  - [x] 10.4 Create `test/helpers/mock-digitalocean.ts` with mock droplet responses
  - [x] 10.5 Write `order.integration.spec.ts`:
    - [x] 10.5.1 Test create order success
    - [x] 10.5.2 Test create order with invalid plan
    - [x] 10.5.3 Test create order with invalid coupon
    - [x] 10.5.4 Test get order by id (owner)
    - [x] 10.5.5 Test get order by id (non-owner, should fail)
    - [x] 10.5.6 Test list orders with pagination
  - [x] 10.6 Write `payment.integration.spec.ts`:
    - [x] 10.6.1 Test mark as PAID success
    - [x] 10.6.2 Test mark as PAID when not PENDING_PAYMENT (should fail)
    - [x] 10.6.3 Test mark as PAYMENT_FAILED
    - [x] 10.6.4 Test retry after PAYMENT_FAILED
  - [x] 10.7 Write `provisioning.integration.spec.ts`:
    - [x] 10.7.1 Test provisioning starts after PAID
    - [x] 10.7.2 Test provisioning success updates order to ACTIVE
    - [x] 10.7.3 Test provisioning failure updates order to FAILED
    - [x] 10.7.4 Test provisioning timeout
  - [x] 10.8 Write `admin.integration.spec.ts`:
    - [x] 10.8.1 Test admin list orders with filters
    - [x] 10.8.2 Test admin get order detail
    - [x] 10.8.3 Test unauthorized access (missing API key)
  - [x] 10.9 Create `README.md` with:
    - [x] 10.9.1 Service overview and scope
    - [x] 10.9.2 Prerequisites and setup instructions
    - [x] 10.9.3 Environment variables documentation
    - [x] 10.9.4 API endpoints summary with request/response examples
    - [x] 10.9.5 Running tests instructions
  - [x] 10.10 Run all tests: `npx nx test order-service` (111 unit tests passed, 33 integration tests skipped)
  - [x] 10.11 Integration tests require `RUN_INTEGRATION_TESTS=true` and running PostgreSQL

### Week 5: Runtime & Local Dev Stack

- [x] 11.0 Dockerized Runtime for Order-Service
  - [x] 11.1 Tambah Dockerfile khusus order-service (Nx monorepo aware)
  - [x] 11.2 Tambah .env.docker untuk konfigurasi runtime di container
  - [x] 11.3 Tambah docker-compose.order-service.yml di root project
  - [x] 11.4 Verifikasi container up (order-service-db & order-service)
  - [x] 11.5 Smoke test API: POST /api/v1/orders & GET /health
  - [x] 11.6 Dokumentasi singkat di README (cara menjalankan via Docker)

### Week 6: API Consumer Guide

- [x] 12.0 API Consumer Guide untuk FE & Bot
  - [x] 12.1 Tentukan lokasi & struktur dokumen (README / docs/api-consumer.md)
  - [x] 12.2 Jelaskan auth & security (JWT, API key internal)
  - [x] 12.3 Dokumentasikan user endpoints (/api/v1/orders)
  - [x] 12.4 Dokumentasikan admin/internal endpoints (/api/v1/internal/orders)
  - [x] 12.5 Jelaskan format error & daftar error codes utama
  - [x] 12.6 Tambahkan contoh request/response (curl + JSON)
  - [x] 12.7 Tambahkan "Integration Checklist" untuk FE/bot

### Week 7: Local Mock Catalog Service (Docker)

- [ ] 13.0 Mock catalog-service di docker-compose
  - [ ] 13.1 Tentukan kontrak endpoint mock (plans, images, coupons)
  - [ ] 13.2 Buat simple HTTP server mock di apps/order-service/mocks/catalog-service
  - [ ] 13.3 Buat Dockerfile untuk mock catalog-service
  - [ ] 13.4 Extend docker-compose.order-service.yml dengan service catalog-mock
  - [ ] 13.5 Update .env.docker: arahkan CATALOG_SERVICE_BASE_URL ke catalog-mock
  - [ ] 13.6 Smoke test end-to-end: POST /api/v1/orders tanpa 503
