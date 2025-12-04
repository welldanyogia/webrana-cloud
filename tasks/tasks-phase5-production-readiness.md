# Task Plan: Phase 5 & 6 - Production Readiness & Multi-Provider

**Created:** 2025-12-04  
**Author:** Senior Product Manager  
**Status:** Ready for Delegation  
**Scope:** Production Readiness, v1.2 Completion, Test Coverage, Multi-Provider v1.3

---

## Ringkasan Eksekutif

Dokumen ini merinci task plan untuk menyelesaikan platform WeBrana Cloud menuju production-ready dan implementasi multi-provider support (v1.3). Berdasarkan analisis gap dari Progress Report, berikut adalah prioritas kerja yang terstruktur dalam 5 fase.

### Status Saat Ini
- **v1.0 (MVP):** ✅ COMPLETE - auth, catalog, order, DO provisioning
- **v1.1 (Billing):** ✅ COMPLETE - billing-service, notification-service, customer-web, admin-web
- **v1.2 (VPS Mgmt):** 🔄 95% COMPLETE - instance-service, VPS UI, rate limiting
- **Phase 4 (Bonus):** ✅ COMPLETE - Wallet, Lifecycle, Promo, VNC Console

### Gap Yang Perlu Diselesaikan
| Gap | Source | Priority |
|-----|--------|----------|
| 9 notification-service tests gagal | Technical Debt | P1 |
| Landing page assets missing | Technical Debt | P2 |
| In-app notifications | PRD v1.2 | P2 |
| Sentry error tracking | PRD v1.2 | P2 |
| CI/CD pipeline | Production Readiness | P1 |
| Monitoring (Prometheus/Grafana) | Production Readiness | P1 |
| Swagger/OpenAPI documentation | Production Readiness | P2 |
| Frontend test coverage (~10%) | Quality | P1 |
| Integration tests incomplete | Quality | P1 |
| provider-service abstraction | PRD v1.3 | P2 |
| Vultr integration | PRD v1.3 | P3 |
| Linode integration | PRD v1.3 | P3 |

### Timeline Overview
| Phase | Durasi | Fokus |
|-------|--------|-------|
| **Phase 5A** | 1 minggu | Quick Wins & Bug Fixes |
| **Phase 5B** | 2 minggu | Production Readiness |
| **Phase 5C** | 1 minggu | v1.2 Completion |
| **Phase 5D** | 2 minggu | Test Coverage |
| **Phase 6** | 4 minggu | v1.3 Multi-Provider |

**Total Estimasi:** 10 minggu

---

## Droid Assignment Matrix

| Droid | Model | Spesialisasi | Phase Assignment |
|-------|-------|--------------|------------------|
| **senior-backend-engineer** | Claude Opus 4.5 | API, microservices, database | 5A, 5C, 5D, 6 |
| **senior-frontend-engineer** | Gemini 3 Pro | UI, components, accessibility | 5A, 5C, 5D |
| **senior-qa-engineer** | Claude Opus 4.5 | Testing, quality gates, security | 5A, 5D |
| **senior-devops-engineer** | Gemini 3 Pro | CI/CD, infrastructure, monitoring | 5B |
| **senior-ui-ux-designer** | Gemini 3 Pro | Design, visual assets | 5A |
| **senior-copywriter** | Claude Opus 4.5 | Documentation, API docs | 5B |
| **senior-marketing-specialist** | GPT-5.1 Codex | Landing page optimization | 5A |

---

## Phase 5A: Quick Wins & Bug Fixes

**Timeline:** Minggu ke-1  
**Goal:** Memperbaiki bug kritikal dan menyelesaikan asset yang hilang  
**Priority:** P1

### Summary

| Task ID | Task Name | Delegated To | Estimate | Priority |
|---------|-----------|--------------|----------|----------|
| P5A-001 | Fix notification-service test mocks | senior-backend-engineer | 1 hari | P1 |
| P5A-002 | Complete landing page image assets | senior-ui-ux-designer | 1 hari | P2 |
| P5A-003 | Landing page copy review & optimization | senior-copywriter | 0.5 hari | P2 |
| P5A-004 | Fix landing page broken links & UI issues | senior-frontend-engineer | 0.5 hari | P2 |
| P5A-005 | Verify all services health checks | senior-qa-engineer | 0.5 hari | P1 |

---

### P5A-001: Fix Notification-Service Test Mocks

**Task ID:** P5A-001  
**Task Name:** Perbaiki 9 Test Mock yang Gagal di notification-service  
**Description:**  
Terdapat 9 unit test di notification-service yang gagal karena mock yang outdated. Test mock perlu di-update untuk merefleksikan perubahan schema dan dependency terbaru.

**Delegated To:** `/droid senior-backend-engineer`  
**Related Skills:** `test-driven-development`, `systematic-debugging`  
**Dependencies:** Tidak ada  
**Estimate:** 1 hari  
**Priority:** P1 (Critical)

**Acceptance Criteria:**
- [ ] Semua 9 test yang gagal diperbaiki dan passing
- [ ] Tidak ada test baru yang gagal setelah perbaikan
- [ ] Mock menggunakan pattern yang konsisten dengan service lain
- [ ] Coverage tidak berkurang dari baseline saat ini

**Technical Details:**
```bash
# Run tests untuk melihat failing tests
npx nx test notification-service

# Lokasi test files
apps/notification-service/src/modules/**/*.spec.ts
```

**Files yang Perlu Direview:**
- `notification.service.spec.ts`
- `email.service.spec.ts`
- `telegram.service.spec.ts`
- `queue.service.spec.ts`

---

### P5A-002: Complete Landing Page Image Assets

**Task ID:** P5A-002  
**Task Name:** Lengkapi Asset Gambar Landing Page  
**Description:**  
Landing page membutuhkan beberapa gambar yang belum tersedia. Asset harus dioptimasi untuk web (WebP format, compressed) dan mendukung dark mode.

**Delegated To:** `/droid senior-ui-ux-designer`  
**Related Skills:** `frontend-design`  
**Dependencies:** Tidak ada  
**Estimate:** 1 hari  
**Priority:** P2 (High)

**Required Assets:**

| Asset | Size | Description | Status |
|-------|------|-------------|--------|
| hero-dashboard.webp | 1920x1080 | Modern VPS dashboard mockup (dark theme) | ❌ Missing |
| feature-nvme.webp | 800x600 | NVMe/Storage illustration | ❌ Missing |
| feature-indonesia.webp | 800x600 | Indonesia map dengan data center nodes | ❌ Missing |
| feature-speed.webp | 800x600 | Speed/Rocket illustration | ❌ Missing |
| feature-payment.webp | 800x600 | Payment method collage (QRIS/Bank) | ❌ Missing |
| why-developer.webp | 1200x800 | Developer workspace photo | ❌ Missing |
| bg-pricing.webp | 1920x400 | Tech pattern background | ❌ Missing |

**Acceptance Criteria:**
- [ ] Semua 7 asset gambar tersedia
- [ ] Format WebP dengan optimasi (< 200KB per file)
- [ ] Mendukung dark mode color scheme
- [ ] Responsive-ready (multiple sizes jika diperlukan)

