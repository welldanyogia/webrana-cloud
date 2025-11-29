# Order Service

VPS Order and Provisioning Service for Webrana Cloud Platform.

## Overview

Order Service manages the complete VPS ordering lifecycle:

1. **Order Creation** - Users create orders by selecting a plan and image from catalog-service
2. **Payment** - Admin/internal endpoints for mock payment verification (v1)
3. **Provisioning** - Automatic droplet creation on DigitalOcean after payment
4. **Monitoring** - Users can track order status and view droplet details

### Dependencies

| Service | Purpose |
|---------|---------|
| **auth-service** | JWT token validation (RS256/HS256) |
| **catalog-service** | Plan/image catalog and pricing |
| **DigitalOcean API** | VPS provisioning |
| **PostgreSQL** | Order and provisioning data storage |

## Setup & Running

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)
- Access to DigitalOcean API (for production)

### Installation

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Start PostgreSQL via Docker Compose
docker-compose up -d

# 3. Run database migrations
npx prisma migrate dev

# 4. (Optional) Seed the database
npx prisma db seed

# 5. Start the service
npx nx serve order-service
```

The service will be available at `http://localhost:3002/api/v1`.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `CATALOG_SERVICE_URL` | Yes | - | URL to catalog-service (e.g., `http://localhost:3001`) |
| `JWT_ALGORITHM` | No | `RS256` | JWT algorithm: `RS256` (production) or `HS256` (dev) |
| `JWT_PUBLIC_KEY` | Conditional | - | RS256 public key (required if `JWT_ALGORITHM=RS256`) |
| `JWT_SECRET` | Conditional | - | HS256 secret (required if `JWT_ALGORITHM=HS256`) |
| `DIGITALOCEAN_API_TOKEN` | Yes* | - | DigitalOcean API token (*mocked in tests) |
| `DIGITALOCEAN_DEFAULT_REGION` | No | `sgp1` | Default droplet region |
| `PROVISIONING_POLL_INTERVAL_MS` | No | `5000` | Polling interval for droplet status (ms) |
| `PROVISIONING_MAX_ATTEMPTS` | No | `60` | Max polling attempts before timeout |
| `INTERNAL_API_KEY` | Yes | - | API key for internal/admin endpoints |

### JWT Configuration Notes

**Production (RS256):**
```env
JWT_ALGORITHM=RS256
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIj...\n-----END PUBLIC KEY-----"
```

**Development (HS256):**
```env
JWT_ALGORITHM=HS256
JWT_SECRET=your-secret-key
```

## API Summary

### User Endpoints (JWT Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/orders` | Create new order |
| `GET` | `/api/v1/orders` | List user's orders (paginated) |
| `GET` | `/api/v1/orders/:id` | Get order details |

### Admin/Internal Endpoints (API Key Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/internal/orders/:id/payment-status` | Update payment status |
| `GET` | `/api/v1/internal/orders` | List all orders (paginated, filterable) |
| `GET` | `/api/v1/internal/orders/:id` | Get order detail with full history |

## Request/Response Examples

### Create Order

**Request:**
```http
POST /api/v1/orders
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "planId": "plan-basic-vps-001",
  "imageId": "image-ubuntu-2204-001",
  "duration": "MONTHLY",
  "couponCode": "HEMAT20"
}
```

**Success Response (201):**
```json
{
  "data": {
    "id": "6f0429ea-4344-496d-bd40-1f4e47a6220c",
    "status": "PENDING_PAYMENT",
    "pricing": {
      "basePrice": 100000,
      "promoDiscount": 0,
      "couponDiscount": 20000,
      "finalPrice": 80000,
      "currency": "IDR"
    },
    "items": [
      {
        "id": "item-001",
        "itemType": "PLAN",
        "referenceId": "plan-basic-vps-001",
        "description": "Basic VPS 1vCPU 1GB",
        "unitPrice": 100000,
        "quantity": 1,
        "totalPrice": 100000
      }
    ],
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### Mark Payment as PAID (Admin)

**Request:**
```http
POST /api/v1/internal/orders/6f0429ea-4344-496d-bd40-1f4e47a6220c/payment-status
X-API-Key: your-internal-api-key
Content-Type: application/json

{
  "status": "PAID",
  "notes": "Manual bank transfer verified"
}
```

**Success Response (200):**
```json
{
  "data": {
    "id": "6f0429ea-4344-496d-bd40-1f4e47a6220c",
    "status": "PAID",
    "previousStatus": "PENDING_PAYMENT",
    "paidAt": "2024-01-15T11:00:00.000Z"
  }
}
```

### Get Order Detail (User)

**Request:**
```http
GET /api/v1/orders/6f0429ea-4344-496d-bd40-1f4e47a6220c
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "data": {
    "id": "6f0429ea-4344-496d-bd40-1f4e47a6220c",
    "status": "ACTIVE",
    "pricing": {
      "basePrice": 100000,
      "promoDiscount": 0,
      "couponDiscount": 20000,
      "finalPrice": 80000,
      "currency": "IDR"
    },
    "items": [...],
    "provisioningTask": {
      "id": "task-001",
      "status": "SUCCESS",
      "dropletId": "12345678",
      "dropletName": "vps-6f0429ea",
      "dropletStatus": "active",
      "ipv4Public": "143.198.123.45",
      "ipv4Private": "10.130.0.2",
      "doRegion": "sgp1",
      "doSize": "s-1vcpu-1gb",
      "doImage": "ubuntu-22-04-x64",
      "errorCode": null,
      "errorMessage": null,
      "startedAt": "2024-01-15T11:01:00.000Z",
      "completedAt": "2024-01-15T11:05:00.000Z"
    },
    "paidAt": "2024-01-15T11:00:00.000Z",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T11:05:00.000Z"
  }
}
```

### Error Response Example

```json
{
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order dengan ID tersebut tidak ditemukan",
    "details": {
      "orderId": "non-existent-id"
    }
  }
}
```

## Order Status Flow

```
PENDING_PAYMENT  ──[PAID]──>  PAID  ──[auto]──>  PROVISIONING  ──[success]──>  ACTIVE
       │                                               │
       │                                               └──[failure]──>  FAILED
       │
       └──[CANCELLED]──>  CANCELLED
