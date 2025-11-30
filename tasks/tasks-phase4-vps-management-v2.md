# Task Plan: Phase 4 - Complete VPS Management System (v2)

**Created:** 2025-11-30  
**Updated:** 2025-11-30 (Klarifikasi flow)  
**Author:** Senior Product Manager  
**Status:** Final - Ready for Implementation

---

## Executive Summary

Platform VPS dengan **balance-based payment system**:
- User deposit saldo via Tripay
- Order VPS menggunakan saldo (bukan direct payment)
- Auto-renewal dari saldo
- Auto-destroy jika expired dan tidak diperpanjang

---

## Business Rules (FINAL)

### 1. Payment Flow
```
Deposit → Tripay → Balance bertambah → Order VPS → Balance dipotong
```
- ❌ TIDAK ADA direct payment untuk VPS
- ✅ Semua pembayaran VPS via balance
- ✅ User HARUS punya saldo cukup sebelum order

### 2. Grace Period by Billing Type

| Billing | Grace Period | Behavior |
|---------|--------------|----------|
| **Daily** | 0 (none) | Langsung DESTROY |
| **Monthly** | 1 day | SUSPEND → wait 24h → DESTROY |
| **Yearly** | 3 days | SUSPEND → wait 72h → DESTROY |

### 3. Notification Schedule

**Monthly & Yearly:**
```
-7 days  → "VPS akan expired dalam 7 hari"
-3 days  → "VPS akan expired dalam 3 hari"
-1 day   → "VPS akan expired besok"
-8 hours → "VPS akan expired dalam 8 jam"
Destroy  → "VPS telah dihapus"
```

**Daily:**
```
-8 hours → "VPS akan expired dalam 8 jam"
Destroy  → "VPS telah dihapus"
```

### 4. Refund Policy
- ❌ User delete sendiri = TIDAK ADA refund
- ✅ System suspend / DO account locked = USER DAPAT VPS PENGGANTI

### 5. Order Requirements
- User balance >= VPS price (WAJIB)
- Balance dipotong saat order BERHASIL (setelah provisioning sukses? atau sebelum?)
  - **Rekomendasi:** Dipotong SEBELUM provisioning (reserve), rollback jika gagal

---

## Anti-Race Condition Design

### Critical Sections yang Perlu Dilindungi

#### 1. Balance Operations (CRITICAL)
```typescript
// WRONG - Race condition possible
const balance = await getBalance(userId);
if (balance >= amount) {
  await deductBalance(userId, amount); // Another request might deduct first!
}

// CORRECT - Use database transaction with row locking
await prisma.$transaction(async (tx) => {
  // Lock the wallet row for update
  const wallet = await tx.userWallet.findUnique({
    where: { userId },
    select: { id: true, balance: true },
    // Use FOR UPDATE lock in raw query if needed
  });
  
  if (wallet.balance < amount) {
    throw new InsufficientBalanceException();
  }
  
  // Atomic update with version check
  await tx.userWallet.update({
    where: { id: wallet.id },
    data: { 
      balance: { decrement: amount },
      version: { increment: 1 }
    }
  });
  
  // Create transaction record
  await tx.walletTransaction.create({...});
}, {
  isolationLevel: 'Serializable' // Highest isolation
});
```

#### 2. VPS Lifecycle State Transitions
```typescript
// Use optimistic locking with version field
model Order {
  version Int @default(0)
  // ...
}

// State transition with version check
async transitionState(orderId: string, fromState: OrderStatus, toState: OrderStatus) {
  const result = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: fromState, // Only update if still in expected state
    },
    data: {
      status: toState,
      version: { increment: 1 },
      updatedAt: new Date(),
    }
  });
  
  if (result.count === 0) {
    throw new StateTransitionConflictException();
  }
}
```