**Deliverable Location:**
```
apps/customer-web/public/images/landing/
├── hero-dashboard.webp
├── feature-nvme.webp
├── feature-indonesia.webp
├── feature-speed.webp
├── feature-payment.webp
├── why-developer.webp
└── bg-pricing.webp
```

---

### P5A-003: Landing Page Copy Review & Optimization

**Task ID:** P5A-003  
**Task Name:** Review dan Optimasi Copy Landing Page  
**Description:**  
Review seluruh copy di landing page untuk memastikan messaging yang clear, compelling, dan SEO-friendly. Fokus pada value proposition dan call-to-action.

**Delegated To:** `/droid senior-copywriter`  
**Related Skills:** Tidak ada  
**Dependencies:** Tidak ada  
**Estimate:** 0.5 hari  
**Priority:** P2 (High)

**Scope:**
- Hero section headline & subheadline
- Feature descriptions
- Pricing section copy
- CTA buttons text
- Footer content

**Acceptance Criteria:**
- [ ] Copy direview dan dioptimasi untuk clarity
- [ ] SEO keywords terintegrasi natural
- [ ] CTA text actionable dan compelling
- [ ] Bahasa Indonesia yang formal tapi engaging

---

### P5A-004: Fix Landing Page Broken Links & UI Issues

**Task ID:** P5A-004  
**Task Name:** Perbaiki Broken Links dan UI Issues di Landing Page  
**Description:**  
Audit landing page untuk menemukan dan memperbaiki broken links, UI inconsistencies, dan minor bugs.

**Delegated To:** `/droid senior-frontend-engineer`  
**Related Skills:** `browser`  
**Dependencies:** P5A-002 (image assets)  
**Estimate:** 0.5 hari  
**Priority:** P2 (High)

**Checklist:**
- [ ] Semua navigation links berfungsi
- [ ] Sign Up dan Login buttons mengarah ke halaman yang benar
- [ ] Responsive design berfungsi (mobile, tablet, desktop)
- [ ] Dark mode toggle berfungsi dengan benar
- [ ] Image loading performance optimal (LCP < 2.5s)
- [ ] Tidak ada console errors

**Acceptance Criteria:**
- [ ] Zero broken links
- [ ] Lighthouse score > 90 untuk Performance
- [ ] Lighthouse score > 90 untuk Accessibility
- [ ] Tidak ada visual regression dari design intent

---

### P5A-005: Verify All Services Health Checks

**Task ID:** P5A-005  
**Task Name:** Verifikasi Health Check Semua Services  
**Description:**  
Pastikan semua microservices memiliki health check endpoint yang berfungsi dan dapat dimonitor.

**Delegated To:** `/droid senior-qa-engineer`  
**Related Skills:** `verification-before-completion`  
**Dependencies:** Tidak ada  
**Estimate:** 0.5 hari  
**Priority:** P1 (Critical)

**Services to Verify:**

| Service | Port | Health Endpoint | Status |
|---------|------|-----------------|--------|
| api-gateway | 3000 | /health | ⏳ Verify |
| auth-service | 3001 | /health | ⏳ Verify |
| catalog-service | 3002 | /health | ⏳ Verify |
| order-service | 3003 | /health | ⏳ Verify |
| billing-service | 3004 | /health | ⏳ Verify |
| notification-service | 3005 | /health | ⏳ Verify |
| instance-service | 3006 | /health | ⏳ Verify |

**Acceptance Criteria:**
- [ ] Semua services memiliki /health endpoint
- [ ] Health check mengembalikan status database connection
- [ ] Health check mengembalikan status Redis connection (jika applicable)
- [ ] Response time < 100ms

---

## Phase 5B: Production Readiness

**Timeline:** Minggu ke-2 hingga ke-3  
**Goal:** Setup infrastructure production-grade (CI/CD, monitoring, documentation)  
**Priority:** P1

### Summary

| Task ID | Task Name | Delegated To | Estimate | Priority |
|---------|-----------|--------------|----------|----------|
| P5B-001 | Setup GitHub Actions CI/CD Pipeline | senior-devops-engineer | 3 hari | P1 |
| P5B-002 | Setup Prometheus & Grafana Monitoring | senior-devops-engineer | 3 hari | P1 |
| P5B-003 | Setup Log Aggregation (Loki/ELK) | senior-devops-engineer | 2 hari | P2 |
| P5B-004 | Generate Swagger/OpenAPI Documentation | senior-backend-engineer | 2 hari | P2 |
| P5B-005 | Create Deployment Runbook | senior-devops-engineer | 1 hari | P2 |
| P5B-006 | Setup Alerting Rules | senior-devops-engineer | 1 hari | P2 |

---

### P5B-001: Setup GitHub Actions CI/CD Pipeline

**Task ID:** P5B-001  
**Task Name:** Setup GitHub Actions CI/CD Pipeline  
**Description:**  
Implementasi CI/CD pipeline menggunakan GitHub Actions untuk automated testing, building, dan deployment.

**Delegated To:** `/droid senior-devops-engineer`  
**Related Skills:** Tidak ada  
**Dependencies:** Tidak ada  
**Estimate:** 3 hari  
**Priority:** P1 (Critical)

**Pipeline Stages:**

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [master, develop]
  pull_request:
    branches: [master]

jobs:
  lint:
    # ESLint & TypeScript check
  
  test:
    # Unit tests dengan coverage report
  
  integration-test:
    # Integration tests dengan Testcontainers
  
  build:
    # Build all services
  
  docker-build:
    # Build & push Docker images ke registry
  
  deploy-staging:
    # Deploy ke staging (automatic untuk develop branch)
  
  deploy-production:
    # Deploy ke production (manual approval untuk master)
```

**Acceptance Criteria:**
- [ ] Pipeline berjalan pada setiap push ke master/develop
- [ ] Pipeline berjalan pada setiap PR ke master
- [ ] Lint stage menjalankan `npm run lint`
- [ ] Test stage menjalankan semua unit tests
- [ ] Integration test stage dengan PostgreSQL container
- [ ] Build stage sukses untuk semua services
- [ ] Docker images di-push ke container registry
- [ ] Staging deployment otomatis untuk develop branch
- [ ] Production deployment memerlukan manual approval

**Files to Create:**
```
.github/
├── workflows/
│   ├── ci.yml           # Main CI pipeline
│   ├── deploy-staging.yml
│   └── deploy-production.yml
└── dependabot.yml       # Dependency updates
```

---

### P5B-002: Setup Prometheus & Grafana Monitoring

**Task ID:** P5B-002  
**Task Name:** Setup Prometheus & Grafana Monitoring Stack  
**Description:**  
Implementasi monitoring infrastructure dengan Prometheus untuk metrics collection dan Grafana untuk visualization.

**Delegated To:** `/droid senior-devops-engineer`  
**Related Skills:** Tidak ada  
**Dependencies:** P5B-001 (CI/CD untuk deployment)  
**Estimate:** 3 hari  
**Priority:** P1 (Critical)

**Components:**
1. **Prometheus** - Metrics collection & storage
2. **Grafana** - Dashboard visualization
3. **Node Exporter** - Host metrics
4. **Cadvisor** - Container metrics

**Metrics to Collect:**

| Service | Metrics |
|---------|---------|
| All NestJS | HTTP request duration, status codes, error rates |
| PostgreSQL | Connections, query duration, cache hit ratio |
| Redis | Memory usage, connections, operations/sec |
| Docker | Container CPU, memory, network |
| Host | CPU, memory, disk, network |

**Grafana Dashboards:**
- Overview Dashboard (semua services)
- Per-Service Dashboard
- Infrastructure Dashboard
- Business Metrics Dashboard (orders, payments)

**Acceptance Criteria:**
- [ ] Prometheus mengumpulkan metrics dari semua services
- [ ] Grafana dashboards tersedia untuk semua services
- [ ] Metrics retention minimal 15 hari
- [ ] Dashboard accessible via secure URL

**Files to Create:**
```
docker/monitoring/
├── docker-compose.yml
├── prometheus/
│   └── prometheus.yml
├── grafana/
│   ├── provisioning/
│   │   ├── dashboards/
│   │   └── datasources/
│   └── dashboards/
└── alertmanager/
    └── config.yml
