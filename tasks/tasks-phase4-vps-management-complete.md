# Task Plan: Phase 4 - Complete VPS Management System

**Created:** 2025-11-30  
**Author:** Senior Product Manager  
**Status:** Planning  
**Scope:** VNC Console, VPS Management, User Balance, Promo System, Billing Periods

---

## Executive Summary

Phase 4 akan mengimplementasikan fitur-fitur advanced untuk platform VPS hosting yang lengkap seperti DigitalOcean:

1. **VNC Console** - Akses console VPS via browser
2. **Complete VPS Management** - Stop, Start, Delete, Reinstall, Change OS, Monitoring
3. **User Balance/Wallet System** - Saldo user untuk auto-renewal
4. **Promo System** - Cashback, bonus deposit, welcome bonus
5. **Flexible Billing Periods** - Harian, Bulanan, Tahunan

---

## Feature Breakdown

### 🖥️ Feature 1: VNC Console

**Goal:** User dapat akses console VPS langsung dari browser.

**DigitalOcean API:**
```bash
# Get console URL
POST /v2/droplets/{droplet_id}/actions
Body: { "type": "get_console" }

# Response contains console URL with temporary access
```

**Components:**
- Backend endpoint untuk generate console URL
- Frontend noVNC integration
- Time-limited secure access

---

### 🎮 Feature 2: Complete VPS Management

**Goal:** UI seperti DigitalOcean untuk manage VPS.

**Actions:**

| Action | DO API | Description |
|--------|--------|-------------|
| Power On | `POST /droplets/{id}/actions` type=power_on | Nyalakan VPS |
| Power Off | `POST /droplets/{id}/actions` type=power_off | Matikan (force) |
| Shutdown | `POST /droplets/{id}/actions` type=shutdown | Graceful shutdown |
| Reboot | `POST /droplets/{id}/actions` type=reboot | Restart VPS |
| Reset Password | `POST /droplets/{id}/actions` type=password_reset | Reset root password |
| Rebuild | `POST /droplets/{id}/actions` type=rebuild | Reinstall OS |
| Delete | `DELETE /droplets/{id}` | Hapus VPS permanen |

**Monitoring Metrics (dari DO API):**
```bash
GET /v2/droplets/{id}/bandwidth
GET /v2/monitoring/metrics/droplet/cpu
GET /v2/monitoring/metrics/droplet/memory_free
GET /v2/monitoring/metrics/droplet/filesystem_free
```

---

### 💰 Feature 3: User Balance/Wallet System

**Goal:** User punya saldo yang bisa digunakan untuk bayar VPS & auto-renewal.

**Flow:**
```
User Deposit → Tripay → Webhook → Add Balance → Ready to Use
                                       ↓
                              Auto-deduct for VPS renewal
```

**Database Schema:**
```prisma
model UserWallet {
  id            String   @id @default(uuid())
  userId        String   @unique @map("user_id")
  balance       Int      @default(0)  // in IDR
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  transactions  WalletTransaction[]
}

model WalletTransaction {
  id            String          @id @default(uuid())
  walletId      String          @map("wallet_id")
  wallet        UserWallet      @relation(fields: [walletId], references: [id])
  
  type          TransactionType
  amount        Int             // positive = credit, negative = debit
  balanceBefore Int             @map("balance_before")
  balanceAfter  Int             @map("balance_after")
  
  // Reference
  referenceType String?         @map("reference_type") // DEPOSIT, VPS_PAYMENT, RENEWAL, PROMO
  referenceId   String?         @map("reference_id")   // deposit_id, order_id, etc
  
  description   String?
  createdAt     DateTime        @default(now())
}

enum TransactionType {
  CREDIT    // Tambah saldo
  DEBIT     // Kurang saldo
}

model Deposit {
  id            String        @id @default(uuid())
  userId        String        @map("user_id")
  
  amount        Int           // Nominal deposit
  bonusAmount   Int           @default(0) @map("bonus_amount")  // Bonus dari promo
  totalCredit   Int           @map("total_credit")  // amount + bonus
  
  status        DepositStatus @default(PENDING)
  
  // Payment
  paymentMethod String?       @map("payment_method")
  paymentRef    String?       @map("payment_ref")
  paidAt        DateTime?     @map("paid_at")
  
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

enum DepositStatus {
  PENDING
  PAID
  EXPIRED
  FAILED
}
```

