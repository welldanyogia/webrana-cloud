# PRD: Auth Service – Testing & Hardening v1.1

## 1. Introduction/Overview

Mini-epic ini berfokus pada penambahan test suite dan hardening untuk Auth Service yang sudah diimplementasi. Tujuannya adalah memastikan semua fungsi berjalan sesuai PRD, error handling konsisten, dan security measures sudah diterapkan dengan benar.

**Problem yang dipecahkan:**
- Memastikan core utilities (password hashing, JWT, token handling) bekerja dengan benar
- Memvalidasi semua endpoint merespons sesuai contract yang didefinisikan di PRD
- Memastikan flow utama (register→verify→login→refresh→logout, password reset) berfungsi end-to-end
- Menerapkan rate limiting, input sanitization, security headers, dan request logging

**Scope:**
- Unit tests untuk core utilities dengan mock
- Integration/E2E tests dengan PostgreSQL container
- Hardening: rate limiting, input sanitization, security headers, request logging

## 2. Goals

1. **Unit Test Coverage**: 100% coverage untuk security-critical functions, 80% untuk sisanya
2. **Integration Tests**: Semua 12 endpoints ter-test dengan PostgreSQL container
3. **E2E Flow Tests**: Full flow tests untuk semua user journey utama
4. **Rate Limiting**: Implementasi sesuai PRD (login 5/min, register 3/min, dll)
5. **Security Headers**: X-Content-Type-Options, X-Frame-Options, dll
6. **Request Logging**: Structured logging untuk event penting (auth.login.success, auth.login.failed, dll)
7. **Input Sanitization**: Validasi dan sanitasi input untuk mencegah injection

## 3. User Stories

### Developer
- **US-01**: Sebagai developer, saya ingin menjalankan unit test untuk memastikan core utilities berfungsi dengan benar
- **US-02**: Sebagai developer, saya ingin menjalankan integration test dengan database real untuk memvalidasi query dan transaction
- **US-03**: Sebagai developer, saya ingin melihat code coverage report untuk memastikan tidak ada blind spot

### Security
- **US-04**: Sebagai security engineer, saya ingin rate limiting aktif untuk mencegah brute-force attack
- **US-05**: Sebagai security engineer, saya ingin semua input ter-sanitasi untuk mencegah injection
- **US-06**: Sebagai security engineer, saya ingin security headers diterapkan untuk mencegah common attacks

### Operations
- **US-07**: Sebagai ops, saya ingin structured logging untuk event auth agar mudah di-query di log aggregator
- **US-08**: Sebagai ops, saya ingin alert ketika rate limit exceeded untuk monitoring abuse

## 4. Functional Requirements

### 4.1 Unit Tests - Core Utilities

| ID | Requirement | Priority |
|----|-------------|----------|
| UT-01 | Unit test untuk `PasswordService.hash()` - memastikan menghasilkan hash bcrypt valid | Critical |
| UT-02 | Unit test untuk `PasswordService.verify()` - memastikan bisa memvalidasi password vs hash | Critical |
| UT-03 | Unit test untuk `PasswordService.validatePolicy()` - test semua kombinasi policy (min length, uppercase, lowercase, digit, special) | Critical |
| UT-04 | Unit test untuk `JwtTokenService.generateAccessToken()` - memastikan payload sesuai spec | Critical |
| UT-05 | Unit test untuk `JwtTokenService.generateRefreshToken()` - memastikan payload dan tokenId unik | Critical |
| UT-06 | Unit test untuk `JwtTokenService.verifyAccessToken()` - test valid, expired, invalid signature | Critical |
| UT-07 | Unit test untuk `JwtTokenService.verifyRefreshToken()` - test valid, expired, wrong type | Critical |
| UT-08 | Unit test untuk `TokenService.generateVerificationToken()` - test untuk email_verification dan password_reset | Critical |
| UT-09 | Unit test untuk `TokenService.hashToken()` - memastikan hash SHA256 konsisten | Critical |
| UT-10 | Unit test untuk `UserService.create()` - test email exists, password policy fail, success | High |
| UT-11 | Unit test untuk `UserService.verifyPassword()` - test correct/incorrect password | High |
| UT-12 | Unit test untuk `AuthService.register()` - mock dependencies, test response format | High |
| UT-13 | Unit test untuk `AuthService.login()` - test semua status user (active, pending, suspended, deleted) | Critical |
| UT-14 | Unit test untuk `AuthService.verifyEmail()` - test valid, expired, used, wrong type | Critical |
| UT-15 | Unit test untuk `AuthService.refresh()` - test token rotation, revoked token, expired token | Critical |
| UT-16 | Unit test untuk `AuthService.resetPassword()` - test valid token, token one-time-use | Critical |

### 4.2 Integration Tests - Endpoints

