# Order Service – API Consumer Guide (v1.0)

Dokumen ini untuk **FE** dan **bot** yang akan mengkonsumsi order-service.

---

## 1. Base URL & Environment

### 1.1 Local (Docker Dev)

- Base URL: `http://localhost:3333`
- Prefix: semua endpoint REST ada di bawah: `/api/v1`

Contoh:
- `GET /api/v1/health`
- `POST /api/v1/orders`
- `GET /api/v1/orders/:id`
- `POST /api/v1/internal/orders/:id/payment-status`

### 1.2 Dependencies

Order-service bergantung pada:

- PostgreSQL (DATABASE_URL)
- catalog-service (`CATALOG_SERVICE_BASE_URL`)
- DigitalOcean API (`DO_ACCESS_TOKEN`) – untuk provisioning droplet

Jika catalog-service atau DO down, beberapa endpoint akan mengembalikan error dengan format standar `{ error: { ... } }`.

---

## 2. Authentication & Security

### 2.1 User JWT (Untuk endpoint /api/v1/orders)

Semua endpoint user (`/api/v1/orders`) **wajib** header:

```http
Authorization: Bearer <JWT>
```

#### Claim minimal yang dipakai:

* `sub` → ID user (contoh: `"user-123"`)
* Claim lain (email, name, dll) tidak dipakai oleh order-service v1.0.

#### Algoritma JWT

* **Production default**: `RS256` (public key via `JWT_PUBLIC_KEY`)
* **Local/dev**: boleh pakai `HS256` (`JWT_SECRET`)

Untuk local dev (HS256), contoh payload:

```json
{
  "sub": "user-123",
  "email": "user@example.com"
}
```

### 2.2 Internal API Key (Untuk endpoint /api/v1/internal/*)

Semua endpoint internal (admin) menggunakan header:

```http
X-API-Key: <INTERNAL_API_KEY>
```

* Nilai `INTERNAL_API_KEY` diambil dari environment backend.
* Jika header kosong atau salah:
  * Response: `401` atau `403`
  * Body: `{ "error": { "code": "UNAUTHORIZED" | "FORBIDDEN", ... } }`

---

## 3. User Endpoints – /api/v1/orders

### 3.1 POST /api/v1/orders – Create Order

Membuat order baru untuk user yang login.

- **Method**: `POST`
- **URL**: `/api/v1/orders`
- **Auth**: `Authorization: Bearer <JWT>`
- **Body** (JSON):

```json
{
  "planId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "imageId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "duration": "MONTHLY",
  "couponCode": "PROMO20"
}
```

#### Aturan:

* `planId` harus valid & aktif di catalog-service
* `imageId` harus valid & tersedia untuk plan tersebut
* `duration` salah satu dari:
  * `MONTHLY`, `QUARTERLY`, `SEMI_ANNUAL`, `ANNUAL`
* `couponCode` optional, akan divalidasi ke catalog-service

#### Response 201 – Success

