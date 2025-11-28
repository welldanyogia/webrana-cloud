# Tasks: Auth Service Implementation

> Generated from: `prd-auth-service.md`

## Relevant Files

### Configuration & Setup
- `apps/auth-service/src/main.ts` - Express application entry point
- `apps/auth-service/src/app/app.ts` - Express app configuration (middleware, routes)
- `apps/auth-service/.env.example` - Environment variables template
- `apps/auth-service/prisma/schema.prisma` - Prisma database schema

### Database & Models
- `libs/database/src/lib/prisma.ts` - Prisma client singleton
- `libs/database/src/lib/prisma.test.ts` - Unit tests for Prisma client
- `apps/auth-service/prisma/migrations/` - Database migration files

### Types & Enums
- `libs/common/src/lib/types/auth.types.ts` - Auth-related TypeScript types
- `libs/common/src/lib/enums/user.enum.ts` - User role & status enums
- `libs/common/src/lib/enums/token.enum.ts` - Token type enums

### Utilities
- `apps/auth-service/src/utils/password.util.ts` - Password hashing & validation
- `apps/auth-service/src/utils/password.util.test.ts` - Unit tests for password utilities
- `apps/auth-service/src/utils/jwt.util.ts` - JWT token generation & verification
- `apps/auth-service/src/utils/jwt.util.test.ts` - Unit tests for JWT utilities
- `apps/auth-service/src/utils/token.util.ts` - Verification token generation
- `apps/auth-service/src/utils/token.util.test.ts` - Unit tests for token utilities

### Middleware
- `apps/auth-service/src/middleware/auth.middleware.ts` - JWT authentication middleware
- `apps/auth-service/src/middleware/auth.middleware.test.ts` - Unit tests for auth middleware
- `apps/auth-service/src/middleware/rate-limit.middleware.ts` - Rate limiting middleware
- `apps/auth-service/src/middleware/rate-limit.middleware.test.ts` - Unit tests for rate limiter
- `apps/auth-service/src/middleware/role.middleware.ts` - Role-based access control
- `apps/auth-service/src/middleware/role.middleware.test.ts` - Unit tests for role middleware

### Validators
- `apps/auth-service/src/validators/auth.validator.ts` - Request validation schemas (Zod/Joi)
- `apps/auth-service/src/validators/auth.validator.test.ts` - Unit tests for validators

### Services (Business Logic)
- `apps/auth-service/src/services/auth.service.ts` - Core authentication logic
- `apps/auth-service/src/services/auth.service.test.ts` - Unit tests for auth service
- `apps/auth-service/src/services/user.service.ts` - User CRUD operations
- `apps/auth-service/src/services/user.service.test.ts` - Unit tests for user service
- `apps/auth-service/src/services/token.service.ts` - Token management (refresh, verification)
- `apps/auth-service/src/services/token.service.test.ts` - Unit tests for token service

### Controllers (Route Handlers)
- `apps/auth-service/src/controllers/auth.controller.ts` - Auth endpoints handler
- `apps/auth-service/src/controllers/auth.controller.test.ts` - Unit tests for auth controller
- `apps/auth-service/src/controllers/user.controller.ts` - User profile endpoints handler
- `apps/auth-service/src/controllers/user.controller.test.ts` - Unit tests for user controller
- `apps/auth-service/src/controllers/admin.controller.ts` - Admin endpoints handler
- `apps/auth-service/src/controllers/admin.controller.test.ts` - Unit tests for admin controller

### Routes
- `apps/auth-service/src/routes/auth.routes.ts` - Auth route definitions
- `apps/auth-service/src/routes/user.routes.ts` - User route definitions
- `apps/auth-service/src/routes/admin.routes.ts` - Admin route definitions
- `apps/auth-service/src/routes/index.ts` - Route aggregator

### Error Handling & Logging
- `apps/auth-service/src/utils/error.util.ts` - Custom error classes
- `apps/auth-service/src/utils/logger.util.ts` - Structured logging utility
- `apps/auth-service/src/middleware/error.middleware.ts` - Global error handler

### Configuration
- `apps/auth-service/src/config/index.ts` - Configuration loader from env vars
- `apps/auth-service/src/config/password-policy.config.ts` - Password policy configuration

### Notes

- Unit tests should be placed alongside the code files they are testing
- Use `npx nx test auth-service` to run all tests for auth-service
- Use `npx nx serve auth-service` to run the service in development mode
- Database migrations: `npx prisma migrate dev --schema=apps/auth-service/prisma/schema.prisma`