| ID | Requirement | Priority |
|----|-------------|----------|
| IT-01 | Integration test `POST /register` - test success (201), email exists (409), validation error (400) | High |
| IT-02 | Integration test `POST /verify-email` - test success (200), invalid token (400), expired (400), used (400) | High |
| IT-03 | Integration test `POST /resend-verification` - test success, user not found (same response), already verified | High |
| IT-04 | Integration test `POST /login` - test success active (200), pending_verification (200 + flag), suspended (403), deleted (403), wrong password (401) | Critical |
| IT-05 | Integration test `POST /refresh` - test success dengan rotation (200), invalid token (400), expired (400), revoked (400) | Critical |
| IT-06 | Integration test `POST /logout` - test success (200), invalid token (tetap 200) | High |
| IT-07 | Integration test `POST /logout-all` - test success, verify semua refresh token ter-revoke | High |
| IT-08 | Integration test `POST /forgot-password` - test success (always same response), verify token created | High |
| IT-09 | Integration test `POST /reset-password` - test success, invalid token, expired, used, password policy fail | Critical |
| IT-10 | Integration test `POST /change-password` - test success, wrong current password, password policy fail | High |
| IT-11 | Integration test `GET /me` - test success (200), unauthorized (401) | High |
| IT-12 | Integration test `PATCH /me` - test success (200), validation error (400) | High |

### 4.3 E2E Flow Tests

| ID | Requirement | Priority |
|----|-------------|----------|
| E2E-01 | Flow test: register → verify-email → login → refresh → logout | Critical |
| E2E-02 | Flow test: register → login (pending) → verify-email → login (active) | Critical |
| E2E-03 | Flow test: forgot-password → reset-password → login dengan password baru | Critical |
| E2E-04 | Flow test: login → change-password → verify old refresh token invalid → login dengan password baru | High |
| E2E-05 | Flow test: login dari multiple devices → logout-all → verify semua session invalid | High |
| E2E-06 | Flow test: register → resend-verification → verify dengan token baru (token lama invalid) | High |
| E2E-07 | Flow test: suspended user tidak bisa login | Critical |
| E2E-08 | Flow test: deleted user tidak bisa login | Critical |

### 4.4 Response Format Verification

| ID | Requirement | Priority |
|----|-------------|----------|
| RF-01 | Verify semua success response menggunakan format `{ data: {...} }` | High |
| RF-02 | Verify semua error response menggunakan format `{ error: { code, message, details? } }` | High |
| RF-03 | Verify error codes sesuai PRD: VALIDATION_ERROR, EMAIL_EXISTS, INVALID_CREDENTIALS, INVALID_TOKEN, TOKEN_EXPIRED, TOKEN_USED, ACCOUNT_SUSPENDED, ACCOUNT_DELETED, INVALID_CURRENT_PASSWORD, FORBIDDEN, RATE_LIMIT_EXCEEDED | High |
| RF-04 | Verify HTTP status codes: 200, 201, 400, 401, 403, 404, 409, 429 | High |

### 4.5 Rate Limiting

| ID | Requirement | Priority |
|----|-------------|----------|
| RL-01 | Implementasi rate limiting untuk `POST /login`: max 5 request per menit per IP | Critical |
| RL-02 | Implementasi rate limiting untuk `POST /register`: max 3 request per menit per IP | Critical |
| RL-03 | Implementasi rate limiting untuk `POST /forgot-password`: max 3 request per menit per email | Critical |
| RL-04 | Implementasi rate limiting untuk `POST /resend-verification`: max 3 request per menit per email | High |
| RL-05 | Return HTTP 429 dengan format `{ error: { code: "RATE_LIMIT_EXCEEDED", message: "..." } }` | High |
| RL-06 | Gunakan Redis untuk distributed rate limiting (configurable via REDIS_URL) | High |
| RL-07 | Rate limit window configurable via `AUTH_RATE_LIMIT_WINDOW` (default: 60 seconds) | Medium |

### 4.6 Security Headers

| ID | Requirement | Priority |
|----|-------------|----------|
| SH-01 | Set `X-Content-Type-Options: nosniff` | High |
| SH-02 | Set `X-Frame-Options: DENY` | High |
| SH-03 | Set `X-XSS-Protection: 1; mode=block` | Medium |
| SH-04 | Set `Strict-Transport-Security: max-age=31536000; includeSubDomains` (jika HTTPS) | Medium |
| SH-05 | Set `Content-Security-Policy: default-src 'self'` | Medium |
| SH-06 | Remove `X-Powered-By` header | High |

### 4.7 Input Sanitization

