# Technical Audit Report: Customer Web Frontend

**Date:** 2025-12-04
**App:** `apps/customer-web` (Next.js 14+ / App Router)

## 1. Shadcn UI Audit

**Installed Components:**
- Accordion, Avatar, Badge, Button, Card, Checkbox, Dialog, Dropdown Menu, Form, Input, Label, Separator, Sheet, Skeleton, Table, Tabs.

**Findings:**
- **Heavy Customization:** 
  - `Button.tsx`: Modified to include `isLoading` (spinner), `leftIcon`, `rightIcon`, and custom variants (`success`, `danger`, `warning`).
  - `Badge.tsx`: Modified to include `size` variants, `dot` indicator logic, `pill` prop, and semantic color variants.
- **Consistency:** Components are used consistently across the analyzed files (`HeroSection`, `page.tsx`), but the deviations from the standard Shadcn base create a "forked" state.
- **Risk:** Running `npx shadcn-ui@latest add [component]` for Button or Badge will overwrite these customizations, breaking the UI (e.g., losing the loading spinner logic).

## 2. Animation Audit

**Libraries:**
- ✅ `tailwindcss-animate` (Installed)
- ❌ `framer-motion` (Missing)

**Gap Analysis:**
1.  **Hero Section Entrance:** The landing page hero content (headline, subtext, buttons) loads statically. It lacks a staggered entrance animation (e.g., text sliding up + fading in sequentially) to guide user attention.
2.  **Page Transitions:** There are no layout transitions when navigating between routes (e.g., Home → Login). The new page simply "snaps" into view.
3.  **List/Grid Reveals:** Sections like "Features" or "Pricing" display all cards instantly. A staggered "waterfall" effect is missing to make the scroll experience smoother.

## 3. Technical Recommendations

1.  **Performance (Critical): Remove `'use client'` from `page.tsx`**
    - **Issue:** The entire `page.tsx` is marked as a Client Component. This forces the browser to download and hydrate the entire landing page JavaScript before rendering, hurting LCP (Largest Contentful Paint) and SEO.
    - **Fix:** Move `'use client'` only to the specific interactive leaf components (e.g., `ThemeToggle`, `Navbar` mobile menu, `Button` wrappers) and keep the main page structure and static content as Server Components.

2.  **Animation: Integrate `framer-motion`**
    - **Issue:** `tailwindcss-animate` is limited to simple keyframes. Complex orchestrations (staggering children, layout animations, exit transitions) are difficult to maintain.
    - **Fix:** Install `framer-motion`. Use `<AnimatePresence>` for page transitions and `<motion.div>` with `variants` for the Hero and Feature sections to implement high-quality, staggered entrance animations.

3.  **Maintainability: Protect Customized Primitives**
    - **Issue:** The `Button` and `Badge` are heavily modified.
    - **Fix:** Add a file comment header `@customized` or similar to `button.tsx` and `badge.tsx` to warn developers. Alternatively, wrap the raw Shadcn component in a project-specific `AppButton` that handles the `isLoading` logic, keeping the base primitive clean and updateable.
