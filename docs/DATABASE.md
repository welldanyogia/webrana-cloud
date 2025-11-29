# WeBrana Cloud Database Documentation

This document describes the database architecture, migration procedures, and seed data for the WeBrana Cloud platform.

## Overview

WeBrana Cloud uses **PostgreSQL** as the primary database with **Prisma ORM** for schema management and database access. Each microservice has its own isolated schema and migrations.

### Services with Databases

| Service | Schema Location | Purpose |
|---------|-----------------|---------|
| auth-service | `apps/auth-service/prisma/schema.prisma` | User authentication, tokens, MFA |
| catalog-service | `apps/catalog-service/prisma/schema.prisma` | VPS plans, images, coupons, pricing |
| order-service | `apps/order-service/prisma/schema.prisma` | Orders, provisioning tasks, status history |
| billing-service | `apps/billing-service/prisma/schema.prisma` | Invoices, payments |

---

## Database Schemas

### Auth Service Schema

**Tables:**
- `users` - User accounts with email, password hash, roles
- `refresh_tokens` - JWT refresh tokens for session management
- `verification_tokens` - Email verification and password reset tokens
- `user_mfa` - Multi-factor authentication settings (prepared for future)

**Key Fields:**
```
User {
  id: UUID
  email: string (unique)
  passwordHash: string
  fullName: string
  role: customer | admin | super_admin
  status: pending_verification | active | suspended | deleted
}
```

### Catalog Service Schema

**Tables:**
- `vps_plans` - VPS plan specifications (CPU, RAM, Disk, etc.)
- `plan_pricings` - Monthly/yearly pricing for plans
- `plan_promos` - Time-limited promotional discounts
- `vps_images` - OS images (Ubuntu, Debian, CentOS)
- `vps_plan_images` - Many-to-many: which images are available for which plans
- `coupons` - Discount coupons with rules
- `coupon_plans` - Many-to-many: coupon restrictions to specific plans
- `coupon_users` - Many-to-many: coupon restrictions to specific users
- `coupon_redemptions` - Coupon usage history

### Order Service Schema

**Tables:**
- `orders` - Customer orders with pricing snapshot
- `order_items` - Line items within an order
- `provisioning_tasks` - DigitalOcean droplet provisioning status
- `status_history` - Order status change audit trail

**Order Status Flow:**
```
PENDING_PAYMENT → PAID → PROVISIONING → ACTIVE
                       ↘               ↘
                        CANCELED        FAILED
```

### Billing Service Schema

**Tables:**
- `invoices` - Payment invoices with Tripay integration
- `payments` - Individual payment transactions

**Invoice Status Flow:**
```
PENDING → PAID
        ↘
         EXPIRED / CANCELLED
```

---

## Migration Instructions

### Prerequisites

1. PostgreSQL database running and accessible
2. `DATABASE_URL` environment variable configured for each service
3. Prisma CLI installed (`npm install`)

### Running Migrations

#### Development Environment

Use `migrate dev` for development (creates migrations from schema changes):

```bash
# Generate and apply migrations for a specific service
npx prisma migrate dev --schema=apps/auth-service/prisma/schema.prisma

# Generate Prisma Client
npx prisma generate --schema=apps/auth-service/prisma/schema.prisma
```

#### Production Environment

Use the provided migration script or `migrate deploy`:

```bash
# Using the migration script (recommended)
./scripts/migrate.sh

# Or run specific service
./scripts/migrate.sh --service=auth-service

# Or use Prisma directly
npx prisma migrate deploy --schema=apps/auth-service/prisma/schema.prisma
```

**Important:** In production, NEVER use `migrate dev`. Always use `migrate deploy`.

### Migration Order

Services should be migrated in this order due to data dependencies:

1. **auth-service** - No dependencies (users are foundational)
2. **catalog-service** - No dependencies (reference data)
3. **order-service** - Depends on auth (user_id) and catalog (plan_id, image_id)
4. **billing-service** - Depends on order (order_id) and auth (user_id)

---

## Seed Data

### Overview

Seed scripts populate initial data required for the application to function. All seeds use **upsert** operations to be idempotent (safe to run multiple times).

### Running Seeds

```bash
# Using the seed script (recommended)
./scripts/seed.sh

# Or run specific service
./scripts/seed.sh --service=catalog-service

# Or use Prisma directly
npx prisma db seed --schema=apps/auth-service/prisma/schema.prisma
```

### Auth Service Seeds

Creates default administrative users:

