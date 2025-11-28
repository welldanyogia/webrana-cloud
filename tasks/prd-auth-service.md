# PRD: Auth Service

## 1. Introduction/Overview

Auth Service adalah microservice yang menangani autentikasi dan otorisasi untuk platform Webrana Cloud. Service ini menyediakan fitur login/register dengan email dan password, dengan arsitektur yang extensible untuk mendukung social authentication di masa depan.

**Problem yang dipecahkan:**
- Memberikan mekanisme autentikasi yang aman untuk customer dan admin
- Mengelola siklus hidup user (registrasi, verifikasi, reset password)
- Menyediakan token-based authentication (JWT) untuk akses ke seluruh service

## 2. Goals

1. Implementasi autentikasi email/password dengan JWT (Access Token + Refresh Token)
2. Menyediakan email verification untuk akun baru
3. Implementasi password reset via email
4. Implementasi change password untuk user yang sudah login
5. Rate limiting pada endpoint sensitif untuk mencegah brute-force attack
6. Password policy yang configurable via environment variables
7. Arsitektur yang siap untuk 2FA dan social auth di fase selanjutnya

## 3. User Stories

### Customer
- **US-01**: Sebagai customer, saya ingin mendaftar dengan email dan password agar bisa mengakses platform
- **US-02**: Sebagai customer, saya ingin menerima email verifikasi setelah registrasi agar akun saya terverifikasi
- **US-03**: Sebagai customer, saya ingin login dengan email dan password agar bisa mengakses dashboard
- **US-04**: Sebagai customer, saya ingin reset password jika lupa agar bisa mengakses akun kembali
- **US-05**: Sebagai customer, saya ingin mengganti password saat sudah login untuk keamanan akun
- **US-06**: Sebagai customer, saya ingin session tetap aktif tanpa login ulang selama refresh token masih valid
- **US-07**: Sebagai customer, saya ingin mengupdate profil dasar (nama, telepon, timezone, bahasa)

### Admin
- **US-08**: Sebagai admin, saya ingin login dengan kredensial admin untuk mengakses admin portal
- **US-09**: Sebagai admin, saya ingin melihat dan mengelola status user (suspend/activate)
- **US-10**: Sebagai admin, saya ingin membuat akun user baru dengan status langsung `active` (skip verification)

### System
- **US-11**: Sebagai sistem, saya ingin membatasi percobaan login yang gagal untuk mencegah brute-force
- **US-12**: Sebagai sistem, saya ingin memvalidasi password sesuai policy yang dikonfigurasi
- **US-13**: Sebagai sistem, saya ingin mencatat aktivitas login untuk keperluan audit

## 4. Functional Requirements

### 4.1 User Registration
| ID | Requirement |
|----|-------------|
| FR-01 | Sistem harus menerima registrasi dengan field: email, password, full_name, phone_number (optional) |
| FR-02 | Sistem harus memvalidasi email unik dan format valid |
| FR-03 | Sistem harus memvalidasi password sesuai configurable policy |
| FR-04 | Sistem harus menyimpan password dalam bentuk hash (bcrypt/argon2) |
| FR-05 | Sistem harus set status user ke `pending_verification` setelah registrasi |
| FR-06 | Sistem harus mengirim email verifikasi dengan token/link |
| FR-07 | Sistem harus set default role ke `customer` untuk registrasi publik |

### 4.2 Email Verification
| ID | Requirement |
|----|-------------|
| FR-08 | Sistem harus memvalidasi token verifikasi email |
| FR-09 | Sistem harus mengubah status user dari `pending_verification` ke `active` setelah verifikasi berhasil |
| FR-10 | Token verifikasi harus memiliki masa berlaku (configurable, default 24 jam) |
| FR-11 | Sistem harus menyediakan endpoint untuk resend verification email |
| FR-12 | Token verifikasi bersifat one-time-use; setelah digunakan, field `used_at` di-set dan token tidak bisa dipakai lagi |

