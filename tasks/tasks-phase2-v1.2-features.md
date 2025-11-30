# Task Plan: Phase 2 - v1.2 Features

**Created:** 2025-11-30  
**Author:** Senior Product Manager  
**Status:** In Progress  
**Timeline:** Week 4-5

---

## Overview

Phase 2 fokus pada penyelesaian fitur v1.2 yang belum diimplementasi:
1. **In-App Notifications** - Real-time notifications dalam aplikasi
2. **Error Tracking (Sentry)** - Centralized error monitoring
3. **Performance Monitoring** - APM untuk tracking response times

---

## V12-001: In-App Notifications

### Backend Tasks

**Assignee:** Senior Backend Engineer  
**Effort:** 3 days

#### V12-001-BE-1: Database Schema & Model

**File:** `apps/notification-service/prisma/schema.prisma`

```prisma
model InAppNotification {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id")
  
  // Content
  title       String   @db.VarChar(255)
  message     String   @db.Text
  type        NotificationType
  
  // Metadata
  actionUrl   String?  @map("action_url") @db.VarChar(500)
  metadata    Json?
  
  // Status
  isRead      Boolean  @default(false) @map("is_read")
  readAt      DateTime? @map("read_at") @db.Timestamptz
  
  // Timestamps
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  
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

#### V12-001-BE-2: User Notification API

**File:** `apps/notification-service/src/modules/user-notification/`

```
user-notification/
├── user-notification.module.ts
├── user-notification.controller.ts
├── user-notification.service.ts
├── dto/
│   ├── list-notifications.dto.ts
│   └── notification-response.dto.ts
└── user-notification.controller.spec.ts
```

**Endpoints:**
- `GET /api/v1/notifications` - List user notifications (paginated)
- `GET /api/v1/notifications/unread-count` - Get unread count
- `POST /api/v1/notifications/:id/read` - Mark as read
- `POST /api/v1/notifications/read-all` - Mark all as read
- `DELETE /api/v1/notifications/:id` - Delete notification

#### V12-001-BE-3: WebSocket Gateway

**File:** `apps/notification-service/src/modules/websocket/`

```
websocket/
├── websocket.module.ts
├── websocket.gateway.ts
├── websocket.service.ts
└── dto/
    └── notification-event.dto.ts
```

**Events:**
- `notification:new` - New notification pushed to client
- `notification:read` - Notification marked as read
- `connection:auth` - Client authentication with JWT

#### V12-001-BE-4: Integration with Existing Events

Update `notification.service.ts` to also create in-app notifications when sending email/telegram:

```typescript
async notify(event: NotificationEvent, userId: string, data: any) {
  // Existing: Send email/telegram
  await this.sendExternalNotifications(event, userId, data);
  
  // New: Create in-app notification
  await this.createInAppNotification(event, userId, data);
  
  // New: Push via WebSocket
  await this.websocketService.pushToUser(userId, notification);
}
```

---

### Frontend Tasks

**Assignee:** Senior Frontend Engineer  
**Effort:** 2 days

#### V12-001-FE-1: Notification Bell Component

**File:** `apps/customer-web/src/components/notifications/`

```
notifications/
├── NotificationBell.tsx      # Bell icon with unread count badge
├── NotificationDropdown.tsx  # Dropdown list of notifications
├── NotificationItem.tsx      # Single notification item
├── NotificationEmpty.tsx     # Empty state
└── index.ts
```

#### V12-001-FE-2: WebSocket Connection Hook

**File:** `apps/customer-web/src/hooks/use-notifications.ts`

```typescript
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  // WebSocket connection
  // Real-time updates
  // Mark as read functionality
  
  return { notifications, unreadCount, isConnected, markAsRead, markAllAsRead };
}
```

#### V12-001-FE-3: Integration in Layout

Update `apps/customer-web/src/components/layouts/main-layout.tsx`:
- Add NotificationBell to navbar
- Initialize WebSocket connection on mount

#### V12-001-FE-4: Notification Preferences (Optional)

**File:** `apps/customer-web/src/app/(dashboard)/profile/notifications/page.tsx`
- Toggle email notifications
- Toggle telegram notifications
- Toggle in-app notifications

---

## V12-002: Error Tracking (Sentry)

**Assignee:** Senior DevOps Engineer  
**Effort:** 2 days

### V12-002-1: Sentry Project Setup

1. Create Sentry project for webrana-cloud
2. Generate DSN for each environment (dev, staging, prod)
3. Create alert rules

### V12-002-2: Backend Integration

**Install dependencies:**
```bash
npm install @sentry/node @sentry/profiling-node
```

**File:** `libs/common/src/sentry/`
```
sentry/
├── sentry.module.ts
├── sentry.service.ts
├── sentry.interceptor.ts  # Capture request context
└── sentry.filter.ts       # Capture unhandled exceptions
```

**Integration in each service:**
```typescript
// apps/*/src/main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
});
```

### V12-002-3: Frontend Integration

**Install dependencies:**
```bash
npm install @sentry/react
```

**File:** `apps/customer-web/src/lib/sentry.ts`
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**Error Boundary:**
```typescript
// apps/customer-web/src/app/layout.tsx
import { ErrorBoundary } from '@sentry/react';