| Email | Role | Default Password |
|-------|------|------------------|
| `superadmin@webrana.cloud` | super_admin | `SuperAdmin123!` |
| `admin@webrana.cloud` | admin | `Admin123!` |
| `customer@webrana.cloud` | customer | `Customer123!` (dev only) |

**⚠️ SECURITY WARNING:** Change these passwords immediately after first deployment!

To set custom passwords:
```bash
export SUPER_ADMIN_PASSWORD="YourSecurePassword123!"
export ADMIN_PASSWORD="AnotherSecurePassword456!"
./scripts/seed.sh --service=auth-service
```

### Catalog Service Seeds

Creates initial VPS catalog data:

**VPS Plans:**
| Plan | CPU | RAM | Disk | Price (Monthly) |
|------|-----|-----|------|-----------------|
| Basic | 1 | 1GB | 25GB | Rp 50,000 |
| Standard | 2 | 2GB | 50GB | Rp 100,000 |
| Pro | 4 | 8GB | 160GB | Rp 400,000 |

**OS Images:**
- Ubuntu 22.04 LTS
- Ubuntu 24.04 LTS
- Debian 12
- CentOS Stream 9

**Coupons:**
- `WELCOME10` - 10% off (max Rp 100,000)
- `FLAT25K` - Flat Rp 25,000 off (min order Rp 100,000)

---

## Database Connection

### Environment Variables

Each service requires its own `DATABASE_URL`:

```env
# Auth Service
AUTH_DATABASE_URL=postgresql://user:pass@localhost:5432/webrana_auth

# Catalog Service
CATALOG_DATABASE_URL=postgresql://user:pass@localhost:5432/webrana_catalog

# Order Service
ORDER_DATABASE_URL=postgresql://user:pass@localhost:5432/webrana_order

# Billing Service
BILLING_DATABASE_URL=postgresql://user:pass@localhost:5432/webrana_billing
```

### Connection String Format

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
```

**Options:**
- `sslmode=require` - Enable SSL (recommended for production)
- `connection_limit=10` - Limit connection pool size
- `pool_timeout=10` - Connection pool timeout in seconds

---

## Backup & Restore

### Creating Backups

```bash
# Full database backup
pg_dump -h HOST -U USER -d DATABASE -F c -f backup_$(date +%Y%m%d_%H%M%S).dump

# Schema-only backup
pg_dump -h HOST -U USER -d DATABASE --schema-only -f schema_backup.sql

# Data-only backup
pg_dump -h HOST -U USER -d DATABASE --data-only -f data_backup.sql
```

### Restoring from Backup

```bash
# Restore from custom format backup
pg_restore -h HOST -U USER -d DATABASE -c backup.dump

# Restore from SQL file
psql -h HOST -U USER -d DATABASE -f backup.sql
```

### Automated Backup Strategy

For production, implement automated daily backups:

1. **Daily full backup** - Retained for 7 days
2. **Weekly full backup** - Retained for 4 weeks
3. **Monthly full backup** - Retained for 12 months

Consider using cloud provider managed backup solutions (e.g., DigitalOcean Managed Databases, AWS RDS automated backups).

---

## Prisma Studio

For visual database management during development:

```bash
# Open Prisma Studio for a specific service
npx prisma studio --schema=apps/auth-service/prisma/schema.prisma
```

This opens a web interface at `http://localhost:5555` where you can browse and edit data.

---

## Troubleshooting

### Common Issues

**1. Migration pending state**
```bash
# Reset migration state (CAUTION: may lose data)
npx prisma migrate reset --schema=apps/SERVICE/prisma/schema.prisma
```

**2. Prisma Client out of sync**
```bash
# Regenerate Prisma Client
npx prisma generate --schema=apps/SERVICE/prisma/schema.prisma
```

**3. Connection refused**
- Check PostgreSQL is running
- Verify DATABASE_URL is correct
- Check firewall/security group rules

**4. Permission denied**
- Ensure database user has CREATE/ALTER privileges
- Check pg_hba.conf for connection permissions

### Health Checks

Each service should expose a database health check endpoint:
```
GET /health/db
```

Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "latency_ms": 5
}
```

---

## Schema Versioning

All schema changes must go through Prisma migrations:

1. Modify `schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Review generated SQL in `migrations/` folder
4. Commit migration files to version control
5. Deploy using `migrate deploy` in production

**Never:**
- Directly modify database schema in production
- Delete or modify existing migration files
- Use `migrate dev` in production

---

## Related Documentation

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [API Consumer Documentation](./api-consumer.md)
- [Deployment Guide](./DEPLOYMENT.md)