---

### 🎁 Feature 4: Promo System

**Goal:** Admin bisa setup berbagai promo untuk menarik user.

**Promo Types:**

| Type | Description | Example |
|------|-------------|---------|
| **DEPOSIT_BONUS** | Bonus saldo saat deposit | Deposit 100k dapat bonus 10k |
| **DEPOSIT_CASHBACK** | Persentase cashback | Deposit 100k dapat cashback 5% |
| **NEW_USER_BONUS** | Free saldo untuk user baru | Register dapat 25k |
| **REFERRAL_BONUS** | Bonus dari referral | Invite friend dapat 10k |

**Database Schema:**
```prisma
model Promo {
  id              String      @id @default(uuid())
  
  name            String
  code            String?     @unique  // Optional promo code
  type            PromoType
  
  // Value
  valueType       ValueType   @map("value_type")  // FIXED or PERCENTAGE
  value           Int         // Amount or percentage
  maxDiscount     Int?        @map("max_discount")  // Max for percentage
  
  // Conditions
  minDeposit      Int?        @map("min_deposit")   // Minimum deposit amount
  maxUsageTotal   Int?        @map("max_usage_total")  // Total usage limit
  maxUsagePerUser Int?        @map("max_usage_per_user") @default(1)
  
  // Validity
  isActive        Boolean     @default(true) @map("is_active")
  startDate       DateTime?   @map("start_date")
  endDate         DateTime?   @map("end_date")
  
  // Targeting
  forNewUsersOnly Boolean     @default(false) @map("for_new_users_only")
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  usages          PromoUsage[]
}

enum PromoType {
  DEPOSIT_BONUS
  DEPOSIT_CASHBACK
  NEW_USER_BONUS
  REFERRAL_BONUS
}

enum ValueType {
  FIXED
  PERCENTAGE
}

model PromoUsage {
  id        String   @id @default(uuid())
  promoId   String   @map("promo_id")
  promo     Promo    @relation(fields: [promoId], references: [id])
  userId    String   @map("user_id")
  amount    Int      // Actual bonus/cashback given
  usedAt    DateTime @default(now()) @map("used_at")
  
  @@unique([promoId, userId])  // One usage per user per promo
}
```

---

### 📅 Feature 5: Flexible Billing Periods

**Goal:** Admin bisa enable/disable periode billing (harian/bulanan/tahunan).

**Update VpsPlan Schema:**
```prisma
model VpsPlan {
  // ... existing fields
  
  // Pricing per period
  priceHourly   Int?    @map("price_hourly")   // Harga per jam (for reference)
  priceDaily    Int?    @map("price_daily")    // Harga harian
  priceMonthly  Int     @map("price_monthly")  // Harga bulanan (required)
  priceYearly   Int?    @map("price_yearly")   // Harga tahunan
  
  // Enable/disable periods
  allowDaily    Boolean @default(false) @map("allow_daily")
  allowMonthly  Boolean @default(true) @map("allow_monthly")
  allowYearly   Boolean @default(true) @map("allow_yearly")
}

// Update Order untuk track billing period
model Order {
  // ... existing fields
  
  billingPeriod   BillingPeriod @default(MONTHLY) @map("billing_period")
  nextRenewalAt   DateTime?     @map("next_renewal_at")
  autoRenew       Boolean       @default(true) @map("auto_renew")
}

enum BillingPeriod {
  DAILY
  MONTHLY
  YEARLY
}
```

---

### 🔄 Feature 6: Auto-Renewal System

**Goal:** VPS otomatis diperpanjang jika saldo cukup.

**Flow:**
```
Cron Job (setiap jam) → Check expiring VPS
        ↓
    For each VPS:
        ├── Check autoRenew enabled?
        ├── Check user balance sufficient?
        │       ├── YES → Deduct balance, extend VPS
        │       └── NO → Send notification "saldo tidak cukup"
        └── Update nextRenewalAt
```

---

## Database Schema Summary

### New Tables

| Table | Service | Purpose |
|-------|---------|---------|
| `UserWallet` | billing-service | User balance |
| `WalletTransaction` | billing-service | Balance history |
| `Deposit` | billing-service | Top-up records |
| `Promo` | billing-service | Promo configuration |
| `PromoUsage` | billing-service | Promo usage tracking |

