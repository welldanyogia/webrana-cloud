# 🚀 Welcome to Webrana Cloud Team!

Selamat bergabung di tim Webrana Cloud! Dokumen ini akan membantu kamu untuk mulai berkontribusi.

---

## 📋 Project Overview

**Webrana Cloud** adalah platform VPS hosting Indonesia yang menyediakan:
- Self-service VPS ordering dalam hitungan menit
- Pembayaran dalam Rupiah (IDR) via Tripay
- Dashboard untuk customer dan admin
- Automated provisioning ke DigitalOcean

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Monorepo** | Nx 22 |
| **Backend** | NestJS 11, TypeScript, Prisma 6 |
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, Shadcn UI |
| **Database** | PostgreSQL |
| **Cache/Queue** | Redis, ioredis |
| **Real-time** | Socket.IO |
| **Testing** | Jest 30, Vitest 4, Testcontainers |
| **Cloud** | DigitalOcean API |

---

## 🏗️ Architecture

```
webrana-cloud/
├── apps/                      # Applications
│   ├── order-service/         # Order & provisioning (NestJS)
│   ├── auth-service/          # Authentication (NestJS)
│   ├── catalog-service/       # Plans & pricing (NestJS)
│   ├── billing-service/       # Payments & invoicing (NestJS)
│   ├── notification-service/  # Email/Telegram/In-app (NestJS)
│   ├── instance-service/      # VPS management (NestJS)
│   ├── api-gateway/           # Rate limiting & routing (NestJS)
│   ├── customer-web/          # Customer portal (React)
│   └── admin-web/             # Admin dashboard (React)
├── libs/                      # Shared libraries
│   ├── common/                # Shared utilities, Sentry
│   ├── database/              # Database utilities
│   ├── events/                # Event types
│   ├── frontend-api/          # API client
│   └── ui/                    # Shared UI components
├── tasks/                     # PRDs & task tracking
└── docs/                      # Documentation
```

---

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone <repo-url>
cd webrana-cloud
npm install
```

### 2. Setup Environment

Copy `.env.example` ke `.env` di setiap service:
```bash
cp apps/order-service/.env.example apps/order-service/.env
# Repeat for other services
```

Key environment variables:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
JWT_ALGORITHM=HS256
JWT_SECRET=your-dev-secret
INTERNAL_API_KEY=your-internal-key
```

### 3. Setup Database

```bash
# Generate Prisma client for each service
npx prisma generate --schema=apps/order-service/prisma/schema.prisma
npx prisma generate --schema=apps/auth-service/prisma/schema.prisma
npx prisma generate --schema=apps/catalog-service/prisma/schema.prisma
npx prisma generate --schema=apps/billing-service/prisma/schema.prisma
npx prisma generate --schema=apps/notification-service/prisma/schema.prisma

# Run migrations (requires PostgreSQL running)
npx prisma migrate dev --schema=apps/order-service/prisma/schema.prisma
```

### 4. Run Services

```bash
# Start specific service
npx nx serve order-service
npx nx serve customer-web

# Start multiple
npx nx run-many -t serve -p order-service,auth-service
```

### 5. Run Tests

```bash
# All tests
npm run test

# Specific service
npx nx test order-service
npx nx test customer-web

# With coverage
npx nx test order-service --coverage

# Integration tests (requires Docker)
RUN_INTEGRATION_TESTS=true npx nx test billing-service
```

---

## 📚 Key Documentation

| Document | Location | Description |
|----------|----------|-------------|
| **AGENTS.md** | `/AGENTS.md` | Coding guidelines & conventions |
| **Platform PRD** | `/tasks/prd-webrana-cloud-platform-v1.md` | Full product requirements |
| **Progress Report** | `/docs/project-progress-report.md` | Current implementation status |
| **Task Plans** | `/tasks/tasks-*.md` | Sprint task breakdowns |
| **Design System** | `/docs/design-system.md` | UI/UX guidelines |

---

## 🤖 Available Droids (AI Assistants)

Kita menggunakan Factory AI droids untuk accelerate development. Setiap droid adalah specialist:

