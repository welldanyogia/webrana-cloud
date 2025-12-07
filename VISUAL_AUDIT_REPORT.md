# UI/UX Visual Audit Report

## Executive Summary
Audit visual pada `customer-web` dan `admin-web` menemukan isu kritikal terkait penggunaan CSS Variable yang tidak terdefinisi (`--text-muted`) yang berpotensi menyebabkan teks tidak terlihat atau memiliki kontras yang buruk di seluruh aplikasi. Selain itu, ditemukan penggunaan hardcoded color values (Hex dan Tailwind utility classes) yang tidak konsisten dengan sistem tema, terutama pada varian komponen Button dan Badge. Implementasi Dark/Light mode secara umum berjalan baik namun terhambat oleh hardcoded values tersebut.

## Critical Issues (P0)
**Bug yang harus segera diperbaiki**

1.  **Undefined CSS Variable `text-[var(--text-muted)]`**
    *   **Deskripsi**: Banyak komponen menggunakan utility class `text-[var(--text-muted)]`, namun variable `--text-muted` tidak didefinisikan di `globals.css` (hanya `--muted` dan `--muted-foreground` yang ada).
    *   **Dampak**: Teks menjadi hitam (default browser) atau tidak memiliki warna yang benar, merusak readability di Dark Mode (teks hitam di background hitam/gelap).
    *   **Lokasi**: Hampir semua komponen VPS (`VpsSpecsDisplay`, `VpsCard`, `VpsPowerControls`) dan Layout (`main-layout`, `admin-layout`).

## Major Issues (P1)
**Bug yang significant tapi tidak blocking**

1.  **Hardcoded Colors pada Component Variants**
    *   **Deskripsi**: `Button` dan `Badge` menggunakan class hardcoded seperti `bg-emerald-500`, `bg-amber-500`, `bg-red-500` untuk varian success, warning, dan danger.
    *   **Dampak**: Warna tidak bisa diatur lewat tema global. Jika brand color berubah atau mode High Contrast diperlukan, warna ini akan tetap statis.
    *   **Lokasi**: `apps/customer-web/src/components/ui/button.tsx`, `apps/customer-web/src/components/ui/badge.tsx` (dan file serupa di admin-web).

2.  **Hardcoded Background pada `TerminalDemo`**
    *   **Deskripsi**: Menggunakan `bg-[#1e1e1e]` dan `bg-[#2d2d2d]`.
    *   **Dampak**: Tampilan tidak konsisten jika user mengganti tema ke Light Mode (Terminal tetap gelap sementara sekitarnya terang, atau kontras teks `text-zinc-400` menjadi buruk jika background berubah).
    *   **Lokasi**: `apps/customer-web/src/components/landing/TerminalDemo.tsx`.

3.  **Missing Semantic Tokens**
    *   **Deskripsi**: `globals.css` tidak mendefinisikan semantic tokens untuk `success`, `warning`, `info` (hanya `destructive` yang ada).
    *   **Dampak**: Developer terpaksa menggunakan hardcoded colors.

## Minor Issues (P2)
**Improvements yang nice-to-have**

1.  **Ukuran Font Terlalu Kecil**
    *   **Deskripsi**: Penggunaan `text-[10px]` pada Badge dan elemen status.
    *   **Dampak**: Readability buruk, terutama di layar resolusi tinggi atau untuk user dengan gangguan penglihatan. WCAG menyarankan minimal 12px untuk teks fungsional.
    *   **Lokasi**: `VpsStatusBadge`, `VpsExpiryCountdown`, `Badge` component.

2.  **Truncate Tanpa Tooltip**
    *   **Deskripsi**: Penggunaan `truncate` tanpa pembungkus `Tooltip` atau atribut `title`.
    *   **Dampak**: User tidak bisa membaca informasi lengkap jika teks terpotong.
    *   **Lokasi**: `VpsCard`, `NotificationItem`, `StatCard`.

