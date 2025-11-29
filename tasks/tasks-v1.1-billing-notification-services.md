# Tasks: WeBrana Cloud v1.1 - Backend Services

> PRD Reference: `prd-webrana-cloud-platform-v1.md` Section 6.4, 6.5
> Target: Q1 2025
> Priority: P1

---

## Overview

v1.1 focuses on billing integration (Tripay) and notification services (Email + Telegram) to enable end-to-end automated payment flow.

### Dependencies
- ✅ auth-service (v1.0)
- ✅ catalog-service (v1.0)
- ✅ order-service (v1.0)

### Deliverables
1. **billing-service**: Invoice generation, Tripay integration, payment webhook
2. **notification-service**: Email (SMTP/SES) + Telegram bot notifications

---

## Service 1: billing-service

### BE-101: Project Setup & Configuration

- [x] 101.1 Verify NestJS app exists: `apps/billing-service`
- [x] 101.2 Install dependencies: `@nestjs/axios`, `@nestjs/config`, `class-validator`, `class-transformer`, `@prisma/client`, `prisma`
- [x] 101.3 Create `.env.example` with all required variables:
  ```
  DATABASE_URL=postgresql://...
  TRIPAY_API_KEY=xxx
  TRIPAY_PRIVATE_KEY=xxx
  TRIPAY_MERCHANT_CODE=xxx
  TRIPAY_MODE=sandbox|production
  ORDER_SERVICE_BASE_URL=http://localhost:3003
  INTERNAL_API_KEY=xxx
  ```
- [x] 101.4 Configure `AppModule` with `ConfigModule.forRoot({ isGlobal: true })`
- [x] 101.5 Setup `main.ts` with global prefix, validation pipe, port

### BE-102: Database Schema (Prisma)

- [x] 102.1 Initialize Prisma: `npx prisma init`
- [x] 102.2 Create enums:
  - `InvoiceStatus`: `PENDING`, `PAID`, `EXPIRED`, `CANCELLED`
  - `PaymentMethod`: `VIRTUAL_ACCOUNT`, `EWALLET`, `QRIS`, `CONVENIENCE_STORE`
  - `PaymentChannel`: `BCA_VA`, `BNI_VA`, `BRI_VA`, `MANDIRI_VA`, `OVO`, `GOPAY`, `DANA`, `QRIS`, etc.
- [x] 102.3 Create `Invoice` model:
  ```prisma
  model Invoice {
    id              String        @id @default(uuid())
    orderId         String        @unique
    userId          String
    invoiceNumber   String        @unique
    amount          Int           // IDR (final price dari order)
    status          InvoiceStatus @default(PENDING)
    paymentMethod   PaymentMethod?
    paymentChannel  PaymentChannel?
    paymentCode     String?       // VA number / payment code
    paymentUrl      String?       // Redirect URL dari Tripay
    tripayReference String?       // Tripay transaction reference
    expiredAt       DateTime
    paidAt          DateTime?
    paidAmount      Int?
    paidChannel     String?
    callbackPayload Json?         // Raw callback dari Tripay
    createdAt       DateTime      @default(now())
    updatedAt       DateTime      @updatedAt
    payments        Payment[]
  }
  ```
- [x] 102.4 Create `Payment` model (for audit trail):
  ```prisma
  model Payment {
    id              String   @id @default(uuid())
    invoiceId       String
    invoice         Invoice  @relation(fields: [invoiceId], references: [id])
    amount          Int
    channel         String
    reference       String   // Tripay reference
    status          String   // SUCCESS, FAILED
    rawPayload      Json?
    processedAt     DateTime @default(now())
  }
  ```
- [x] 102.5 Run migration: `npx prisma migrate dev --name init` (schema created, migration pending DB)
- [x] 102.6 Create `PrismaModule` and `PrismaService`

### BE-103: Tripay Integration Module

- [x] 103.1 Create `TripayModule` with `HttpModule.registerAsync()`
- [x] 103.2 Create `TripayService` with methods:
  - [x] 103.2.1 `getPaymentChannels()`: GET /merchant/payment-channel
  - [x] 103.2.2 `createTransaction(dto)`: POST /transaction/create (closed payment)
  - [x] 103.2.3 `getTransactionDetail(reference)`: GET /transaction/detail
  - [x] 103.2.4 `generateSignature(params)`: HMAC-SHA256 signature generator
  - [x] 103.2.5 `verifyCallbackSignature(payload, signature)`: Validate webhook
- [x] 103.3 Implement Tripay API request signing
- [x] 103.4 Add error handling with custom exceptions:
  - `TripayApiException`
  - `TripaySignatureException`
- [x] 103.5 Write unit tests for `TripayService`

### BE-104: Invoice Module

