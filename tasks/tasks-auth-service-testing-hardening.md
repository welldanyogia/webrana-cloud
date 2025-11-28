# Tasks: Auth Service – Testing & Hardening v1.1

> Generated from: `prd-auth-service-testing-hardening-v1.1.md`

## Relevant Files

### Test Infrastructure
- `apps/auth-service/test/setup.ts` - Testcontainers setup untuk PostgreSQL dan Redis
- `apps/auth-service/test/helpers/test-database.ts` - Database utilities (cleanup, seed)
- `apps/auth-service/test/helpers/test-fixtures.ts` - Test data factories (createTestUser, dll)
- `apps/auth-service/test/helpers/test-app.ts` - NestJS test app bootstrap helper
- `apps/auth-service/jest.config.ts` - Jest configuration update

### Unit Tests - Core Services
- `apps/auth-service/src/common/services/password.service.spec.ts` - Unit tests PasswordService
- `apps/auth-service/src/common/services/jwt.service.spec.ts` - Unit tests JwtTokenService
- `apps/auth-service/src/common/services/token.service.spec.ts` - Unit tests TokenService

### Unit Tests - Business Services
- `apps/auth-service/src/modules/user/user.service.spec.ts` - Unit tests UserService
- `apps/auth-service/src/modules/auth/auth.service.spec.ts` - Unit tests AuthService

### Integration Tests
- `apps/auth-service/src/modules/auth/auth.controller.integration.spec.ts` - Integration tests auth endpoints
- `apps/auth-service/src/modules/auth/password.controller.integration.spec.ts` - Integration tests password endpoints
- `apps/auth-service/src/modules/auth/profile.controller.integration.spec.ts` - Integration tests profile endpoints

### E2E Flow Tests
- `apps/auth-service/test/e2e/auth-flow.e2e-spec.ts` - Full auth flow tests
- `apps/auth-service/test/e2e/password-flow.e2e-spec.ts` - Password reset/change flow tests

### Hardening
- `apps/auth-service/src/common/guards/throttle.guard.ts` - Custom throttle guard dengan Redis
- `apps/auth-service/src/common/interceptors/logging.interceptor.ts` - Request logging interceptor
- `apps/auth-service/src/common/pipes/sanitize.pipe.ts` - Input sanitization pipe
- `apps/auth-service/src/common/utils/email-mask.util.ts` - Email masking utility untuk logs

### Notes

- Unit tests ditempatkan alongside source files (`*.spec.ts`)
- Integration tests menggunakan suffix `.integration.spec.ts`
- E2E tests ditempatkan di folder `test/e2e/`
- Gunakan `npx nx test auth-service` untuk menjalankan semua tests
- Gunakan `npx nx test auth-service --coverage` untuk coverage report