```

---

### P5B-003: Setup Log Aggregation (Loki/ELK)

**Task ID:** P5B-003  
**Task Name:** Setup Centralized Logging dengan Loki atau ELK  
**Description:**  
Implementasi centralized logging untuk mengumpulkan dan menganalisa logs dari semua services.

**Delegated To:** `/droid senior-devops-engineer`  
**Related Skills:** Tidak ada  
**Dependencies:** P5B-002 (Grafana)  
**Estimate:** 2 hari  
**Priority:** P2 (High)

**Recommended Stack:** Loki + Grafana (lebih ringan dari ELK)

**Components:**
1. **Loki** - Log aggregation
2. **Promtail** - Log shipper
3. **Grafana** - Log visualization (sudah tersedia dari P5B-002)

**Log Sources:**
- Docker container logs
- NestJS application logs
- Nginx access logs
- PostgreSQL slow query logs

**Acceptance Criteria:**
- [ ] Logs dari semua containers terkumpul di Loki
- [ ] Logs searchable via Grafana
- [ ] Log retention minimal 7 hari
- [ ] Filter by service, level, dan timestamp

---

### P5B-004: Generate Swagger/OpenAPI Documentation

**Task ID:** P5B-004  
**Task Name:** Generate Swagger/OpenAPI Documentation untuk Semua Services  
**Description:**  
Implementasi dan generate Swagger/OpenAPI documentation untuk semua REST API endpoints.

**Delegated To:** `/droid senior-backend-engineer`  
**Related Skills:** Tidak ada  
**Dependencies:** Tidak ada  
**Estimate:** 2 hari  
**Priority:** P2 (High)

**Services to Document:**

| Service | Endpoints Count | Status |
|---------|-----------------|--------|
| auth-service | ~15 | ⏳ Pending |
| catalog-service | ~20 | ⏳ Pending |
| order-service | ~25 | ⏳ Pending |
| billing-service | ~20 | ⏳ Pending |
| notification-service | ~10 | ⏳ Pending |
| instance-service | ~15 | ⏳ Pending |

**Implementation Steps:**
1. Install `@nestjs/swagger` di semua services
2. Tambahkan decorators ke semua DTOs dan Controllers
3. Setup Swagger UI di setiap service (`/api/docs`)
4. Generate OpenAPI JSON spec

**Acceptance Criteria:**
- [ ] Semua endpoints terdokumentasi
- [ ] Request/Response DTOs memiliki descriptions
- [ ] Authentication requirements jelas
- [ ] Example values tersedia
- [ ] Swagger UI accessible di `/api/docs` tiap service

**Code Example:**
```typescript
// apps/*/src/main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Order Service API')
  .setDescription('VPS Order Management')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

---

### P5B-005: Create Deployment Runbook

**Task ID:** P5B-005  
**Task Name:** Buat Deployment Runbook  
**Description:**  
Dokumentasi lengkap untuk deployment procedures, rollback steps, dan troubleshooting guide.

**Delegated To:** `/droid senior-devops-engineer`  
**Related Skills:** Tidak ada  
**Dependencies:** P5B-001, P5B-002  
**Estimate:** 1 hari  
**Priority:** P2 (High)

**Runbook Sections:**
1. **Pre-deployment Checklist**
2. **Deployment Steps** (staging & production)
3. **Post-deployment Verification**
4. **Rollback Procedures**
5. **Common Issues & Solutions**
6. **Emergency Contacts**

**Acceptance Criteria:**
- [ ] Runbook tersedia di `docs/deployment/RUNBOOK.md`
- [ ] Step-by-step instructions jelas
- [ ] Rollback procedure teruji
- [ ] Emergency escalation path defined

---

### P5B-006: Setup Alerting Rules

**Task ID:** P5B-006  
**Task Name:** Setup Alerting Rules (Telegram/Email)  
**Description:**  
Konfigurasi alerting rules untuk critical events dan notifikasi ke tim via Telegram/Email.

**Delegated To:** `/droid senior-devops-engineer`  
**Related Skills:** Tidak ada  
**Dependencies:** P5B-002 (Prometheus)  
**Estimate:** 1 hari  
**Priority:** P2 (High)

**Alert Rules:**

| Alert | Condition | Severity | Channel |
|-------|-----------|----------|---------|
| ServiceDown | health_check == 0 for 1m | Critical | Telegram |
| HighErrorRate | error_rate > 5% for 5m | Warning | Telegram |
| HighLatency | p95 > 2s for 5m | Warning | Telegram |
| DiskSpaceLow | disk_usage > 85% | Warning | Email |
| MemoryHigh | memory_usage > 90% | Warning | Email |
| DatabaseDown | pg_up == 0 | Critical | Telegram |

**Acceptance Criteria:**
- [ ] Alert rules terkonfigurasi di Prometheus/Alertmanager
- [ ] Telegram bot terintegrasi untuk critical alerts
- [ ] Email notifications untuk warning alerts
- [ ] Alert deduplication dan grouping berfungsi

---

## Phase 5C: v1.2 Completion

**Timeline:** Minggu ke-4  
**Goal:** Selesaikan fitur v1.2 yang tersisa (In-app notifications, Sentry)  
**Priority:** P2

### Summary

| Task ID | Task Name | Delegated To | Estimate | Priority |
|---------|-----------|--------------|----------|----------|
| P5C-001 | Implement In-App Notifications Backend | senior-backend-engineer | 2 hari | P2 |
| P5C-002 | Implement In-App Notifications Frontend | senior-frontend-engineer | 2 hari | P2 |
| P5C-003 | WebSocket Real-time Push | senior-backend-engineer | 1 hari | P2 |
| P5C-004 | Sentry Error Tracking Integration | senior-devops-engineer | 1.5 hari | P2 |
| P5C-005 | Manual Retry Provisioning | senior-backend-engineer | 1 hari | P3 |

---

### P5C-001: Implement In-App Notifications Backend

