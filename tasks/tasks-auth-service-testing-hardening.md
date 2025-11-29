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
- `apps/auth-service/test/integration/auth.controller.integration.spec.ts` - Integration tests auth endpoints (23 tests)
- `apps/auth-service/test/integration/password.controller.integration.spec.ts` - Integration tests password endpoints (13 tests)
- `apps/auth-service/test/integration/profile.controller.integration.spec.ts` - Integration tests profile endpoints (8 tests)
- `apps/auth-service/test/integration/database.integration.spec.ts` - Database connection tests (15 tests)

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
- Integration tests menggunakan suffix `.integration.spec.ts` di folder `test/integration/`
- E2E tests ditempatkan di folder `test/e2e/`
- Gunakan `npx nx test auth-service` untuk menjalankan semua tests
- Gunakan `npx nx test auth-service --coverage` untuk coverage report

### Current Progress (Updated: 2025-11-28)

**Completed Tasks: 0.0 - 6.0**
- Test Infrastructure: Jest + Testcontainers setup
- Unit Tests: 128 tests (80 core + 48 business)
- Integration Tests: 59 tests (23 auth + 13 password + 8 profile + 15 database)
- E2E Flow Tests: 9 tests (7 auth flows + 2 password flows + 1 response format)
- **Total: 196 tests passed** ✅

**Status Code Compliance:**
- POST /register → 201 (creates resource)
- All other POST endpoints → 200 (actions)

**Completed: Task 6.0 E2E Flow Tests ✅**
**Next Task: 7.0 Hardening - Rate Limiting**

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

- [x] 4.0 Integration Tests - Auth Endpoints (register, verify-email, resend-verification, login, refresh, logout, logout-all)
  - [x] 4.1 Create `auth.controller.integration.spec.ts` dengan Supertest (23 tests)
  - [x] 4.2 Test `POST /register` - success returns 201 dengan correct response format
  - [x] 4.3 Test `POST /register` - email exists returns 409 dengan EMAIL_EXISTS code
  - [x] 4.4 Test `POST /register` - validation error returns 400 dengan BAD_REQUEST code
  - [x] 4.5 Test `POST /register` - password policy fail returns 400 dengan BAD_REQUEST code
  - [x] 4.6 Test `POST /verify-email` - valid token returns 200, user status becomes active
  - [x] 4.7 Test `POST /verify-email` - invalid token returns 400 dengan INVALID_TOKEN code
  - [x] 4.8 Test `POST /verify-email` - expired token returns 400 dengan TOKEN_EXPIRED code
  - [x] 4.9 Test `POST /verify-email` - used token returns 400 dengan TOKEN_USED code
  - [x] 4.10 Test `POST /resend-verification` - success returns 200 (same response for security)
  - [x] 4.11 Test `POST /resend-verification` - no leak: same response for non-existent email
  - [x] 4.12 Test `POST /login` - active user returns 200 dengan tokens + user data
  - [x] 4.13 Test `POST /login` - pending_verification returns 200 dengan requires_verification flag
  - [x] 4.14 Test `POST /login` - suspended user returns 403 dengan ACCOUNT_SUSPENDED code
  - [x] 4.15 Test `POST /login` - deleted user returns 403 dengan ACCOUNT_DELETED code
  - [x] 4.16 Test `POST /login` - wrong password returns 401 dengan INVALID_CREDENTIALS code
  - [x] 4.17 Test `POST /login` - user not found returns 401 dengan INVALID_CREDENTIALS code
  - [x] 4.18 Test `POST /refresh` - valid token returns 200 dengan new token pair (rotation)
  - [x] 4.19 Test `POST /refresh` - old token revoked after rotation (verified in DB)
  - [x] 4.20 Test `POST /refresh` - invalid token returns 400 dengan INVALID_TOKEN code
  - [x] 4.21 Test `POST /refresh` - already used token returns 400 dengan INVALID_TOKEN code
  - [x] 4.22 Test `POST /logout` - success returns 200, refresh token revoked
  - [x] 4.23 Test `POST /logout` - invalid token still returns 200 (idempotent)
  - [x] 4.24 Test `POST /logout-all` - requires authentication (401 without token)
  - [x] 4.25 Test `POST /logout-all` - revokes all refresh tokens for user
  - [x] 4.26 **FIX**: Added @HttpCode(200) to all POST endpoints except /register (201 for resource creation)

- [x] 5.0 Integration Tests - Password & Profile Endpoints (forgot-password, reset-password, change-password, GET /me, PATCH /me)
  - [x] 5.1 Create `password.controller.integration.spec.ts`
  - [x] 5.2 Test `POST /forgot-password` - always returns 200 dengan same message (security)
  - [x] 5.3 Test `POST /forgot-password` - creates reset token in database
  - [x] 5.4 Test `POST /reset-password` - valid token returns 200, password updated
  - [x] 5.5 Test `POST /reset-password` - all refresh tokens revoked after reset
  - [x] 5.6 Test `POST /reset-password` - invalid token returns 400 dengan INVALID_TOKEN code
  - [x] 5.7 Test `POST /reset-password` - expired token returns 400 dengan TOKEN_EXPIRED code
  - [x] 5.8 Test `POST /reset-password` - used token returns 400 dengan TOKEN_USED code
  - [x] 5.9 Test `POST /reset-password` - password policy fail returns 400
  - [x] 5.10 Test `POST /change-password` - requires authentication (401 without token)
  - [x] 5.11 Test `POST /change-password` - success returns 200
  - [x] 5.12 Test `POST /change-password` - wrong current password returns 400 dengan INVALID_CURRENT_PASSWORD code
  - [x] 5.13 Test `POST /change-password` - password policy fail returns 400
  - [x] 5.14 Create `profile.controller.integration.spec.ts`
  - [x] 5.15 Test `GET /me` - requires authentication (401 without token)
  - [x] 5.16 Test `GET /me` - returns 200 dengan user profile data
  - [x] 5.17 Test `PATCH /me` - requires authentication (401 without token)
  - [x] 5.18 Test `PATCH /me` - success returns 200 dengan updated profile
  - [x] 5.19 Test `PATCH /me` - partial update only updates provided fields

