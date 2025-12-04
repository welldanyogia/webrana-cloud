# Staging Environment Setup

This document outlines the procedure for setting up and managing the WeBrana Cloud staging environment.

## Architecture

The staging environment is designed to mirror production as closely as possible, with the following key differences:
- **Single Database Instance**: Uses one PostgreSQL instance with separate schemas for each service to save resources.
- **Debug Logging**: Enabled for all services to facilitate troubleshooting.
- **Relaxed Rate Limits**: Higher thresholds to prevent blocking during intensive testing.
- **Mock Services**: Can be configured to use mock payment/provider gateways if needed (controlled via env vars).

## Prerequisites

- Docker & Docker Compose (v2+)
- Git
- Node.js v20+ (for local tools)
- SSL Certificates (if exposing to internet)

## Configuration

1. **Environment Variables**
   Copy the staging template:
   ```bash
   cp .env.staging.example .env
   ```

2. **Secrets Configuration**
   Edit `.env` and populate the following critical secrets:
   - `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`: Generate new RS256 keys.
   - `DATABASE_PASSWORD`: Set a strong password.
   - `INTERNAL_API_KEY`: Generate a secure random string.
   - `DIGITALOCEAN_API_TOKEN`: Use a specific Staging Project token or Mock.
   - `TRIPAY_*`: Use Sandbox credentials.

## Deployment

To start the staging stack:

```bash
docker-compose -f docker-compose.staging.yml up -d --build
```

### Services & Ports

| Service | Internal Port | External Port (Host) |
|---------|---------------|----------------------|
| PostgreSQL | 5432 | 5432 |
| Redis | 6379 | 6379 |
| API Gateway | 3000 | 3000 |
| Auth Service | 3001 | 3001 |
| Catalog Service | 3002 | 3002 |
| Order Service | 3003 | 3003 |
| Billing Service | 3004 | 3004 |
| Instance Service | 3005 | 3005 |
| Notification Service | 3006 | 3006 |
| Admin Web | 3000 | 4200 |
| Customer Web | 3000 | 4201 |

## Database Management

Since staging uses schemas, migrations must be run for each service. The Dockerfiles include an entrypoint that attempts to run `npx prisma migrate deploy`, but you can also run them manually if needed:

```bash
# Example for Order Service
docker-compose -f docker-compose.staging.yml exec order-service npx prisma migrate deploy
```

## Testing on Staging

1. **Health Checks**
   Verify all services are healthy:
   ```bash
   docker-compose -f docker-compose.staging.yml ps
   ```

2. **Accessing Frontend**
   - Admin Dashboard: http://localhost:4200 (or configured domain)
   - Customer Portal: http://localhost:4201 (or configured domain)

3. **Logs**
   View logs for specific services:
   ```bash
   docker-compose -f docker-compose.staging.yml logs -f order-service
   ```

## Troubleshooting

- **Database Connection Errors**: Ensure `DATABASE_URL_*` in `.env` matches the container name (`postgres-staging`) and credentials.
- **JWT Errors**: Verify that the Public Key in `auth-service` matches the private key used for signing, and other services have the correct Public Key.