---

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Install dependencies` → `- [x] 1.1 Install dependencies` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

---

## Tasks

- [x] 0.0 Setup Test Infrastructure
  - [x] 0.1 Install test dependencies (`@testcontainers/postgresql`, `testcontainers`, `supertest`, `@types/supertest`, `ts-jest`, `jest`)
  - [x] 0.2 Update `jest.config.ts` untuk auth-service (coverage thresholds, test patterns)
  - [x] 0.3 Create `test/setup.ts` untuk global test setup
  - [x] 0.4 Create `test/helpers/test-app.ts` - helper untuk bootstrap NestJS test app
  - [x] 0.5 Verify test setup dengan simple smoke test

- [x] 1.0 Unit Tests - Core Services (PasswordService, JwtTokenService, TokenService)
  - [x] 1.1 Create `password.service.spec.ts` - test `hash()` menghasilkan bcrypt hash valid
  - [x] 1.2 Test `verify()` - correct password returns true, wrong password returns false
  - [x] 1.3 Test `validatePolicy()` - semua kombinasi policy (min length, uppercase, lowercase, digit, special)
  - [x] 1.4 Create `jwt.service.spec.ts` - test `generateAccessToken()` payload sesuai spec
  - [x] 1.5 Test `generateRefreshToken()` - payload dengan tokenId unik
  - [x] 1.6 Test `verifyAccessToken()` - valid token, expired token, invalid signature, wrong type
  - [x] 1.7 Test `verifyRefreshToken()` - valid token, expired token, wrong type
  - [x] 1.8 Test `generateTokenPair()` - returns both tokens dengan correct structure
  - [x] 1.9 Create `token.service.spec.ts` - test `generateVerificationToken()` untuk email_verification
  - [x] 1.10 Test `generateVerificationToken()` untuk password_reset dengan expiry berbeda
  - [x] 1.11 Test `hashToken()` - SHA256 hash konsisten
  - [x] 1.12 Verify coverage >= 100% untuk semua core services

- [x] 2.0 Unit Tests - Business Services (UserService, AuthService)
  - [x] 2.1 Create `user.service.spec.ts` dengan mock PrismaService dan PasswordService
  - [x] 2.2 Test `create()` - success case, email exists throws EmailExistsException
  - [x] 2.3 Test `create()` - password policy fail throws PasswordValidationException
  - [x] 2.4 Test `findByEmail()` - returns user atau null
  - [x] 2.5 Test `findByIdOrThrow()` - returns user atau throws UserNotFoundException
  - [x] 2.6 Test `verifyPassword()` - delegates to PasswordService
  - [x] 2.7 Test `updatePassword()` - validates policy, hashes, updates lastPasswordChangeAt
  - [x] 2.8 Create `auth.service.spec.ts` dengan mock semua dependencies
  - [x] 2.9 Test `register()` - creates user, creates verification token, returns correct format
  - [x] 2.10 Test `login()` - user active returns tokens
  - [x] 2.11 Test `login()` - user pending_verification returns tokens + requires_verification flag
  - [x] 2.12 Test `login()` - user suspended throws AccountSuspendedException
  - [x] 2.13 Test `login()` - user deleted throws AccountDeletedException
  - [x] 2.14 Test `login()` - wrong password throws InvalidCredentialsException
  - [x] 2.15 Test `verifyEmail()` - valid token activates user
  - [x] 2.16 Test `verifyEmail()` - expired token throws TokenExpiredException
  - [x] 2.17 Test `verifyEmail()` - used token throws TokenUsedException
  - [x] 2.18 Test `refresh()` - valid token returns new token pair (rotation)
  - [x] 2.19 Test `refresh()` - revoked token throws InvalidTokenException
  - [x] 2.20 Test `resetPassword()` - valid token updates password, revokes all refresh tokens
  - [x] 2.21 Test `resetPassword()` - used token throws TokenUsedException
  - [x] 2.22 Test `changePassword()` - wrong current password throws InvalidCurrentPasswordException
  - [x] 2.23 Verify coverage >= 80% untuk business services

- [x] 3.0 Integration Test Infrastructure (Testcontainers + Helpers)
  - [x] 3.1 Create `test/helpers/test-database.ts` - PostgreSQL container setup dengan Testcontainers
  - [x] 3.2 Implement `startDatabase()` - spin up container, run migrations
  - [x] 3.3 Implement `cleanDatabase()` - truncate tables between tests
  - [x] 3.4 Implement `stopDatabase()` - cleanup container
  - [x] 3.5 Create `test/helpers/test-redis.ts` - Redis container setup untuk rate limiting tests
  - [x] 3.6 Create `test/helpers/test-fixtures.ts` - factory functions
  - [x] 3.7 Implement `createTestUser()` - create user dengan password hash
  - [x] 3.8 Implement `createVerificationToken()` - create token untuk testing
  - [x] 3.9 Implement `createRefreshToken()` - create refresh token untuk testing
  - [x] 3.10 Update `test/setup.ts` untuk integration test global setup/teardown
  - [x] 3.11 Verify infrastructure dengan simple database connection test

- [ ] 4.0 Integration Tests - Auth Endpoints (register, verify-email, resend-verification, login, refresh, logout, logout-all)
  - [ ] 4.1 Create `auth.controller.integration.spec.ts` dengan Supertest
  - [ ] 4.2 Test `POST /register` - success returns 201 dengan correct response format
  - [ ] 4.3 Test `POST /register` - email exists returns 409 dengan EMAIL_EXISTS code
  - [ ] 4.4 Test `POST /register` - validation error returns 400 dengan VALIDATION_ERROR code
  - [ ] 4.5 Test `POST /register` - password policy fail returns 400 dengan requirements detail
  - [ ] 4.6 Test `POST /verify-email` - valid token returns 200, user status becomes active
  - [ ] 4.7 Test `POST /verify-email` - invalid token returns 400 dengan INVALID_TOKEN code
  - [ ] 4.8 Test `POST /verify-email` - expired token returns 400 dengan TOKEN_EXPIRED code
  - [ ] 4.9 Test `POST /verify-email` - used token returns 400 dengan TOKEN_USED code
  - [ ] 4.10 Test `POST /resend-verification` - success returns 200 (same response for security)
  - [ ] 4.11 Test `POST /resend-verification` - invalidates old token, creates new one
  - [ ] 4.12 Test `POST /login` - active user returns 200 dengan tokens + user data
  - [ ] 4.13 Test `POST /login` - pending_verification returns 200 dengan requires_verification flag
  - [ ] 4.14 Test `POST /login` - suspended user returns 403 dengan ACCOUNT_SUSPENDED code
  - [ ] 4.15 Test `POST /login` - deleted user returns 403 dengan ACCOUNT_DELETED code
  - [ ] 4.16 Test `POST /login` - wrong password returns 401 dengan INVALID_CREDENTIALS code
  - [ ] 4.17 Test `POST /login` - user not found returns 401 dengan INVALID_CREDENTIALS code
  - [ ] 4.18 Test `POST /refresh` - valid token returns 200 dengan new token pair
  - [ ] 4.19 Test `POST /refresh` - old token revoked after rotation
  - [ ] 4.20 Test `POST /refresh` - invalid token returns 400 dengan INVALID_TOKEN code
  - [ ] 4.21 Test `POST /refresh` - expired token returns 400 dengan TOKEN_EXPIRED code
  - [ ] 4.22 Test `POST /logout` - success returns 200, refresh token revoked
  - [ ] 4.23 Test `POST /logout` - invalid token still returns 200 (idempotent)
  - [ ] 4.24 Test `POST /logout-all` - requires authentication (401 without token)
  - [ ] 4.25 Test `POST /logout-all` - revokes all refresh tokens for user

- [ ] 5.0 Integration Tests - Password & Profile Endpoints (forgot-password, reset-password, change-password, GET /me, PATCH /me)
  - [ ] 5.1 Create `password.controller.integration.spec.ts`
  - [ ] 5.2 Test `POST /forgot-password` - always returns 200 dengan same message (security)
  - [ ] 5.3 Test `POST /forgot-password` - creates reset token in database
  - [ ] 5.4 Test `POST /reset-password` - valid token returns 200, password updated
  - [ ] 5.5 Test `POST /reset-password` - all refresh tokens revoked after reset
  - [ ] 5.6 Test `POST /reset-password` - invalid token returns 400 dengan INVALID_TOKEN code
  - [ ] 5.7 Test `POST /reset-password` - expired token returns 400 dengan TOKEN_EXPIRED code
  - [ ] 5.8 Test `POST /reset-password` - used token returns 400 dengan TOKEN_USED code
  - [ ] 5.9 Test `POST /reset-password` - password policy fail returns 400
  - [ ] 5.10 Test `POST /change-password` - requires authentication (401 without token)
  - [ ] 5.11 Test `POST /change-password` - success returns 200
  - [ ] 5.12 Test `POST /change-password` - wrong current password returns 400 dengan INVALID_CURRENT_PASSWORD code
  - [ ] 5.13 Test `POST /change-password` - password policy fail returns 400
  - [ ] 5.14 Create `profile.controller.integration.spec.ts`
  - [ ] 5.15 Test `GET /me` - requires authentication (401 without token)
  - [ ] 5.16 Test `GET /me` - returns 200 dengan user profile data
  - [ ] 5.17 Test `PATCH /me` - requires authentication (401 without token)
  - [ ] 5.18 Test `PATCH /me` - success returns 200 dengan updated profile
  - [ ] 5.19 Test `PATCH /me` - validation error returns 400

- [ ] 6.0 E2E Flow Tests
  - [ ] 6.1 Create `test/e2e/auth-flow.e2e-spec.ts`
  - [ ] 6.2 Flow: register → verify-email → login → refresh → logout
  - [ ] 6.3 Flow: register → login (pending) → verify-email → login (active)
  - [ ] 6.4 Flow: register → resend-verification → verify dengan token baru (token lama invalid)
  - [ ] 6.5 Flow: login dari multiple devices → logout-all → verify semua session invalid
  - [ ] 6.6 Flow: suspended user tidak bisa login
  - [ ] 6.7 Flow: deleted user tidak bisa login
  - [ ] 6.8 Create `test/e2e/password-flow.e2e-spec.ts`
  - [ ] 6.9 Flow: forgot-password → reset-password → login dengan password baru
  - [ ] 6.10 Flow: login → change-password → old refresh token invalid → login dengan password baru
  - [ ] 6.11 Verify response format konsisten di semua flows: `{ data }` atau `{ error: { code, message, details? } }`

- [ ] 7.0 Hardening - Rate Limiting
  - [ ] 7.1 Install `@nestjs/throttler` dan `ioredis` jika belum ada
  - [ ] 7.2 Create Redis connection module untuk rate limiting
  - [ ] 7.3 Configure ThrottlerModule dengan Redis storage
  - [ ] 7.4 Apply rate limit ke `POST /login`: max 5 requests per 60 seconds per IP
  - [ ] 7.5 Apply rate limit ke `POST /register`: max 3 requests per 60 seconds per IP
  - [ ] 7.6 Apply rate limit ke `POST /forgot-password`: max 3 requests per 60 seconds per email
  - [ ] 7.7 Apply rate limit ke `POST /resend-verification`: max 3 requests per 60 seconds per email
  - [ ] 7.8 Customize error response: HTTP 429 dengan `{ error: { code: "RATE_LIMIT_EXCEEDED", message: "..." } }`
  - [ ] 7.9 Create integration test: verify rate limit triggers after threshold
  - [ ] 7.10 Create integration test: verify HTTP 429 response format correct
  - [ ] 7.11 Make rate limit configurable via environment variables

- [ ] 8.0 Hardening - Security Headers & Input Sanitization
  - [ ] 8.1 Verify helmet middleware sudah dikonfigurasi di main.ts
  - [ ] 8.2 Ensure `X-Content-Type-Options: nosniff` header present
  - [ ] 8.3 Ensure `X-Frame-Options: DENY` header present
  - [ ] 8.4 Ensure `X-XSS-Protection: 1; mode=block` header present
  - [ ] 8.5 Ensure `X-Powered-By` header removed
  - [ ] 8.6 Create integration test untuk verify semua security headers
  - [ ] 8.7 Create `sanitize.pipe.ts` atau update ValidationPipe untuk input sanitization
  - [ ] 8.8 Implement email trim dan lowercase sebelum processing
  - [ ] 8.9 Implement HTML escape untuk full_name field
  - [ ] 8.10 Validate phone_number format (optional field)
  - [ ] 8.11 Validate timezone menggunakan IANA timezone list
  - [ ] 8.12 Validate language code menggunakan ISO 639-1
  - [ ] 8.13 Create unit tests untuk sanitization functions

- [ ] 9.0 Hardening - Request Logging
  - [ ] 9.1 Create `logging.interceptor.ts` untuk structured request logging
  - [ ] 9.2 Create `email-mask.util.ts` - mask email format: `u***@example.com`
  - [ ] 9.3 Implement log event `auth.register.success` dengan fields: user_id, email (masked), ip_address
  - [ ] 9.4 Implement log event `auth.login.success` dengan fields: user_id, email (masked), ip_address, user_agent
  - [ ] 9.5 Implement log event `auth.login.failed` dengan fields: email (masked), ip_address, user_agent, reason
  - [ ] 9.6 Implement log event `auth.logout` dengan fields: user_id, ip_address
  - [ ] 9.7 Implement log event `auth.password.reset` dengan fields: user_id, ip_address
  - [ ] 9.8 Implement log event `auth.password.change` dengan fields: user_id, ip_address
  - [ ] 9.9 Implement log event `auth.verify_email.success` dengan fields: user_id
  - [ ] 9.10 Implement log event `auth.rate_limit.exceeded` dengan fields: ip_address, endpoint, limit
  - [ ] 9.11 Ensure semua logs dalam JSON format
  - [ ] 9.12 Create unit test untuk email masking utility
  - [ ] 9.13 Verify: tidak ada password atau token plaintext di logs

- [ ] 10.0 Verification & Coverage Report
  - [ ] 10.1 Run full test suite: `npx nx test auth-service --coverage`
  - [ ] 10.2 Verify coverage >= 100% untuk security-critical files (password.service, jwt.service, token.service)
  - [ ] 10.3 Verify coverage >= 80% untuk overall auth-service
  - [ ] 10.4 Create checklist test untuk response format `{ data }` pada semua success responses
  - [ ] 10.5 Create checklist test untuk response format `{ error: { code, message, details? } }` pada semua error responses
  - [ ] 10.6 Verify semua error codes match PRD: VALIDATION_ERROR, EMAIL_EXISTS, INVALID_CREDENTIALS, INVALID_TOKEN, TOKEN_EXPIRED, TOKEN_USED, ACCOUNT_SUSPENDED, ACCOUNT_DELETED, INVALID_CURRENT_PASSWORD, FORBIDDEN, RATE_LIMIT_EXCEEDED
  - [ ] 10.7 Create integration test untuk verify security headers presence
  - [ ] 10.8 Audit logs: verify tidak ada password/token plaintext
  - [ ] 10.9 Generate final coverage report dan document any gaps
  - [ ] 10.10 Update task list - mark all completed, note any deferred items
