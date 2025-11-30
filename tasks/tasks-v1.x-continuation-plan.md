# Task Plan: Webrana Cloud Platform Continuation (v1.2 - v1.3+)

**Source Document:** `tasks/prd-webrana-cloud-platform-v1.md`  
**Created:** 2025-11-30  
**Author:** Senior Product Manager  
**Status:** Ready for Delegation

---

## Executive Summary

Berdasarkan analisis PRD dan status implementasi saat ini, project Webrana Cloud telah menyelesaikan **v1.0 (MVP)** dan sebagian besar **v1.1**. Task plan ini fokus pada penyelesaian fitur yang tersisa dan persiapan untuk **v1.2** dan **v1.3**.

---

## Current Implementation Status

### ✅ COMPLETED (v1.0 + v1.1)

| Component | Status | Coverage |
|-----------|--------|----------|
| auth-service | ✅ Complete | ~80% |
| catalog-service | ✅ Complete | ~60% |
| order-service | ✅ Complete | ~85% |
| billing-service (Tripay) | ✅ Complete | ~50% |
| notification-service (Email/Telegram) | ✅ Complete | ~40% |
| instance-service (reboot, power, password) | ✅ Complete | ~50% |
| api-gateway (rate limiting) | ✅ Complete | ~40% |
| customer-web (landing, dashboard, order) | ✅ Complete | ~10% |
| admin-web (orders, users, analytics) | ✅ Complete | 0% |

### 🔄 IN PROGRESS / GAPS

| Feature | Status | Priority |
|---------|--------|----------|
| Landing page assets (images) | ⚠️ Missing assets | P1 |
| Frontend unit tests | ⚠️ Low coverage | P1 |
| Backend integration tests | ⚠️ Incomplete | P1 |
| Security testing | ❌ Not started | P1 |

### ❌ NOT IMPLEMENTED (v1.2 - v1.3)

| Feature | PRD Version | Priority |
|---------|-------------|----------|
| In-app notifications | v1.2 | P2 |
| Error tracking (Sentry) | v1.2 | P2 |
| provider-service abstraction | v1.3 | P2 |
| Vultr integration | v1.3 | P3 |
| Linode integration | v1.3 | P3 |
| VNC console access | v1.3 | P3 |

---

## Phase 1: Quality Assurance & Testing (Priority: P1)

**Target:** Achieve 80% backend coverage, 60% frontend coverage  
**Timeline:** Week 1-3  
**Reference:** `tasks/tasks-qa-testing-v1.md`

### [QA-001] Backend Unit Tests Completion

**Assignee:** Senior Backend Engineer + Senior QA Engineer  
**Priority:** P1  
**Effort:** 6 days

| Task ID | Service | Tests Needed | Effort |
|---------|---------|--------------|--------|
| QA-BE-001 | billing-service | Invoice, Admin, Webhook controllers | 2 days |
| QA-BE-002 | notification-service | Queue, Notification controllers | 1.5 days |
| QA-BE-003 | instance-service | Instance, Order client controllers | 1.5 days |
| QA-BE-004 | api-gateway | Proxy controllers, rate limiting | 1 day |

**Acceptance Criteria:**
- [ ] All controllers have ≥80% test coverage
- [ ] All services have unit tests for critical paths
- [ ] Error scenarios covered

### [QA-002] Backend Integration Tests

**Assignee:** Senior Backend Engineer  
**Priority:** P1  
**Effort:** 4 days

| Task ID | Service | Scope | Effort |
|---------|---------|-------|--------|
| QA-INT-001 | billing-service | Invoice creation, payment, webhook | 2 days |
| QA-INT-002 | notification-service | Queue with Redis, email/telegram mock | 1 day |
| QA-INT-003 | instance-service | Instance listing, action execution | 1 day |

**Test Infrastructure:**
```bash
# Required: Testcontainers for PostgreSQL
RUN_INTEGRATION_TESTS=true npx nx test billing-service
```

### [QA-003] Frontend Component Tests

**Assignee:** Senior Frontend Engineer + Senior QA Engineer  
**Priority:** P1  
**Effort:** 5 days

| Task ID | App | Components | Effort |
|---------|-----|------------|--------|
| QA-FE-001 | customer-web | Auth, Catalog, Order, VPS, UI components | 3 days |
| QA-FE-002 | admin-web | Dashboard, Orders, Users, Analytics | 2 days |