```json
{
  "data": {
    "id": "6f0429ea-4344-496d-bd40-1f4e47a6220c",
    "status": "PENDING_PAYMENT",
    "pricing": {
      "basePrice": 100000,
      "promoDiscount": 0,
      "couponCode": "PROMO20",
      "couponDiscount": 20000,
      "finalPrice": 80000,
      "currency": "IDR"
    },
    "items": [
      {
        "id": "item-001",
        "itemType": "PLAN",
        "referenceId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "description": "Basic VPS Plan",
        "unitPrice": 100000,
        "quantity": 1,
        "totalPrice": 100000
      },
      {
        "id": "item-002",
        "itemType": "IMAGE",
        "referenceId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "description": "Ubuntu 22.04 LTS",
        "unitPrice": 0,
        "quantity": 1,
        "totalPrice": 0
      }
    ],
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

#### Error utama:

* Plan tidak valid → `400 INVALID_PLAN`
* Image tidak valid → `400 INVALID_IMAGE`
* Coupon tidak valid → `400 INVALID_COUPON`
* Catalog-service down → `503 CATALOG_SERVICE_UNAVAILABLE`

---

### 3.2 GET /api/v1/orders – List Orders (User)

* **Method**: `GET`
* **URL**: `/api/v1/orders`
* **Auth**: `Authorization: Bearer <JWT>`
* **Query Params**:
  * `page` (default: 1)
  * `limit` (default: 10)
  * `status` (optional; filter by order status)

#### Response 200 – Success

```json
{
  "data": [
    {
      "id": "6f0429ea-4344-496d-bd40-1f4e47a6220c",
      "status": "ACTIVE",
      "finalPrice": 100000,
      "currency": "IDR",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 3.3 GET /api/v1/orders/:id – Order Detail (User)

* **Method**: `GET`
* **URL**: `/api/v1/orders/:id`
* **Auth**: `Authorization: Bearer <JWT>`
* Hanya bisa mengakses order milik user itu sendiri.

#### Response 200 – Success

```json
{
  "data": {
    "id": "6f0429ea-4344-496d-bd40-1f4e47a6220c",
    "status": "ACTIVE",
    "pricing": {
      "basePrice": 100000,
      "promoDiscount": 0,
      "couponCode": null,
      "couponDiscount": 0,
      "finalPrice": 100000,
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
      "errorMessage": null
    },
    "paidAt": "2024-01-15T11:00:00.000Z",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T11:05:00.000Z"
  }
}
```

#### Error utama:

* Bukan pemilik order → `403 ORDER_ACCESS_DENIED`
* Order tidak ditemukan → `404 ORDER_NOT_FOUND`

---

## 4. Internal/Admin Endpoints – /api/v1/internal/orders

Semua endpoint di bawah ini **wajib** header:

```http
X-API-Key: <INTERNAL_API_KEY>
```

### 4.1 POST /api/v1/internal/orders/:id/payment-status

Override status pembayaran secara manual oleh admin.

* **Method**: `POST`
* **URL**: `/api/v1/internal/orders/:id/payment-status`
* **Headers**:
  * `X-API-Key: <INTERNAL_API_KEY>`
* **Body**:

```json
{
  "status": "PAID",
  "notes": "Payment verified"
}
```

#### Behavior:

* Jika `status = "PAID"`:
  * Order status berubah `PENDING_PAYMENT -> PAID`
  * Field `paidAt` diisi
  * **Provisioning akan otomatis dimulai** (order -> PROVISIONING -> ACTIVE/FAILED)

* Jika `status = "PAYMENT_FAILED"`:
  * Order status **tetap** `PENDING_PAYMENT`
  * Event dicatat di `StatusHistory` dengan status `PAYMENT_FAILED`
  * Tujuan: memungkinkan **retry payment** di masa depan.

---

### 4.2 GET /api/v1/internal/orders – List All Orders (Admin)

* **Method**: `GET`
* **URL**: `/api/v1/internal/orders`
* **Query Params**:
  * `page`, `limit`
  * `status` (optional)
  * `userId` (optional)

Response sama seperti list user, tapi:

* Admin bisa melihat semua user (tidak dibatasi ownership).
* Bisa filter per userId.

---

### 4.3 GET /api/v1/internal/orders/:id – Order Detail (Admin)

* **Method**: `GET`
* **URL**: `/api/v1/internal/orders/:id`
* **Behavior**:
  * Tidak ada ownership check
  * Mengembalikan detail lengkap:
    * Order
    * OrderItems
    * ProvisioningTask
    * StatusHistory

---

## 5. Error Format & Error Codes

### 5.1 Error Envelope

Semua error menggunakan format:

```json
{
  "error": {
    "code": "INVALID_PLAN",
    "message": "Plan ID tidak valid atau tidak aktif",
    "details": {
      "planId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    }
  }
}
```

### 5.2 Daftar Error Codes Utama

**Order & Payment:**

| Code | HTTP | Description |
|------|------|-------------|
| `ORDER_NOT_FOUND` | 404 | Order tidak ditemukan |
| `ORDER_ACCESS_DENIED` | 403 | User tidak berhak mengakses order |
| `INVALID_PLAN` | 400 | Plan ID tidak valid atau tidak aktif |
| `INVALID_IMAGE` | 400 | Image ID tidak valid atau tidak tersedia |
| `INVALID_COUPON` | 400 | Coupon tidak valid |
| `INVALID_DURATION` | 400 | Duration tidak dikenali |
| `PAYMENT_STATUS_CONFLICT` | 409 | Order dalam status yang tidak bisa di-update payment-nya |

**Catalog-service:**

| Code | HTTP | Description |
|------|------|-------------|
| `CATALOG_SERVICE_UNAVAILABLE` | 503 | Tidak dapat menghubungi catalog-service |

**Provisioning & DigitalOcean:**

| Code | HTTP | Description |
|------|------|-------------|
| `PROVISIONING_FAILED` | 500 | Gagal membuat droplet |
| `DIGITALOCEAN_UNAVAILABLE` | 503 | Tidak dapat menghubungi DO API |
| `PROVISIONING_TIMEOUT` | 500 | Droplet tidak ready dalam waktu yang ditentukan |

**Generic:**

| Code | HTTP | Description |
|------|------|-------------|
| `BAD_REQUEST` | 400 | Request tidak valid |
| `UNAUTHORIZED` | 401 | Token tidak valid atau tidak ada |
| `FORBIDDEN` | 403 | Tidak punya akses |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

---

## 6. Contoh Request – curl & Flow Integrasi

### 6.1 Generate JWT (Local Dev – HS256)

Gunakan script helper (misal `scripts/gen-jwt.mjs`):

```bash
JWT_SECRET=super-secret-dev-token node scripts/gen-jwt.mjs
```

### 6.2 Create Order – User

```bash
curl -X POST http://localhost:3333/api/v1/orders \
  -H "Authorization: Bearer <JWT_USER>" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "imageId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    "duration": "MONTHLY",
    "couponCode": null
  }'
```

### 6.3 Mark Order as PAID – Admin

```bash
curl -X POST http://localhost:3333/api/v1/internal/orders/<ORDER_ID>/payment-status \
  -H "X-API-Key: super-secret-internal-key" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PAID",
    "notes": "Manual verification"
  }'
```

### 6.4 Get Order Detail – User

```bash
curl -X GET http://localhost:3333/api/v1/orders/<ORDER_ID> \
  -H "Authorization: Bearer <JWT_USER>"
```

### 6.5 List Orders – Admin (with filters)

```bash
curl -X GET "http://localhost:3333/api/v1/internal/orders?status=PENDING_PAYMENT&page=1&limit=20" \
  -H "X-API-Key: super-secret-internal-key"
```

---

## 7. Integration Checklist (Untuk FE & Bot)

Sebelum integrasi ke production, pastikan:

- [ ] **1. Base URL** environment-based
  - Dev: `http://localhost:3333`
  - Staging/Prod: `https://order-service.<your-domain>`

- [ ] **2. JWT Generation** sesuai aturan backend
  - Claim `sub` diisi dengan userId
  - Algoritma sama dengan backend (`HS256` untuk dev, `RS256` di prod)

- [ ] **3. Headers** selalu dikirim:
  - `Authorization: Bearer <JWT_USER>` untuk user endpoints
  - `X-API-Key: <INTERNAL_API_KEY>` untuk admin endpoints

- [ ] **4. Error Handling** standar:
  - Baca `error.code` untuk logic
  - Tampilkan `error.message` ke user jika aman

- [ ] **5. Flow Utama** teruji end-to-end:
  - Create order → tampilkan harga & status `PENDING_PAYMENT`
  - Setelah payment sukses (gateway lain):
    - Panggil `/internal/orders/:id/payment-status` dengan `status=PAID`
    - Poll `/orders/:id` sampai status `ACTIVE` atau `FAILED`

- [ ] **6. Timeout & Retry**:
  - Jika `CATALOG_SERVICE_UNAVAILABLE` atau `DIGITALOCEAN_UNAVAILABLE` → FE/bot lakukan retry atau tampilkan pesan "coba lagi".

- [ ] **7. Status Polling** (untuk provisioning):
  - Setelah PAID, poll setiap 5-10 detik
  - Stop polling ketika status = `ACTIVE` atau `FAILED`
  - Timeout client-side setelah ~5 menit

---

## Appendix: Order Status Flow

```
PENDING_PAYMENT
      │
      ├── (payment failed event) → tetap PENDING_PAYMENT (bisa retry)
      │
      └── (payment success) → PAID
                                │
                                └── (auto) → PROVISIONING
                                                  │
                                                  ├── (success) → ACTIVE
                                                  │
                                                  └── (failed) → FAILED
```

---

*Last updated: 2024-01-15 | Version: 1.0*
