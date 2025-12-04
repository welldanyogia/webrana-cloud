# Landing Page Asset Specification: P5A-002

## Current State Analysis

Analysis of `src/components/landing/` and `public/images/landing/` reveals the following status:

| Asset Name | Referenced In Code | Current File | Status | Action Required |
|------------|-------------------|--------------|--------|-----------------|
| **hero-dashboard** | `HeroSection.tsx` | `hero-dashboard.jpg` (2.6MB) | ⚠️ Format/Size Mismatch | Convert to WebP, Optimize <200KB |
| **feature-nvme** | `FeaturesSection.tsx` | `feature-nvme.jpg` (112KB) | ⚠️ Format Mismatch | Convert to WebP |
| **feature-indonesia** | `FeaturesSection.tsx` (as `feature-location`) | `feature-location.jpg` (882KB) | ⚠️ Name/Format/Size Mismatch | Rename, Convert to WebP, Optimize |
| **feature-speed** | `FeaturesSection.tsx` | `feature-speed.jpg` (2.7MB) | ⚠️ Format/Size Mismatch | Convert to WebP, Optimize <200KB |
| **feature-payment** | `FeaturesSection.tsx` | `feature-payment.jpg` (41KB) | ⚠️ Format Mismatch | Convert to WebP |
| **why-developer** | Not directly (uses `TerminalDemo`) | `why-us-dev.jpg` (2.6MB) | ⚠️ Name/Format/Size Mismatch | Rename, Convert to WebP, Optimize |
| **bg-pricing** | `PricingSection.tsx` (CSS gradient) | `placeholder-bg-pattern.svg` | ❌ Missing | Create new WebP asset |

**Critical Issue:** Current JPG assets are unoptimized (up to 2.7MB), significantly impacting Load Time and Core Web Vitals.

## Asset Specifications

All assets must be exported in **WebP format** with quality setting ~80-85 to ensure file size **< 200KB** (strict limit).

### 1. hero-dashboard.webp
- **Dimensions:** 1920x1200 (Aspect Ratio 16:10)
- **Format:** WebP
- **Max Size:** 200 KB
- **Color Palette:** Dark Theme (Background `#09090b`, Brand `#16a34a`)
- **Content:** High-fidelity dashboard mockup showing VPS metrics (CPU, RAM usage graphs). Modern UI, glassmorphism effects.
- **Placeholder Recommendation:** Screenshot of existing Admin Dashboard with mock data, or UI kit mockup (e.g., Vercel/Linear style).

### 2. feature-nvme.webp
- **Dimensions:** 800x600 (4:3)
- **Format:** WebP
- **Max Size:** 100 KB
- **Color Palette:** Dark/Cyberpunk accents (Green/Blue)
- **Content:** Abstract 3D or illustrative representation of NVMe SSD storage. Focus on speed and hardware.
- **Placeholder Recommendation:** Unsplash "Server Hardware" or 3D render of chip/storage.

### 3. feature-indonesia.webp
- **Dimensions:** 800x600 (4:3)
- **Format:** WebP
- **Max Size:** 100 KB
- **Color Palette:** Dark map with bright data points
- **Content:** Stylized map of Indonesia highlighting Jakarta data center location. Connection nodes radiating from Jakarta.
- **Placeholder Recommendation:** Vector map of Indonesia with glowing dot on Jakarta (Canva/Figma).

### 4. feature-speed.webp
- **Dimensions:** 800x600 (4:3)
- **Format:** WebP
- **Max Size:** 100 KB
- **Color Palette:** Emerald/Brand Green motion trails
- **Content:** Rocket or abstract speed lines/motion blur indicating instant deployment. Minimalist 3D style.
- **Placeholder Recommendation:** 3D Rocket illustration (Spline/Blender render) or abstract motion lines.

### 5. feature-payment.webp
- **Dimensions:** 800x600 (4:3)
- **Format:** WebP
- **Max Size:** 100 KB
- **Color Palette:** Neutral/White logos on dark background
- **Content:** Collage of payment method logos relevant to Indonesia: QRIS, BCA, Mandiri, GoPay, OVO. Clean layout.
- **Placeholder Recommendation:** Collage of official logos (QRIS, Banks) on dark card background.

### 6. why-developer.webp
- **Dimensions:** 1200x800 (3:2)
- **Format:** WebP
- **Max Size:** 150 KB
- **Color Palette:** Dim lighting, coding environment
- **Content:** Atmospheric photo of a developer workspace with code on screens. Dark, moody, professional.
- **Placeholder Recommendation:** Unsplash "Developer Coding Dark" (e.g., by Nubelson Fernandes).

### 7. bg-pricing.webp
- **Dimensions:** 1920x400
- **Format:** WebP
- **Max Size:** 100 KB
- **Color Palette:** Very subtle dark pattern (hex `#09090b` base)
- **Content:** Subtle tech pattern (grid, dots, or circuit lines) fading to transparent at bottom. Low contrast to ensure text readability.
- **Placeholder Recommendation:** CSS Pattern (Hero Patterns) or subtle circuit SVG converted to WebP.

## Implementation Notes

1.  **Update File References:**
    Frontend code in `src/components/landing/` must be updated to point to new `.webp` filenames.
    *   `HeroSection.tsx`: `/images/landing/hero-dashboard.jpg` -> `.webp`
    *   `FeaturesSection.tsx`: Update array `image` paths.

2.  **Image Component Props:**
    Ensure `next/image` is used with `placeholder="blur"` (requires generating blurDataURL or importing static image object) for optimal UX.

3.  **Responsive Sizing:**
    Current `sizes` prop in `FeaturesSection.tsx` is good: `(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw`.

4.  **Dark Mode Compatibility:**
    Images should be designed primarily for Dark Mode as the landing page uses a dark aesthetic (or adapts). Transparent backgrounds (PNG/WebP) preferred for feature illustrations where possible to blend with `bg-card`.

## Files Reviewed
*   `src/components/landing/HeroSection.tsx`
*   `src/components/landing/FeaturesSection.tsx`
*   `src/components/landing/PricingSection.tsx`
*   `src/components/landing/WhyUsSection.tsx`
*   `src/components/landing/TerminalDemo.tsx`
*   `public/images/landing/*`