#### 3. Cron Job Idempotency
```typescript
// Use database-based distributed lock
model CronJobLock {
  id          String   @id
  jobName     String   @unique @map("job_name")
  lockedAt    DateTime @map("locked_at")
  lockedBy    String   @map("locked_by") // instance ID
  expiresAt   DateTime @map("expires_at")
}

async acquireLock(jobName: string, ttlSeconds: number): Promise<boolean> {
  try {
    await prisma.cronJobLock.upsert({
      where: { jobName },
      create: {
        id: uuid(),
        jobName,
        lockedAt: new Date(),
        lockedBy: INSTANCE_ID,
        expiresAt: addSeconds(new Date(), ttlSeconds),
      },
      update: {
        // Only update if lock expired
        lockedAt: new Date(),
        lockedBy: INSTANCE_ID,
        expiresAt: addSeconds(new Date(), ttlSeconds),
      },
      where: {
        jobName,
        OR: [
          { expiresAt: { lt: new Date() } }, // Lock expired
          { lockedBy: INSTANCE_ID }, // Same instance
        ]
      }
    });
    return true;
  } catch {
    return false; // Another instance has the lock
  }
}
```

#### 4. Deposit Processing (Webhook)
```typescript
// Idempotent webhook processing
model Deposit {
  // ...
  processedAt DateTime? @map("processed_at")
  idempotencyKey String @unique @map("idempotency_key")
}

async processDepositWebhook(payload: TripayCallback) {
  const idempotencyKey = `tripay_${payload.reference}`;
  
  // Try to mark as processing (atomic)
  const deposit = await prisma.deposit.updateMany({
    where: {
      idempotencyKey,
      processedAt: null, // Only if not processed
    },
    data: {
      processedAt: new Date(),
    }
  });
  
  if (deposit.count === 0) {
    // Already processed, return success (idempotent)
    return { success: true, message: 'Already processed' };
  }
  
  // Process the deposit...
}
```

#### 5. Order Creation with Balance
```typescript
async createOrder(userId: string, dto: CreateOrderDto) {
  return prisma.$transaction(async (tx) => {
    // 1. Lock and check balance
    const wallet = await tx.$queryRaw`
      SELECT * FROM user_wallets 
      WHERE user_id = ${userId} 
      FOR UPDATE
    `;
    
    if (wallet.balance < dto.totalPrice) {
      throw new InsufficientBalanceException();
    }
    
    // 2. Create order in PENDING state
    const order = await tx.order.create({
      data: {
        userId,
        status: 'PENDING',
        // ...
      }
    });
    
    // 3. Deduct balance (reserve)
    await tx.userWallet.update({
      where: { userId },
      data: { balance: { decrement: dto.totalPrice } }
    });
    
    // 4. Create wallet transaction
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'DEBIT',
        amount: -dto.totalPrice,
        referenceType: 'VPS_ORDER',
        referenceId: order.id,
        description: `Order VPS: ${dto.planName}`,
      }
    });
    
    return order;
  }, {
    isolationLevel: 'Serializable',
    timeout: 10000, // 10 second timeout
  });
}

// If provisioning fails, rollback balance
async handleProvisioningFailed(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { user: { include: { wallet: true } } }
    });
    
    // Refund the balance
    await tx.userWallet.update({
      where: { id: order.user.wallet.id },
      data: { balance: { increment: order.finalPrice } }
    });
    
    // Create refund transaction
    await tx.walletTransaction.create({
      data: {
        walletId: order.user.wallet.id,
        type: 'CREDIT',
        amount: order.finalPrice,
        referenceType: 'PROVISION_FAILED_REFUND',
        referenceId: orderId,
      }
    });
    
    // Update order status
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'FAILED' }
    });
  });
}
```

---

## Database Schema (Complete)

### billing-service/prisma/schema.prisma