3.  **Manual Theme Hydration**
    *   **Deskripsi**: `ThemeProvider` memanipulasi DOM secara manual di `useEffect`.
    *   **Dampak**: Potensi FOUC (Flash of Unstyled Content) atau flash tema yang salah saat loading awal sebelum JS berjalan.
    *   **Rekomendasi**: Gunakan `next-themes` yang menangani hydration mismatch dengan lebih robust.

## Detailed Findings

### Dark/Light Mode Issues
| File | Line | Issue | Recommendation |
|------|------|-------|----------------|
| `customer-web/.../landing/TerminalDemo.tsx` | 56, 58 | Hardcoded hex `bg-[#1e1e1e]`, `bg-[#2d2d2d]` | Gunakan `bg-card` atau `bg-secondary` dengan opacity modifier jika perlu gelap. |
| `customer-web/.../theme-provider.tsx` | 20-30 | Manual class manipulation | Pertimbangkan migrasi ke library `next-themes` untuk handling hydration yang lebih baik. |

### Text Readability Issues
| File | Line | Issue | Recommendation |
|------|------|-------|----------------|
| `customer-web/.../vps/VpsSpecsDisplay.tsx` | multiple | Menggunakan `text-[var(--text-muted)]` (undefined) | Ganti ke `text-muted-foreground`. |
| `customer-web/.../vps/VpsStatusBadge.tsx` | 9 | `text-[10px]` terlalu kecil | Naikkan ke `text-xs` (12px) atau gunakan icon saja jika space terbatas. |
| `customer-web/.../ui/badge.tsx` | 33 | Variant `sm` menggunakan `text-[10px]` | Evaluasi ulang kebutuhan teks sekecil ini dalam sistem desain. |
| `customer-web/.../ui/stat-card.tsx` | 15 | `truncate` tanpa tooltip | Bungkus konten yang di-truncate dengan komponen `Tooltip`. |

### Color Consistency Issues
| File | Line | Issue | Recommendation |
|------|------|-------|----------------|
| `customer-web/.../ui/button.tsx` | 20-25 | Hardcoded `bg-emerald-500`, `bg-amber-500` | Definisikan variable `--success`, `--warning` di `globals.css` dan gunakan `bg-success`. |
| `customer-web/.../vps/VpsPowerControls.tsx` | multiple | Hardcoded `text-amber-400`, `text-blue-400` | Gunakan semantic classes: `text-warning`, `text-info`. |
| `customer-web/.../app/globals.css` | - | Missing Semantic Tokens (Success/Warning/Info) | Tambahkan variable CSS untuk semantic colors agar konsisten di seluruh app. |

## Recommended Fixes

### 1. Fix Undefined CSS Variable (High Priority)
Update file `apps/customer-web/src/app/globals.css` dan `apps/admin-web/src/app/globals.css`:

```css
@theme {
  /* ... existing vars ... */
  /* Tambahkan mapping jika ingin mempertahankan usage variable, 
     TAPI lebih baik replace usage di component */
}

@layer base {
  :root {
    /* ... */
    --success: 142 76% 36%;  /* Emerald 600 */
    --success-foreground: 355 100% 100%;
    
    --warning: 48 96% 53%;   /* Amber 500 */
    --warning-foreground: 0 0% 100%;
    
    --info: 217 91% 60%;     /* Blue 500 */
    --info-foreground: 0 0% 100%;
  }
  
  .dark {
    /* ... */
    --success: 142 70% 50%;  /* Emerald 500 for dark mode */
    --success-foreground: 144 100% 5%;
    
    /* adjust others for dark mode */
  }
}
```

Dan lakukan Global Find & Replace di codebase:
*   Find: `text-[var(--text-muted)]`
*   Replace: `text-muted-foreground`

### 2. Standardize Colors in Components
Refactor `Button` dan `Badge` untuk menggunakan semantic variables yang baru dibuat.

**Contoh refactor `badge.tsx`:**
```tsx
// Sebelum
success: "border-transparent bg-emerald-500 text-white shadow hover:bg-emerald-600",

// Sesudah
success: "border-transparent bg-success text-success-foreground shadow hover:bg-success/80",
```