**Task ID:** P5C-001  
**Task Name:** Implementasi Backend In-App Notifications  
**Description:**  
Tambahkan sistem notifikasi in-app ke notification-service dengan persistensi database dan API endpoints.

**Delegated To:** `/droid senior-backend-engineer`  
**Related Skills:** `test-driven-development`  
**Dependencies:** Tidak ada  
**Estimate:** 2 hari  
**Priority:** P2 (High)

**Database Schema:**
```prisma
model InAppNotification {
  id          String           @id @default(uuid()) @db.Uuid
  userId      String           @map("user_id")
  
  title       String           @db.VarChar(255)
  message     String           @db.Text
  type        NotificationType
  
  actionUrl   String?          @map("action_url") @db.VarChar(500)
  metadata    Json?
  
  isRead      Boolean          @default(false) @map("is_read")
  readAt      DateTime?        @map("read_at") @db.Timestamptz
  
  createdAt   DateTime         @default(now()) @map("created_at") @db.Timestamptz
  
  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@map("in_app_notifications")
}

enum NotificationType {
  ORDER_CREATED
  PAYMENT_CONFIRMED
  VPS_ACTIVE
  PROVISIONING_FAILED
  VPS_EXPIRING
  SYSTEM_ANNOUNCEMENT
}
```

**API Endpoints:**
```
GET  /api/v1/notifications              # List user notifications (paginated)
GET  /api/v1/notifications/unread-count # Get unread count
POST /api/v1/notifications/:id/read     # Mark as read
POST /api/v1/notifications/read-all     # Mark all as read
DELETE /api/v1/notifications/:id        # Delete notification
```

**Acceptance Criteria:**
- [ ] InAppNotification model created dan migrated
- [ ] Semua 5 endpoints terimplementasi dan tested
- [ ] Integration dengan existing notification events (email/telegram trigger juga in-app)
- [ ] Test coverage > 80%

---

### P5C-002: Implement In-App Notifications Frontend

**Task ID:** P5C-002  
**Task Name:** Implementasi Frontend In-App Notifications  
**Description:**  
Buat komponen UI untuk menampilkan dan mengelola notifikasi in-app di customer-web.

**Delegated To:** `/droid senior-frontend-engineer`  
**Related Skills:** `shadcn-management`, `frontend-ui-animator`  
**Dependencies:** P5C-001 (Backend API)  
**Estimate:** 2 hari  
**Priority:** P2 (High)

**Components to Create:**

```
apps/customer-web/src/components/notifications/
├── NotificationBell.tsx       # Bell icon dengan unread count badge
├── NotificationDropdown.tsx   # Dropdown panel dengan list notifications
├── NotificationItem.tsx       # Single notification item
├── NotificationEmpty.tsx      # Empty state illustration
├── NotificationSkeleton.tsx   # Loading skeleton
└── index.ts                   # Exports
```

**Features:**
- Bell icon dengan badge unread count
- Dropdown dengan list notifikasi terbaru (max 10)
- Mark as read on click
- Mark all as read button
- Link ke notification settings
- Empty state jika tidak ada notifikasi

**Acceptance Criteria:**
- [ ] NotificationBell terintegrasi di navbar
- [ ] Dropdown menampilkan notifikasi dengan pagination
- [ ] Mark as read functionality berfungsi
- [ ] Unread count badge realtime update
- [ ] Responsive design (mobile & desktop)
- [ ] Dark mode support

---

### P5C-003: WebSocket Real-time Push

**Task ID:** P5C-003  
**Task Name:** Implementasi WebSocket untuk Real-time Notification Push  
**Description:**  
Tambahkan WebSocket gateway untuk push notifications secara real-time ke connected clients.

**Delegated To:** `/droid senior-backend-engineer`  
**Related Skills:** Tidak ada  
**Dependencies:** P5C-001  
**Estimate:** 1 hari  
**Priority:** P2 (High)

**WebSocket Gateway:**
```typescript
// apps/notification-service/src/modules/websocket/
@WebSocketGateway({
  namespace: 'notifications',
  cors: true,
})
export class NotificationGateway {
  @SubscribeMessage('authenticate')
  handleAuth(client: Socket, token: string): void;
  
  async pushToUser(userId: string, notification: InAppNotification): Promise<void>;
}
```

**Events:**
| Event | Direction | Payload |
|-------|-----------|---------|
| `authenticate` | Client → Server | JWT token |
| `authenticated` | Server → Client | { success: boolean } |
| `notification:new` | Server → Client | InAppNotification |
| `notification:read` | Server → Client | { id: string } |

**Frontend Integration:**
```typescript
// apps/customer-web/src/hooks/use-notifications.ts
export function useNotifications() {
  // WebSocket connection management
  // Real-time updates handling
  // Reconnection logic
}
```

**Acceptance Criteria:**
- [ ] WebSocket gateway terimplementasi
- [ ] Client authentication via JWT
- [ ] Real-time push berfungsi
- [ ] Reconnection handling
- [ ] Connection status indicator di UI

---

### P5C-004: Sentry Error Tracking Integration

**Task ID:** P5C-004  
**Task Name:** Integrasi Sentry Error Tracking  
**Description:**  
Setup Sentry untuk centralized error tracking di semua backend services dan frontend apps.

**Delegated To:** `/droid senior-devops-engineer`  
**Related Skills:** Tidak ada  
**Dependencies:** Tidak ada  
**Estimate:** 1.5 hari  
**Priority:** P2 (High)

**Setup Steps:**

**1. Backend Integration (NestJS):**
```bash
npm install @sentry/node @sentry/profiling-node
```

```typescript
// libs/common/src/sentry/sentry.module.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
});
```

**2. Frontend Integration (React):**
```bash
npm install @sentry/react
```

```typescript
// apps/customer-web/src/lib/sentry.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**Environment Variables:**
```env
# Backend
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=v1.2.0

# Frontend
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

**Acceptance Criteria:**
- [ ] Sentry project created
- [ ] All 7 backend services connected
- [ ] Both frontend apps connected
- [ ] Source maps uploaded untuk frontend
- [ ] Error grouping berfungsi
- [ ] Alert rules configured

---

### P5C-005: Manual Retry Provisioning

**Task ID:** P5C-005  
**Task Name:** Implementasi Manual Retry Provisioning  
**Description:**  
Tambahkan kemampuan untuk admin melakukan manual retry provisioning jika terjadi kegagalan.

**Delegated To:** `/droid senior-backend-engineer`  
**Related Skills:** Tidak ada  
**Dependencies:** Tidak ada  
**Estimate:** 1 hari  
**Priority:** P3 (Medium)

**API Endpoint:**
```
POST /api/v1/internal/orders/:orderId/retry-provisioning
Headers: X-API-Key: <INTERNAL_API_KEY>
```

**Logic:**
1. Validate order status is PROVISIONING_FAILED
2. Reset ProvisioningTask status ke PENDING
3. Clear error message
4. Re-queue provisioning job
5. Return success response

**Acceptance Criteria:**
- [ ] Endpoint terimplementasi dengan auth (X-API-Key)
- [ ] Hanya order dengan status PROVISIONING_FAILED yang bisa di-retry
- [ ] Audit log untuk retry action
- [ ] Admin UI button untuk trigger retry