```

### Status Descriptions

| Status | Description |
|--------|-------------|
| `PENDING_PAYMENT` | Order created, awaiting payment |
| `PAID` | Payment received, provisioning will start |
| `PROVISIONING` | Droplet being created on DigitalOcean |
| `ACTIVE` | Droplet ready and running |
| `FAILED` | Provisioning failed (timeout or DO error) |
| `CANCELLED` | Order cancelled by user/admin |

### PAYMENT_FAILED Behavior (v1)

`PAYMENT_FAILED` is treated as a **payment event**, not an order status transition:
- Order status remains `PENDING_PAYMENT`
- Event is recorded in `StatusHistory`
- User/admin can retry payment

## Testing

### Unit Tests

```bash
npx nx test order-service
```

### Integration Tests

Integration tests are **skipped by default**. To run them:

1. Ensure PostgreSQL is running (via `docker-compose up -d`)
2. Ensure `.env` has valid `DATABASE_URL`
3. Run with the `RUN_INTEGRATION_TESTS` flag:

```bash
# Windows (PowerShell)
$env:RUN_INTEGRATION_TESTS="true"; npx nx test order-service

# Linux/macOS
RUN_INTEGRATION_TESTS=true npx nx test order-service
```

**Note:** Integration tests validate full order lifecycle including:
- Order creation with catalog service mocks
- Payment status updates (PAID, PAYMENT_FAILED)
- Provisioning flow with DigitalOcean mocks
- Admin endpoint access control

### Test Coverage

```bash
npx nx test order-service --coverage
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ORDER_NOT_FOUND` | 404 | Order ID does not exist |
| `ORDER_ACCESS_DENIED` | 403 | User does not own this order |
| `INVALID_PLAN` | 400 | Plan ID invalid or inactive |
| `INVALID_IMAGE` | 400 | Image ID invalid or unavailable |
| `INVALID_COUPON` | 400 | Coupon code invalid or expired |
| `INVALID_DURATION` | 400 | Duration not available for plan |
| `PAYMENT_STATUS_CONFLICT` | 409 | Invalid payment status transition |
| `PROVISIONING_FAILED` | 500 | Droplet creation failed |
| `PROVISIONING_TIMEOUT` | 504 | Droplet not ready within timeout |
| `CATALOG_SERVICE_UNAVAILABLE` | 503 | Cannot reach catalog-service |
| `DIGITALOCEAN_UNAVAILABLE` | 503 | Cannot reach DigitalOcean API |

## Architecture

```
apps/order-service/
├── src/
│   ├── app/                    # App module, controller, service
│   ├── common/
│   │   ├── decorators/         # @CurrentUser decorator
│   │   ├── exceptions/         # Custom exceptions with error codes
│   │   ├── filters/            # HttpExceptionFilter
│   │   └── guards/             # JwtAuthGuard, ApiKeyGuard
│   ├── modules/
│   │   ├── catalog-client/     # HTTP client for catalog-service
│   │   ├── order/              # Order, Payment services & controllers
│   │   └── provisioning/       # Provisioning, DigitalOcean client
│   └── prisma/                 # PrismaService
├── prisma/
│   └── schema.prisma           # Database schema
└── test/
    ├── helpers/                # Test utilities (mocks, database setup)
    └── integration/            # Integration tests
```

## Running with Docker

### 1. Start Stack (Postgres + Order Service)

Di root monorepo:

```bash
docker-compose -f docker-compose.order-service.yml up -d --build
```

Cek container running:

```bash
docker ps
# Should show: order-service-db (postgres) dan order-service (NestJS)
```

### 2. Environment

Order service di container menggunakan file:
- `apps/order-service/.env.docker`

Variable penting:
- `DATABASE_URL` - Connection string ke PostgreSQL
- `JWT_ALGORITHM`, `JWT_SECRET` - JWT configuration (HS256 untuk dev)
- `INTERNAL_API_KEY` - API key untuk endpoint /internal/*
- `CATALOG_SERVICE_BASE_URL` - URL ke catalog-service
- `DO_ACCESS_TOKEN` - DigitalOcean API token (untuk provisioning)

### 3. Healthcheck & Smoke Test

```bash
# Health check
curl http://localhost:3333/api/v1/health

# Generate JWT token (dari root monorepo)
node scripts/gen-jwt.mjs

# Create order (akan error CATALOG_SERVICE_UNAVAILABLE jika catalog-service tidak ada)
curl -X POST http://localhost:3333/api/v1/orders \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"planId":"uuid-plan","imageId":"uuid-image","duration":"MONTHLY"}'
```

### 4. Stop Stack

```bash
docker-compose -f docker-compose.order-service.yml down
```

## Related Documentation

- [PRD: VPS Order & Provisioning Service v1.0](../../tasks/prd-vps-order-provisioning-service-v1-0.md)
- [Task List](../../tasks/tasks-order-service-v1.md)