| ID | Requirement | Priority |
|----|-------------|----------|
| IS-01 | Trim whitespace dari email sebelum processing | High |
| IS-02 | Lowercase email sebelum save dan lookup | High |
| IS-03 | Validate email format dengan regex atau library | High |
| IS-04 | Escape/reject HTML tags di field full_name | High |
| IS-05 | Validate phone_number format (optional, tapi jika ada harus valid) | Medium |
| IS-06 | Validate timezone menggunakan IANA timezone list | Medium |
| IS-07 | Validate language code menggunakan ISO 639-1 | Medium |

### 4.8 Request Logging

| ID | Requirement | Priority |
|----|-------------|----------|
| LOG-01 | Log `auth.register.success` dengan fields: user_id, email (masked), ip_address | High |
| LOG-02 | Log `auth.login.success` dengan fields: user_id, email (masked), ip_address, user_agent | Critical |
| LOG-03 | Log `auth.login.failed` dengan fields: email (masked), ip_address, user_agent, reason | Critical |
| LOG-04 | Log `auth.logout` dengan fields: user_id, ip_address | High |
| LOG-05 | Log `auth.password.reset` dengan fields: user_id, ip_address | High |
| LOG-06 | Log `auth.password.change` dengan fields: user_id, ip_address | High |
| LOG-07 | Log `auth.rate_limit.exceeded` dengan fields: ip_address, endpoint, limit | Critical |
| LOG-08 | Log `auth.verify_email.success` dengan fields: user_id | High |
| LOG-09 | Gunakan JSON format untuk semua logs | High |
| LOG-10 | Jangan log password atau token plaintext | Critical |

## 5. Non-Goals (Out of Scope)

- Penetration testing formal - akan dilakukan di fase terpisah setelah v1.1 stable
- Load testing / stress testing - akan dilakukan sebelum production release
- Automated security scanning (SAST/DAST) - future enhancement
- Mutation testing - nice to have tapi tidak wajib untuk v1.1
- Performance benchmarking - akan dilakukan terpisah
- Admin endpoint testing (`POST /admin/users`) - endpoint belum diimplementasi

## 6. Technical Considerations

### 6.1 Test Framework Stack
```
- Jest: Unit & Integration test runner (sudah ter-setup di Nx)
- Supertest: HTTP-level testing untuk controllers
- Testcontainers: PostgreSQL container untuk integration tests
- @nestjs/testing: NestJS testing utilities
```

### 6.2 Test Database Strategy
```
Unit Tests:
- Mock PrismaService, ConfigService, dan dependencies lainnya
- Fokus ke business logic tanpa database

Integration Tests:
- Gunakan Testcontainers untuk spin up PostgreSQL container
- Jalankan Prisma migrations sebelum test
- Cleanup database setelah setiap test suite
- Isolasi test dengan transaction rollback atau truncate
```

### 6.3 Test File Structure
```
apps/auth-service/
├── src/
│   ├── common/
│   │   └── services/
│   │       ├── password.service.ts
│   │       ├── password.service.spec.ts      # Unit test
│   │       ├── jwt.service.ts
│   │       ├── jwt.service.spec.ts           # Unit test
│   │       ├── token.service.ts
│   │       └── token.service.spec.ts         # Unit test
│   └── modules/
│       ├── auth/
│       │   ├── auth.service.ts
│       │   ├── auth.service.spec.ts          # Unit test
│       │   ├── auth.controller.spec.ts       # Unit test
│       │   └── auth.e2e-spec.ts              # Integration test
│       └── user/
│           ├── user.service.ts
│           └── user.service.spec.ts          # Unit test
├── test/
│   ├── setup.ts                              # Test setup (testcontainers)
│   ├── helpers/
│   │   ├── test-database.ts                  # Database utilities
│   │   └── test-fixtures.ts                  # Test data factories
│   └── e2e/
│       ├── auth-flow.e2e-spec.ts             # Full flow tests
│       └── password-flow.e2e-spec.ts         # Password flow tests
```

### 6.4 Rate Limiting Implementation
```typescript
// Menggunakan @nestjs/throttler dengan Redis store
// atau rate-limiter-flexible dengan ioredis

// Decorator-based untuk per-endpoint configuration
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
async login() { ... }
```

