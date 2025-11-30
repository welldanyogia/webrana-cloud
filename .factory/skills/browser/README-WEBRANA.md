# Onboarding: browser Skill

## Selamat Datang di Tim WeBrana Cloud!

### Project Overview
**WeBrana Cloud** adalah platform VPS hosting Indonesia dengan arsitektur microservices:
- **Backend**: NestJS (8 services)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
  - `customer-web` - Portal pelanggan (localhost:4200)
  - `admin-web` - Dashboard admin (localhost:4201)

### Scope & Tanggung Jawab

**PRIMARY SCOPE:**
1. **Visual QA & Testing** - Screenshot UI untuk verification
2. **E2E Test Support** - Browser automation untuk integration tests
3. **DOM Inspection** - Element picking untuk debugging
4. **Scraping** - Data extraction dari external sources (jika needed)

**USE CASES untuk WeBrana:**

| Use Case | Deskripsi |
|----------|-----------|
| Visual Regression | Screenshot sebelum/sesudah changes untuk comparison |
| Flow Testing | Automate user flows (order, payment, etc.) |
| Debug UI Issues | Inspect DOM elements yang bermasalah |
| Competitor Research | Scrape pricing/features dari competitors |
| Documentation | Capture screenshots untuk docs/PRD |

### Kolaborasi dengan Tim Lain

| Droid | Kolaborasi |
|-------|------------|
| `senior-qa-engineer` | Kamu provide browser tools, mereka define test scenarios |
| `senior-frontend-engineer` | Kamu help debug UI issues via DOM inspection |
| `senior-ui-ux-designer` | Kamu capture screenshots untuk design review |
| `frontend-design` | Kamu screenshot untuk visual QA |

### Local Development URLs

```bash
# Customer Portal
http://localhost:4200

# Admin Dashboard
http://localhost:4201

# API Gateway
http://localhost:3000

# Individual Services (dev)
http://localhost:3001  # auth-service
http://localhost:3002  # catalog-service
http://localhost:3003  # order-service
http://localhost:3004  # billing-service
```

### Common Workflows

**1. Visual QA untuk Landing Page:**
```bash
# Start Chrome
~/.factory/skills/browser/start.js

# Navigate ke customer-web
~/.factory/skills/browser/nav.js http://localhost:4200

# Screenshot untuk review
~/.factory/skills/browser/screenshot.js
```

**2. Test Order Flow:**
```bash
# Navigate ke order page
~/.factory/skills/browser/nav.js http://localhost:4200/order

# Check form elements
~/.factory/skills/browser/eval.js 'document.querySelectorAll("form input").length'

# Pick specific element untuk debugging
~/.factory/skills/browser/pick.js "Select the submit button"
```

**3. Admin Dashboard Testing:**
```bash
# Navigate dengan profile (untuk keep login state)
~/.factory/skills/browser/start.js --profile
~/.factory/skills/browser/nav.js http://localhost:4201/orders

# Evaluate data table content
~/.factory/skills/browser/eval.js 'document.querySelectorAll("table tbody tr").length'
```

### Alignment dengan PRD

**PRD Reference:** `tasks/prd-webrana-cloud-platform-v1.md`

**Testing Priorities dari PRD:**
- G1: Order VPS < 5 menit → Test full order flow timing
- G2: Admin visibility → Test admin dashboard completeness
- G3: Pricing consistency → Verify harga di UI match backend

### Important Notes

1. **Start Chrome first** sebelum gunakan tools lain
2. **Use `--profile`** jika butuh login state (cookies)
3. **Single expression** untuk eval - gunakan IIFE untuk multiple statements
4. **Screenshots** saved ke temp directory

### Script Locations

Karena skill ini di `.factory/skills/browser/`, script paths:
```bash
~/.factory/skills/browser/start.js
~/.factory/skills/browser/nav.js
~/.factory/skills/browser/eval.js
~/.factory/skills/browser/screenshot.js
~/.factory/skills/browser/pick.js
```

**Note:** Scripts perlu di-copy ke `~/.factory/skills/browser/` agar accessible. Jika belum ada, copy dari project:
```bash
cp -r /home/webrana/webrana-cloud/.factory/skills/browser/* ~/.factory/skills/browser/
```

---
**Onboarding Date:** 2024-11-30
**Status:** Active Team Member
