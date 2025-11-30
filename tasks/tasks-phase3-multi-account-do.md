# Task Plan: Phase 3 - Multi-Account DigitalOcean Support

**Created:** 2025-11-30  
**Author:** Senior Product Manager  
**Status:** Ready for Implementation  
**Timeline:** Week 6-7

---

## Executive Summary

Revisi dari multi-provider menjadi **multi-account DigitalOcean**. Platform akan support multiple DO accounts untuk horizontal scaling dan menghindari droplet limit per account.

### Why Multi-Account?

| Problem | Solution |
|---------|----------|
| DO account punya droplet limit (default 10-25) | Distribute across multiple accounts |
| Single point of failure | Redundancy dengan multiple accounts |
| Billing separation | Pisah billing per account jika perlu |
| Rate limiting | Spread API calls across accounts |

---

## Architecture Overview

### Current State
```
order-service → single DO_ACCESS_TOKEN → DigitalOcean
```

### Target State
```
order-service → DO Account Service → Account Pool
                      ↓                    ├── Account A (limit: 25, used: 20)
                Check available            ├── Account B (limit: 25, used: 5)  ← selected
                      ↓                    └── Account C (limit: 25, used: 25) ← full
               Select best account
                      ↓
              Provision on Account B
```

---

## DigitalOcean API Reference

### GET /v2/account
```bash
curl -X GET "https://api.digitalocean.com/v2/account" \
  -H "Authorization: Bearer $DO_ACCESS_TOKEN"
```

**Response:**
```json
{
  "account": {
    "droplet_limit": 25,
    "floating_ip_limit": 5,
    "volume_limit": 100,
    "email": "account@example.com",
    "uuid": "abc123",
    "email_verified": true,
    "status": "active",
    "status_message": ""
  }
}
```

### GET /v2/droplets
```bash
curl -X GET "https://api.digitalocean.com/v2/droplets" \
  -H "Authorization: Bearer $DO_ACCESS_TOKEN"
```

**Response (untuk count):**
```json
{
  "droplets": [...],
  "meta": {
    "total": 20
  }
}
```

### Available Capacity Formula
```
available_capacity = droplet_limit - active_droplets_count
```

---

## Database Schema

### New Table: `do_accounts` (order-service)

```prisma
// apps/order-service/prisma/schema.prisma

model DoAccount {
  id              String    @id @default(uuid()) @db.Uuid
  
  // Account Info
  name            String    @db.VarChar(100)     // "DO Account 1"
  email           String    @db.VarChar(255)     // DO account email
  accessToken     String    @map("access_token") @db.Text  // encrypted
  
  // Limits (cached from DO API)
  dropletLimit    Int       @default(25) @map("droplet_limit")
  activeDroplets  Int       @default(0) @map("active_droplets")
  
  // Status
  isActive        Boolean   @default(true) @map("is_active")
  isPrimary       Boolean   @default(false) @map("is_primary")  // fallback account
  
  // Health
  lastHealthCheck DateTime? @map("last_health_check") @db.Timestamptz
  healthStatus    AccountHealth @default(UNKNOWN) @map("health_status")
  
  // Timestamps
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  
  // Relations
  provisioningTasks ProvisioningTask[]
  
  @@index([isActive, healthStatus])
  @@map("do_accounts")
}

enum AccountHealth {
  HEALTHY
  DEGRADED
  UNHEALTHY
  UNKNOWN
}

// Update ProvisioningTask to link to DoAccount
model ProvisioningTask {
  // ... existing fields
  
  // Add relation to DO account
  doAccountId     String?   @map("do_account_id") @db.Uuid
  doAccount       DoAccount? @relation(fields: [doAccountId], references: [id])
}
```

---

## Task Breakdown

### V13-001: DO Account Management Module
**Assignee:** Senior Backend Engineer  
**Priority:** P1  
**Effort:** 2 days

**Directory:** `apps/order-service/src/modules/do-account/`

```
do-account/
├── do-account.module.ts
├── do-account.service.ts
├── do-account.controller.ts      # Admin endpoints
├── dto/
│   ├── create-do-account.dto.ts
│   ├── update-do-account.dto.ts
│   └── do-account-response.dto.ts
└── do-account.service.spec.ts
```

**Service Methods:**
```typescript
class DoAccountService {
  // CRUD
  create(dto: CreateDoAccountDto): Promise<DoAccount>
  findAll(): Promise<DoAccount[]>
  findById(id: string): Promise<DoAccount>
  update(id: string, dto: UpdateDoAccountDto): Promise<DoAccount>
  delete(id: string): Promise<void>
  
  // Account Selection (CORE)
  selectAvailableAccount(): Promise<DoAccount>
  
  // Health & Sync
  syncAccountLimits(accountId: string): Promise<void>
  syncAllAccounts(): Promise<void>
  healthCheck(accountId: string): Promise<AccountHealth>
}
```