### 4.3 Login/Authentication
| ID | Requirement |
|----|-------------|
| FR-13 | Sistem harus menerima login dengan email dan password |
| FR-14 | Sistem harus memvalidasi kredensial user |
| FR-15 | User dengan status `pending_verification` hanya boleh login untuk mengakses halaman verifikasi dan resend email; akses penuh membutuhkan status `active` |
| FR-16 | Sistem harus menolak login untuk user dengan status `suspended` atau `deleted` dengan pesan error yang sesuai |
| FR-17 | Sistem harus mengembalikan Access Token (JWT, short-lived) dan Refresh Token (long-lived) |
| FR-18 | Access Token harus berisi: user_id, email, role, status, issued_at, expires_at |
| FR-19 | Refresh Token harus disimpan di database (table `refresh_tokens`) dalam bentuk hash |
| FR-20 | Sistem harus mengupdate field `last_login_at` setiap login sukses |

### 4.4 Token Refresh
| ID | Requirement |
|----|-------------|
| FR-21 | Sistem harus menerima refresh token dan mengembalikan access token baru |
| FR-22 | Sistem harus memvalidasi refresh token belum expired dan belum di-revoke |
| FR-23 | Sistem harus mendukung refresh token rotation (configurable via `AUTH_REFRESH_TOKEN_ROTATION`) |

### 4.5 Logout
| ID | Requirement |
|----|-------------|
| FR-24 | Sistem harus menyediakan endpoint logout yang me-revoke refresh token |
| FR-25 | Sistem harus mendukung logout dari semua device (revoke all refresh tokens) |

### 4.6 Password Reset (Forgot Password)
| ID | Requirement |
|----|-------------|
| FR-26 | Sistem harus menerima request forgot password dengan email |
| FR-27 | Sistem harus mengirim email dengan reset token/link |
| FR-28 | Reset token harus memiliki masa berlaku (configurable, default 1 jam) |
| FR-29 | Reset token bersifat one-time-use; setelah digunakan, field `used_at` di-set |
| FR-30 | Sistem harus memvalidasi reset token dan menerima password baru |
| FR-31 | Setelah password reset, semua refresh token user harus di-revoke |
| FR-32 | Sistem harus mengupdate field `last_password_change_at` setelah password berhasil direset |

### 4.7 Change Password (Logged-in User)
| ID | Requirement |
|----|-------------|
| FR-33 | Sistem harus menyediakan endpoint untuk ganti password bagi user yang sudah login |
| FR-34 | Sistem harus memvalidasi `current_password` sebelum menerima password baru |
| FR-35 | Sistem harus memvalidasi `new_password` sesuai password policy |
| FR-36 | Sistem harus mengupdate field `last_password_change_at` setelah password berhasil diganti |
| FR-37 | Setelah ganti password, semua refresh token user di-revoke (logout dari semua device) |

### 4.8 Update Profile
| ID | Requirement |
|----|-------------|
| FR-38 | Sistem harus menyediakan endpoint untuk update profil user yang sudah login |
| FR-39 | Field yang bisa diupdate: `full_name`, `phone_number`, `timezone`, `language` |
| FR-40 | Field yang TIDAK bisa diupdate via endpoint ini: `email`, `role`, `status` |
| FR-41 | Sistem harus memvalidasi format phone_number, timezone (IANA format), dan language (ISO 639-1) |

### 4.9 Admin Create User
| ID | Requirement |
|----|-------------|
| FR-42 | Sistem harus menyediakan endpoint khusus admin untuk membuat user baru |
| FR-43 | Hanya user dengan role `admin` atau `super_admin` yang bisa mengakses endpoint ini |
| FR-44 | Admin dapat set role user baru: `customer` atau `admin` (hanya `super_admin` yang bisa create `admin`) |
| FR-45 | Admin dapat set status awal user: `active` (default) atau `pending_verification` |
| FR-46 | Jika status `active`, sistem mengirim email "set password" (reset password link untuk first-time login) |
| FR-47 | Admin TIDAK bisa set password plaintext; user harus set password via reset link |