- [x] 104.1 Create `InvoiceModule`
- [x] 104.2 Create `InvoiceService` with methods:
  - [x] 104.2.1 `createInvoice(orderId, userId, amount)`:
    - Generate invoice number: `INV-{YYYYMMDD}-{RANDOM}`
    - Set expiry (e.g., 24 hours)
    - Create Invoice record with status `PENDING`
  - [x] 104.2.2 `getInvoiceById(invoiceId)`
  - [x] 104.2.3 `getInvoiceByOrderId(orderId)`
  - [x] 104.2.4 `getInvoicesByUserId(userId, pagination)`
  - [x] 104.2.5 `initiatePayment(invoiceId, channel)`:
    - Call Tripay to create transaction
    - Save payment code, URL, Tripay reference
    - Return payment instructions
  - [x] 104.2.6 `processCallback(callbackPayload)`:
    - Verify signature
    - Update invoice status
    - Record Payment entry
    - If SUCCESS: Call order-service internal API to mark PAID
  - [x] 104.2.7 `expireInvoice(invoiceId)`: Mark as EXPIRED (for cron job)
- [x] 104.3 Create DTOs:
  - `CreateInvoiceDto`
  - `InitiatePaymentDto` (channel selection)
  - `InvoiceResponseDto`
  - `TripayCallbackDto`
- [x] 104.4 Write unit tests for `InvoiceService`

### BE-105: Order Service Client

- [x] 105.1 Create `OrderClientModule` with `HttpModule`
- [x] 105.2 Create `OrderClientService` with method:
  - [x] 105.2.1 `updatePaymentStatus(orderId, status, reference)`:
    - POST /internal/orders/{id}/payment-status
    - Use INTERNAL_API_KEY header
- [x] 105.3 Add error handling and retry logic
- [x] 105.4 Write unit tests

### BE-106: User APIs

- [ ] 106.1 Create `InvoiceController` with prefix `billing/invoices`
- [ ] 106.2 Implement JWT auth guard (copy pattern from order-service)
- [ ] 106.3 Implement endpoints:
  - [ ] 106.3.1 `POST /api/v1/billing/invoices`:
    - Body: `{ orderId }`
    - Creates invoice for order
    - Returns invoice with available payment channels
  - [ ] 106.3.2 `GET /api/v1/billing/invoices`:
    - List user's invoices with pagination
  - [ ] 106.3.3 `GET /api/v1/billing/invoices/:id`:
    - Invoice detail with payment instructions
  - [ ] 106.3.4 `POST /api/v1/billing/invoices/:id/pay`:
    - Body: `{ channel: "BCA_VA" }`
    - Initiates payment, returns VA number / QR / payment URL
- [ ] 106.4 Write unit tests for controller

### BE-107: Webhook & Internal APIs

- [ ] 107.1 Create `WebhookController` for Tripay callbacks
- [ ] 107.2 Implement `POST /internal/billing/webhooks/tripay`:
  - Verify signature
  - Process callback via InvoiceService
  - Return 200 OK
- [ ] 107.3 Create `InternalInvoiceController`:
  - [ ] 107.3.1 `GET /internal/billing/transactions`:
    - Admin view of all transactions
    - Filters: status, date range, channel
- [ ] 107.4 Write unit tests

### BE-108: Integration Testing

- [ ] 108.1 Setup Testcontainers for PostgreSQL
- [ ] 108.2 Create mock Tripay server for testing
- [ ] 108.3 Write integration tests:
  - [ ] Invoice creation flow
  - [ ] Payment initiation flow
  - [ ] Webhook callback processing
  - [ ] Order service notification after payment
- [ ] 108.4 Create README.md with setup and API docs

### BE-109: Docker & Deployment

- [ ] 109.1 Create Dockerfile for billing-service
- [ ] 109.2 Add to docker-compose with database
- [ ] 109.3 Smoke test API endpoints
- [ ] 109.4 Document environment variables

---

## Service 2: notification-service

### BE-201: Project Setup & Configuration

- [ ] 201.1 Verify NestJS app exists: `apps/notification-service`
- [ ] 201.2 Install dependencies: `@nestjs/config`, `nodemailer`, `telegraf` (or `node-telegram-bot-api`), `ioredis`, `@nestjs/bull` (for queue)
- [ ] 201.3 Create `.env.example`:
  ```
  SMTP_HOST=smtp.example.com
  SMTP_PORT=587
  SMTP_USER=xxx
  SMTP_PASS=xxx
  SMTP_FROM="WeBrana Cloud <noreply@webrana.id>"
  TELEGRAM_BOT_TOKEN=xxx
  REDIS_URL=redis://localhost:6379
  INTERNAL_API_KEY=xxx
  AUTH_SERVICE_BASE_URL=http://localhost:3001
  ```
- [ ] 201.4 Configure `AppModule`
- [ ] 201.5 Setup `main.ts`

### BE-202: Redis Queue Setup

- [ ] 202.1 Setup Bull queue with Redis
- [ ] 202.2 Create queue configurations:
  - `email-queue`
  - `telegram-queue`
- [ ] 202.3 Implement queue processors for each channel

### BE-203: Email Module

- [ ] 203.1 Create `EmailModule`
- [ ] 203.2 Create `EmailService` with methods:
  - [ ] 203.2.1 `sendEmail(to, subject, html, text?)`: Direct send
  - [ ] 203.2.2 `queueEmail(to, subject, template, data)`: Queue for async