**Admin Endpoints:**
```
POST   /internal/do-accounts              # Create account
GET    /internal/do-accounts              # List all accounts
GET    /internal/do-accounts/:id          # Get account detail
PATCH  /internal/do-accounts/:id          # Update account
DELETE /internal/do-accounts/:id          # Delete account
POST   /internal/do-accounts/:id/sync     # Sync limits from DO
POST   /internal/do-accounts/sync-all     # Sync all accounts
GET    /internal/do-accounts/:id/health   # Health check
```

---

### V13-002: Account Selection Algorithm
**Assignee:** Senior Backend Engineer  
**Priority:** P1  
**Effort:** 1 day

**Selection Logic:**
```typescript
async selectAvailableAccount(): Promise<DoAccount> {
  // 1. Get all active & healthy accounts
  const accounts = await this.prisma.doAccount.findMany({
    where: {
      isActive: true,
      healthStatus: { in: ['HEALTHY', 'UNKNOWN'] },
    },
    orderBy: [
      { isPrimary: 'desc' },  // Primary first as tiebreaker
      { activeDroplets: 'asc' },  // Least used first
    ],
  });
  
  if (accounts.length === 0) {
    throw new NoAvailableAccountException();
  }
  
  // 2. Find account with available capacity
  for (const account of accounts) {
    // Refresh from DO API to get real-time data
    const { dropletLimit, activeCount } = await this.getAccountCapacity(account);
    
    if (activeCount < dropletLimit) {
      // Update cache
      await this.prisma.doAccount.update({
        where: { id: account.id },
        data: { activeDroplets: activeCount },
      });
      
      return account;
    }
  }
  
  throw new AllAccountsFullException();
}

async getAccountCapacity(account: DoAccount): Promise<{
  dropletLimit: number;
  activeCount: number;
}> {
  const client = this.createDoClient(account.accessToken);
  
  // Get account info (droplet_limit)
  const accountInfo = await client.get('/v2/account');
  const dropletLimit = accountInfo.data.account.droplet_limit;
  
  // Get active droplets count
  const droplets = await client.get('/v2/droplets?per_page=1');
  const activeCount = droplets.data.meta.total;
  
  return { dropletLimit, activeCount };
}
```

**Edge Cases:**
- All accounts full → `AllAccountsFullException` → Alert admin
- Account unhealthy → Skip, try next
- API rate limited → Retry with backoff
- Token expired/invalid → Mark unhealthy, alert admin

---

### V13-003: Update Provisioning Flow
**Assignee:** Senior Backend Engineer  
**Priority:** P1  
**Effort:** 2 days

**Update:** `apps/order-service/src/modules/provisioning/provisioning.service.ts`

```typescript
async provision(orderId: string): Promise<ProvisioningTask> {
  const order = await this.getOrder(orderId);
  
  // NEW: Select available DO account
  const doAccount = await this.doAccountService.selectAvailableAccount();
  
  // Create provisioning task with account reference
  const task = await this.prisma.provisioningTask.create({
    data: {
      orderId,
      status: 'IN_PROGRESS',
      doAccountId: doAccount.id,  // NEW
      doRegion: this.getRegion(order),
      doSize: this.getSize(order),
      doImage: this.getImage(order),
    },
  });
  
  // Create droplet using selected account's token
  const droplet = await this.createDroplet(doAccount, task);
  
  // Increment active count (optimistic)
  await this.doAccountService.incrementActiveCount(doAccount.id);
  
  return task;
}

private async createDroplet(account: DoAccount, task: ProvisioningTask) {
  const client = this.createDoClient(account.accessToken);
  
  const response = await client.post('/v2/droplets', {
    name: `webrana-${task.orderId.slice(0, 8)}`,
    region: task.doRegion,
    size: task.doSize,
    image: task.doImage,
    // ...
  });
  
  return response.data.droplet;
}
```

---

### V13-004: Scheduled Sync Job
**Assignee:** Senior Backend Engineer  
**Priority:** P2  
**Effort:** 1 day

**Cron Job:** Sync account limits setiap 5 menit