### 4.10 Rate Limiting
| ID | Requirement |
|----|-------------|
| FR-48 | Endpoint `/auth/login` harus dibatasi: max 5 request per menit per IP |
| FR-49 | Endpoint `/auth/register` harus dibatasi: max 3 request per menit per IP |
| FR-50 | Endpoint `/auth/forgot-password` harus dibatasi: max 3 request per menit per email |
| FR-51 | Endpoint `/auth/resend-verification` harus dibatasi: max 3 request per menit per email |
| FR-52 | Sistem harus mengembalikan error 429 (Too Many Requests) jika limit tercapai |

### 4.11 Password Policy (Configurable)
| ID | Requirement |
|----|-------------|
| FR-53 | Minimum length: configurable via `AUTH_PASSWORD_MIN_LENGTH` (default: 8) |
| FR-54 | Require uppercase: configurable via `AUTH_PASSWORD_REQUIRE_UPPERCASE` (default: true) |
| FR-55 | Require lowercase: configurable via `AUTH_PASSWORD_REQUIRE_LOWERCASE` (default: true) |
| FR-56 | Require digit: configurable via `AUTH_PASSWORD_REQUIRE_DIGIT` (default: true) |
| FR-57 | Require special char: configurable via `AUTH_PASSWORD_REQUIRE_SPECIAL` (default: true) |

## 5. Data Definitions

### 5.1 User Role (Enum)
| Value | Description |
|-------|-------------|
| `customer` | User biasa / pembeli VPS. Default untuk registrasi publik. |
| `admin` | Admin internal (ops, support, billing). Akses ke admin portal. |
| `super_admin` | Owner/sistem level tertinggi. Akses full termasuk konfigurasi security & provider. |

### 5.2 User Status (Enum)
| Value | Description |
|-------|-------------|
| `pending_verification` | User sudah register tapi belum verifikasi email. Login terbatas. |
| `active` | User normal, bisa login & pakai semua fitur sesuai role. |
| `suspended` | User diblokir (fraud/abuse/chargeback). Tidak boleh login. |
| `deleted` | Soft delete. Akun dinonaktifkan tetapi record masih ada untuk audit. |

### 5.3 Verification Token Type (Enum)
| Value | Description |
|-------|-------------|
| `email_verification` | Token untuk verifikasi email setelah registrasi. TTL: 24 jam. |
| `password_reset` | Token untuk reset password (forgot password). TTL: 1 jam. |

## 6. Non-Goals (Out of Scope v1)

- Social authentication (Google, GitHub, dll) - akan diimplementasi di fase selanjutnya
- Two-factor authentication (2FA/TOTP) - akan diimplementasi di fase selanjutnya, tapi schema disiapkan
- OAuth2 provider (menjadi authorization server untuk third-party apps)
- Full login history table - v1 hanya menyimpan `last_login_at` dan application log
- Migrasi user dari sistem lama - schema disiapkan dengan field `legacy_id` dan `legacy_source`, implementasi di proyek terpisah
- Permission/RBAC granular - cukup role-based untuk v1

## 7. Database Schema

