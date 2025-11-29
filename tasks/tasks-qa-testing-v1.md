# QA & Unit Testing Task Plan

> **Target:** Comprehensive test coverage untuk platform v1.0-v1.2
> **Priority:** P1 (Must complete before production)
> **Created:** 2024-11-29

---

## Overview

### Current Test Coverage Status

| Service | Unit Tests | Integration Tests | E2E Tests | Coverage |
|---------|------------|-------------------|-----------|----------|
| auth-service | ✅ Yes | ✅ Yes | ⚠️ Basic | ~80% |
| catalog-service | ⚠️ Partial | ✅ Yes | ⚠️ Basic | ~60% |
| order-service | ✅ Yes | ✅ Yes | ⚠️ Basic | ~85% |
| billing-service | ✅ Yes | ❌ No | ❌ No | ~50% |
| notification-service | ✅ Yes | ❌ No | ❌ No | ~40% |
| instance-service | ✅ Yes | ❌ No | ❌ No | ~50% |
| api-gateway | ✅ Yes | ❌ No | ❌ No | ~40% |
| customer-web | ❌ No | ❌ No | ❌ No | 0% |
| admin-web | ❌ No | ❌ No | ❌ No | 0% |

### Target Coverage
- Backend Services: **80%** minimum
- Frontend Apps: **60%** minimum
- Critical Paths: **100%** coverage

---

## Task Breakdown

### Phase 1: Backend Unit Tests (P1)

#### QA-BE-001: billing-service Unit Tests
**Assignee:** Senior Backend Engineer
**Priority:** P1
**Effort:** 2 days

**Tasks:**
- [ ] QA-BE-001.1: Invoice Controller tests
  - Create invoice endpoint
  - Get invoice endpoint
  - List invoices endpoint
  - Initiate payment endpoint
- [ ] QA-BE-001.2: Admin Invoice Controller tests
  - List all invoices
  - Get invoice by ID (admin)
- [ ] QA-BE-001.3: Webhook Controller tests
  - Tripay callback handling
  - Signature verification
  - Invalid signature rejection
- [ ] QA-BE-001.4: Invoice Service tests (expand existing)
  - Payment channel mapping
  - Fee calculation
  - Status transitions

**Test Files:**
```
apps/billing-service/src/modules/invoice/invoice.controller.spec.ts
apps/billing-service/src/modules/invoice/admin-invoice.controller.spec.ts
apps/billing-service/src/modules/webhook/webhook.controller.spec.ts
```

---

#### QA-BE-002: notification-service Unit Tests
**Assignee:** Senior Backend Engineer
**Priority:** P1
**Effort:** 1.5 days

**Tasks:**
- [ ] QA-BE-002.1: Queue Service tests
  - Job add/remove
  - Processing loop
  - Retry logic
  - Failed job handling
- [ ] QA-BE-002.2: Queue Controller tests
  - Stats endpoint
  - Retry failed endpoint
  - Clear failed endpoint
- [ ] QA-BE-002.3: Queue Processor tests
  - Job handling
  - Error scenarios

**Test Files:**
```
apps/notification-service/src/modules/queue/queue.service.spec.ts
apps/notification-service/src/modules/queue/queue.controller.spec.ts
apps/notification-service/src/modules/queue/queue.processor.spec.ts
```

---

#### QA-BE-003: instance-service Unit Tests (Expand)
**Assignee:** Senior Backend Engineer
**Priority:** P1
**Effort:** 1.5 days

**Tasks:**
- [ ] QA-BE-003.1: Instance Controller tests
  - List instances
  - Get instance detail
  - Trigger action
  - Get action status
- [ ] QA-BE-003.2: Order Client Service tests
  - Get orders by user
  - Error handling
- [ ] QA-BE-003.3: DigitalOcean Service tests (expand)
  - All action types
  - Error scenarios
  - Rate limiting handling

**Test Files:**
```
apps/instance-service/src/modules/instance/instance.controller.spec.ts
apps/instance-service/src/modules/order-client/order-client.service.spec.ts
```

---

#### QA-BE-004: api-gateway Unit Tests (Expand)
**Assignee:** Senior Backend Engineer
**Priority:** P2
**Effort:** 1 day

**Tasks:**
- [ ] QA-BE-004.1: Proxy Controller tests
  - Auth proxy
  - Order proxy
  - Instance proxy
- [ ] QA-BE-004.2: Rate limiting scenarios
  - Auth endpoints (5/min)
  - Order endpoints (10/min)
  - Instance endpoints (1/min)