### Orchestrator
| Droid | Command | Purpose |
|-------|---------|---------|
| **Product Manager** | `/pm` atau `/droid senior-product-manager` | PRD, task planning, delegation |

### Engineering
| Droid | Command | Purpose |
|-------|---------|---------|
| **Backend Engineer** | `/backend` atau `/droid senior-backend-engineer` | API, database, microservices |
| **Frontend Engineer** | `/frontend` atau `/droid senior-frontend-engineer` | React, UI components |
| **QA Engineer** | `/qa` atau `/droid senior-qa-engineer` | Testing, quality |
| **DevOps Engineer** | `/devops` atau `/droid senior-devops-engineer` | CI/CD, infrastructure |

### Creative
| Droid | Command | Purpose |
|-------|---------|---------|
| **UI/UX Designer** | `/design` atau `/droid senior-ui-ux-designer` | Design system, UX |
| **Copywriter** | `/copy` atau `/droid senior-copywriter` | Content, copy |
| **Marketing** | `/marketing` atau `/droid senior-marketing-specialist` | GTM, campaigns |

### Workflow Example
```
1. /pm new-task "Add feature X"     → PM creates task breakdown
2. /pm delegate BE-001 to backend   → Delegate to backend engineer
3. /backend                         → Backend implements
4. /qa                              → QA verifies
```

---

## 📊 Current Project Status

### Completed (v1.0 - v1.2)

✅ **Backend Services:**
- auth-service (JWT, registration, login)
- catalog-service (plans, images, coupons)
- order-service (ordering, DO provisioning)
- billing-service (Tripay integration)
- notification-service (Email, Telegram, In-app)
- instance-service (reboot, power, password reset)
- api-gateway (rate limiting)

✅ **Frontend Apps:**
- customer-web (landing, dashboard, order flow, VPS management)
- admin-web (orders, users, analytics)

✅ **Infrastructure:**
- Sentry error tracking
- WebSocket for real-time notifications
- Rate limiting
- Security tests

### In Progress (v1.3)

🔄 **Next up:**
- provider-service abstraction (multi-cloud)
- Vultr/Linode integration
- VNC console access

---

## 🧪 Testing Guidelines

### Test Coverage Targets
- Backend: ≥80%
- Frontend: ≥60%

### Test Types
```bash
# Unit tests (*.spec.ts, *.test.tsx)
npx nx test <service>

# Integration tests (test/integration/)
RUN_INTEGRATION_TESTS=true npx nx test <service>

# E2E tests (test/e2e/)
RUN_E2E_TESTS=true npx jest test/e2e/

# Security tests
npx jest test/security/
```

---

## 🔧 Common Commands

```bash
# Development
npm install                     # Install dependencies
npx nx serve <project>          # Start dev server
npx nx build <project>          # Build project

# Quality
npm run lint                    # Check linting
npm run lint:fix                # Fix linting issues
npm run format                  # Format code
npm run typecheck               # Type checking

# Testing
npm run test                    # Run all tests
npx nx test <project> --watch   # Watch mode

# Database
npx prisma studio --schema=apps/<service>/prisma/schema.prisma  # GUI
npx prisma migrate dev --schema=apps/<service>/prisma/schema.prisma

# Docker
docker-compose -f docker-compose.order-service.yml up -d
```

---

## 🤝 Contribution Workflow

1. **Ambil task** dari `/tasks/tasks-*.md` atau dari PM
2. **Buat branch**: `feature/task-id-description` atau `fix/issue-description`
3. **Develop** dengan TDD approach
4. **Test** - pastikan semua test pass
5. **Lint** - `npm run lint`
6. **PR** - gunakan conventional commits

### Commit Convention
```
feat: add new feature
fix: bug fix
docs: documentation
refactor: code refactoring
test: add tests
chore: maintenance
```

---

## ❓ Need Help?

1. **Check docs** di `/docs/` dan `/tasks/`
2. **Ask PM** dengan `/pm help`
3. **Use specific droid** untuk domain-specific questions:
   - Backend issues → `/backend`
   - Frontend issues → `/frontend`
   - Testing issues → `/qa`

---

**Welcome aboard! 🎉**

*Last updated: 2025-11-30*