### Table: users (schema: auth)
```sql
CREATE TABLE auth.users (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                     VARCHAR(255) NOT NULL UNIQUE,
    password_hash             VARCHAR(255) NOT NULL,
    full_name                 VARCHAR(255) NOT NULL,
    phone_number              VARCHAR(50),
    role                      VARCHAR(50) NOT NULL DEFAULT 'customer',
                              -- ENUM: 'customer', 'admin', 'super_admin'
    status                    VARCHAR(50) NOT NULL DEFAULT 'pending_verification',
                              -- ENUM: 'pending_verification', 'active', 'suspended', 'deleted'
    timezone                  VARCHAR(100) DEFAULT 'UTC',
    language                  VARCHAR(10) DEFAULT 'en',
    last_login_at             TIMESTAMP WITH TIME ZONE,
    last_password_change_at   TIMESTAMP WITH TIME ZONE,
    legacy_id                 VARCHAR(255),  -- untuk migrasi dari sistem lama
    legacy_source             VARCHAR(50),   -- ENUM: 'old_panel', 'csv_import', dll
    created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON auth.users(email);
CREATE INDEX idx_users_status ON auth.users(status);
CREATE INDEX idx_users_role ON auth.users(role);
CREATE INDEX idx_users_legacy_id ON auth.users(legacy_id) WHERE legacy_id IS NOT NULL;
```

### Table: refresh_tokens (schema: auth)
```sql
CREATE TABLE auth.refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    device_info     VARCHAR(500),
    ip_address      VARCHAR(45),
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at      TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON auth.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON auth.refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON auth.refresh_tokens(expires_at);
```

### Table: verification_tokens (schema: auth)
Tabel ini menyimpan token untuk dua keperluan: verifikasi email dan reset password. Dibedakan menggunakan field `type`. Token bersifat **one-time-use** dan memiliki `expires_at`.

```sql
CREATE TABLE auth.verification_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    type            VARCHAR(50) NOT NULL,
                    -- ENUM: 'email_verification', 'password_reset'
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at         TIMESTAMP WITH TIME ZONE,  -- NULL jika belum dipakai, set saat digunakan
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_verification_tokens_user_id ON auth.verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_token_hash ON auth.verification_tokens(token_hash);
CREATE INDEX idx_verification_tokens_type ON auth.verification_tokens(type);
```