**Test Files:**
```
apps/api-gateway/src/modules/auth-proxy/auth-proxy.controller.spec.ts
apps/api-gateway/src/modules/order-proxy/order-proxy.controller.spec.ts
apps/api-gateway/src/modules/instance-proxy/instance-proxy.controller.spec.ts
```

---

### Phase 2: Backend Integration Tests (P1)

#### QA-INT-001: billing-service Integration Tests
**Assignee:** Senior Backend Engineer
**Priority:** P1
**Effort:** 2 days

**Tasks:**
- [ ] QA-INT-001.1: Invoice creation flow
  - Create invoice for order
  - Verify pricing snapshot
- [ ] QA-INT-001.2: Payment initiation flow
  - Select channel
  - Generate payment code
  - Tripay API mock
- [ ] QA-INT-001.3: Webhook processing flow
  - Payment callback
  - Status update
  - Order service notification
- [ ] QA-INT-001.4: Admin override flow

**Test Files:**
```
apps/billing-service/test/integration/invoice.integration.spec.ts
apps/billing-service/test/integration/payment.integration.spec.ts
apps/billing-service/test/integration/webhook.integration.spec.ts
```

---

#### QA-INT-002: notification-service Integration Tests
**Assignee:** Senior Backend Engineer
**Priority:** P2
**Effort:** 1 day

**Tasks:**
- [ ] QA-INT-002.1: Queue with Redis
  - Job enqueue
  - Job processing
  - Retry mechanism
- [ ] QA-INT-002.2: Email sending (mock SMTP)
- [ ] QA-INT-002.3: Telegram sending (mock API)

**Test Files:**
```
apps/notification-service/test/integration/queue.integration.spec.ts
apps/notification-service/test/integration/notification.integration.spec.ts
```

---

#### QA-INT-003: instance-service Integration Tests
**Assignee:** Senior Backend Engineer
**Priority:** P2
**Effort:** 1 day

**Tasks:**
- [ ] QA-INT-003.1: Instance listing with order data
- [ ] QA-INT-003.2: Action execution (mock DO API)
- [ ] QA-INT-003.3: Action status polling

**Test Files:**
```
apps/instance-service/test/integration/instance.integration.spec.ts
apps/instance-service/test/integration/action.integration.spec.ts
```

---

### Phase 3: Frontend Tests (P1)

#### QA-FE-001: customer-web Component Tests
**Assignee:** Senior QA Engineer / Frontend Engineer
**Priority:** P1
**Effort:** 3 days

**Tasks:**
- [ ] QA-FE-001.1: Setup Vitest + React Testing Library
- [ ] QA-FE-001.2: Auth components tests
  - LoginForm
  - RegisterForm
  - ForgotPasswordForm
- [ ] QA-FE-001.3: Catalog components tests
  - PlanCard
  - PlanGrid
  - PriceDisplay
- [ ] QA-FE-001.4: Order flow components tests
  - OrderWizard steps
  - PaymentChannelSelector
  - PaymentInstructions
- [ ] QA-FE-001.5: VPS components tests
  - VpsCard
  - ActionButton
  - ActionModal
  - StatusIndicator
- [ ] QA-FE-001.6: Common UI components tests
  - Button
  - Input
  - Card
  - Modal
  - Badge

**Test Files:**
```
apps/customer-web/src/components/**/*.test.tsx
apps/customer-web/src/hooks/*.test.ts
```

---

#### QA-FE-002: admin-web Component Tests
**Assignee:** Senior QA Engineer / Frontend Engineer
**Priority:** P2
**Effort:** 2 days

**Tasks:**
- [ ] QA-FE-002.1: Setup Vitest + React Testing Library
- [ ] QA-FE-002.2: Dashboard components tests
  - StatCard
  - RecentOrdersTable
- [ ] QA-FE-002.3: Order management tests
  - OrdersTable
  - OrderDetail
  - PaymentOverrideModal
- [ ] QA-FE-002.4: Analytics components tests
  - OrdersChart
  - RevenueChart
  - PlansChart

**Test Files:**
```
apps/admin-web/src/components/**/*.test.tsx
apps/admin-web/src/hooks/*.test.ts
```

---

#### QA-FE-003: Frontend E2E Tests
**Assignee:** Senior QA Engineer
**Priority:** P2
**Effort:** 3 days

**Tasks:**
- [ ] QA-FE-003.1: Setup Playwright
- [ ] QA-FE-003.2: customer-web E2E scenarios
  - User registration flow
  - User login flow
  - Order creation flow
  - Payment flow
  - VPS management flow
- [ ] QA-FE-003.3: admin-web E2E scenarios
  - Admin login
  - Order list & detail
  - Payment override
  - User management

**Test Files:**
```
apps/customer-web-e2e/src/**.spec.ts
apps/admin-web-e2e/src/**.spec.ts
```

