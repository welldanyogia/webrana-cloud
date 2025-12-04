# Known Issues & Blockers

## Active Issues

### [BLOCKER] Landing Page Animations Not Triggering (2024-12-04)

**Status:** 🔴 Needs Investigation  
**Severity:** Medium  
**Affected:** Landing page sections after Hero

**Problem:**
Framer-motion `whileInView` animations with `initial="hidden"` (opacity: 0) are not triggering properly, causing content to remain invisible after the Hero section.

**Symptoms:**
- Sections appear empty/blank after Hero section
- Content exists in HTML (server-side rendering works)
- Client-side JavaScript animations fail to trigger
- `whileInView` with Intersection Observer not working as expected

**Temporary Fix Applied:**
Removed framer-motion animations from affected sections:
- `FeaturesSection.tsx` - Changed motion.div to static div
- `PricingSection.tsx` - Removed motion imports & animations
- `WhyUsSection.tsx` - Removed motion imports & animations

**Root Cause Candidates:**
1. Intersection Observer not initializing correctly in Next.js 16
2. Hydration mismatch causing animation state machine to fail
3. Framer-motion v12 compatibility issue with React 19/Next.js 16
4. Browser/viewport configuration affecting IntersectionObserver

**TODO for Investigation:**
- [ ] Check browser console for JavaScript errors
- [ ] Test with framer-motion LazyMotion for better SSR support
- [ ] Try `animate="visible"` instead of `whileInView` as fallback
- [ ] Check if `viewport={{ once: true, amount: 0 }}` fixes the issue
- [ ] Consider using CSS animations as alternative
- [ ] Test in different browsers (Chrome, Firefox, Safari)

**Related Files:**
- `apps/customer-web/src/components/landing/FeaturesSection.tsx`
- `apps/customer-web/src/components/landing/PricingSection.tsx`
- `apps/customer-web/src/components/landing/WhyUsSection.tsx`
- `apps/customer-web/src/lib/motion.ts`

**Dependencies:**
- framer-motion: v12.23.25
- next: v16.0.5
- react: v19.x

---

## Resolved Issues

(None yet)

---

## Notes

- Document new issues with date and severity
- Move resolved issues to "Resolved Issues" section with resolution date
- Link to relevant PRs or commits when fixing