### Table: user_mfa (schema: auth) - Prepared for future 2FA
```sql
CREATE TABLE auth.user_mfa (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    totp_secret     VARCHAR(255),
    enabled         BOOLEAN DEFAULT FALSE,
    backup_codes    TEXT[],  -- encrypted backup codes
    last_used_at    TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 8. API Endpoints

### Base URL: `/api/v1/auth`

**Total Endpoints: 13**

| # | Method | Endpoint | Auth Required | Description |
|---|--------|----------|---------------|-------------|
| 1 | POST | `/register` | No | Registrasi user baru |
| 2 | POST | `/verify-email` | No | Verifikasi email dengan token |
| 3 | POST | `/resend-verification` | No | Kirim ulang email verifikasi |
| 4 | POST | `/login` | No | Login dan dapatkan tokens |
| 5 | POST | `/refresh` | No | Refresh access token |
| 6 | POST | `/logout` | Yes | Logout (revoke refresh token) |
| 7 | POST | `/logout-all` | Yes | Logout dari semua device |
| 8 | POST | `/forgot-password` | No | Request reset password |
| 9 | POST | `/reset-password` | No | Reset password dengan token |
| 10 | POST | `/change-password` | Yes | Ganti password (logged-in) |
| 11 | GET | `/me` | Yes | Get current user profile |
| 12 | PATCH | `/me` | Yes | Update current user profile |
| 13 | POST | `/admin/users` | Yes (Admin) | Admin create user |

---

### 8.1 POST /register
Registrasi user baru dengan email dan password.

**Request:**
```json
{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "full_name": "John Doe",
    "phone_number": "+6281234567890"
}
```

**Response (201 Created):**
```json
{
    "data": {
        "id": "uuid",
        "email": "user@example.com",
        "full_name": "John Doe",
        "role": "customer",
        "status": "pending_verification",
        "created_at": "2025-01-15T10:30:00Z"
    }
}
```

**Error (400 Bad Request):**
```json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Password tidak memenuhi kriteria",
        "details": {
            "field": "password",
            "requirements": ["uppercase", "special_char"]
        }
    }
}
```

**Error (409 Conflict):**
```json
{
    "error": {
        "code": "EMAIL_EXISTS",
        "message": "Email sudah terdaftar"
    }
}
```

---

### 8.2 POST /verify-email
Verifikasi email dengan token dari email.

**Request:**
```json
{
    "token": "verification-token-from-email"
}
```

**Response (200 OK):**
```json
{
    "data": {
        "message": "Email berhasil diverifikasi"
    }
}
```

**Error (400 Bad Request):**
```json
{
    "error": {
        "code": "INVALID_TOKEN",
        "message": "Token tidak valid atau sudah expired"
    }
}
```

---

### 8.3 POST /resend-verification
Kirim ulang email verifikasi.

**Request:**
```json
{
    "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
    "data": {
        "message": "Email verifikasi telah dikirim ulang"
    }
}
```

---

### 8.4 POST /login
Login dengan email dan password.

**Request:**
```json
{
    "email": "user@example.com",
    "password": "SecurePass123!"
}
```

**Response (200 OK) - Status Active:**
```json
{
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
        "token_type": "Bearer",
        "expires_in": 900,
        "user": {
            "id": "uuid",
            "email": "user@example.com",
            "full_name": "John Doe",
            "role": "customer",
            "status": "active"
        }
    }
}
```

**Response (200 OK) - Status Pending Verification:**
```json
{
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
        "token_type": "Bearer",
        "expires_in": 900,
        "user": {
            "id": "uuid",
            "email": "user@example.com",
            "full_name": "John Doe",
            "role": "customer",
            "status": "pending_verification"
        },
        "requires_verification": true
    }
}
```

**Error (401 Unauthorized):**
```json
{
    "error": {
        "code": "INVALID_CREDENTIALS",
        "message": "Email atau password salah"
    }
}
```

**Error (403 Forbidden) - Suspended:**
```json
{
    "error": {
        "code": "ACCOUNT_SUSPENDED",
        "message": "Akun Anda telah disuspend. Hubungi support untuk informasi lebih lanjut."
    }
}
```

**Error (403 Forbidden) - Deleted:**
```json
{
    "error": {
        "code": "ACCOUNT_DELETED",
        "message": "Akun tidak ditemukan"
    }
}
```

---

### 8.5 POST /refresh
Refresh access token menggunakan refresh token.

**Request:**
```json
{
    "refresh_token": "dGhpcyBpcyBhIHJlZnJl..."
}
```

**Response (200 OK):**
```json
{
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "refresh_token": "bmV3IHJlZnJlc2ggdG9r...",
        "token_type": "Bearer",
        "expires_in": 900
    }
}
```

---

### 8.6 POST /logout
Logout dan revoke refresh token.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
    "refresh_token": "dGhpcyBpcyBhIHJlZnJl..."
}
```

**Response (200 OK):**
```json
{
    "data": {
        "message": "Logout berhasil"
    }
}
```

---

### 8.7 POST /logout-all
Logout dari semua device (revoke semua refresh tokens).

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
    "data": {
        "message": "Logout dari semua device berhasil",
        "revoked_sessions": 3
    }
}
```

---

### 8.8 POST /forgot-password
Request reset password. Response selalu sama untuk mencegah email enumeration.

**Request:**
```json
{
    "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
    "data": {
        "message": "Jika email terdaftar, instruksi reset password akan dikirim"
    }
}
```

---

### 8.9 POST /reset-password
Reset password dengan token dari email.

**Request:**
```json
{
    "token": "reset-token-from-email",
    "password": "NewSecurePass456!"
}
```

**Response (200 OK):**
```json
{
    "data": {
        "message": "Password berhasil direset. Silakan login dengan password baru."
    }
}
```

---

### 8.10 POST /change-password
Ganti password untuk user yang sudah login.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
    "current_password": "OldSecurePass123!",
    "new_password": "NewSecurePass456!"
}
```

