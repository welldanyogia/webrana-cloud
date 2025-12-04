# WeBrana Cloud

**VPS Indonesia yang cepat, mudah, dan terjangkau.**

Platform cloud hosting VPS dengan pembayaran Rupiah, provisioning otomatis via DigitalOcean, dan dashboard self-service untuk customer dan admin.

[![CI Pipeline](https://github.com/welldanyogia/webrana-cloud/actions/workflows/ci.yml/badge.svg)](https://github.com/welldanyogia/webrana-cloud/actions/workflows/ci.yml)

## Features

### Customer Portal
- **Self-service VPS ordering** - Order VPS dalam hitungan menit
- **Multiple payment methods** - QRIS, Virtual Account, E-Wallet via Tripay
- **Real-time provisioning** - VPS aktif otomatis setelah pembayaran
- **VPS Management** - Start, stop, reboot, rebuild, delete
- **Wallet system** - Top-up saldo untuk pembayaran
- **In-app notifications** - Real-time notifications via WebSocket

### Admin Panel
- **Order management** - View, approve, override payments
- **User management** - Manage customers
- **DO Account management** - Multiple DigitalOcean accounts dengan load balancing
- **Analytics dashboard** - Revenue, orders, plans charts
- **Bulk actions** - Batch approve/reject orders

### Backend Services
- **Auto-provisioning** - DigitalOcean droplet creation
- **Lifecycle management** - Auto-suspend, terminate expired VPS
- **Promo codes** - Discount dan promotional pricing
- **Multi-channel notifications** - Email, Telegram, In-app

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | NestJS, TypeScript, Prisma ORM |
| **Frontend** | Next.js 14, React, TailwindCSS, shadcn/ui |
| **Database** | PostgreSQL |
| **Cache** | Redis |
| **Message Queue** | BullMQ |
| **Payment** | Tripay |
| **Cloud Provider** | DigitalOcean |
| **Monitoring** | Prometheus, Grafana, Sentry |

## Project Structure

```
webrana-cloud/
├── apps/
│   ├── api-gateway/          # API Gateway & routing (NestJS)
│   ├── auth-service/         # Authentication & JWT (NestJS)
│   ├── catalog-service/      # Plans, images, pricing (NestJS)
│   ├── billing-service/      # Payment & invoicing (NestJS)
│   ├── order-service/        # Orders & provisioning (NestJS)
│   ├── instance-service/     # VPS instance management (NestJS)
│   ├── notification-service/ # Email/Telegram/In-app (NestJS)
│   ├── customer-web/         # Customer portal (Next.js)
│   └── admin-web/            # Admin dashboard (Next.js)
├── libs/
│   └── common/               # Shared utilities
├── docker/
│   └── monitoring/           # Prometheus + Grafana stack
├── docs/
│   └── deployment/           # Deployment guides
└── tasks/                    # PRD & task tracking
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| api-gateway | 3000 | API Gateway, rate limiting, auth middleware |
| auth-service | 3001 | JWT authentication, user management |
| catalog-service | 3002 | VPS plans, OS images, coupons |
| order-service | 3003 | Order lifecycle, DO provisioning |
| billing-service | 3004 | Invoices, payments, wallet |
| notification-service | 3005 | Email, Telegram, WebSocket |
| instance-service | 3006 | VPS actions, status sync |
| customer-web | 4200 | Customer portal |
| admin-web | 4201 | Admin dashboard |

## Quick Start

### Prerequisites

- Node.js >= 20
- PostgreSQL 15+
- Redis 7+
- npm >= 9

### Installation

```bash
# Clone repository
git clone https://github.com/welldanyogia/webrana-cloud.git
cd webrana-cloud

# Install dependencies
npm install --legacy-peer-deps

# Generate Prisma clients
npm run db:generate

# Copy environment files
cp .env.example .env
# Edit .env with your configuration
```

### Development

```bash
# Start all backend services
npm run dev

# Or start individual service
npx nx serve order-service
npx nx serve customer-web

# Run tests
npm run test

# Lint
npm run lint
```

### Database Setup

```bash
# Run migrations (development)
npm run db:migrate:dev

# Run migrations (production)
npm run db:migrate:deploy

# Open Prisma Studio
npx prisma studio --schema=apps/order-service/prisma/schema.prisma
```

## Environment Variables

Key environment variables (see `.env.example` for full list):

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/webrana

# JWT
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256

# DigitalOcean
DO_ACCESS_TOKEN=your-do-token

# Tripay Payment
TRIPAY_API_KEY=your-tripay-key
TRIPAY_PRIVATE_KEY=your-private-key
TRIPAY_MERCHANT_CODE=your-merchant-code

# Services URLs
AUTH_SERVICE_URL=http://localhost:3001
CATALOG_SERVICE_URL=http://localhost:3002
ORDER_SERVICE_URL=http://localhost:3003
BILLING_SERVICE_URL=http://localhost:3004

# Sentry (optional)
SENTRY_DSN=your-sentry-dsn
```

## Deployment

### Staging

```bash
# Use staging configuration
cp .env.staging.example .env

# Start staging stack
docker-compose -f docker-compose.staging.yml up -d
```

### Production

See [Deployment Runbook](docs/deployment/RUNBOOK.md) for full instructions.

```bash
# Build all services
npm run build

# Run database migrations
npm run db:migrate:deploy

# Start with PM2 or Docker
docker-compose up -d
```

### Monitoring

```bash
# Start Prometheus + Grafana
cd docker/monitoring
docker-compose up -d

# Access
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
```

## Testing

```bash
# Run all tests
npm run test

# Run specific service tests
npx nx test order-service
npx nx test auth-service

# Run with coverage
npx nx test order-service --coverage

# Run E2E tests (requires Docker)
npm run test:e2e
```

### Test Coverage

| Service | Unit Tests | Status |
|---------|------------|--------|
| auth-service | 163 | ✅ |
| notification-service | 115 | ✅ |
| billing-service | 157 | ✅ |
| order-service | 80+ | ✅ |
| catalog-service | 23 | ✅ |

## API Documentation

Swagger documentation available at `/api/docs` when service is running:

```
http://localhost:3003/api/docs  # order-service
```

## CI/CD

GitHub Actions pipeline runs on push to `master`/`develop`:

1. **Lint** - ESLint & TypeScript check
2. **Test** - Unit tests
3. **Build** - Build all services

## Security

- JWT authentication with refresh token rotation
- Rate limiting per user and IP
- OWASP security testing
- Sentry error tracking
- Security headers (CSP, X-Frame-Options, etc.)

## Documentation

- [Deployment Runbook](docs/deployment/RUNBOOK.md)
- [Staging Guide](docs/deployment/STAGING.md)
- [Database Migrations](docs/database/MIGRATIONS.md)
- [API Consumer Guide](apps/order-service/docs/api-consumer.md)
- [PRD v1.x](tasks/prd-webrana-cloud-platform-v1.md)

## Contributing

1. Create feature branch from `develop`
2. Follow conventional commits (`feat:`, `fix:`, `docs:`)
3. Ensure tests pass
4. Create pull request

## License

Proprietary - WeBrana Cloud

## Support

- Email: support@webrana.cloud
- Documentation: [docs/](docs/)
