# Auth Service

A robust, secure, and scalable authentication service built with NestJS, designed to handle user identity, access control, and security for the Webrana Cloud platform.

## 🚀 Features

### Authentication & Authorization
- **JWT-based Authentication**: Secure access using short-lived Access Tokens and long-lived Refresh Tokens.
- **Refresh Token Rotation**: Enhanced security by issuing new refresh tokens upon use.
- **RBAC**: Role-Based Access Control support (Admin, User, etc.).
- **Flows**:
  - Register
  - Login
  - Logout (Single & All Sessions)
  - Forgot Password & Reset Password
  - Email Verification
  - Change Password

### Security Hardening
- **Rate Limiting**: Redis-backed distributed rate limiting to prevent abuse (Brute-force protection).
- **Security Headers**: Implements Helmet for `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`.
- **Input Sanitization**: Global pipe to sanitize inputs (trim, lowercase emails, HTML escape names) before validation.
- **Request Logging**: Structured JSON logging with sensitive data masking (PII protection) and exclusion of secrets.
- **Password Policy**: Enforced strong password requirements (length, uppercase, lowercase, digit, special char).

### Observability
- **Structured Logs**: JSON format logs for easy parsing and ingestion by log aggregators.
- **Health Check**: `/health` endpoint for monitoring.

## 🛠 Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Caching/Rate Limiting**: [Redis](https://redis.io/)
- **Testing**: [Jest](https://jestjs.io/), [Testcontainers](https://testcontainers.com/) (for integration tests)

## 📋 Prerequisites

- Node.js (v18+)
- Docker & Docker Compose (for local DB/Redis and running tests)
- PostgreSQL
- Redis

## ⚙️ Configuration

Copy `.env.example` to `.env` and configure the following variables:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 3001 |
| `DATABASE_URL` | PostgreSQL connection string | postgresql://... |
| `REDIS_URL` | Redis connection string | redis://... |
| `AUTH_JWT_SECRET` | Secret for signing JWTs | (Change in prod) |
| `AUTH_JWT_ACCESS_EXPIRY` | Access token lifetime | 15m |
| `AUTH_JWT_REFRESH_EXPIRY` | Refresh token lifetime | 7d |
| `AUTH_RATE_LIMIT_LOGIN` | Max login attempts per window | 5 |
| `AUTH_RATE_LIMIT_WINDOW` | Rate limit window in seconds | 60 |

*See `.env.example` for the full list of configurable options.*

## 🏃‍♂️ Running the Service

```bash
# Development mode
npx nx serve auth-service

# Production build
npx nx build auth-service
node dist/apps/auth-service/main.js
```

The service will start at `http://localhost:3001/api/v1/auth`.

## 🧪 Testing

This project uses **Testcontainers** for robust integration testing. Ensure Docker is running.

```bash
# Run all tests
npx nx test auth-service

# Run with coverage report
npx nx test auth-service --coverage

# Run specific test file
npx nx test auth-service --testFile=auth.service.spec.ts
```

## 🔌 API Endpoints

Base URL: `/api/v1/auth`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/register` | Register a new user | No |
| `POST` | `/login` | Login and receive tokens | No |
| `POST` | `/refresh` | Refresh access token | No |
| `POST` | `/logout` | Logout current session | No |
| `POST` | `/verify-email` | Verify email address | No |
| `POST` | `/resend-verification` | Resend verification email | No |
| `POST` | `/forgot-password` | Request password reset | No |
| `POST` | `/reset-password` | Reset password with token | No |
| `POST` | `/change-password` | Change password (authenticated) | **Yes** |
| `GET` | `/me` | Get current user profile | **Yes** |
| `PATCH` | `/me` | Update user profile | **Yes** |
| `POST` | `/logout-all` | Logout all sessions | **Yes** |

## 🔒 Security Details

### Rate Limiting
Configured globally with specific overrides for sensitive endpoints:
- **Login**: Strict limit (default 5 req/min)
- **Register**: Strict limit (default 3 req/min)
- **General**: Moderate limit for authenticated endpoints.

### Input Sanitization
All incoming requests pass through a `SanitizePipe` which:
- Trims whitespace from strings.
- Lowercases emails.
- HTML-escapes `full_name` to prevent stored XSS.

### Logging
Logs are sanitized to ensure no secrets leak:
- **Masked**: `email` (e.g., `u***@example.com`)
- **Redacted**: `password`, `token`, `access_token`, `refresh_token`