**Response (200 OK):**
```json
{
    "data": {
        "message": "Password berhasil diganti. Anda telah logout dari semua device."
    }
}
```

**Error (400 Bad Request):**
```json
{
    "error": {
        "code": "INVALID_CURRENT_PASSWORD",
        "message": "Password saat ini tidak valid"
    }
}
```

---

### 8.11 GET /me
Get current user profile.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
    "data": {
        "id": "uuid",
        "email": "user@example.com",
        "full_name": "John Doe",
        "phone_number": "+6281234567890",
        "role": "customer",
        "status": "active",
        "timezone": "Asia/Jakarta",
        "language": "id",
        "last_login_at": "2025-01-15T10:30:00Z",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-15T10:30:00Z"
    }
}
```

---

### 8.12 PATCH /me
Update current user profile. Hanya field tertentu yang bisa diupdate.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
    "full_name": "John Doe Updated",
    "phone_number": "+6281234567899",
    "timezone": "Asia/Jakarta",
    "language": "id"
}
```

**Response (200 OK):**
```json
{
    "data": {
        "id": "uuid",
        "email": "user@example.com",
        "full_name": "John Doe Updated",
        "phone_number": "+6281234567899",
        "role": "customer",
        "status": "active",
        "timezone": "Asia/Jakarta",
        "language": "id",
        "updated_at": "2025-01-15T11:00:00Z"
    }
}
```

**Error (400 Bad Request):**
```json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Format timezone tidak valid",
        "details": {
            "field": "timezone"
        }
    }
}
```

---

### 8.13 POST /admin/users
Admin create user baru. Hanya untuk role `admin` atau `super_admin`.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
    "email": "newuser@example.com",
    "full_name": "New User",
    "phone_number": "+6281234567890",
    "role": "customer",
    "status": "active"
}
```

**Response (201 Created):**
```json
{
    "data": {
        "id": "uuid",
        "email": "newuser@example.com",
        "full_name": "New User",
        "role": "customer",
        "status": "active",
        "created_at": "2025-01-15T10:30:00Z",
        "set_password_email_sent": true
    }
}
```

**Error (403 Forbidden):**
```json
{
    "error": {
        "code": "FORBIDDEN",
        "message": "Anda tidak memiliki akses untuk membuat user"
    }
}
```

**Error (403 Forbidden) - Role restriction:**
```json
{
    "error": {
        "code": "FORBIDDEN",
        "message": "Hanya super_admin yang bisa membuat user dengan role admin"
    }
}
```

## 9. Environment Variables

```bash
# JWT Configuration
AUTH_JWT_SECRET=your-super-secret-key-min-32-chars
AUTH_JWT_ACCESS_EXPIRY=15m
AUTH_JWT_REFRESH_EXPIRY=7d
AUTH_JWT_ISSUER=webrana-cloud

# Password Policy
AUTH_PASSWORD_MIN_LENGTH=8
AUTH_PASSWORD_REQUIRE_UPPERCASE=true
AUTH_PASSWORD_REQUIRE_LOWERCASE=true
AUTH_PASSWORD_REQUIRE_DIGIT=true
AUTH_PASSWORD_REQUIRE_SPECIAL=true

# Token Expiry
AUTH_EMAIL_VERIFICATION_EXPIRY=24h
AUTH_PASSWORD_RESET_EXPIRY=1h

# Rate Limiting (per minute)
AUTH_RATE_LIMIT_LOGIN=5
AUTH_RATE_LIMIT_REGISTER=3
AUTH_RATE_LIMIT_FORGOT_PASSWORD=3
AUTH_RATE_LIMIT_RESEND_VERIFICATION=3
AUTH_RATE_LIMIT_WINDOW=60

# Feature Flags
AUTH_EMAIL_VERIFICATION_ENABLED=true
AUTH_REFRESH_TOKEN_ROTATION=true

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/webrana?schema=auth

