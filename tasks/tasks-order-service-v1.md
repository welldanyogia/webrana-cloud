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

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Checkout from main/develop: `git checkout -b feature/order-service-v1`

- [ ] 1.0 Project Setup & Configuration
  - [ ] 1.1 Generate NestJS app using Nx: `npx nx g @nx/nest:app order-service`
  - [ ] 1.2 Install dependencies: `@nestjs/axios`, `axios`, `@nestjs/config`, `class-validator`, `class-transformer`
  - [ ] 1.3 Create `.env.example` with all required environment variables from PRD Section 10.2
  - [ ] 1.4 Create `.env` for local development (copy from .env.example)
  - [ ] 1.5 Configure `AppModule` with `ConfigModule.forRoot({ isGlobal: true })`
  - [ ] 1.6 Setup `main.ts` with global prefix `/api/v1`, validation pipe, and port from env
  - [ ] 1.7 Verify app starts: `npx nx serve order-service`

- [ ] 2.0 Database Schema & Prisma Setup
  - [ ] 2.1 Initialize Prisma: `cd apps/order-service && npx prisma init`
  - [ ] 2.2 Create enums: `OrderStatus`, `PlanDuration`, `ItemType`, `ProvisioningStatus`
  - [ ] 2.3 Create `Order` model with all fields from PRD Section 5.1
  - [ ] 2.4 Create `OrderItem` model with relation to Order
  - [ ] 2.5 Create `ProvisioningTask` model with all droplet metadata fields
  - [ ] 2.6 Create `StatusHistory` model for audit logging
  - [ ] 2.7 Run migration: `npx prisma migrate dev --name init`
  - [ ] 2.8 Create `PrismaModule` and `PrismaService` (copy pattern from catalog-service)
  - [ ] 2.9 Create `seed.ts` with sample order data for testing
  - [ ] 2.10 Test seed: `npx prisma db seed`

- [ ] 3.0 Catalog Service Integration Module
  - [ ] 3.1 Create `CatalogClientModule` with `HttpModule.registerAsync()`
  - [ ] 3.2 Create `CatalogClientService` with injected `HttpService`
  - [ ] 3.3 Implement `getPlanById(planId: string)` - calls `GET /api/v1/catalog/plans/{id}`
  - [ ] 3.4 Implement `getImageById(imageId: string)` - calls `GET /api/v1/catalog/images/{id}`
  - [ ] 3.5 Implement `validateCoupon(dto: ValidateCouponDto)` - calls `POST /api/v1/catalog/coupons/validate`
  - [ ] 3.6 Add error handling: throw `CatalogServiceUnavailableException` on connection failure
  - [ ] 3.7 Add timeout configuration from env: `CATALOG_SERVICE_TIMEOUT_MS`
  - [ ] 3.8 Write unit tests for `CatalogClientService` (mock HttpService)

### Week 2: Core Order & Payment Flow

- [ ] 4.0 Order Module - Core CRUD & State Machine
  - [ ] 4.1 Create `OrderModule` importing `PrismaModule` and `CatalogClientModule`
  - [ ] 4.2 Create `OrderService` with injected `PrismaService` and `CatalogClientService`
  - [ ] 4.3 Implement `createOrder(userId, dto)`:
    - [ ] 4.3.1 Fetch plan from catalog-service, validate active
    - [ ] 4.3.2 Fetch image from catalog-service, validate available
    - [ ] 4.3.3 If couponCode provided, validate via catalog-service
    - [ ] 4.3.4 Calculate pricing snapshot (basePrice, promoDiscount, couponDiscount, finalPrice)
    - [ ] 4.3.5 Create Order with status `PENDING_PAYMENT`
    - [ ] 4.3.6 Create OrderItem(s) for plan
    - [ ] 4.3.7 Record initial StatusHistory
  - [ ] 4.4 Implement `getOrderById(orderId, userId?)` with optional ownership check
  - [ ] 4.5 Implement `getOrdersByUserId(userId, pagination)` with filtering
  - [ ] 4.6 Implement `updateOrderStatus(orderId, newStatus, actor)` with state machine validation
  - [ ] 4.7 Create state machine validator: define valid transitions per PRD Section 10.4
  - [ ] 4.8 Implement `recordStatusHistory(orderId, prevStatus, newStatus, actor, reason?)`
  - [ ] 4.9 Create DTOs: `CreateOrderDto`, `OrderResponseDto`, `OrderListResponseDto`, `PaginationQueryDto`
  - [ ] 4.10 Write unit tests for `OrderService`

