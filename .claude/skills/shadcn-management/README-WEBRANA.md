# Onboarding: shadcn-management Skill

## Selamat Datang di Tim WeBrana Cloud!

### Project Overview
**WeBrana Cloud** adalah platform VPS hosting Indonesia dengan arsitektur microservices:
- **Backend**: NestJS (8 services: auth, catalog, order, billing, notification, instance, provider, api-gateway)
- **Frontend**: React + Vite + TailwindCSS + **shadcn/ui**
  - `customer-web` - Portal pelanggan
  - `admin-web` - Dashboard admin

### Tech Stack Frontend
```
Framework: Next.js / React + Vite
Styling: TailwindCSS + shadcn/ui
State: React Query / Zustand
Forms: React Hook Form + Zod
```

### Scope & Tanggung Jawab

**PRIMARY SCOPE:**
1. Manage semua shadcn/ui components di `customer-web` dan `admin-web`
2. Component discovery dan installation untuk fitur baru
3. Build complex UI features (forms, dialogs, data tables, dashboards)
4. Ensure component consistency across apps

**KEY AREAS:**
| Area | Deskripsi |
|------|-----------|
| Order Flow | Form checkout VPS (plan selection, image, coupon, payment) |
| Dashboard | Data tables untuk orders, users, VPS instances |
| Admin Panel | Dialog untuk payment override, user management |
| Notifications | Toast, alerts, status badges |

### Kolaborasi dengan Tim Lain

| Droid | Kolaborasi |
|-------|------------|
| `senior-frontend-engineer` | Kamu provide component structure, mereka handle business logic |
| `frontend-design` | Kamu handle shadcn setup, mereka customize styling/theming |
| `frontend-ui-animator` | Kamu setup components, mereka add animations |
| `senior-ui-ux-designer` | Mereka design mockup, kamu implement dengan shadcn |

### Component Guidelines

**Preferred shadcn components untuk WeBrana:**
```
Forms: form, input, select, checkbox, radio-group, textarea
Layout: card, dialog, sheet, drawer, tabs, separator
Feedback: alert, toast, skeleton, progress, badge
Data: table, data-table, pagination
Navigation: button, dropdown-menu, navigation-menu, breadcrumb
```

### Alignment dengan PRD

**PRD Reference:** `tasks/prd-webrana-cloud-platform-v1.md`

**Key User Flows yang butuh shadcn:**
1. **UC-001 to UC-006**: Customer order VPS - Form multi-step dengan validation
2. **UC-010 to UC-014**: Customer manage VPS - Data table dengan actions
3. **UC-020 to UC-023**: Admin payment override - Dialog + forms

### File Locations

```
apps/customer-web/
├── src/components/ui/        → shadcn components
├── src/app/                  → Pages
└── components.json           → shadcn config

apps/admin-web/
├── src/components/ui/        → shadcn components
├── src/app/                  → Pages
└── components.json           → shadcn config
```

### Command Reference

```bash
# Add component ke customer-web
cd apps/customer-web && npx shadcn@latest add [component]

# Add component ke admin-web
cd apps/admin-web && npx shadcn@latest add [component]
```

---
**Onboarding Date:** 2024-11-30
**Status:** Active Team Member