---

## Phase 5D: Test Coverage

**Timeline:** Minggu ke-5 hingga ke-6  
**Goal:** Meningkatkan test coverage ke level production-ready  
**Priority:** P1

### Summary

| Task ID | Task Name | Delegated To | Estimate | Priority |
|---------|-----------|--------------|----------|----------|
| P5D-001 | Frontend Unit Tests - customer-web | senior-frontend-engineer | 3 hari | P1 |
| P5D-002 | Frontend Unit Tests - admin-web | senior-frontend-engineer | 2 hari | P1 |
| P5D-003 | Backend Integration Tests - billing-service | senior-backend-engineer | 2 hari | P1 |
| P5D-004 | Backend Integration Tests - notification-service | senior-backend-engineer | 1 hari | P1 |
| P5D-005 | Cross-Service E2E Tests | senior-qa-engineer | 2 hari | P1 |
| P5D-006 | Security Testing Suite | senior-qa-engineer | 2 hari | P1 |
| P5D-007 | Performance/Load Testing | senior-qa-engineer | 1 hari | P2 |

---

### P5D-001: Frontend Unit Tests - customer-web

**Task ID:** P5D-001  
**Task Name:** Unit Tests untuk customer-web Components  
**Description:**  
Meningkatkan test coverage untuk customer-web dari ~10% ke minimal 60%.

**Delegated To:** `/droid senior-frontend-engineer`  
**Related Skills:** `test-driven-development`, `testing-anti-patterns`  
**Dependencies:** Tidak ada  
**Estimate:** 3 hari  
**Priority:** P1 (Critical)

**Components to Test (Priority Order):**

| Component | Priority | Test Focus |
|-----------|----------|------------|
| Auth components (Login, Register) | P1 | Form validation, API calls |
| Order flow components | P1 | Multi-step form, state management |
| VPS dashboard components | P1 | Data fetching, actions |
| Wallet components | P1 | Balance display, transactions |
| UI components (shared) | P2 | Rendering, props, accessibility |

**Test Files to Create:**
```
apps/customer-web/src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.test.tsx
│   │   └── RegisterForm.test.tsx
│   ├── order/
│   │   ├── OrderFlow.test.tsx
│   │   └── PlanSelector.test.tsx
│   ├── vps/
│   │   ├── VpsDashboard.test.tsx
│   │   └── VpsActions.test.tsx
│   └── wallet/
│       ├── WalletBalance.test.tsx
│       └── DepositForm.test.tsx
└── hooks/
    └── use-*.test.ts
```

**Acceptance Criteria:**
- [ ] Test coverage ≥ 60% untuk customer-web
- [ ] Critical user flows tested
- [ ] No flaky tests
- [ ] Tests run in < 30 seconds

---

### P5D-002: Frontend Unit Tests - admin-web

**Task ID:** P5D-002  
**Task Name:** Unit Tests untuk admin-web Components  
**Description:**  
Meningkatkan test coverage untuk admin-web dari ~0% ke minimal 50%.

**Delegated To:** `/droid senior-frontend-engineer`  
**Related Skills:** `test-driven-development`  
**Dependencies:** Tidak ada  
**Estimate:** 2 hari  
**Priority:** P1 (Critical)

**Components to Test:**

| Component | Priority | Test Focus |
|-----------|----------|------------|
| Order management | P1 | List, filter, approve/reject |
| User management | P1 | List, search, actions |
| Dashboard/Analytics | P2 | Chart rendering, data display |
| Promo management | P2 | CRUD operations |

**Acceptance Criteria:**
- [ ] Test coverage ≥ 50% untuk admin-web
- [ ] Admin actions tested
- [ ] Table/list components tested
- [ ] Form validations tested

---

### P5D-003: Backend Integration Tests - billing-service

**Task ID:** P5D-003  
**Task Name:** Integration Tests untuk billing-service  
**Description:**  
Buat integration tests untuk billing-service dengan Testcontainers PostgreSQL.

**Delegated To:** `/droid senior-backend-engineer`  
**Related Skills:** `test-driven-development`  
**Dependencies:** Tidak ada  
**Estimate:** 2 hari  
**Priority:** P1 (Critical)

**Test Scenarios:**

| Scenario | Description |
|----------|-------------|
| Invoice Creation | Create invoice dari order, verify totals |
| Payment Flow | Create payment, process webhook, update status |
| Wallet Operations | Deposit, debit, balance verification |
| Promo Application | Apply promo ke deposit, verify bonus |

**Test Structure:**
```
apps/billing-service/test/integration/
├── invoice.integration.spec.ts
├── payment.integration.spec.ts
├── wallet.integration.spec.ts
└── promo.integration.spec.ts
```

**Acceptance Criteria:**
- [ ] Integration tests dengan real PostgreSQL (Testcontainers)
- [ ] Semua critical paths tested
- [ ] Transaction rollback after each test
- [ ] Tests isolated dan repeatable

---

### P5D-004: Backend Integration Tests - notification-service

**Task ID:** P5D-004  
**Task Name:** Integration Tests untuk notification-service  
**Description:**  
Buat integration tests untuk notification-service termasuk queue dan providers.

**Delegated To:** `/droid senior-backend-engineer`  
**Related Skills:** `test-driven-development`  
**Dependencies:** Tidak ada  
**Estimate:** 1 hari  
**Priority:** P1 (Critical)

**Test Scenarios:**

| Scenario | Description |
|----------|-------------|
| Queue Processing | Enqueue notification, process, verify sent |
| Email Provider | Send email (mocked), verify template |
| Telegram Provider | Send message (mocked), verify format |
| In-App Creation | Create in-app notification, verify persisted |

**Acceptance Criteria:**
- [ ] Queue processing tested dengan Redis mock
- [ ] Provider integrations tested dengan mocks
- [ ] Template rendering tested
- [ ] Error handling tested

---

### P5D-005: Cross-Service E2E Tests

**Task ID:** P5D-005  
**Task Name:** Cross-Service End-to-End Tests  
**Description:**  
Buat E2E tests yang mencover full user flows across multiple services.

**Delegated To:** `/droid senior-qa-engineer`  
**Related Skills:** `test-driven-development`, `browser`  
**Dependencies:** P5D-001, P5D-002, P5D-003, P5D-004  
**Estimate:** 2 hari  
**Priority:** P1 (Critical)

**Test Flows:**

| Flow | Services Involved |
|------|-------------------|
| Registration → Order → Payment → VPS Active | auth, catalog, order, billing, notification, instance |
| Admin Payment Override → VPS Provisioned | admin, order, notification, instance |
| Wallet Deposit → Order with Balance | billing, order |
| VPS Action (Reboot) | customer-web, instance |

**Test Structure:**
```
test/e2e/
├── order-flow.e2e.spec.ts
├── admin-override.e2e.spec.ts
├── wallet-flow.e2e.spec.ts
└── vps-actions.e2e.spec.ts
```

**Acceptance Criteria:**
- [ ] Full order flow tested end-to-end
- [ ] Admin override flow tested
- [ ] Wallet flow tested
- [ ] All tests passing dalam < 2 menit