---

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Install dependencies` → `- [x] 1.1 Install dependencies` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

---

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Initialize git repository if not exists (`git init`)
  - [x] 0.2 Create and checkout a new branch (`git checkout -b feature/auth-service`)

- [x] 1.0 Project Setup & Configuration (Migrated to NestJS)
  - [x] 1.1 Install NestJS dependencies (`@nestjs/config`, `@nestjs/jwt`, `@nestjs/passport`)
  - [x] 1.2 Install authentication dependencies (`bcryptjs`, `jsonwebtoken`, `uuid`, `passport-jwt`)
  - [x] 1.3 Install validation dependencies (`class-validator`, `class-transformer`)
  - [x] 1.4 Install database dependencies (`@prisma/client`, `prisma`)
  - [x] 1.5 Install rate limiting dependencies (`ioredis`)
  - [x] 1.6 Install security dependencies (`helmet`, `compression`)
  - [x] 1.7 Create `.env.example` file dengan semua environment variables dari PRD
  - [x] 1.8 Setup NestJS main.ts dengan ConfigModule, ValidationPipe, CORS, helmet
  - [x] 1.9 Create health endpoint di AppController

- [x] 2.0 Database Schema & ORM Setup
  - [x] 2.1 Initialize Prisma di auth-service (`npx prisma init`)
  - [x] 2.2 Create Prisma schema untuk tabel `users` dengan semua fields dari PRD
  - [x] 2.3 Create Prisma schema untuk tabel `refresh_tokens`
  - [x] 2.4 Create Prisma schema untuk tabel `verification_tokens`
  - [x] 2.5 Create Prisma schema untuk tabel `user_mfa` (prepared for future)
  - [x] 2.6 Create enum types di Prisma (UserRole, UserStatus, VerificationTokenType)
  - [ ] 2.7 Run initial migration (`npx prisma migrate dev --name init`) - requires DB connection
  - [x] 2.8 Create PrismaService dan PrismaModule di `src/prisma/`
  - [ ] 2.9 Generate Prisma client (`npx prisma generate`)

- [x] 3.0 Core Authentication Utilities (NestJS version)
  - [x] 3.1 Create `libs/common/src/lib/enums/user.enum.ts` dengan UserRole dan UserStatus
  - [x] 3.2 Create `libs/common/src/lib/enums/token.enum.ts` dengan VerificationTokenType
  - [x] 3.3 Create `libs/common/src/lib/types/auth.types.ts` dengan interface untuk request/response
  - [x] 3.4 Create `src/common/services/password.service.ts` dengan hash, verify, validatePolicy (bcrypt)
  - [x] 3.5 Create `src/common/services/jwt.service.ts` dengan access/refresh token generation & verification
  - [x] 3.6 Create `src/common/services/token.service.ts` dengan verification token generation
  - [x] 3.7 Create `src/common/exceptions/auth.exceptions.ts` dengan custom exceptions
  - [x] 3.8 Create `src/common/filters/http-exception.filter.ts` untuk error handling
  - [x] 3.9 Create `src/common/guards/jwt-auth.guard.ts` untuk JWT authentication
  - [x] 3.10 Create `src/common/guards/roles.guard.ts` untuk role-based access control
  - [x] 3.11 Create `src/common/decorators/public.decorator.ts` untuk public endpoints
  - [x] 3.12 Create `src/common/decorators/roles.decorator.ts` untuk role requirements
  - [x] 3.13 Create `src/common/decorators/current-user.decorator.ts` untuk extracting user
  - [ ] 3.14 Write unit tests untuk services (PasswordService, JwtService, TokenService)

- [x] 4.0 User Registration & Email Verification Endpoints (NestJS)
  - [x] 4.1 Create DTOs dengan class-validator (RegisterDto, VerifyEmailDto, ResendVerificationDto)
  - [x] 4.2 Create UserService dengan create, findByEmail, findById, updateProfile
  - [x] 4.3 Create AuthService dengan register, verifyEmail, resendVerification
  - [x] 4.4 Create AuthController dengan POST /register, /verify-email, /resend-verification
  - [x] 4.5 Create UserModule dan AuthModule
  - [ ] 4.6 Write unit tests untuk registration flow

- [x] 5.0 Login, Token Refresh & Logout Endpoints (NestJS)
  - [x] 5.1 Create DTOs (LoginDto, RefreshTokenDto)
  - [x] 5.2 Implement login dengan credential validation dan status check
  - [x] 5.3 Implement refresh dengan token rotation
  - [x] 5.4 Implement logout dan logout-all
  - [x] 5.5 Create AuthController handlers (login, refresh, logout, logout-all)
  - [ ] 5.6 Write unit tests untuk login/refresh/logout flow

- [x] 6.0 Password Management Endpoints (NestJS)
  - [x] 6.1 Create DTOs (ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto)
  - [x] 6.2 Implement forgotPassword (create reset token)
  - [x] 6.3 Implement resetPassword (validate token, update password)
  - [ ] 6.4 Write unit tests untuk forgot-password flow
  - [ ] 6.5 Create validator schema untuk reset-password request
  - [ ] 6.6 Create `src/services/auth.service.ts` dengan fungsi resetPassword
  - [ ] 6.7 Create handler resetPassword di auth.controller.ts (validate token, update password, revoke tokens)
  - [ ] 6.8 Write unit tests untuk reset-password flow
  - [ ] 6.9 Create validator schema untuk change-password request
  - [ ] 6.10 Create `src/services/auth.service.ts` dengan fungsi changePassword
  - [ ] 6.11 Create handler changePassword di auth.controller.ts (validate current, update, revoke tokens)
  - [ ] 6.12 Write unit tests untuk change-password flow
  - [ ] 6.13 Update auth.routes.ts dengan POST /forgot-password, /reset-password, /change-password

- [ ] 7.0 User Profile Endpoints (Get & Update)
  - [ ] 7.1 Create `src/services/user.service.ts` dengan fungsi getUserById
  - [ ] 7.2 Create `src/controllers/user.controller.ts` dengan handler getMe
  - [ ] 7.3 Write unit tests untuk get profile flow
  - [ ] 7.4 Create validator schema untuk update profile request (full_name, phone_number, timezone, language)
  - [ ] 7.5 Create validation helpers untuk timezone (IANA) dan language (ISO 639-1)
  - [ ] 7.6 Create `src/services/user.service.ts` dengan fungsi updateUser
  - [ ] 7.7 Create handler updateMe di user.controller.ts
  - [ ] 7.8 Write unit tests untuk update profile flow
  - [ ] 7.9 Create `src/routes/user.routes.ts` dengan GET /me, PATCH /me

- [ ] 8.0 Admin User Management Endpoint
  - [ ] 8.1 Create `src/middleware/role.middleware.ts` untuk check admin/super_admin role
  - [ ] 8.2 Write unit tests untuk role middleware
  - [ ] 8.3 Create validator schema untuk admin create user request
  - [ ] 8.4 Create `src/services/user.service.ts` dengan fungsi adminCreateUser
  - [ ] 8.5 Create `src/controllers/admin.controller.ts` dengan handler createUser
  - [ ] 8.6 Implement role restriction: only super_admin can create admin users
  - [ ] 8.7 Implement send "set password" email for active users (via notification-service or placeholder)
  - [ ] 8.8 Write unit tests untuk admin create user flow
  - [ ] 8.9 Create `src/routes/admin.routes.ts` dengan POST /admin/users

- [ ] 9.0 Rate Limiting & Security Middleware
  - [ ] 9.1 Setup Redis connection untuk rate limiting
  - [ ] 9.2 Create `src/middleware/rate-limit.middleware.ts` dengan configurable limits
  - [ ] 9.3 Implement rate limit untuk /login (5 req/min per IP)
  - [ ] 9.4 Implement rate limit untuk /register (3 req/min per IP)
  - [ ] 9.5 Implement rate limit untuk /forgot-password (3 req/min per email)
  - [ ] 9.6 Implement rate limit untuk /resend-verification (3 req/min per email)
  - [ ] 9.7 Write unit tests untuk rate limiting middleware
  - [ ] 9.8 Apply security headers via helmet middleware
  - [ ] 9.9 Configure CORS untuk allowed origins
  - [ ] 9.10 Apply rate limiting middleware ke routes yang sesuai

- [ ] 10.0 Logging, Error Handling & Final Integration
  - [ ] 10.1 Create `src/middleware/error.middleware.ts` sebagai global error handler
  - [ ] 10.2 Implement structured error responses sesuai PRD format
  - [ ] 10.3 Implement logging untuk semua auth events (login success/failed, register, password reset, dll)
  - [ ] 10.4 Create `src/routes/index.ts` untuk aggregate semua routes
  - [ ] 10.5 Update `src/app/app.ts` untuk mount semua routes dan middleware
  - [ ] 10.6 Update `src/main.ts` untuk start server dengan proper error handling
  - [ ] 10.7 Run all unit tests dan fix any failures
  - [ ] 10.8 Test manual semua endpoints dengan Postman/curl
  - [ ] 10.9 Verify `npx nx serve auth-service` berjalan tanpa error
  - [ ] 10.10 Update libs exports di `libs/common/src/index.ts` dan `libs/database/src/index.ts`
  - [ ] 10.11 Create initial super_admin user seed script (optional)
  - [ ] 10.12 Final code review dan cleanup

---

## Summary

| Task Group | Endpoints Covered | Key Components |
|------------|-------------------|----------------|
| Task 4 | POST /register, /verify-email, /resend-verification | User creation, email verification tokens |
| Task 5 | POST /login, /refresh, /logout, /logout-all | JWT, refresh tokens, auth middleware |
| Task 6 | POST /forgot-password, /reset-password, /change-password | Password reset tokens, password validation |
| Task 7 | GET /me, PATCH /me | User profile management |
| Task 8 | POST /admin/users | Admin user creation, role middleware |
| Task 9 | - | Rate limiting, security headers |
| Task 10 | - | Error handling, logging, integration |

**Total Endpoints:** 13
**Estimated Sub-tasks:** 80+