### Updated Tables

| Table | Changes |
|-------|---------|
| `VpsPlan` | Add daily/yearly pricing, period toggles |
| `Order` | Add billingPeriod, nextRenewalAt, autoRenew |
| `ProvisioningTask` | Already has doAccountId |

---

## Task Breakdown by Sub-Phase

### Sub-Phase 4A: VPS Management UI (3-4 days)
**Priority: P1**

| Task ID | Description | Assignee | Effort |
|---------|-------------|----------|--------|
| P4A-001 | VPS Detail Page redesign (like DO) | Frontend | 2 days |
| P4A-002 | VPS Actions (power, reboot, shutdown) | Backend + Frontend | 1 day |
| P4A-003 | VPS Monitoring charts | Backend + Frontend | 1 day |

### Sub-Phase 4B: VNC Console (2-3 days)
**Priority: P2**

| Task ID | Description | Assignee | Effort |
|---------|-------------|----------|--------|
| P4B-001 | Console URL endpoint | Backend | 0.5 day |
| P4B-002 | noVNC integration | Frontend | 1.5 days |
| P4B-003 | Security & session management | Backend | 1 day |

### Sub-Phase 4C: Delete & Reinstall VPS (2 days)
**Priority: P1**

| Task ID | Description | Assignee | Effort |
|---------|-------------|----------|--------|
| P4C-001 | Delete VPS (with confirmation) | Backend + Frontend | 1 day |
| P4C-002 | Reinstall/Rebuild VPS | Backend + Frontend | 1 day |

### Sub-Phase 4D: User Wallet System (3-4 days)
**Priority: P1**

| Task ID | Description | Assignee | Effort |
|---------|-------------|----------|--------|
| P4D-001 | Wallet database schema | Backend | 0.5 day |
| P4D-002 | Wallet service (balance, transactions) | Backend | 1 day |
| P4D-003 | Deposit flow (Tripay integration) | Backend | 1 day |
| P4D-004 | Wallet UI (balance, history, deposit) | Frontend | 1.5 days |

### Sub-Phase 4E: Promo System (3 days)
**Priority: P2**

| Task ID | Description | Assignee | Effort |
|---------|-------------|----------|--------|
| P4E-001 | Promo database schema | Backend | 0.5 day |
| P4E-002 | Promo service & validation | Backend | 1 day |
| P4E-003 | Admin Promo management UI | Frontend | 1 day |
| P4E-004 | Apply promo on deposit | Backend | 0.5 day |

### Sub-Phase 4F: Billing Periods & Auto-Renewal (3 days)
**Priority: P1**

| Task ID | Description | Assignee | Effort |
|---------|-------------|----------|--------|
| P4F-001 | Update plan schema for periods | Backend | 0.5 day |
| P4F-002 | Period selection in order flow | Frontend | 1 day |
| P4F-003 | Auto-renewal cron job | Backend | 1 day |
| P4F-004 | Renewal notifications | Backend | 0.5 day |

---

## Detailed Specifications

### VPS Detail Page (Like DigitalOcean)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🖥️ my-webrana-vps                              [Console] [⋮]   │
│ 165.22.123.45 • Singapore • Ubuntu 22.04                        │
├─────────────────────────────────────────────────────────────────┤
│ [Overview] [Graphs] [Networking] [Backups] [Destroy]           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Status: 🟢 Running                    Actions:                 │
│  ┌─────────────────────────┐          [Turn Off] [Reboot]      │
│  │ CPU     ████░░░░ 45%    │          [Reset Password]         │
│  │ Memory  ██████░░ 72%    │          [Rebuild]                │
│  │ Disk    ███░░░░░ 35%    │                                   │
│  │ Bandwidth 2.5GB/1TB     │          Billing:                 │
│  └─────────────────────────┘          Monthly • Rp 150.000     │
│                                       Next renewal: Dec 15     │
│  Specs:                               [✓] Auto-renew           │
│  • 2 vCPU                                                      │
│  • 4 GB RAM                                                    │
│  • 80 GB NVMe SSD                                              │
│  • 4 TB Transfer                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Wallet Page