---

### P5D-006: Security Testing Suite

**Task ID:** P5D-006  
**Task Name:** Security Testing Suite  
**Description:**  
Implementasi security tests covering OWASP Top 10 dan authentication/authorization.

**Delegated To:** `/droid senior-qa-engineer`  
**Related Skills:** `defense-in-depth`  
**Dependencies:** Tidak ada  
**Estimate:** 2 hari  
**Priority:** P1 (Critical)

**Security Test Areas:**

| Area | Tests |
|------|-------|
| Authentication | JWT validation, token expiry, refresh rotation |
| Authorization | Role-based access, resource ownership |
| Input Validation | SQL injection, XSS, CSRF protection |
| API Security | Rate limiting, API key validation, CORS |
| Data Protection | Sensitive data exposure, PII handling |

**Test Structure:**
```
test/security/
├── auth.security.spec.ts
├── authorization.security.spec.ts
├── injection.security.spec.ts
├── api.security.spec.ts
└── data-protection.security.spec.ts
```

**Acceptance Criteria:**
- [ ] OWASP Top 10 vulnerabilities tested
- [ ] JWT security tested
- [ ] Rate limiting verified
- [ ] No sensitive data in logs
- [ ] CORS properly configured

---

### P5D-007: Performance/Load Testing

**Task ID:** P5D-007  
**Task Name:** Performance dan Load Testing  
**Description:**  
Setup performance testing dengan k6 untuk benchmark API performance.

**Delegated To:** `/droid senior-qa-engineer`  
**Related Skills:** Tidak ada  
**Dependencies:** P5B-002 (Monitoring)  
**Estimate:** 1 hari  
**Priority:** P2 (High)

**Performance Targets:**

| Metric | Target |
|--------|--------|
| API Response Time (p95) | < 500ms |
| Throughput | > 100 req/s per service |
| Error Rate | < 1% |
| Concurrent Users | 1000 |

**Test Scripts:**
```
test/performance/
├── api-gateway.k6.js
├── order-flow.k6.js
├── catalog-browse.k6.js
└── vps-actions.k6.js
```

**Acceptance Criteria:**
- [ ] k6 scripts created untuk critical paths
- [ ] Baseline benchmarks established
- [ ] Performance report generated
- [ ] Bottlenecks identified

---

## Phase 6: v1.3 Multi-Provider

**Timeline:** Minggu ke-7 hingga ke-10  
**Goal:** Implementasi multi-provider support (Vultr, Linode)  
**Priority:** P2

### Summary

| Task ID | Task Name | Delegated To | Estimate | Priority |
|---------|-----------|--------------|----------|----------|
| P6-001 | Design Provider Service Architecture | senior-backend-engineer | 2 hari | P1 |
| P6-002 | Implement Provider Service Core | senior-backend-engineer | 3 hari | P1 |
| P6-003 | Migrate DigitalOcean Adapter | senior-backend-engineer | 2 hari | P1 |
| P6-004 | Implement Vultr Adapter | senior-backend-engineer | 3 hari | P2 |
| P6-005 | Implement Linode Adapter | senior-backend-engineer | 3 hari | P2 |
| P6-006 | Update Order Service Integration | senior-backend-engineer | 2 hari | P1 |
| P6-007 | Update Catalog Service - Multi-Provider Plans | senior-backend-engineer | 2 hari | P1 |
| P6-008 | Frontend Provider Selection UI | senior-frontend-engineer | 2 hari | P2 |
| P6-009 | Provider Service Testing | senior-qa-engineer | 2 hari | P1 |

---

### P6-001: Design Provider Service Architecture

**Task ID:** P6-001  
**Task Name:** Design Arsitektur Provider Service  
**Description:**  
Design comprehensive architecture untuk provider-service dengan adapter pattern yang scalable.

**Delegated To:** `/droid senior-backend-engineer`  
**Related Skills:** `writing-plans`, `brainstorming`  
**Dependencies:** Tidak ada  
**Estimate:** 2 hari  
**Priority:** P1 (Critical)

**Architecture Overview:**

```
provider-service/
├── src/
│   ├── adapters/
│   │   ├── digitalocean/
│   │   │   ├── digitalocean.adapter.ts
│   │   │   ├── digitalocean.types.ts
│   │   │   └── digitalocean.mapper.ts
│   │   ├── vultr/
│   │   │   ├── vultr.adapter.ts
│   │   │   ├── vultr.types.ts
│   │   │   └── vultr.mapper.ts
│   │   └── linode/
│   │       ├── linode.adapter.ts
│   │       ├── linode.types.ts
│   │       └── linode.mapper.ts
│   ├── interfaces/
│   │   ├── cloud-provider.interface.ts
│   │   ├── provision-request.interface.ts
│   │   ├── provision-result.interface.ts
│   │   └── instance-action.interface.ts
│   ├── modules/
│   │   └── provider/
│   │       ├── provider.module.ts
│   │       ├── provider.service.ts
│   │       └── provider.controller.ts
│   ├── factory/
│   │   └── provider.factory.ts
│   └── common/
│       └── dto/
```

**Interface Definition:**
```typescript
interface ICloudProvider {
  // Instance Lifecycle
  createInstance(request: ProvisionRequest): Promise<ProvisionResult>;
  deleteInstance(instanceId: string): Promise<void>;
  getInstanceStatus(instanceId: string): Promise<InstanceStatus>;
  
  // Instance Actions
  performAction(instanceId: string, action: InstanceAction): Promise<ActionResult>;
  
  // Resource Discovery
  listRegions(): Promise<Region[]>;
  listSizes(): Promise<Size[]>;
  listImages(): Promise<Image[]>;
  
  // Metrics (optional)
  getMetrics?(instanceId: string): Promise<Metrics>;
  
  // Console (optional)
  getConsoleUrl?(instanceId: string): Promise<string>;
}
```

**Deliverables:**
- Architecture diagram
- Interface definitions
- Provider factory design
- Database schema untuk multi-provider tracking

**Acceptance Criteria:**
- [ ] Architecture document created
- [ ] Interface definitions complete
- [ ] Scalable untuk future providers
- [ ] Clear separation of concerns

---

### P6-002: Implement Provider Service Core

**Task ID:** P6-002  
**Task Name:** Implementasi Provider Service Core  
**Description:**  
Implementasi core provider-service dengan module structure, factory pattern, dan base functionality.

**Delegated To:** `/droid senior-backend-engineer`  
**Related Skills:** `test-driven-development`  
**Dependencies:** P6-001 (Design)  
**Estimate:** 3 hari  
**Priority:** P1 (Critical)

**Components:**

1. **ProviderFactory** - Create provider adapter berdasarkan provider type
2. **ProviderService** - Orchestrate provider operations
3. **ProviderController** - Internal API endpoints
4. **ProviderModule** - NestJS module setup

**Internal API Endpoints:**
```
POST /internal/provision           # Create instance
DELETE /internal/instances/:id     # Delete instance
GET  /internal/instances/:id       # Get instance status
POST /internal/instances/:id/action # Perform action
GET  /internal/regions             # List regions
GET  /internal/sizes               # List sizes
GET  /internal/images              # List images
```

