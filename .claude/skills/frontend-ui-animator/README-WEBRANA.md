# Onboarding: frontend-ui-animator Skill

## Selamat Datang di Tim WeBrana Cloud!

### Project Overview
**WeBrana Cloud** adalah platform VPS hosting Indonesia dengan arsitektur microservices:
- **Backend**: NestJS (8 services)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
  - `customer-web` - Portal pelanggan (landing page, dashboard, order flow)
  - `admin-web` - Dashboard admin

### Tech Stack Frontend
```
Framework: Next.js / React + Vite
Styling: TailwindCSS + shadcn/ui
Animation: CSS Animations (preferred), Framer Motion (if needed)
```

### Scope & Tanggung Jawab

**PRIMARY SCOPE:**
1. UI animations untuk `customer-web` (prioritas utama)
2. Micro-interactions untuk feedback & UX enhancement
3. Landing page animations (hero, scroll reveal, hover effects)
4. Dashboard animations (loading states, transitions)

**ANIMATION PRIORITIES untuk WeBrana:**

| Priority | Area | Target Components |
|----------|------|-------------------|
| 1 | Landing Page Hero | Headline, CTA buttons, feature icons |
| 2 | Pricing Section | Plan cards, hover effects, comparison |
| 3 | Order Flow | Step transitions, progress indicators |
| 4 | Dashboard | Loading skeletons, data refresh |
| 5 | Notifications | Toast animations, alerts |

### Kolaborasi dengan Tim Lain

| Droid | Kolaborasi |
|-------|------------|
| `senior-frontend-engineer` | Mereka build components, kamu add animations |
| `frontend-design` | Mereka set creative direction, kamu implement motion |
| `shadcn-management` | Mereka setup components, kamu enhance dengan animations |
| `senior-ui-ux-designer` | Mereka spec animation intent, kamu implement teknis |

### Animation Guidelines untuk WeBrana

**Brand Personality:** Professional, Modern, Trustworthy (VPS hosting)
- **Speed**: Fast & snappy (200-300ms max untuk micro-interactions)
- **Easing**: `ease-out` untuk entrances, `ease-in-out` untuk hover
- **Style**: Subtle & purposeful, hindari berlebihan

**DO:**
```css
/* Smooth fade-in untuk content */
animation: fade-in 0.3s ease-out;

/* Subtle lift untuk cards */
transform: translateY(-4px);
box-shadow: 0 10px 40px rgba(0,0,0,0.1);
```

**DON'T:**
```css
/* Terlalu lambat untuk UX profesional */
animation: bounce 2s infinite;

/* Mengganggu trust untuk platform hosting */
animation: shake 0.5s;
```

### Key Pages untuk Animate

```
apps/customer-web/src/app/
├── (landing)/page.tsx          → Hero animations, scroll reveals
├── (dashboard)/                → Loading states, transitions
├── (auth)/login/               → Form animations
└── order/                      → Multi-step progress

apps/customer-web/src/components/
├── landing/                    → HeroSection, FeaturesSection, PricingSection
├── ui/                         → Button hover, Card lift
└── layouts/                    → Navigation transitions
```

### Tailwind Animation Config

Update `tailwind.config.ts`:
```typescript
theme: {
  extend: {
    animation: {
      'fade-in': 'fade-in 0.3s ease-out',
      'fade-slide-up': 'fade-slide-up 0.4s ease-out',
      'scale-in': 'scale-in 0.2s ease-out',
    },
    keyframes: {
      'fade-in': {
        '0%': { opacity: '0' },
        '100%': { opacity: '1' },
      },
      'fade-slide-up': {
        '0%': { opacity: '0', transform: 'translateY(10px)' },
        '100%': { opacity: '1', transform: 'translateY(0)' },
      },
      'scale-in': {
        '0%': { opacity: '0', transform: 'scale(0.95)' },
        '100%': { opacity: '1', transform: 'scale(1)' },
      },
    },
  },
}
```

### Alignment dengan PRD

**PRD Reference:** `tasks/prd-webrana-cloud-platform-v1.md`

**Animation Requirements dari PRD:**
- G1: Customer order VPS < 5 menit → Smooth, fast transitions di order flow
- G4: Notifikasi otomatis → Toast animations yang attention-grabbing tapi tidak annoying

### Accessibility (WAJIB)

Selalu include di `globals.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---
**Onboarding Date:** 2024-11-30
**Status:** Active Team Member