```prisma
// ============================================
// USER WALLET
// ============================================

model UserWallet {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @unique @map("user_id")
  
  balance       Int      @default(0)  // IDR, always >= 0
  version       Int      @default(0)  // Optimistic locking
  
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  
  transactions  WalletTransaction[]
  
  @@map("user_wallets")
}

model WalletTransaction {
  id              String          @id @default(uuid()) @db.Uuid
  walletId        String          @map("wallet_id") @db.Uuid
  wallet          UserWallet      @relation(fields: [walletId], references: [id])
  
  type            TransactionType
  amount          Int             // + for credit, - for debit
  balanceBefore   Int             @map("balance_before")
  balanceAfter    Int             @map("balance_after")
  
  referenceType   ReferenceType   @map("reference_type")
  referenceId     String?         @map("reference_id")
  
  description     String?
  metadata        Json?
  
  createdAt       DateTime        @default(now()) @map("created_at")
  
  @@index([walletId, createdAt])
  @@index([referenceType, referenceId])
  @@map("wallet_transactions")
}

enum TransactionType {
  CREDIT
  DEBIT
}

enum ReferenceType {
  DEPOSIT
  DEPOSIT_BONUS
  WELCOME_BONUS
  REFERRAL_BONUS
  VPS_ORDER
  VPS_RENEWAL
  PROVISION_FAILED_REFUND
  REPLACEMENT_VPS
  ADMIN_ADJUSTMENT
}

// ============================================
// DEPOSITS
// ============================================

model Deposit {
  id              String        @id @default(uuid()) @db.Uuid
  userId          String        @map("user_id")
  
  // Amounts
  amount          Int           // Nominal deposit
  bonusAmount     Int           @default(0) @map("bonus_amount")
  totalCredit     Int           @map("total_credit")  // amount + bonus
  
  // Status
  status          DepositStatus @default(PENDING)
  
  // Payment (Tripay)
  paymentMethod   String?       @map("payment_method")
  paymentCode     String?       @map("payment_code")  // VA number, etc
  paymentUrl      String?       @map("payment_url")
  tripayReference String?       @unique @map("tripay_reference")
  
  // Promo applied
  promoId         String?       @map("promo_id") @db.Uuid
  promoCode       String?       @map("promo_code")
  
  // Processing (for idempotency)
  processedAt     DateTime?     @map("processed_at")
  idempotencyKey  String        @unique @map("idempotency_key")
  
  // Timestamps
  expiresAt       DateTime      @map("expires_at")
  paidAt          DateTime?     @map("paid_at")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")
  
  @@index([userId, status])
  @@index([status, expiresAt])
  @@map("deposits")
}

enum DepositStatus {
  PENDING
  PAID
  EXPIRED
  FAILED
}

// ============================================
// PROMOS
// ============================================

model Promo {
  id                String      @id @default(uuid()) @db.Uuid
  
  name              String
  description       String?
  code              String?     @unique  // Optional promo code
  type              PromoType
  
  // Value configuration
  valueType         ValueType   @map("value_type")
  value             Int         // Amount (IDR) or percentage (1-100)
  maxBonus          Int?        @map("max_bonus")  // Cap for percentage
  
  // Conditions
  minDeposit        Int?        @map("min_deposit")
  maxUsageTotal     Int?        @map("max_usage_total")
  maxUsagePerUser   Int         @default(1) @map("max_usage_per_user")
  
  // Validity
  isActive          Boolean     @default(true) @map("is_active")
  startDate         DateTime?   @map("start_date")
  endDate           DateTime?   @map("end_date")
  
  // Targeting
  forNewUsersOnly   Boolean     @default(false) @map("for_new_users_only")
  
  // Stats
  totalUsage        Int         @default(0) @map("total_usage")
  totalBonusGiven   Int         @default(0) @map("total_bonus_given")
  
  createdAt         DateTime    @default(now()) @map("created_at")
  updatedAt         DateTime    @updatedAt @map("updated_at")
  
  usages            PromoUsage[]
  
  @@map("promos")
}

enum PromoType {
  DEPOSIT_BONUS       // Bonus saldo saat deposit
  DEPOSIT_CASHBACK    // Persentase cashback
  NEW_USER_BONUS      // Bonus untuk user baru (auto-apply)
  REFERRAL_BONUS      // Bonus dari referral
}

enum ValueType {
  FIXED       // Fixed amount in IDR
  PERCENTAGE  // Percentage of deposit
}

model PromoUsage {
  id          String   @id @default(uuid()) @db.Uuid
  promoId     String   @map("promo_id") @db.Uuid
  promo       Promo    @relation(fields: [promoId], references: [id])
  
  userId      String   @map("user_id")
  depositId   String?  @map("deposit_id") @db.Uuid
  
  bonusAmount Int      @map("bonus_amount")
  
  usedAt      DateTime @default(now()) @map("used_at")
  
  @@unique([promoId, userId, depositId])
  @@index([userId])
  @@map("promo_usages")
}

// ============================================
// CRON JOB LOCKS (for distributed locking)
// ============================================

model CronJobLock {
  id          String   @id @default(uuid()) @db.Uuid
  jobName     String   @unique @map("job_name")
  lockedAt    DateTime @map("locked_at")
  lockedBy    String   @map("locked_by")
  expiresAt   DateTime @map("expires_at")
  
  @@map("cron_job_locks")
}
```

