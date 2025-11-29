# WeBrana Cloud v1.3 - UI/UX Redesign Task Plan

## Objective
Redesign the `customer-web` and `admin-web` interfaces to achieve a modern, professional, and developer-friendly aesthetic similar to **Vultr, DigitalOcean, Laravel Forge, and Vercel**. The implementation must use **Shadcn UI** as the component library foundation.

## Principles
- **Clean & Minimal**: High whitespace, subtle borders, distinct hierarchy.
- **Developer Centric**: Mono fonts for IDs/IPs, fast interactions, keyboard accessible.
- **Consistent**: Unified design system across Customer and Admin portals.
- **Responsive**: Mobile-first approach for all management features.

## Workflow
1. **PM**: Define Plan (This document).
2. **UI/UX**: Create Design Guidelines (Colors, Typography, Layout, Shadcn Customization).
3. **Frontend**: Implement Design System & Components.
4. **Frontend**: Apply to Pages.

---

## Phase 1: Design Guidelines (UI/UX Designer)
*Assignee: Senior UI/UX Designer*

### UI-001: Visual Identity & Design System
- **Deliverable**: `docs/design-system.md`
- **Tasks**:
    - Define Color Palette (Primary, Secondary, Accents, semantic colors for Success/Error/Warning).
        - *Ref*: Vercel's monochrome + accent approach, or DO's friendly blue.
    - Define Typography (Headings, Body, Monospace for code/IPs).
    - Define Spacing & Layout Grid.
    - Define "Surface" styles (Card backgrounds, borders, shadows - subtle like Linear/Vercel).
    - Define Shadcn `radius` and `neutral` base color strategies.

### UI-002: Component Specs (Shadcn Customization)
- **Deliverable**: Update `docs/design-system.md` with component specs.
- **Tasks**:
    - **Buttons**: Variants (Default, Ghost, Outline, Destructive). Focus states.
    - **Inputs**: Border styles, focus rings (Laravel Cloud style).
    - **Cards**: Header, Content, Footer layouts for Resource lists.
    - **Navigation**: Sidebar vs Topbar specs (admin vs customer).
    - **Data Display**: Tables, Badges (Status indicators).

---

## Phase 2: Frontend Foundation (Frontend Engineer)
*Assignee: Senior Frontend Engineer*

### FE-001: Shadcn Setup & Configuration
- **Target**: `apps/customer-web`, `apps/admin-web`
- **Tasks**:
    - Install `shadcn/ui` dependencies (`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`).
    - Initialize `components.json`.
    - Configure `globals.css` with CSS variables derived from UI-001.
    - Create `lib/utils.ts` for `cn` helper.

### FE-002: Core Components Implementation
- **Tasks**: Install and customize core Shadcn components:
    - `Button`, `Input`, `Label`, `Form`
    - `Card`, `Separator`, `Badge`
    - `Dialog`, `Sheet` (for mobile nav/drawers)
    - `DropdownMenu`, `Avatar`
    - `Table`, `Skeleton` (loading states)
    - `Toast`/`Sonner` (notifications)

---

## Phase 3: Page Revamp (Frontend Engineer)
*Assignee: Senior Frontend Engineer*

### FE-003: Layout & Navigation Redesign
- **Tasks**:
    - Implement new `AppShell` / `DashboardLayout`.
    - **Sidebar/Navbar**: Responsive, collapsible (Vultr style).
    - **Breadcrumbs**: Dynamic and clear hierarchy.

### FE-004: Key Screens Redesign
- **Tasks**:
    - **Dashboard**: Stats overview, active resources list.
    - **Create Instance**: Wizard flow (DigitalOcean Droplet style) - Region, Image, Size selection cards.
    - **Instance Details**: Tabbed interface (Overview, Graphs, Settings) - Vercel/Laravel Forge style.
    - **Billing**: Invoices table, Payment method cards.

## Delegation Plan

1. **Step 1**: Delegate **UI-001 & UI-002** to `Senior UI/UX Designer`.
   - *Command*: `/droid senior-ui-ux-designer`
   - *Prompt*: "Create a comprehensive design system document `docs/design-system.md` for WeBrana Cloud. Inspiration: Vultr, DO, Vercel. Tech: Tailwind + Shadcn. Define colors, typography, and component styles."

2. **Step 2**: Delegate **FE-001 & FE-002** to `Senior Frontend Engineer`.
   - *Command*: `/droid senior-frontend-engineer`
   - *Prompt*: "Initialize Shadcn UI in `customer-web` and `admin-web`. Configure the theme based on `docs/design-system.md`. Install core components."

3. **Step 3**: Delegate **FE-003 & FE-004** to `Senior Frontend Engineer`.
   - *Command*: `/droid senior-frontend-engineer`
   - *Prompt*: "Redesign the Dashboard Layout and Create Instance flow using the new Shadcn components."