- [x] 6.0 E2E Flow Tests
  - [x] 6.1 Create `test/e2e/auth-flow.e2e-spec.ts`
  - [x] 6.2 Flow: register → verify-email → login → refresh → logout
  - [x] 6.3 Flow: register → login (pending) → verify-email → login (active)
  - [x] 6.4 Flow: register → resend-verification → verify dengan token baru (token lama invalid)
  - [x] 6.5 Flow: login dari multiple devices → logout-all → verify semua session invalid
  - [x] 6.6 Flow: suspended user tidak bisa login
  - [x] 6.7 Flow: deleted user tidak bisa login
  - [x] 6.8 Create `test/e2e/password-flow.e2e-spec.ts`
  - [x] 6.9 Flow: forgot-password → reset-password → login dengan password baru
  - [x] 6.10 Flow: login → change-password → old refresh token invalid → login dengan password baru
  - [x] 6.11 Verify response format konsisten di semua flows: `{ data }` atau `{ error: { code, message, details? } }`
  - [x] 6.12 **Bug Fix**: Fixed changePassword to revoke all refresh tokens per PRD FR-37

- [x] 7.0 Hardening - Rate Limiting
  - [x] 7.1 Install `@nestjs/throttler` dan `ioredis` jika belum ada
  - [x] 7.2 Create Redis connection module untuk rate limiting
  - [x] 7.3 Configure ThrottlerModule dengan Redis storage
  - [x] 7.4 Apply rate limit ke `POST /login`: max 5 requests per 60 seconds per IP
  - [x] 7.5 Apply rate limit ke `POST /register`: max 3 requests per 60 seconds per IP
  - [x] 7.6 Apply rate limit ke `POST /forgot-password`: max 3 requests per 60 seconds per email
  - [x] 7.7 Apply rate limit ke `POST /resend-verification`: max 3 requests per 60 seconds per email
  - [x] 7.8 Customize error response: HTTP 429 dengan `{ error: { code: "RATE_LIMIT_EXCEEDED", message: "..." } }`
  - [x] 7.9 Create integration test: verify rate limit triggers after threshold
  - [x] 7.10 Create integration test: verify HTTP 429 response format correct
  - [x] 7.11 Make rate limit configurable via environment variables

- [x] **Task 8.0: Security Headers & Input Sanitization**
    - [x] Implement Security Headers (Helmet)
        - `X-Content-Type-Options: nosniff`
        - `X-Frame-Options: DENY`
        - `X-XSS-Protection: 1; mode=block`
        - Remove `X-Powered-By`
    - [x] Implement Input Sanitization
        - Create `SanitizePipe`
        - Sanitize: Email (trim, lower), Name (escape html), Phone (trim), Timezone (trim), Language (trim, lower)
    - [x] Add Unit Tests for Sanitization
    - [x] Add Integration Tests for Security Headers

- [x] **Task 9.0: Hardening - Request Logging**
  - [x] 9.1 Create `logging.interceptor.ts` untuk structured request logging
  - [x] 9.2 Create `email-mask.util.ts` - mask email format: `u***@example.com`
  - [x] 9.3 Implement log event `auth.register.success` dengan fields: user_id, email (masked), ip_address
  - [x] 9.4 Implement log event `auth.login.success` dengan fields: user_id, email (masked), ip_address, user_agent
  - [x] 9.5 Implement log event `auth.login.failed` dengan fields: email (masked), ip_address, user_agent, reason
  - [x] 9.6 Implement log event `auth.logout` dengan fields: user_id, ip_address
  - [x] 9.7 Implement log event `auth.password.reset` dengan fields: user_id, ip_address
  - [x] 9.8 Implement log event `auth.password.change` dengan fields: user_id, ip_address
  - [x] 9.9 Implement log event `auth.verify_email.success` dengan fields: user_id
  - [x] 9.10 Implement log event `auth.rate_limit.exceeded` dengan fields: ip_address, endpoint, limit
  - [x] 9.11 Ensure semua logs dalam JSON format
  - [x] 9.12 Create unit test untuk email masking utility
  - [x] 9.13 Verify: tidak ada password atau token plaintext di logs

- [x] **Task 10.0: Verification & Coverage Report**
  - [x] 10.1 Run full test suite: `npx nx test auth-service --coverage`
  - [x] 10.2 Verify coverage >= 100% untuk security-critical files (password.service, jwt.service, token.service)
  - [x] 10.3 Verify coverage >= 80% untuk overall auth-service
  - [x] 10.4 Create checklist test untuk response format `{ data }` pada semua success responses
  - [x] 10.5 Create checklist test untuk response format `{ error: { code, message, details? } }` pada semua error responses
  - [x] 10.6 Verify semua error codes match PRD: VALIDATION_ERROR, EMAIL_EXISTS, INVALID_CREDENTIALS, INVALID_TOKEN, TOKEN_EXPIRED, TOKEN_USED, ACCOUNT_SUSPENDED, ACCOUNT_DELETED, INVALID_CURRENT_PASSWORD, FORBIDDEN, RATE_LIMIT_EXCEEDED
  - [x] 10.7 Create integration test untuk verify security headers presence
  - [x] 10.8 Audit logs: verify tidak ada password/token plaintext
  - [x] 10.9 Generate final coverage report dan document any gaps
  - [x] 10.10 Update task list - mark all completed, note any deferred items