### order-service/prisma/schema.prisma (Updates)

```prisma
model Order {
  id                String        @id @default(uuid()) @db.Uuid
  userId            String        @map("user_id")
  
  // Plan & Image (snapshot)
  planId            String        @map("plan_id")
  planName          String        @map("plan_name")
  imageId           String        @map("image_id")
  imageName         String        @map("image_name")
  
  // Billing
  billingPeriod     BillingPeriod @default(MONTHLY) @map("billing_period")
  basePrice         Int           @map("base_price")
  promoDiscount     Int           @default(0) @map("promo_discount")
  couponCode        String?       @map("coupon_code")
  couponDiscount    Int           @default(0) @map("coupon_discount")
  finalPrice        Int           @map("final_price")
  currency          String        @default("IDR")
  
  // Lifecycle
  status            OrderStatus   @default(PENDING)
  version           Int           @default(0)  // Optimistic locking
  
  // Dates
  activatedAt       DateTime?     @map("activated_at")
  expiresAt         DateTime?     @map("expires_at")
  suspendedAt       DateTime?     @map("suspended_at")
  terminatedAt      DateTime?     @map("terminated_at")
  
  // Auto-renewal
  autoRenew         Boolean       @default(true) @map("auto_renew")
  lastRenewalAt     DateTime?     @map("last_renewal_at")
  renewalFailReason String?       @map("renewal_fail_reason")
  
  // Termination
  terminationReason TerminationReason? @map("termination_reason")
  
  // Timestamps
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")
  
  // Relations
  items             OrderItem[]
  provisioningTask  ProvisioningTask?
  statusHistory     StatusHistory[]
  renewalHistory    RenewalHistory[]
  
  @@index([userId, status])
  @@index([status, expiresAt])
  @@index([status, autoRenew, expiresAt])
  @@map("orders")
}

enum OrderStatus {
  PENDING           // Order created, awaiting balance deduction
  PROCESSING        // Balance deducted, provisioning starting
  PROVISIONING      // Creating VPS on DO
  ACTIVE            // VPS running normally
  EXPIRING_SOON     // < threshold before expiration
  EXPIRED           // Past expiration date (grace period)
  SUSPENDED         // VPS powered off (monthly/yearly grace)
  TERMINATED        // VPS destroyed
  FAILED            // Provisioning failed
  CANCELED          // User canceled before provisioning
}

enum BillingPeriod {
  DAILY
  MONTHLY
  YEARLY
}

enum TerminationReason {
  USER_DELETED          // User explicitly deleted
  EXPIRED_NO_RENEWAL    // Expired and not renewed
  INSUFFICIENT_BALANCE  // No balance for renewal
  ADMIN_TERMINATED      // Admin terminated
  DO_ACCOUNT_ISSUE      // DO account locked/issue
  POLICY_VIOLATION      // ToS violation
}

model RenewalHistory {
  id            String        @id @default(uuid()) @db.Uuid
  orderId       String        @map("order_id") @db.Uuid
  order         Order         @relation(fields: [orderId], references: [id])
  
  renewalType   RenewalType   @map("renewal_type")
  amount        Int
  
  previousExpiry DateTime     @map("previous_expiry")
  newExpiry      DateTime     @map("new_expiry")
  
  // For failed renewals
  success       Boolean       @default(true)
  failReason    String?       @map("fail_reason")
  
  createdAt     DateTime      @default(now()) @map("created_at")
  
  @@index([orderId])
  @@map("renewal_history")
}

enum RenewalType {
  AUTO_RENEWAL
  MANUAL_RENEWAL
  ADMIN_EXTENSION
  REPLACEMENT_VPS
}
```