- [ ] 5.0 Payment Module - Mock Payment Override
  - [ ] 5.1 Add payment methods to `OrderService` (or create separate `PaymentService`)
  - [ ] 5.2 Implement `updatePaymentStatus(orderId, status, actor, notes?)`:
    - [ ] 5.2.1 Validate current status is `PENDING_PAYMENT`
    - [ ] 5.2.2 If status = `PAID`: update order, set `paidAt`, record history
    - [ ] 5.2.3 If status = `PAYMENT_FAILED`: update order, record history
    - [ ] 5.2.4 Throw `PaymentStatusConflictException` if invalid transition
  - [ ] 5.3 Create `UpdatePaymentStatusDto` with validation
  - [ ] 5.4 Wire provisioning trigger: after `PAID`, call `ProvisioningService.startProvisioning()`
  - [ ] 5.5 Write unit tests for payment status flow

### Week 3: Provisioning & User APIs

- [ ] 6.0 Provisioning Module - DigitalOcean Integration
  - [ ] 6.1 Create `ProvisioningModule` importing `PrismaModule`
  - [ ] 6.2 Create `DigitalOceanClientService` with axios instance
  - [ ] 6.3 Implement `createDroplet(config)` - POST to DO API `/v2/droplets`
  - [ ] 6.4 Implement `getDroplet(dropletId)` - GET from DO API `/v2/droplets/{id}`
  - [ ] 6.5 Add DO API error handling and response mapping
  - [ ] 6.6 Create `ProvisioningService` with injected `PrismaService` and `DigitalOceanClientService`
  - [ ] 6.7 Implement `startProvisioning(orderId)`:
    - [ ] 6.7.1 Get order and plan details
    - [ ] 6.7.2 Create ProvisioningTask with status `PENDING`
    - [ ] 6.7.3 Update order status to `PROVISIONING`
    - [ ] 6.7.4 Call DO API to create droplet
    - [ ] 6.7.5 Save initial droplet metadata (dropletId, name)
    - [ ] 6.7.6 Update task status to `IN_PROGRESS`
    - [ ] 6.7.7 Start async polling (non-blocking)
  - [ ] 6.8 Implement `pollDropletStatus(taskId, dropletId)`:
    - [ ] 6.8.1 Loop with interval from env `PROVISIONING_POLL_INTERVAL_MS` (default 5000)
    - [ ] 6.8.2 Max attempts from env `PROVISIONING_MAX_ATTEMPTS` (default 60)
    - [ ] 6.8.3 On each poll: update droplet metadata in DB
    - [ ] 6.8.4 If droplet status = `active`: call `markProvisioningSuccess()`
    - [ ] 6.8.5 If droplet status = `errored`: call `markProvisioningFailed()`
    - [ ] 6.8.6 If max attempts reached: call `markProvisioningFailed()` with timeout
  - [ ] 6.9 Implement `markProvisioningSuccess(taskId)`: update task to `SUCCESS`, order to `ACTIVE`
  - [ ] 6.10 Implement `markProvisioningFailed(taskId, errorCode, errorMessage)`: update task to `FAILED`, order to `FAILED`
  - [ ] 6.11 Write unit tests for `ProvisioningService` (mock DO client)
  - [ ] 6.12 Write unit tests for `DigitalOceanClientService` (mock axios)

- [ ] 7.0 User APIs (JWT Protected)
  - [ ] 7.1 Create `JwtAuthGuard` that validates JWT using public key from env
  - [ ] 7.2 Create `@CurrentUser()` decorator to extract userId from JWT payload
  - [ ] 7.3 Create `OrderController` with route prefix `orders`
  - [ ] 7.4 Implement `POST /api/v1/orders`:
    - [ ] 7.4.1 Apply `@UseGuards(JwtAuthGuard)`
    - [ ] 7.4.2 Get userId from `@CurrentUser()`
    - [ ] 7.4.3 Validate request body with `CreateOrderDto`
    - [ ] 7.4.4 Call `OrderService.createOrder()`
    - [ ] 7.4.5 Return 201 with order data
  - [ ] 7.5 Implement `GET /api/v1/orders`:
    - [ ] 7.5.1 Apply `@UseGuards(JwtAuthGuard)`
    - [ ] 7.5.2 Accept query params: `page`, `limit`, `status`
    - [ ] 7.5.3 Call `OrderService.getOrdersByUserId()`
    - [ ] 7.5.4 Return paginated response with meta
  - [ ] 7.6 Implement `GET /api/v1/orders/:id`:
    - [ ] 7.6.1 Apply `@UseGuards(JwtAuthGuard)`
    - [ ] 7.6.2 Validate ownership (userId must match order.userId)
    - [ ] 7.6.3 Include ProvisioningTask data in response
    - [ ] 7.6.4 Throw `OrderAccessDeniedException` if not owner
  - [ ] 7.7 Write integration tests for user endpoints

### Week 4: Admin APIs & Testing

