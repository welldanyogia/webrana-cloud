# Task Plan: Landing Page Revamp (v1.3)

**Source Document:** `docs/content-landing-page.md` (ID: CONTENT-LP-V1.4)
**Target App:** `apps/customer-web`
**Design System:** `docs/design-system.md`

---

## 🎨 UI/UX Design Tasks

### [UI-001] Asset Sourcing & Optimization
**Assignee:** Senior UI/UX Designer
**Priority:** High
**Description:**
Find and prepare high-quality, royalty-free images (Unsplash/Pexels/PixelBay) as described in the content document.
**Requirements:**
1. **Hero Image:** Modern dashboard mockup or abstract cloud node visualization (Dark/Blue theme).
2. **Feature Images:** 
   - NVMe/Storage illustration (3D/Abstract).
   - Indonesia Map with glowing node.
   - Speed/Rocket illustration.
   - Payment method collage (QRIS/Bank logos).
3. **Why Us Image:** Developer setup photo (Dark mode, code, professional vibe).
4. **Backgrounds:** Subtle tech pattern for Pricing section.
**Deliverables:**
- Download high-res images.
- Optimize to WebP format (max width 1920px for hero, 800px for others).
- Save to `apps/customer-web/public/images/landing/`.

### [UI-002] Component Visual Guidelines
**Assignee:** Senior UI/UX Designer
**Priority:** Medium
**Description:**
Define the layout spacing and typography hierarchy for the new sections using the existing Design System (Shadcn/Tailwind).
**Requirements:**
- Define grid gap for the 4-column Feature section.
- Define visual hierarchy for the Pricing Cards (Highlight "Standard" plan).
- Ensure high contrast for text over images.

---

## 💻 Frontend Engineering Tasks

### [FE-001] Project Structure & Assets
**Assignee:** Senior Frontend Engineer
**Priority:** High
**Description:**
Prepare the project for the new landing page.
**Steps:**
1. Create directory `apps/customer-web/public/images/landing/` (if not exists).
2. Create component directory `apps/customer-web/src/components/landing/`.
3. Ensure all Shadcn components needed are installed (Card, Button, Badge, Table/Grid).

### [FE-002] Implement Hero Section
**Assignee:** Senior Frontend Engineer
**Priority:** High
**Description:**
Implement the "Above the Fold" section.
**Specs:**
- **Layout:** Split screen (Desktop) / Stacked (Mobile).
- **Content:** Headline, Subhead, 2 Buttons, Trust Badges (from `CONTENT-LP-V1.4`).
- **Image:** Display the Hero Image sourced by UI/UX.
- **Style:** Use transparent navbar if possible, or standard navbar.

### [FE-003] Implement Features & Pricing
**Assignee:** Senior Frontend Engineer
**Priority:** High
**Description:**
Implement the core value proposition sections.
**Specs:**
- **Features:** Grid layout (1x4 or 2x2). Card style with image/icon on top, title, and description.
- **Pricing:** 3-Column Table/Card layout. 
  - **Standard Plan:** Must have a "Recommended" badge and slightly distinct border/shadow (Brand Color).
  - **Data:** Hardcode data from `docs/content-landing-page.md` (do not fetch from API for LP speed).

### [FE-004] Implement Developer Section & Footer
**Assignee:** Senior Frontend Engineer
**Priority:** Medium
**Description:**
Implement the "Why Us" section and the final CTA.
**Specs:**
- **Why Us:** Side-by-side layout. Text left, Image right.
- **Tech Specs:** Icon list or small grid.
- **Footer CTA:** Full-width banner with gradient background (Indigo/Brand).
- **Responsiveness:** Ensure perfect stacking on mobile.

---

## 🚀 QA & Verification

### [QA-001] Visual & Content QA
**Assignee:** Senior QA Engineer
**Description:**
Verify the implementation against the content document.
- Check responsiveness (Mobile, Tablet, Desktop).
- Check Dark Mode consistency.
- Verify all links (Sign Up, View Plans) work.
- Verify image loading performance (LCP).