```
┌─────────────────────────────────────────────────────────────────┐
│ 💰 My Wallet                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Balance: Rp 250.000                    [+ Top Up]              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Recent Transactions                                             │
├─────────────────────────────────────────────────────────────────┤
│ Dec 1  │ Deposit         │ +Rp 100.000 │ Rp 250.000           │
│ Dec 1  │ Bonus Deposit   │ +Rp 10.000  │ Rp 150.000           │
│ Nov 30 │ VPS Renewal     │ -Rp 150.000 │ Rp 140.000           │
│ Nov 28 │ Welcome Bonus   │ +Rp 25.000  │ Rp 290.000           │
│ Nov 28 │ Initial Deposit │ +Rp 265.000 │ Rp 265.000           │
└─────────────────────────────────────────────────────────────────┘
```

### Admin Promo Management

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎁 Promo Management                            [+ Create Promo] │
├─────────────────────────────────────────────────────────────────┤
│ Name              │ Type           │ Value    │ Status │ Usage │
├───────────────────┼────────────────┼──────────┼────────┼───────┤
│ Welcome Bonus     │ NEW_USER       │ Rp 25k   │ 🟢 ON  │ 150   │
│ Deposit 10%       │ DEPOSIT_BONUS  │ 10%      │ 🟢 ON  │ 89    │
│ Year End Cashback │ CASHBACK       │ 5%       │ 🟡 Soon│ 0     │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### VPS Management (instance-service)
```
POST /api/v1/instances/:id/power-on
POST /api/v1/instances/:id/power-off
POST /api/v1/instances/:id/shutdown
POST /api/v1/instances/:id/reboot
POST /api/v1/instances/:id/reset-password
POST /api/v1/instances/:id/rebuild
DELETE /api/v1/instances/:id
GET  /api/v1/instances/:id/console
GET  /api/v1/instances/:id/metrics
```

### Wallet (billing-service)
```
GET  /api/v1/wallet                    # Get balance
GET  /api/v1/wallet/transactions       # Transaction history
POST /api/v1/wallet/deposit            # Create deposit
GET  /api/v1/wallet/deposits           # Deposit history
```

### Promo (billing-service - Admin)
```
POST   /internal/promos                # Create promo
GET    /internal/promos                # List promos
GET    /internal/promos/:id            # Get promo
PATCH  /internal/promos/:id            # Update promo
DELETE /internal/promos/:id            # Delete promo
GET    /internal/promos/:id/usage      # Get usage stats
```

### Billing Periods (catalog-service - Admin)
```
PATCH /internal/plans/:id/pricing      # Update plan pricing & periods
```

---

## Timeline Estimate

| Sub-Phase | Duration | Dependencies |
|-----------|----------|--------------|
| 4A: VPS Management UI | 3-4 days | - |
| 4B: VNC Console | 2-3 days | 4A |
| 4C: Delete & Reinstall | 2 days | 4A |
| 4D: Wallet System | 3-4 days | - |
| 4E: Promo System | 3 days | 4D |
| 4F: Billing & Auto-Renewal | 3 days | 4D |

**Total Estimate: 16-19 days (3-4 weeks)**

---

## Delegation Plan

| Role | Tasks |
|------|-------|
| **Backend Engineer** | All backend services, APIs, cron jobs |
| **Frontend Engineer** | VPS UI, Wallet UI, Admin Promo UI |
| **QA Engineer** | Testing for each sub-phase |

---

## Success Criteria

- [ ] User dapat power on/off/reboot VPS dari dashboard
- [ ] User dapat akses VNC console via browser
- [ ] User dapat delete VPS dengan konfirmasi
- [ ] User dapat reinstall/rebuild VPS
- [ ] User dapat lihat monitoring (CPU, RAM, Disk, Bandwidth)
- [ ] User dapat top-up saldo via Tripay
- [ ] User mendapat bonus saldo sesuai promo aktif
- [ ] User baru mendapat welcome bonus
- [ ] VPS auto-renew jika saldo cukup
- [ ] Admin dapat manage promo (create, edit, toggle)
- [ ] Admin dapat set pricing per periode (daily/monthly/yearly)
- [ ] All features have ≥80% test coverage

---

**Document Version:** 1.0  
**Status:** Ready for Review