- [ ] 203.3 Create email templates:
  - [ ] 203.3.1 `order-created.hbs`: Order confirmation
  - [ ] 203.3.2 `payment-confirmed.hbs`: Payment success
  - [ ] 203.3.3 `vps-active.hbs`: VPS ready with IP, credentials
  - [ ] 203.3.4 `provisioning-failed.hbs`: Error notification
  - [ ] 203.3.5 `vps-expiring.hbs`: Expiry reminder
- [ ] 203.4 Implement template rendering (Handlebars)
- [ ] 203.5 Write unit tests

### BE-204: Telegram Module

- [ ] 204.1 Create `TelegramModule`
- [ ] 204.2 Create `TelegramService` with methods:
  - [ ] 204.2.1 `sendMessage(chatId, message)`: Direct send
  - [ ] 204.2.2 `queueMessage(chatId, template, data)`: Queue for async
- [ ] 204.3 Create message templates:
  - [ ] 204.3.1 Payment confirmed template
  - [ ] 204.3.2 VPS active template (with details)
  - [ ] 204.3.3 Provisioning failed template
- [ ] 204.4 Implement bot initialization
- [ ] 204.5 Handle user linking (chatId to userId) - Optional v1.1
- [ ] 204.6 Write unit tests

### BE-205: Notification Orchestration

- [ ] 205.1 Create `NotificationModule`
- [ ] 205.2 Create `NotificationService` with methods:
  - [ ] 205.2.1 `notify(event, userId, data)`:
    - Look up user preferences (email, telegram chatId)
    - Queue appropriate notifications
  - [ ] 205.2.2 `notifyOrderCreated(userId, orderData)`
  - [ ] 205.2.3 `notifyPaymentConfirmed(userId, orderData)`
  - [ ] 205.2.4 `notifyVpsActive(userId, orderData, dropletData)`
  - [ ] 205.2.5 `notifyProvisioningFailed(userId, orderData, error)`
- [ ] 205.3 Create `NotificationLog` model for audit:
  ```prisma
  model NotificationLog {
    id        String   @id @default(uuid())
    userId    String
    event     String
    channel   String   // EMAIL, TELEGRAM
    status    String   // QUEUED, SENT, FAILED
    payload   Json?
    error     String?
    sentAt    DateTime?
    createdAt DateTime @default(now())
  }
  ```
- [ ] 205.4 Write unit tests

### BE-206: Auth Service Client

- [ ] 206.1 Create `AuthClientModule`
- [ ] 206.2 Create `AuthClientService` with method:
  - [ ] 206.2.1 `getUserById(userId)`: GET /internal/users/{id}
    - Returns email, name, telegram_chat_id (if linked)
- [ ] 206.3 Add caching for user data (optional)
- [ ] 206.4 Write unit tests

### BE-207: Internal APIs

- [ ] 207.1 Create `NotificationController` with prefix `internal/notifications`
- [ ] 207.2 Implement API Key guard
- [ ] 207.3 Implement endpoints:
  - [ ] 207.3.1 `POST /internal/notifications/send`:
    - Body: `{ event, userId, data }`
    - Triggers notification via NotificationService
  - [ ] 207.3.2 `GET /internal/notifications/templates`:
    - List available templates
  - [ ] 207.3.3 `GET /internal/notifications/logs`:
    - Admin view of notification history
- [ ] 207.4 Write unit tests

### BE-208: Integration with Other Services

- [ ] 208.1 Update order-service to call notification-service:
  - After order created
  - After provisioning success/failure
- [ ] 208.2 Update billing-service to call notification-service:
  - After payment confirmed
- [ ] 208.3 Document integration points

### BE-209: Integration Testing

- [ ] 209.1 Setup test environment with Redis
- [ ] 209.2 Mock SMTP and Telegram API
- [ ] 209.3 Write integration tests:
  - [ ] Email sending flow
  - [ ] Telegram sending flow
  - [ ] Queue processing
  - [ ] Notification logging
- [ ] 209.4 Create README.md

### BE-210: Docker & Deployment

- [ ] 210.1 Create Dockerfile
- [ ] 210.2 Add to docker-compose with Redis
- [ ] 210.3 Smoke test notification endpoints
- [ ] 210.4 Document environment variables

---

## Acceptance Criteria Summary

### billing-service
- [ ] Invoice creation untuk existing order
- [ ] Tripay payment channel selection
- [ ] VA/QRIS payment code generation
- [ ] Webhook callback processing
- [ ] Auto-update order status after payment
- [ ] 80%+ test coverage

### notification-service
- [ ] Email notifications untuk semua events
- [ ] Telegram notifications untuk payment & VPS status
- [ ] Async queue-based processing
- [ ] Notification logging
- [ ] 80%+ test coverage

---

## Timeline

| Week | Focus |
|------|-------|
| Week 1 | BE-101 to BE-105 (billing foundation) |
| Week 2 | BE-106 to BE-109 (billing completion) |
| Week 3 | BE-201 to BE-205 (notification foundation) |
| Week 4 | BE-206 to BE-210 (notification completion) |

---

**Created:** 2024-11-29
**Author:** Product Manager
**Status:** Ready for Delegation
