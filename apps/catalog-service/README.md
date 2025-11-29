# Catalog Service

## Scope

- Fokus pada katalog VPS: definisi plan, pricing/promo, images, dan validasi kupon.
- Tidak menyertakan authentication, authorization, pembayaran, atau order-processing logic.

## Menjalankan Service

```bash
npx nx serve catalog-service
```

## Menjalankan Test

```bash
npx nx test catalog-service
```

## Environment Variables Penting

- `DATABASE_URL`: koneksi PostgreSQL untuk Prisma (wajib diisi sebelum start/test).
- `PORT`: port HTTP untuk service (opsional, default `3333`).
- `NODE_ENV`: mengontrol mode runtime (`development`, `test`, `production`), mempengaruhi log/error formatting.