**Acceptance Criteria:**
- [ ] Core module structure created
- [ ] Provider factory implemented
- [ ] Internal API endpoints working
- [ ] Unit tests > 80% coverage
- [ ] Integration dengan existing order-service siap

---

### P6-003: Migrate DigitalOcean Adapter

**Task ID:** P6-003  
**Task Name:** Migrasi DigitalOcean Adapter dari Order Service  
**Description:**  
Migrate existing DigitalOcean integration dari order-service ke provider-service menggunakan adapter pattern.

**Delegated To:** `/droid senior-backend-engineer`  
**Related Skills:** `test-driven-development`  
**Dependencies:** P6-002 (Core)  
**Estimate:** 2 hari  
**Priority:** P1 (Critical)

**Migration Steps:**
1. Extract DigitalOcean logic dari order-service
2. Implement ICloudProvider interface
3. Create DO-specific mappers
4. Test dengan existing workflows
5. Update order-service untuk call provider-service

**Features to Migrate:**
- Droplet creation
- Droplet deletion
- Droplet actions (power, reboot, etc.)
- Region/Size/Image listing
- Metrics fetching
- Console URL generation

**Acceptance Criteria:**
- [ ] DO adapter implements ICloudProvider
- [ ] All existing functionality preserved
- [ ] Zero regression in order flow
- [ ] Tests migrated dan passing

---

### P6-004: Implement Vultr Adapter

**Task ID:** P6-004  
**Task Name:** Implementasi Vultr Adapter  
**Description:**  
Implementasi Vultr cloud provider adapter dengan full ICloudProvider interface.

**Delegated To:** `/droid senior-backend-engineer`  
**Related Skills:** `test-driven-development`  
**Dependencies:** P6-002 (Core)  
**Estimate:** 3 hari  
**Priority:** P2 (High)

**Vultr API Reference:**
- API Docs: https://www.vultr.com/api/
- Base URL: https://api.vultr.com/v2

**API Mapping:**

| Operation | Vultr API Endpoint |
|-----------|-------------------|
| Create Instance | POST /instances |
| Delete Instance | DELETE /instances/{instance-id} |
| Get Instance | GET /instances/{instance-id} |
| Reboot | POST /instances/{instance-id}/reboot |
| Halt | POST /instances/{instance-id}/halt |
| Start | POST /instances/{instance-id}/start |
| List Regions | GET /regions |
| List Plans | GET /plans |
| List OS | GET /os |

**Environment Variables:**
```env
VULTR_API_KEY=xxx
```

**Acceptance Criteria:**
- [ ] Vultr adapter implements ICloudProvider
- [ ] All operations functional
- [ ] Error handling comprehensive
- [ ] Rate limiting handled
- [ ] Tests dengan mocked Vultr API

---

### P6-005: Implement Linode Adapter

**Task ID:** P6-005  
**Task Name:** Implementasi Linode Adapter  
**Description:**  
Implementasi Linode cloud provider adapter dengan full ICloudProvider interface.

**Delegated To:** `/droid senior-backend-engineer`  
**Related Skills:** `test-driven-development`  
**Dependencies:** P6-002 (Core)  
**Estimate:** 3 hari  
**Priority:** P2 (High)

**Linode API Reference:**
- API Docs: https://www.linode.com/docs/api/
- Base URL: https://api.linode.com/v4

**API Mapping:**

| Operation | Linode API Endpoint |
|-----------|-------------------|
| Create Instance | POST /linode/instances |
| Delete Instance | DELETE /linode/instances/{linodeId} |
| Get Instance | GET /linode/instances/{linodeId} |
| Reboot | POST /linode/instances/{linodeId}/reboot |
| Shutdown | POST /linode/instances/{linodeId}/shutdown |
| Boot | POST /linode/instances/{linodeId}/boot |
| List Regions | GET /regions |
| List Types | GET /linode/types |
| List Images | GET /images |

**Environment Variables:**
```env
LINODE_API_TOKEN=xxx
```

**Acceptance Criteria:**
- [ ] Linode adapter implements ICloudProvider
- [ ] All operations functional
- [ ] Error handling comprehensive
- [ ] Rate limiting handled
- [ ] Tests dengan mocked Linode API

---

### P6-006: Update Order Service Integration

**Task ID:** P6-006  
**Task Name:** Update Order Service untuk Integrasi dengan Provider Service  
**Description:**  
Modifikasi order-service untuk menggunakan provider-service alih-alih direct DigitalOcean API calls.

**Delegated To:** `/droid senior-backend-engineer`  
**Related Skills:** Tidak ada  
**Dependencies:** P6-003 (DO Adapter migrated)  
**Estimate:** 2 hari  
**Priority:** P1 (Critical)

**Changes Required:**

1. **ProvisioningService** - Call provider-service internal API
2. **Order Schema** - Add `providerId` field
3. **ProvisioningTask Schema** - Add `providerType` field
4. **Configuration** - Add PROVIDER_SERVICE_BASE_URL

**New Order Flow:**
```
Order Created
    ↓
Payment Confirmed
    ↓
order-service → provider-service (POST /internal/provision)
    ↓
provider-service → [DO/Vultr/Linode]
    ↓
Webhook back to order-service
    ↓
Order Status: ACTIVE
```

**Acceptance Criteria:**
- [ ] Order-service calls provider-service
- [ ] Provider selection berdasarkan plan
- [ ] Backward compatible dengan existing orders
- [ ] All existing tests passing

---

### P6-007: Update Catalog Service - Multi-Provider Plans

**Task ID:** P6-007  
**Task Name:** Update Catalog Service untuk Multi-Provider Plans  
**Description:**  
Modifikasi catalog-service untuk mendukung plans dari multiple providers.

**Delegated To:** `/droid senior-backend-engineer`  
**Related Skills:** Tidak ada  
**Dependencies:** Tidak ada  
**Estimate:** 2 hari  
**Priority:** P1 (Critical)

**Schema Changes:**
```prisma
model VpsPlan {
  // ... existing fields
  
  providerId    String   @map("provider_id")
  provider      Provider @relation(fields: [providerId], references: [id])
  
  providerSlug  String   @map("provider_slug") // e.g., "s-1vcpu-1gb" for DO
}

model Provider {
  id            String    @id @default(uuid())
  name          String    // "DigitalOcean", "Vultr", "Linode"
  slug          String    @unique // "digitalocean", "vultr", "linode"
  isActive      Boolean   @default(true) @map("is_active")
  plans         VpsPlan[]
}
```

**API Changes:**
```
GET /api/v1/plans                   # Now includes provider info
GET /api/v1/plans?provider=vultr    # Filter by provider
GET /api/v1/providers               # List active providers
```

**Acceptance Criteria:**
- [ ] Provider model created
- [ ] VpsPlan linked ke Provider
- [ ] API endpoints updated
- [ ] Filtering by provider berfungsi
- [ ] Admin can manage providers

---

### P6-008: Frontend Provider Selection UI

**Task ID:** P6-008  
**Task Name:** Implementasi UI untuk Provider Selection  
**Description:**  
Update customer-web untuk menampilkan dan memilih provider saat order VPS.