### 6.5 Logging Implementation
```typescript
// Structured logging dengan NestJS Logger atau Pino
// Format: JSON dengan fields standar

{
  "level": "info",
  "event": "auth.login.success",
  "user_id": "uuid",
  "email": "u***@example.com",  // masked
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## 7. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Unit Test Coverage (security-critical) | 100% | Jest coverage report |
| Unit Test Coverage (overall) | ≥ 80% | Jest coverage report |
| Integration Test Pass Rate | 100% | CI pipeline |
| E2E Flow Test Pass Rate | 100% | CI pipeline |
| Rate Limit Tests Pass | 100% | Integration tests |
| All Error Codes Match PRD | 100% | Response format tests |
| Security Headers Present | 6/6 headers | Integration tests |
| No Secrets in Logs | 0 violations | Log audit |

## 8. Test Cases Detail

### 8.1 Password Policy Test Cases

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Valid password | `SecurePass123!` | `{ isValid: true, errors: [], missingRequirements: [] }` |
| Too short | `Aa1!` | `{ isValid: false, missingRequirements: ['min_length'] }` |
| No uppercase | `securepass123!` | `{ isValid: false, missingRequirements: ['uppercase'] }` |
| No lowercase | `SECUREPASS123!` | `{ isValid: false, missingRequirements: ['lowercase'] }` |
| No digit | `SecurePass!!!` | `{ isValid: false, missingRequirements: ['digit'] }` |
| No special char | `SecurePass123` | `{ isValid: false, missingRequirements: ['special_char'] }` |
| Multiple failures | `password` | `{ isValid: false, missingRequirements: ['uppercase', 'digit', 'special_char'] }` |

### 8.2 JWT Token Test Cases

| Test Case | Scenario | Expected Result |
|-----------|----------|-----------------|
| Generate access token | Valid user | Token dengan payload: sub, email, role, status, type='access' |
| Generate refresh token | Valid user | Token dengan payload: sub, tokenId, type='refresh' |
| Verify valid access token | Fresh token | Return payload |
| Verify expired access token | Token > 15m | Return null |
| Verify refresh as access | Refresh token | Return null (wrong type) |
| Verify tampered token | Modified payload | Return null |

### 8.3 Login Status Test Cases

| Test Case | User Status | Expected Result |
|-----------|-------------|-----------------|
| Active user | `active` | 200, tokens + user data |
| Pending verification | `pending_verification` | 200, tokens + `requires_verification: true` |
| Suspended user | `suspended` | 403, `ACCOUNT_SUSPENDED` |
| Deleted user | `deleted` | 403, `ACCOUNT_DELETED` |
| Wrong password | any | 401, `INVALID_CREDENTIALS` |
| User not found | - | 401, `INVALID_CREDENTIALS` |

### 8.4 Token One-Time-Use Test Cases

| Test Case | Scenario | Expected Result |
|-----------|----------|-----------------|
| First use of verification token | Valid, unused | 200, success |
| Second use of same token | Already used | 400, `TOKEN_USED` |
| First use of reset token | Valid, unused | 200, success |
| Second use of same reset token | Already used | 400, `TOKEN_USED` |

## 9. Dependencies

### NPM Packages to Install (devDependencies)
```json
{
  "@testcontainers/postgresql": "^10.x",
  "testcontainers": "^10.x",
  "supertest": "^6.x",
  "@types/supertest": "^2.x"
}
```

### NPM Packages to Install (dependencies) - for hardening
```json
{
  "@nestjs/throttler": "^5.x",
  "ioredis": "^5.x",
  "helmet": "^7.x"  // sudah terinstall
}
```

## 10. Implementation Order

### Phase 1: Unit Tests (Priority: Critical)
1. PasswordService tests
2. JwtTokenService tests
3. TokenService tests
4. UserService tests (dengan mock)
5. AuthService tests (dengan mock)

### Phase 2: Test Infrastructure (Priority: High)
1. Setup Testcontainers untuk PostgreSQL
2. Create test helpers (database utilities, fixtures)
3. Configure Jest untuk integration tests

### Phase 3: Integration Tests (Priority: High)
1. Auth endpoint tests (register, login, refresh, logout)
2. Password endpoint tests (forgot, reset, change)
3. Profile endpoint tests (me, update)

### Phase 4: E2E Flow Tests (Priority: High)
1. Registration flow
2. Login/refresh/logout flow
3. Password reset flow
4. Change password flow

### Phase 5: Hardening (Priority: Critical)
1. Rate limiting dengan @nestjs/throttler
2. Security headers (helmet sudah ada, verify config)
3. Input sanitization
4. Request logging

### Phase 6: Verification (Priority: High)
1. Response format verification tests
2. Error code verification tests
3. Coverage report review
4. Final cleanup

## 11. Open Questions

1. **Redis untuk Testing**: Apakah rate limiting tests juga perlu Redis container, atau mock saja untuk unit test?
   - Recommendation: Mock untuk unit test, Redis container untuk integration test rate limiting

2. **Email Masking Format**: Format masking email di logs? (e.g., `u***@example.com` atau `user@***.com`)
   - Recommendation: `u***@example.com` (show first char + domain)

3. **Test Data Cleanup Strategy**: Truncate semua tables atau transaction rollback?
   - Recommendation: Transaction rollback untuk speed, truncate untuk complex scenarios

---

**Document Version**: 1.0  
**Created**: 2025-01-28  
**Author**: AI Assistant  
**Status**: Ready for Review  
**Parent PRD**: prd-auth-service.md v1.1