### catalog-service/prisma/schema.prisma (Updates)

```prisma
model VpsPlan {
  id              String    @id @default(uuid()) @db.Uuid
  
  name            String
  slug            String    @unique
  description     String?
  
  // Specs
  vcpu            Int
  memory          Int       // MB
  disk            Int       // GB
  bandwidth       Int       // GB, 0 = unlimited
  
  // Provider mapping
  providerSlug    String    @map("provider_slug")  // e.g., "s-1vcpu-1gb"
  
  // Pricing (IDR)
  priceHourly     Int?      @map("price_hourly")   // Reference only
  priceDaily      Int?      @map("price_daily")
  priceMonthly    Int       @map("price_monthly")
  priceYearly     Int?      @map("price_yearly")
  
  // Period availability (admin configurable)
  allowDaily      Boolean   @default(false) @map("allow_daily")
  allowMonthly    Boolean   @default(true) @map("allow_monthly")
  allowYearly     Boolean   @default(true) @map("allow_yearly")
  
  // Status
  isActive        Boolean   @default(true) @map("is_active")
  sortOrder       Int       @default(0) @map("sort_order")
  
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  @@map("vps_plans")
}
```

---

## VPS Lifecycle State Machine

```
                    ┌─────────────┐
                    │   PENDING   │ (Order created)
                    └──────┬──────┘
                           │ Balance deducted
                           ▼
                    ┌─────────────┐
                    │ PROCESSING  │ (Starting provision)
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │PROVISIONING │          │   FAILED    │ (Refund balance)
       └──────┬──────┘          └─────────────┘
              │ Success
              ▼
       ┌─────────────┐
       │   ACTIVE    │◄─────────────────────────┐
       └──────┬──────┘                          │
              │ Approaching expiry              │ Auto-renew success
              ▼                                 │
       ┌─────────────┐                          │
       │EXPIRING_SOON│──────────────────────────┤
       └──────┬──────┘                          │
              │ Past expiresAt                  │
              ▼                                 │
       ┌─────────────┐                          │
       │   EXPIRED   │──────────────────────────┘
       └──────┬──────┘     (if balance sufficient)
              │
    ┌─────────┴─────────┐
    │ DAILY             │ MONTHLY/YEARLY
    │                   │
    ▼                   ▼
┌─────────┐      ┌─────────────┐
│TERMINATED│◄────│  SUSPENDED  │ (Power off, wait grace period)
└─────────┘      └──────┬──────┘
    ▲                   │ Grace period ended
    └───────────────────┘

Legend:
- PENDING → PROCESSING: Balance deducted
- PROCESSING → ACTIVE: VPS created successfully
- PROCESSING → FAILED: Provisioning failed, balance refunded
- ACTIVE → EXPIRING_SOON: Based on notification schedule
- EXPIRING_SOON → ACTIVE: Auto-renewed
- EXPIRING_SOON → EXPIRED: Past expiry, no renewal
- EXPIRED → ACTIVE: Manual renewal or late auto-renew
- EXPIRED → SUSPENDED: Grace period started (monthly/yearly)
- EXPIRED → TERMINATED: No grace period (daily)
- SUSPENDED → TERMINATED: Grace period ended
- Any → TERMINATED: User delete or admin action
```

---

## Cron Jobs Specification

### 1. VPS Lifecycle Processor

```typescript
// Runs every 5 minutes
@Cron('*/5 * * * *')
async processVpsLifecycle() {
  if (!await this.acquireLock('vps-lifecycle', 300)) {
    return; // Another instance is processing
  }
  
  try {
    await this.processExpiringVps();
    await this.processExpiredVps();
    await this.processSuspendedVps();
  } finally {
    await this.releaseLock('vps-lifecycle');
  }
}

async processExpiringVps() {
  // Mark ACTIVE → EXPIRING_SOON based on notification schedule
  const thresholds = {
    YEARLY: [7 * 24, 3 * 24, 24, 8], // hours
    MONTHLY: [7 * 24, 3 * 24, 24, 8],
    DAILY: [8],
  };
  
  // Send notifications at each threshold
}

async processExpiredVps() {
  // EXPIRING_SOON → EXPIRED when past expiresAt
  // For DAILY: directly to TERMINATED
  // For MONTHLY/YEARLY: to EXPIRED (start grace period)
}

async processSuspendedVps() {
  // SUSPENDED → TERMINATED when grace period ends
  // MONTHLY: 24 hours after suspended
  // YEARLY: 72 hours after suspended
}
```