**Test Files to Create:**
```
apps/customer-web/src/components/**/*.test.tsx
apps/admin-web/src/components/**/*.test.tsx
```

### [QA-004] Security Testing

**Assignee:** Senior QA Engineer  
**Priority:** P1  
**Effort:** 2 days

| Task ID | Area | Tests |
|---------|------|-------|
| QA-SEC-001.1 | Authentication | JWT validation, token expiry, refresh rotation |
| QA-SEC-001.2 | Authorization | Role-based access, resource ownership |
| QA-SEC-001.3 | Input Validation | SQL injection, XSS, CSRF protection |
| QA-SEC-001.4 | API Security | Rate limiting, API key validation, CORS |

**Test Location:** `test/security/`

### [QA-005] Cross-Service E2E Tests

**Assignee:** Senior QA Engineer  
**Priority:** P1  
**Effort:** 3 days

| Task ID | Flow | Services Involved |
|---------|------|-------------------|
| QA-CROSS-001 | Full Order Flow | order → billing → notification → instance |
| QA-CROSS-002 | Admin Override Flow | admin-web → order → notification |

---

## Phase 2: Landing Page Completion (Priority: P1)

**Target:** Complete landing page visual assets and QA  
**Timeline:** Week 1  
**Reference:** `tasks/tasks-v1.3-landing-page.md`

### [LP-001] Asset Sourcing & Optimization

**Assignee:** Senior UI/UX Designer  
**Priority:** High  
**Effort:** 1 day

**Required Assets:**
1. **Hero Image:** Modern dashboard mockup (dark/blue theme)
2. **Feature Images:**
   - NVMe/Storage illustration
   - Indonesia map with glowing nodes
   - Speed/Rocket illustration
   - Payment method collage (QRIS/Bank)
3. **Why Us Image:** Developer setup photo
4. **Backgrounds:** Tech pattern for Pricing section

**Deliverables:**
- Optimized WebP images (1920px hero, 800px others)
- Location: `apps/customer-web/public/images/landing/`

### [LP-002] Visual & Content QA

**Assignee:** Senior QA Engineer  
**Priority:** Medium  
**Effort:** 0.5 day

**Checklist:**
- [ ] Responsiveness (Mobile, Tablet, Desktop)
- [ ] Dark Mode consistency
- [ ] All links functional (Sign Up, View Plans)
- [ ] Image loading performance (LCP < 2.5s)

---

## Phase 3: v1.2 Features (Priority: P2)

**Target:** Complete remaining v1.2 features  
**Timeline:** Week 4-5

### [V12-001] In-App Notifications

**Assignee:** Senior Backend Engineer + Senior Frontend Engineer  
**Priority:** P2  
**Effort:** 5 days

**Backend Tasks:**
- [ ] Add `InAppNotification` model to notification-service
- [ ] Create `/api/v1/notifications` endpoint for user notifications
- [ ] WebSocket integration for real-time push
- [ ] Mark as read/unread functionality

**Frontend Tasks:**
- [ ] Notification bell component in navbar
- [ ] Notification dropdown/panel
- [ ] Real-time WebSocket connection
- [ ] Notification preferences in profile

**API Endpoints:**
```
GET  /api/v1/notifications          # List user notifications
POST /api/v1/notifications/:id/read # Mark as read
POST /api/v1/notifications/read-all # Mark all as read
```

### [V12-002] Error Tracking (Sentry)

**Assignee:** Senior DevOps Engineer  
**Priority:** P2  
**Effort:** 2 days

**Tasks:**
- [ ] Setup Sentry project for webrana-cloud
- [ ] Integrate `@sentry/node` in all NestJS services
- [ ] Integrate `@sentry/react` in customer-web and admin-web
- [ ] Configure source maps upload
- [ ] Setup alert rules for critical errors

**Environment Variables:**
```env
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=v1.2.0
```

### [V12-003] Performance Monitoring

**Assignee:** Senior DevOps Engineer  
**Priority:** P3  
**Effort:** 1 day

**Tasks:**
- [ ] Setup performance monitoring (Sentry Performance)
- [ ] Add custom spans for critical operations
- [ ] Configure performance baselines

---

## Phase 4: v1.3 Features (Priority: P2-P3)