**Delegated To:** `/droid senior-frontend-engineer`  
**Related Skills:** `shadcn-management`  
**Dependencies:** P6-007 (Catalog API)  
**Estimate:** 2 hari  
**Priority:** P2 (High)

**UI Changes:**

1. **Provider Selector** - Step 1 di order flow, pilih provider
2. **Plan Cards** - Update dengan provider badge
3. **Order Summary** - Tampilkan provider info
4. **VPS Dashboard** - Tampilkan provider di detail

**Mockup Provider Selector:**
```
┌─────────────────────────────────────────────────────────────┐
│ Pilih Provider                                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   DO Logo    │  │  Vultr Logo  │  │ Linode Logo  │      │
│  │ DigitalOcean │  │    Vultr     │  │   Linode     │      │
│  │   8 Plans    │  │   6 Plans    │  │   5 Plans    │      │
│  │  ✓ Selected  │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Provider selector di step 1 order flow
- [ ] Plans filtered berdasarkan selected provider
- [ ] Provider info tampil di order summary
- [ ] Provider badge di VPS dashboard
- [ ] Responsive design

---

### P6-009: Provider Service Testing

**Task ID:** P6-009  
**Task Name:** Testing Lengkap untuk Provider Service  
**Description:**  
Buat comprehensive test suite untuk provider-service covering semua adapters.

**Delegated To:** `/droid senior-qa-engineer`  
**Related Skills:** `test-driven-development`  
**Dependencies:** P6-003, P6-004, P6-005  
**Estimate:** 2 hari  
**Priority:** P1 (Critical)

**Test Categories:**

| Category | Scope |
|----------|-------|
| Unit Tests | Each adapter, factory, service |
| Integration Tests | Provider service with mocked providers |
| Contract Tests | Verify adapter implementations match interface |
| E2E Tests | Full provision flow per provider |

**Test Structure:**
```
apps/provider-service/
├── src/
│   └── adapters/
│       ├── digitalocean/
│       │   └── digitalocean.adapter.spec.ts
│       ├── vultr/
│       │   └── vultr.adapter.spec.ts
│       └── linode/
│           └── linode.adapter.spec.ts
└── test/
    ├── integration/
    │   └── provision.integration.spec.ts
    └── e2e/
        └── provider.e2e.spec.ts
```

**Acceptance Criteria:**
- [ ] Unit test coverage > 80% untuk provider-service
- [ ] Integration tests untuk setiap provider
- [ ] Contract tests memverifikasi interface compliance
- [ ] E2E tests untuk critical paths

---

## Delegation Commands Reference

### Quick Start per Phase

**Phase 5A:**
```bash
/droid senior-backend-engineer
# Task: P5A-001 - Fix notification-service test mocks

/droid senior-ui-ux-designer
# Task: P5A-002 - Complete landing page image assets

/droid senior-copywriter
# Task: P5A-003 - Landing page copy review

/droid senior-frontend-engineer
# Task: P5A-004 - Fix landing page broken links

/droid senior-qa-engineer
# Task: P5A-005 - Verify all services health checks
```

**Phase 5B:**
```bash
/droid senior-devops-engineer
# Tasks: P5B-001 to P5B-006 - All infrastructure tasks

/droid senior-backend-engineer
# Task: P5B-004 - Swagger documentation
```

**Phase 5C:**
```bash
/droid senior-backend-engineer
# Tasks: P5C-001, P5C-003, P5C-005 - Backend notification & retry

/droid senior-frontend-engineer
# Task: P5C-002 - Frontend notifications

/droid senior-devops-engineer
# Task: P5C-004 - Sentry integration
```

**Phase 5D:**
```bash
/droid senior-frontend-engineer
# Tasks: P5D-001, P5D-002 - Frontend tests

/droid senior-backend-engineer
# Tasks: P5D-003, P5D-004 - Backend integration tests

/droid senior-qa-engineer
# Tasks: P5D-005, P5D-006, P5D-007 - E2E & security tests
```

**Phase 6:**
```bash
/droid senior-backend-engineer
# Tasks: P6-001 to P6-007 - All provider service work

/droid senior-frontend-engineer
# Task: P6-008 - Provider selection UI

/droid senior-qa-engineer
# Task: P6-009 - Provider service testing
```

---

## Effort Summary by Droid

| Droid | Phase 5A | Phase 5B | Phase 5C | Phase 5D | Phase 6 | Total |
|-------|----------|----------|----------|----------|---------|-------|
| **senior-backend-engineer** | 1 hari | 2 hari | 4 hari | 3 hari | 17 hari | **27 hari** |
| **senior-frontend-engineer** | 0.5 hari | - | 2 hari | 5 hari | 2 hari | **9.5 hari** |
| **senior-qa-engineer** | 0.5 hari | - | - | 5 hari | 2 hari | **7.5 hari** |
| **senior-devops-engineer** | - | 10 hari | 1.5 hari | - | - | **11.5 hari** |
| **senior-ui-ux-designer** | 1 hari | - | - | - | - | **1 hari** |
| **senior-copywriter** | 0.5 hari | - | - | - | - | **0.5 hari** |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| Provider API changes | Medium | Medium | Version pinning, integration tests | Backend |
| CI/CD pipeline complexity | Medium | High | Incremental setup, documentation | DevOps |
| Test coverage target tidak tercapai | Low | Medium | Prioritize critical paths | QA |
| Multi-provider timing conflicts | Low | High | Sequential adapter development | Backend |
| Performance degradation | Low | High | Load testing, monitoring | QA/DevOps |

---

## Success Metrics

| Metric | Current | Phase 5 Target | Phase 6 Target |
|--------|---------|----------------|----------------|
| Backend Test Coverage | ~80% | 85% | 85% |
| Frontend Test Coverage | ~10% | 60% | 65% |
| CI/CD Pipeline | ❌ None | ✅ Full | ✅ Full |
| Monitoring | ❌ None | ✅ Prometheus/Grafana | ✅ Enhanced |
| API Documentation | ❌ None | ✅ Swagger | ✅ Swagger |
| Providers Supported | 1 (DO) | 1 (DO) | 3 (DO, Vultr, Linode) |
| Error Tracking | ❌ None | ✅ Sentry | ✅ Sentry |

---

## Appendix: Environment Variables Reference

### New Variables for Phase 5-6

```env
# Phase 5B - Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_URL=http://monitoring.webrana.id

# Phase 5C - Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=v1.2.0
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx

# Phase 5C - WebSocket
WEBSOCKET_ENABLED=true

# Phase 6 - Provider Service
PROVIDER_SERVICE_BASE_URL=http://provider-service:3007

# Phase 6 - Vultr
VULTR_API_KEY=xxx
VULTR_ENABLED=true

# Phase 6 - Linode
LINODE_API_TOKEN=xxx
LINODE_ENABLED=true
```

---

**Document Version:** 1.0  
**Status:** Ready for Delegation  
**Created:** 2025-12-04  
**Author:** Senior Product Manager  

---

*Next Steps: Mulai Phase 5A dengan `/droid senior-backend-engineer` untuk task P5A-001*