### 2. Auto-Renewal Processor

```typescript
// Runs every hour
@Cron('0 * * * *')
async processAutoRenewal() {
  if (!await this.acquireLock('auto-renewal', 3600)) {
    return;
  }
  
  try {
    const ordersToRenew = await this.prisma.order.findMany({
      where: {
        status: { in: ['EXPIRING_SOON', 'EXPIRED'] },
        autoRenew: true,
        expiresAt: { lte: addHours(new Date(), 24) }, // Expiring within 24h
      }
    });
    
    for (const order of ordersToRenew) {
      await this.attemptRenewal(order);
    }
  } finally {
    await this.releaseLock('auto-renewal');
  }
}

async attemptRenewal(order: Order) {
  // Use transaction to prevent race condition
  return this.prisma.$transaction(async (tx) => {
    // Lock wallet
    const wallet = await tx.$queryRaw`
      SELECT * FROM user_wallets WHERE user_id = ${order.userId} FOR UPDATE
    `;
    
    const renewalPrice = this.calculateRenewalPrice(order);
    
    if (wallet.balance < renewalPrice) {
      // Mark renewal failed
      await tx.order.update({
        where: { id: order.id },
        data: { renewalFailReason: 'INSUFFICIENT_BALANCE' }
      });
      
      // Send notification
      await this.notificationService.send({
        userId: order.userId,
        event: 'RENEWAL_FAILED_NO_BALANCE',
        data: { orderId: order.id, required: renewalPrice, balance: wallet.balance }
      });
      
      return false;
    }
    
    // Deduct balance
    await tx.userWallet.update({
      where: { userId: order.userId },
      data: { balance: { decrement: renewalPrice } }
    });
    
    // Extend expiry
    const newExpiry = this.calculateNewExpiry(order);
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'ACTIVE',
        expiresAt: newExpiry,
        lastRenewalAt: new Date(),
        renewalFailReason: null,
      }
    });
    
    // Record renewal
    await tx.renewalHistory.create({...});
    await tx.walletTransaction.create({...});
    
    // Send success notification
    await this.notificationService.send({
      userId: order.userId,
      event: 'RENEWAL_SUCCESS',
      data: { orderId: order.id, newExpiry }
    });
    
    return true;
  }, { isolationLevel: 'Serializable' });
}
```

### 3. VPS Destroyer

```typescript
// Runs every 10 minutes
@Cron('*/10 * * * *')
async processVpsDestruction() {
  if (!await this.acquireLock('vps-destruction', 600)) {
    return;
  }
  
  try {
    const toDestroy = await this.prisma.order.findMany({
      where: { status: 'TERMINATED' },
      include: { provisioningTask: true }
    });
    
    for (const order of toDestroy) {
      if (order.provisioningTask?.dropletId) {
        await this.destroyDroplet(order);
      }
    }
  } finally {
    await this.releaseLock('vps-destruction');
  }
}

async destroyDroplet(order: Order) {
  const task = order.provisioningTask;
  const account = await this.doAccountService.findById(task.doAccountId);
  const client = new DoApiClient(account.decryptedToken);
  
  try {
    await client.deleteDroplet(task.dropletId);
    
    await this.prisma.provisioningTask.update({
      where: { id: task.id },
      data: { 
        dropletStatus: 'destroyed',
        completedAt: new Date()
      }
    });
    
    // Decrement active count on DO account
    await this.doAccountService.decrementActiveCount(account.id);
    
    // Send final notification
    await this.notificationService.send({
      userId: order.userId,
      event: 'VPS_DESTROYED',
      data: { orderId: order.id }
    });
    
  } catch (error) {
    this.logger.error(`Failed to destroy droplet ${task.dropletId}`, error);
    // Will retry on next cron run
  }
}
```