**Target:** Multi-provider support  
**Timeline:** Week 6-8

### [V13-001] Provider Service Abstraction

**Assignee:** Senior Backend Engineer  
**Priority:** P2  
**Effort:** 5 days

**Architecture:**
```
provider-service/
├── src/
│   ├── adapters/
│   │   ├── digitalocean.adapter.ts
│   │   ├── vultr.adapter.ts (v1.3)
│   │   └── linode.adapter.ts (v1.3)
│   ├── interfaces/
│   │   └── cloud-provider.interface.ts
│   ├── modules/
│   │   └── provider/
│   │       ├── provider.service.ts
│   │       └── provider.controller.ts
│   └── common/
│       └── dto/
│           └── provision-request.dto.ts
```

**Tasks:**
- [ ] Define `ICloudProvider` interface
- [ ] Implement `DigitalOceanAdapter` (migrate from order-service)
- [ ] Create `ProviderService` with adapter pattern
- [ ] Create internal API endpoints
- [ ] Update order-service to use provider-service

**Interface Definition:**
```typescript
interface ICloudProvider {
  createInstance(request: ProvisionRequest): Promise<ProvisionResult>;
  deleteInstance(instanceId: string): Promise<void>;
  getInstanceStatus(instanceId: string): Promise<InstanceStatus>;
  performAction(instanceId: string, action: InstanceAction): Promise<ActionResult>;
  listRegions(): Promise<Region[]>;
  listSizes(): Promise<Size[]>;
  listImages(): Promise<Image[]>;
}
```

### [V13-002] Vultr Integration

**Assignee:** Senior Backend Engineer  
**Priority:** P3  
**Effort:** 3 days

**Tasks:**
- [ ] Research Vultr API documentation
- [ ] Implement `VultrAdapter` 
- [ ] Add Vultr plans to catalog-service
- [ ] Test provisioning workflow
- [ ] Documentation

**Environment Variables:**
```env
VULTR_API_KEY=xxx
```

### [V13-003] Linode Integration

**Assignee:** Senior Backend Engineer  
**Priority:** P3  
**Effort:** 3 days

**Tasks:**
- [ ] Research Linode API documentation
- [ ] Implement `LinodeAdapter`
- [ ] Add Linode plans to catalog-service
- [ ] Test provisioning workflow
- [ ] Documentation

**Environment Variables:**
```env
LINODE_API_TOKEN=xxx
```

### [V13-004] VNC Console Access

**Assignee:** Senior Backend Engineer + Senior Frontend Engineer  
**Priority:** P3  
**Effort:** 5 days

**Backend Tasks:**
- [ ] Add console URL generation per provider
- [ ] Secure console access with time-limited tokens
- [ ] WebSocket proxy for VNC traffic

**Frontend Tasks:**
- [ ] noVNC integration in customer-web
- [ ] Console modal/fullscreen view
- [ ] Connection status indicator

---

## Phase 5: Production Readiness (Priority: P2)

**Target:** Production-grade deployment  
**Timeline:** Week 9-10

### [PROD-001] Infrastructure Setup

**Assignee:** Senior DevOps Engineer  
**Priority:** P2  
**Effort:** 3 days

**Tasks:**
- [ ] Docker Compose production configuration
- [ ] Kubernetes manifests (optional)
- [ ] Database backup strategy
- [ ] Redis cluster setup
- [ ] Load balancer configuration
- [ ] SSL certificate setup

### [PROD-002] CI/CD Pipeline

**Assignee:** Senior DevOps Engineer  
**Priority:** P2  
**Effort:** 2 days

**Tasks:**
- [ ] GitHub Actions workflow for:
  - [ ] Lint & Type check
  - [ ] Unit tests
  - [ ] Integration tests (with Testcontainers)
  - [ ] Build & Push Docker images
  - [ ] Deploy to staging
  - [ ] Deploy to production (manual trigger)

### [PROD-003] Monitoring & Alerting

**Assignee:** Senior DevOps Engineer  
**Priority:** P2  
**Effort:** 2 days

**Tasks:**
- [ ] Health check dashboard
- [ ] Prometheus metrics export
- [ ] Grafana dashboards
- [ ] Alert rules (PagerDuty/Telegram)
- [ ] Log aggregation (ELK/Loki)

---

## Delegation Summary

### By Droid