---

### Phase 4: Cross-Service Integration Tests (P2)

#### QA-CROSS-001: Full Order Flow Test
**Assignee:** Senior QA Engineer
**Priority:** P1
**Effort:** 2 days

**Scenario:**
1. User creates order (order-service)
2. Invoice generated (billing-service)
3. Payment initiated (billing-service → Tripay)
4. Payment confirmed (webhook → billing-service)
5. Order status updated (order-service)
6. Provisioning triggered (order-service → DO)
7. Notification sent (notification-service)
8. VPS appears in instance-service

**Test File:**
```
test/e2e/full-order-flow.e2e.spec.ts
```

---

#### QA-CROSS-002: Admin Override Flow Test
**Assignee:** Senior QA Engineer
**Priority:** P1
**Effort:** 1 day

**Scenario:**
1. Order in PENDING_PAYMENT
2. Admin marks as PAID
3. Order status updated
4. Provisioning triggered
5. Notification sent

**Test File:**
```
test/e2e/admin-override-flow.e2e.spec.ts
```

---

### Phase 5: Security & Performance Tests (P2)

#### QA-SEC-001: Security Testing
**Assignee:** Senior QA Engineer
**Priority:** P2
**Effort:** 2 days

**Tasks:**
- [ ] QA-SEC-001.1: Authentication tests
  - JWT validation
  - Token expiry
  - Refresh token rotation
- [ ] QA-SEC-001.2: Authorization tests
  - Role-based access
  - Resource ownership
  - Admin-only endpoints
- [ ] QA-SEC-001.3: Input validation tests
  - SQL injection prevention
  - XSS prevention
  - CSRF protection
- [ ] QA-SEC-001.4: API security tests
  - Rate limiting verification
  - API key validation
  - CORS configuration

---

#### QA-SEC-002: Performance Testing
**Assignee:** Senior QA Engineer
**Priority:** P3
**Effort:** 1 day

**Tasks:**
- [ ] QA-SEC-002.1: Load testing (k6 or Artillery)
  - Concurrent order creation
  - Payment webhook handling
  - Instance status polling
- [ ] QA-SEC-002.2: Stress testing
  - Rate limit behavior
  - Database connection pool

---

## Test Infrastructure

### Required Setup
```bash
# Install test dependencies (if not already)
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D playwright @playwright/test
npm install -D testcontainers @testcontainers/postgresql

# Run all unit tests
npm run test

# Run specific service tests
npx nx test billing-service
npx nx test notification-service
npx nx test instance-service

# Run integration tests
RUN_INTEGRATION_TESTS=true npx nx test order-service

# Run E2E tests
npx nx e2e customer-web-e2e
npx nx e2e admin-web-e2e
```

### Test Database
- Use Testcontainers for PostgreSQL
- Separate test database per service
- Auto-cleanup after tests

### Mock Services
- Mock Tripay API responses
- Mock DigitalOcean API responses
- Mock SMTP/Telegram for notifications
- Use MSW (Mock Service Worker) for frontend API mocking

---

## Acceptance Criteria

### Before Release:
- [ ] All P1 tests passing
- [ ] Backend coverage ≥80%
- [ ] Frontend coverage ≥60%
- [ ] No critical/high security issues
- [ ] Full order flow E2E passing
- [ ] Admin override E2E passing

### Quality Gates:
- [ ] No failing tests in CI/CD
- [ ] Coverage reports generated
- [ ] Security scan passed
- [ ] Performance baseline established

---

## Timeline

| Phase | Duration | Target |
|-------|----------|--------|
| Phase 1: Backend Unit | 6 days | Week 1 |
| Phase 2: Backend Integration | 4 days | Week 2 |
| Phase 3: Frontend Tests | 5 days | Week 2 |
| Phase 4: Cross-Service E2E | 3 days | Week 3 |
| Phase 5: Security & Perf | 3 days | Week 3 |

**Total Estimated Effort:** ~21 days (3 weeks)

---

## Delegation Summary

| Task ID | Assignee | Priority |
|---------|----------|----------|
| QA-BE-001 to QA-BE-004 | Senior Backend Engineer | P1 |
| QA-INT-001 to QA-INT-003 | Senior Backend Engineer | P1-P2 |
| QA-FE-001 to QA-FE-003 | Senior QA Engineer | P1-P2 |
| QA-CROSS-001 to QA-CROSS-002 | Senior QA Engineer | P1 |
| QA-SEC-001 to QA-SEC-002 | Senior QA Engineer | P2-P3 |

---

**Created:** 2024-11-29
**Status:** Ready for Delegation