```typescript
// apps/order-service/src/modules/do-account/do-account.scheduler.ts

@Injectable()
export class DoAccountScheduler {
  constructor(private doAccountService: DoAccountService) {}
  
  // Sync all accounts every 5 minutes
  @Cron('*/5 * * * *')
  async syncAllAccounts() {
    await this.doAccountService.syncAllAccounts();
  }
  
  // Health check every 1 minute
  @Cron('*/1 * * * *')
  async healthCheckAll() {
    const accounts = await this.doAccountService.findAll();
    
    for (const account of accounts) {
      const health = await this.doAccountService.healthCheck(account.id);
      
      if (health === 'UNHEALTHY') {
        // Alert admin via notification-service
        await this.notifyUnhealthyAccount(account);
      }
    }
  }
}
```

---

### V13-005: Admin UI for DO Accounts
**Assignee:** Senior Frontend Engineer  
**Priority:** P2  
**Effort:** 2 days

**Pages:**
```
apps/admin-web/src/app/(admin)/settings/do-accounts/
├── page.tsx              # List all DO accounts
├── [id]/page.tsx         # Account detail
└── new/page.tsx          # Add new account
```

**Features:**
- List accounts with status indicators
- Add/Edit/Delete accounts
- View capacity (used/limit)
- Manual sync button
- Health status badges
- Alert when all accounts near capacity

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────────┐
│ DigitalOcean Accounts                        [+ Add Account]│
├─────────────────────────────────────────────────────────────┤
│ Name          │ Email           │ Capacity    │ Status      │
├───────────────┼─────────────────┼─────────────┼─────────────┤
│ 🟢 Primary    │ do1@webrana.com │ 20/25 (80%) │ Healthy     │
│ 🟢 Account 2  │ do2@webrana.com │ 5/25 (20%)  │ Healthy     │
│ 🔴 Account 3  │ do3@webrana.com │ 25/25 (100%)│ Full        │
├───────────────┴─────────────────┴─────────────┴─────────────┤
│ Total Capacity: 50/75 (67%)                    [Sync All]   │
└─────────────────────────────────────────────────────────────┘
```

---

### V13-006: Security - Token Encryption
**Assignee:** Senior Backend Engineer  
**Priority:** P1  
**Effort:** 0.5 day

**Requirement:** DO access tokens harus encrypted di database

```typescript
// libs/common/src/lib/encryption/encryption.service.ts

@Injectable()
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;
  
  constructor() {
    this.key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }
  
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

**Environment:**
```env
ENCRYPTION_KEY=your-32-byte-hex-key-here
```

---

## Testing Requirements

### Unit Tests
- [ ] DoAccountService CRUD operations
- [ ] Account selection algorithm
- [ ] Encryption/decryption
- [ ] Health check logic

### Integration Tests
- [ ] Account selection with mock DO API
- [ ] Provisioning with selected account
- [ ] Sync job updates correct values

### E2E Tests
- [ ] Full order flow with multi-account
- [ ] Account failover when one is full

---

## Delegation Summary

| Task | Assignee | Effort | Priority |
|------|----------|--------|----------|
| V13-001: Account Management Module | `/backend` | 2 days | P1 |
| V13-002: Selection Algorithm | `/backend` | 1 day | P1 |
| V13-003: Update Provisioning | `/backend` | 2 days | P1 |
| V13-004: Scheduled Sync | `/backend` | 1 day | P2 |
| V13-005: Admin UI | `/frontend` | 2 days | P2 |
| V13-006: Token Encryption | `/backend` | 0.5 day | P1 |

**Total Effort:** ~8.5 days

---

## Environment Variables

```env
# Existing (will be deprecated after migration)
DO_ACCESS_TOKEN=xxx

# New
ENCRYPTION_KEY=64-character-hex-key-for-aes-256

# Optional: Default region if not specified
DIGITALOCEAN_DEFAULT_REGION=sgp1
```

---

## Migration Plan

1. **Phase A:** Deploy new schema & module (accounts table empty)
2. **Phase B:** Add first account via Admin UI (current DO_ACCESS_TOKEN)
3. **Phase C:** Test provisioning with new flow
4. **Phase D:** Add additional accounts
5. **Phase E:** Remove old DO_ACCESS_TOKEN env var

---

## Success Criteria

- [ ] Multiple DO accounts can be added via Admin UI
- [ ] System auto-selects account with available capacity
- [ ] Provisioning works with any selected account
- [ ] Tokens are encrypted in database
- [ ] Health checks detect unhealthy accounts
- [ ] Admin alerted when all accounts near capacity
- [ ] Existing tests pass
- [ ] New unit & integration tests added

---

## Monitoring & Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| Account Full | `activeDroplets >= dropletLimit` | Notify admin |
| All Accounts Full | No available account | Critical alert |
| Account Unhealthy | Health check fails | Notify admin |
| High Utilization | Total capacity > 80% | Warning |

---

**Document Version:** 1.0  
**Status:** Approved - Ready for Implementation