| Droid | Tasks | Total Effort |
|-------|-------|--------------|
| **Senior Backend Engineer** | QA-BE-*, QA-INT-*, V12-001 (BE), V13-001, V13-002, V13-003, V13-004 (BE) | ~20 days |
| **Senior Frontend Engineer** | QA-FE-*, V12-001 (FE), V13-004 (FE) | ~8 days |
| **Senior QA Engineer** | QA-003, QA-004, QA-005, LP-002 | ~7.5 days |
| **Senior UI/UX Designer** | LP-001 | ~1 day |
| **Senior DevOps Engineer** | V12-002, V12-003, PROD-* | ~10 days |

### By Priority

| Priority | Tasks | Timeline |
|----------|-------|----------|
| **P1 (Must Have)** | QA-001 to QA-005, LP-001, LP-002 | Week 1-3 |
| **P2 (Should Have)** | V12-001, V12-002, V13-001, PROD-* | Week 4-10 |
| **P3 (Nice to Have)** | V12-003, V13-002, V13-003, V13-004 | Week 6-10 |

---

## Execution Plan

### Sprint 1 (Week 1-2): QA Foundation

```
Day 1-2:  QA-BE-001 (billing-service tests)     → /backend
Day 2-3:  LP-001 (asset sourcing)               → /design
Day 3-4:  QA-BE-002 (notification tests)        → /backend
Day 4-5:  QA-FE-001 (customer-web tests start)  → /frontend
Day 5-6:  QA-BE-003 (instance-service tests)    → /backend
Day 6-7:  QA-BE-004 (api-gateway tests)         → /backend
Day 7-8:  QA-INT-001 (billing integration)      → /backend
Day 8-10: QA-FE-001 (continue), QA-SEC-001      → /frontend, /qa
```

### Sprint 2 (Week 3-4): QA Completion + v1.2 Start

```
Day 1-3:  QA-FE-002, QA-INT-002, QA-INT-003     → /frontend, /backend
Day 3-5:  QA-CROSS-001, QA-CROSS-002            → /qa
Day 5-7:  V12-002 (Sentry setup)                → /devops
Day 7-10: V12-001 (In-app notifications start)  → /backend, /frontend
```

### Sprint 3 (Week 5-6): v1.2 Completion + v1.3 Start

```
Day 1-3:  V12-001 (complete)                    → /backend, /frontend
Day 3-5:  V12-003 (performance monitoring)      → /devops
Day 5-10: V13-001 (provider-service)            → /backend
```

### Sprint 4 (Week 7-8): v1.3 + Production Prep

```
Day 1-3:  V13-002 (Vultr)                       → /backend
Day 3-6:  V13-003 (Linode)                      → /backend
Day 6-10: PROD-001, PROD-002                    → /devops
```

### Sprint 5 (Week 9-10): Production Launch

```
Day 1-5:  V13-004 (VNC console)                 → /backend, /frontend
Day 5-7:  PROD-003 (monitoring)                 → /devops
Day 7-10: Final QA, Bug fixes, Launch           → All teams
```

---

## Quick Commands

```bash
# Start specific droid for task
/droid senior-backend-engineer    # Backend tasks
/droid senior-frontend-engineer   # Frontend tasks
/droid senior-qa-engineer         # QA tasks
/droid senior-ui-ux-designer      # Design tasks
/droid senior-devops-engineer     # DevOps tasks

# Run tests
npm run test                      # All tests
npx nx test billing-service       # Specific service
npx nx test customer-web          # Frontend tests

# Lint & Build
npm run lint
npm run build
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Provider API changes | Medium | Version pin, integration tests |
| Test coverage gaps | High | Dedicated QA sprint first |
| Performance issues at scale | Medium | Load testing before launch |
| Security vulnerabilities | Critical | Security audit, penetration testing |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Backend test coverage | ~50% avg | ≥80% |
| Frontend test coverage | ~10% | ≥60% |
| Order success rate | N/A | ≥99% |
| Provisioning time | N/A | <3 min |
| API availability | N/A | 99.9% |

---

**Document Version:** 1.0  
**Created:** 2025-11-30  
**Author:** Senior Product Manager  
**Status:** Ready for Delegation

---

*Next Action: Start with Phase 1 (QA) using `/droid senior-backend-engineer` and `/droid senior-qa-engineer`*