- [ ] 8.0 Admin/Internal APIs
  - [ ] 8.1 Create `ApiKeyGuard` that validates `X-API-Key` header against env `INTERNAL_API_KEY`
  - [ ] 8.2 Create `InternalOrderController` with route prefix `internal/orders`
  - [ ] 8.3 Implement `POST /internal/orders/:id/payment-status`:
    - [ ] 8.3.1 Apply `@UseGuards(ApiKeyGuard)`
    - [ ] 8.3.2 Validate request body with `UpdatePaymentStatusDto`
    - [ ] 8.3.3 Call `OrderService.updatePaymentStatus()`
    - [ ] 8.3.4 Return updated order data
  - [ ] 8.4 Implement `GET /internal/orders`:
    - [ ] 8.4.1 Accept query params: `status`, `userId`, `page`, `limit`
    - [ ] 8.4.2 No ownership filter (admin sees all)
    - [ ] 8.4.3 Return paginated response
  - [ ] 8.5 Implement `GET /internal/orders/:id`:
    - [ ] 8.5.1 No ownership check
    - [ ] 8.5.2 Include full details: OrderItems, ProvisioningTask, StatusHistory
  - [ ] 8.6 Write integration tests for admin endpoints

- [ ] 9.0 Error Handling & Common Infrastructure
  - [ ] 9.1 Create custom exceptions in `common/exceptions/`:
    - [ ] 9.1.1 `OrderNotFoundException` (404)
    - [ ] 9.1.2 `OrderAccessDeniedException` (403)
    - [ ] 9.1.3 `InvalidPlanException` (400)
    - [ ] 9.1.4 `InvalidImageException` (400)
    - [ ] 9.1.5 `InvalidCouponException` (400)
    - [ ] 9.1.6 `InvalidDurationException` (400)
    - [ ] 9.1.7 `PaymentStatusConflictException` (409)
    - [ ] 9.1.8 `CatalogServiceUnavailableException` (503)
    - [ ] 9.1.9 `ProvisioningFailedException` (500)
    - [ ] 9.1.10 `DigitalOceanUnavailableException` (503)
    - [ ] 9.1.11 `ProvisioningTimeoutException` (504)
  - [ ] 9.2 Create `HttpExceptionFilter` with error envelope format: `{ error: { code, message, details? } }`
  - [ ] 9.3 Register global exception filter in `AppModule`
  - [ ] 9.4 Create common DTOs: `PaginationQueryDto`, `PaginatedResponseDto`
  - [ ] 9.5 Write unit tests for exception filter

- [ ] 10.0 Integration Testing & Documentation
  - [ ] 10.1 Setup Testcontainers: create `test/helpers/test-database.ts` (copy from catalog-service)
  - [ ] 10.2 Create `test/helpers/mock-catalog-service.ts` with mock responses for plan/image/coupon
  - [ ] 10.3 Create `test/helpers/mock-digitalocean.ts` with mock droplet responses
  - [ ] 10.4 Write `order.integration.spec.ts`:
    - [ ] 10.4.1 Test create order success
    - [ ] 10.4.2 Test create order with invalid plan
    - [ ] 10.4.3 Test create order with invalid coupon
    - [ ] 10.4.4 Test get order by id (owner)
    - [ ] 10.4.5 Test get order by id (non-owner, should fail)
    - [ ] 10.4.6 Test list orders with pagination
  - [ ] 10.5 Write `payment.integration.spec.ts`:
    - [ ] 10.5.1 Test mark as PAID success
    - [ ] 10.5.2 Test mark as PAID when not PENDING_PAYMENT (should fail)
    - [ ] 10.5.3 Test mark as PAYMENT_FAILED
  - [ ] 10.6 Write `provisioning.integration.spec.ts`:
    - [ ] 10.6.1 Test provisioning starts after PAID
    - [ ] 10.6.2 Test provisioning success updates order to ACTIVE
    - [ ] 10.6.3 Test provisioning failure updates order to FAILED
    - [ ] 10.6.4 Test droplet metadata is saved
  - [ ] 10.7 Write `admin.integration.spec.ts`:
    - [ ] 10.7.1 Test admin list orders with filters
    - [ ] 10.7.2 Test admin get order detail
    - [ ] 10.7.3 Test unauthorized access (missing API key)
  - [ ] 10.8 Create `README.md` with:
    - [ ] 10.8.1 Service overview and scope
    - [ ] 10.8.2 Prerequisites and setup instructions
    - [ ] 10.8.3 Environment variables documentation
    - [ ] 10.8.4 API endpoints summary
    - [ ] 10.8.5 Running tests instructions
  - [ ] 10.9 Run all tests: `npx nx test order-service`
  - [ ] 10.10 Fix any failing tests and lint issues
  - [ ] 10.11 Final code review: check for hardcoded values, security issues, missing error handling