# Redis (for rate limiting)
REDIS_URL=redis://localhost:6379
```

## 10. Security & Logging

### 10.1 Security Measures
1. **Password Hashing**: Gunakan bcrypt (cost factor 12) atau argon2id
2. **Token Storage**: Refresh token dan verification token di-hash sebelum disimpan di database
3. **Rate Limiting**: Implementasi menggunakan Redis untuk distributed rate limiting
4. **CORS**: Konfigurasi CORS untuk frontend domains yang diizinkan
5. **Input Validation**: Validasi dan sanitasi semua input user
6. **Secure Headers**: Implementasi security headers (X-Content-Type-Options, X-Frame-Options, dll)

### 10.2 Logging & Audit
Untuk v1, logging menggunakan application log (JSON format) yang bisa dikirim ke log aggregator (ELK, Loki, dll).

**Events yang di-log:**
| Event | Log Level | Fields |
|-------|-----------|--------|
| `auth.login.success` | INFO | user_id, email, ip_address, user_agent |
| `auth.login.failed` | WARN | email, ip_address, user_agent, reason |
| `auth.register.success` | INFO | user_id, email, ip_address |
| `auth.password.reset` | INFO | user_id, email, ip_address |
| `auth.password.change` | INFO | user_id, email, ip_address |
| `auth.logout` | INFO | user_id, ip_address |
| `auth.rate_limit.exceeded` | WARN | ip_address, endpoint |

**Note:** Full login history table (`auth.login_events`) tidak diimplementasi di v1. Cukup field `last_login_at` di tabel users dan application log.

## 11. Technical Considerations

1. **Password Hashing**: Gunakan bcrypt atau argon2id dengan cost factor yang appropriate
2. **Token Storage**: Refresh token di-hash sebelum disimpan di database
3. **Rate Limiting**: Implementasi menggunakan Redis untuk distributed rate limiting
4. **Email Service**: Integrasi dengan notification-service untuk pengiriman email
5. **Timezone Validation**: Validasi timezone menggunakan IANA timezone database
6. **Language Validation**: Validasi language code menggunakan ISO 639-1

## 12. Success Metrics

1. **Registration Success Rate**: > 95% registrasi berhasil tanpa error teknis
2. **Login Latency**: < 200ms untuk proses login (P95)
3. **Token Refresh Latency**: < 100ms untuk refresh token (P95)
4. **Failed Login Alerts**: Notifikasi jika ada > 10 failed login dari IP yang sama dalam 5 menit
5. **Email Delivery Rate**: > 99% email verifikasi/reset terkirim dalam 1 menit

## 13. Assumptions & Decisions

### Resolved Questions (dari diskusi sebelumnya):

1. **Login history untuk security audit?**
   - **Keputusan**: v1 tidak perlu full login history table. Cukup `last_login_at` di tabel users dan application log untuk login success/failed dengan IP & user_id.
   - **Future**: Bisa tambahkan tabel `auth.login_events` di phase berikutnya jika diperlukan.

2. **Admin bisa create user langsung dengan status active?**
   - **Keputusan**: Ya, via endpoint `POST /admin/users` yang hanya bisa diakses oleh role `admin` atau `super_admin`.
   - **Restriction**: Hanya `super_admin` yang bisa create user dengan role `admin`.
   - **Flow**: Admin tidak set password plaintext; user menerima email "set password" (reset link untuk first-time login).

3. **Handling migrasi user dari sistem lama?**
   - **Keputusan**: Out of scope untuk v1 secara implementasi.
   - **Preparation**: Schema users sudah menyediakan field `legacy_id` dan `legacy_source` untuk memudahkan proses import di proyek terpisah.

---

**Document Version**: 1.1  
**Created**: 2025-01-15  
**Last Updated**: 2025-01-15  
**Author**: AI Assistant  
**Status**: Final - Ready for Implementation