<ErrorBoundary fallback={<ErrorFallback />}>
  {children}
</ErrorBoundary>
```

### V12-002-4: Source Maps Upload

**File:** `apps/customer-web/vite.config.ts`
```typescript
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  plugins: [
    sentryVitePlugin({
      org: 'webrana',
      project: 'customer-web',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

### V12-002-5: Environment Variables

```env
# Backend
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=v1.2.0

# Frontend
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## V12-003: Performance Monitoring

**Assignee:** Senior DevOps Engineer  
**Effort:** 1 day

### V12-003-1: Sentry Performance

Sentry Performance sudah termasuk dalam setup V12-002. Tambahan:

```typescript
// Custom transaction for critical operations
const transaction = Sentry.startTransaction({
  name: 'provision-vps',
  op: 'task',
});

try {
  await provisionDroplet();
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('internal_error');
  throw error;
} finally {
  transaction.finish();
}
```

### V12-003-2: Custom Spans

```typescript
// Add spans for database operations
const span = transaction.startChild({
  op: 'db.query',
  description: 'SELECT orders',
});
const orders = await prisma.order.findMany();
span.finish();
```

### V12-003-3: Performance Baselines

Set alert rules in Sentry:
- P95 response time > 500ms
- Error rate > 5%
- Transaction throughput drop > 50%

---

## Delegation Summary

| Task | Assignee | Command | Effort |
|------|----------|---------|--------|
| V12-001 (Backend) | Backend Engineer | `/droid senior-backend-engineer` | 3 days |
| V12-001 (Frontend) | Frontend Engineer | `/droid senior-frontend-engineer` | 2 days |
| V12-002 (Sentry) | DevOps Engineer | `/droid senior-devops-engineer` | 2 days |
| V12-003 (Performance) | DevOps Engineer | `/droid senior-devops-engineer` | 1 day |

---

## Acceptance Criteria

### In-App Notifications
- [ ] User dapat melihat list notifikasi di navbar
- [ ] Unread count badge muncul
- [ ] Real-time push notification via WebSocket
- [ ] Mark as read functionality works
- [ ] Integration dengan existing notification events

### Sentry Integration
- [ ] All services connected to Sentry
- [ ] Errors captured with full context
- [ ] Source maps uploaded untuk frontend
- [ ] Alert rules configured
- [ ] Performance monitoring active

---

## Commands to Verify

```bash
# Run tests for new features
npx nx test notification-service
npx nx test customer-web

# Check Sentry connection
curl -X POST https://sentry.io/api/0/projects/webrana/customer-web/store/ \
  -H "X-Sentry-Auth: ..." \
  -d '{"message": "Test from CLI"}'

# Verify WebSocket
wscat -c ws://localhost:3004/notifications -H "Authorization: Bearer <token>"
```

---

**Document Version:** 1.0  
**Status:** Ready for Delegation