---

## Task Breakdown (Updated)

### Sub-Phase 4A: Wallet System (4 days) - P1

| Task | Description | Effort |
|------|-------------|--------|
| 4A-001 | Wallet schema & migration | 0.5d |
| 4A-002 | WalletService with transaction safety | 1d |
| 4A-003 | Deposit flow with Tripay | 1d |
| 4A-004 | Wallet API endpoints | 0.5d |
| 4A-005 | Wallet UI (balance, history, deposit) | 1d |

### Sub-Phase 4B: Order Flow Refactor (3 days) - P1

| Task | Description | Effort |
|------|-------------|--------|
| 4B-001 | Update order creation (balance-based) | 1d |
| 4B-002 | Balance deduction with rollback | 0.5d |
| 4B-003 | Update order flow UI | 1d |
| 4B-004 | Tests for race conditions | 0.5d |

### Sub-Phase 4C: VPS Lifecycle (4 days) - P1

| Task | Description | Effort |
|------|-------------|--------|
| 4C-001 | State machine implementation | 1d |
| 4C-002 | Lifecycle cron jobs | 1d |
| 4C-003 | Auto-renewal processor | 1d |
| 4C-004 | VPS destroyer | 0.5d |
| 4C-005 | Distributed locking | 0.5d |

### Sub-Phase 4D: Promo System (2 days) - P2

| Task | Description | Effort |
|------|-------------|--------|
| 4D-001 | Promo schema & service | 0.5d |
| 4D-002 | Apply promo on deposit | 0.5d |
| 4D-003 | Welcome bonus auto-apply | 0.5d |
| 4D-004 | Admin promo management UI | 0.5d |

### Sub-Phase 4E: Billing Periods (2 days) - P1

| Task | Description | Effort |
|------|-------------|--------|
| 4E-001 | Update plan schema | 0.5d |
| 4E-002 | Period selection in order | 0.5d |
| 4E-003 | Admin period configuration | 0.5d |
| 4E-004 | Price calculation per period | 0.5d |

### Sub-Phase 4F: VPS Management UI (4 days) - P1

| Task | Description | Effort |
|------|-------------|--------|
| 4F-001 | VPS detail page redesign | 1.5d |
| 4F-002 | Power actions (on/off/reboot) | 0.5d |
| 4F-003 | Delete VPS with confirmation | 0.5d |
| 4F-004 | Rebuild/Reinstall VPS | 0.5d |
| 4F-005 | VPS monitoring charts | 1d |

### Sub-Phase 4G: VNC Console (2 days) - P2

| Task | Description | Effort |
|------|-------------|--------|
| 4G-001 | Console URL endpoint | 0.5d |
| 4G-002 | noVNC integration | 1d |
| 4G-003 | Security & session management | 0.5d |

### Sub-Phase 4H: Notifications (1 day) - P1

| Task | Description | Effort |
|------|-------------|--------|
| 4H-001 | Expiration notification templates | 0.5d |
| 4H-002 | Notification triggers in lifecycle | 0.5d |

---

## Total Estimate

| Phase | Effort | Priority |
|-------|--------|----------|
| 4A: Wallet | 4 days | P1 |
| 4B: Order Refactor | 3 days | P1 |
| 4C: Lifecycle | 4 days | P1 |
| 4D: Promo | 2 days | P2 |
| 4E: Billing Periods | 2 days | P1 |
| 4F: VPS Management UI | 4 days | P1 |
| 4G: VNC Console | 2 days | P2 |
| 4H: Notifications | 1 day | P1 |

**Total: ~22 days (4-5 weeks)**

---

## Recommended Execution Order

```
Week 1: 4A (Wallet) + 4E (Billing Periods)
Week 2: 4B (Order Refactor) + 4C (Lifecycle) start
Week 3: 4C (Lifecycle) complete + 4H (Notifications)
Week 4: 4F (VPS Management UI)
Week 5: 4D (Promo) + 4G (VNC Console)
```

---

**Document Version:** 2.0  
**Status:** Final - Approved for Implementation
