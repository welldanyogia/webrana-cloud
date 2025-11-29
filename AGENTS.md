# Webrana Cloud

## Core Commands

• Install dependencies: `npm install`
• Type-check and lint: `npm run lint` or use `npm run lint:fix` to auto-fix
• Run test suite: `npm run test` or `npx nx run-many -t test`
• Run single test: `npx nx test <project-name>` (e.g., `npx nx test order-service`)
• Start development: `npx nx serve <project-name>`
• Build for production: `npm run build` or `npx nx build <project-name>`

## Architecture Overview

This is a **VPS cloud hosting platform** built as a microservices architecture using Nx monorepo.

**Project Type:** Microservices (NestJS backend) + React frontend  
**Primary Language:** TypeScript  
**Build System:** Nx + npm workspaces

### Project Layout

```
webrana-cloud/
├─ apps/                    → All applications (services & frontends)
│  ├─ order-service/        → VPS order & provisioning (NestJS + Prisma)
│  ├─ auth-service/         → Authentication & JWT (NestJS)
│  ├─ catalog-service/      → Plans, images, pricing catalog (NestJS)
│  ├─ billing-service/      → Payment & invoicing (NestJS)
│  ├─ instance-service/     → VPS instance management (NestJS)
│  ├─ notification-service/ → Email/SMS notifications (NestJS)
│  ├─ provider-service/     → Cloud provider abstraction (NestJS)
│  ├─ api-gateway/          → API gateway & routing (NestJS)
│  ├─ admin-web/            → Admin dashboard (React + Vite)
│  └─ customer-web/         → Customer portal (React + Vite)
├─ libs/                    → Shared libraries
├─ packages/                → Internal packages
├─ tasks/                   → PRDs and task tracking
└─ docker-compose*.yml      → Docker stack definitions
```

### Key Components
- **order-service**: Order lifecycle, payment verification, DigitalOcean provisioning
- **auth-service**: JWT token generation/validation (RS256/HS256)
- **catalog-service**: VPS plans, OS images, coupon validation
- **api-gateway**: Request routing, rate limiting, auth middleware

## Build & Test

All commands should be run from the project root.

```bash
# Development
npm install                           # Install all dependencies
npx nx serve order-service            # Start specific service
npx nx test order-service             # Run tests for specific service
npx nx test order-service --watch     # Run tests in watch mode

# Database (Prisma)
npx prisma migrate dev --schema=apps/order-service/prisma/schema.prisma
npx prisma generate --schema=apps/order-service/prisma/schema.prisma
npx prisma studio --schema=apps/order-service/prisma/schema.prisma

# Docker (order-service stack)
docker-compose -f docker-compose.order-service.yml up -d --build
docker-compose -f docker-compose.order-service.yml down

# Production
npm run build                         # Build all projects
npm run lint                          # Check code quality
npm run lint:fix                      # Auto-fix style issues
npm run format                        # Format all files with Prettier
```

## Project-Specific Skills

Custom skills untuk webrana-cloud project, terletak di `.factory/droids/`.

### Orchestrator Skill (Start Here for New Features)

| Skill | Command | Shorthand | Purpose |
|-------|---------|-----------|---------|
| **Senior Product Manager** | `/droid senior-product-manager` | `/pm` | Create PRD/BRD, orchestrate tasks, delegate to engineering skills |

### Engineering Skills

| Skill | Command | Shorthand | Purpose |
|-------|---------|-----------|---------|
| **Senior Backend Engineer** | `/droid senior-backend-engineer` | `/backend` | API development, database design, microservices |
| **Senior Frontend Engineer** | `/droid senior-frontend-engineer` | `/frontend` | UI components, state management, accessibility |
| **Senior QA Engineer** | `/droid senior-qa-engineer` | `/qa` | Test strategy, automation, quality gates |
| **Senior DevOps Engineer** | `/droid senior-devops-engineer` | `/devops` | CI/CD, infrastructure, monitoring |

### Typical Workflow

```
1. /pm new-project "Feature Name"     → PM creates PRD & breaks down tasks
2. /pm delegate BE-001 to backend     → PM delegates to Backend Engineer
3. /backend                           → Backend implements with best practices
4. /pm delegate FE-001 to frontend    → PM delegates to Frontend Engineer
5. /frontend                          → Frontend implements UI
6. /pm delegate QA-001 to qa          → PM delegates to QA Engineer
7. /qa                                → QA creates test plan & executes
8. /pm prepare-release v1.0           → PM runs alignment checklist
```

### Quick Reference

```bash
# Start new project (creates PRD, tasks)
/pm new-project "VPS Order System"

# Check project status
/pm status

# Delegate specific task
/pm delegate BE-001 to backend

# Review deliverable against PRD
/pm review BE-001

# Prepare for release
/pm prepare-release v1.0
```

---

## Droidpowers Integration

### Mandatory Workflows
**All tasks must start with:**
`/droid using-droids` - Required first step for task analysis

### Core Skills (Always Applicable)
- **test-driven-development**: `/droid test-driven-development` or `/tdd` for any code implementation
- **verification-before-completion**: `/droid verification-before-completion` or `/verify` before commits
- **systematic-debugging**: `/droid systematic-debugging` or `/debug` for bug investigation

### Planning & Execution Skills
- **brainstorming**: `/droid brainstorming` or `/brainstorm` for new features/architecture
- **writing-plans**: `/droid writing-plans` or `/plan` for complex implementations
- **executing-plans**: `/droid executing-plans` or `/execute` for batch execution with checkpoints

### Code Review & Collaboration
- **requesting-code-review**: `/droid requesting-code-review` or `/review` for PR coordination
- **receiving-code-review**: `/droid receiving-code-review` or `/handle-review` for technical feedback evaluation
- **finishing-a-development-branch**: `/droid finishing-a-development-branch` or `/finish-branch` for branch completion

### Advanced Debugging Skills
- **condition-based-waiting**: `/droid condition-based-waiting` or `/condition-wait` for test timing issues
- **defense-in-depth**: `/droid defense-in-depth` or `/defense-in-depth` for multi-layer validation
- **root-cause-tracing**: `/droid root-cause-tracing` for backward bug investigation
- **dispatching-parallel-agents**: `/droid dispatching-parallel-agents` or `/parallel` for concurrent debugging

### Development Workflow Skills
- **using-git-worktrees**: `/droid using-git-worktrees` or `/worktree` for isolated development
- **subagent-driven-development**: `/droid subagent-driven-development` or `/subdev` for parallel task execution

### Testing & Quality Skills
- **testing-anti-patterns**: `/droid testing-anti-patterns` or `/anti-patterns` for test quality
- **testing-skills-with-subagents**: `/droid testing-skills-with-subagents` or `/test-skills` for skill validation

### Meta-Skills
- **writing-skills**: `/droid writing-skills` or `/write-droid` for creating new skills
- **sharing-skills**: `/droid sharing-skills` or `/share` for contributing upstream

### Gateway Skills (Mandatory)
- **using-droids**: `/droid using-droids` or `/droids` - ALWAYS start here for task analysis
- **skill-checker**: `/droid skill-checker` - Automatic routing to applicable droids

### Workflow Rules
1. **ALWAYS** run `/droid using-droids` first for task analysis
2. Follow skill-checker routing recommendations
3. Use TodoWrite for all checklist items
4. Complete all checkpoints before declaring done

## Security & Configuration

### Environment Variables (order-service)
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ALGORITHM` | `RS256` (prod) or `HS256` (dev) |
| `JWT_SECRET` | Secret for HS256 (dev only) |
| `JWT_PUBLIC_KEY` | Public key for RS256 (prod) |
| `INTERNAL_API_KEY` | API key for `/internal/*` endpoints |
| `DO_ACCESS_TOKEN` | DigitalOcean API token |
| `CATALOG_SERVICE_BASE_URL` | URL to catalog-service |

### API Authentication
- **User endpoints** (`/api/v1/orders`): `Authorization: Bearer <JWT>`
- **Admin endpoints** (`/api/v1/internal/*`): `X-API-Key: <INTERNAL_API_KEY>`

### Sensitive Data Handling
- Never commit `.env` files (use `.env.example` as template)
- DO tokens should be read-only for dev, full access only in prod
- JWT secrets must be rotated periodically in production

## Gotchas & Common Issues

- **Prisma Client not generated**: Run `npx prisma generate --schema=apps/<service>/prisma/schema.prisma`
- **503 CATALOG_SERVICE_UNAVAILABLE**: Start catalog-service or use mock (`catalog-mock` in docker-compose)
- **JWT validation fails in tests**: Ensure `JWT_ALGORITHM=HS256` and `JWT_SECRET` are set
- **Integration tests need PostgreSQL**: Use `RUN_INTEGRATION_TESTS=true` with Testcontainers or Docker
- **Docker build slow**: Ensure `.dockerignore` excludes `node_modules`

## Git Workflow

1. **Branch naming**: `${type}/${description}` (e.g., `feature/order-provisioning`, `fix/jwt-validation`)
2. **Commit conventions**: Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)
3. **Pull request requirements**: 
   - All tests pass (`npx nx test <project>`)
   - Lint checks pass (`npm run lint`)
   - Use `requesting-code-review` droid for significant changes

## Conventions & Patterns

### Code Style
- **Formatting**: Prettier (2-space indent, single quotes, no semicolons optional)
- **TypeScript**: Strict mode enabled, explicit return types for public methods
- **NestJS**: Follow module/service/controller pattern, use DTOs with class-validator

### File Organization
- **Modules**: `src/modules/<feature>/` with `*.module.ts`, `*.service.ts`, `*.controller.ts`
- **DTOs**: `src/modules/<feature>/dto/` with `create-*.dto.ts`, `update-*.dto.ts`
- **Guards**: `src/common/guards/`
- **Filters**: `src/common/filters/`
- **Exceptions**: `src/common/exceptions/`

### Testing Strategy
- **Unit tests**: Jest, colocated with source (`*.spec.ts`)
- **Integration tests**: `test/integration/*.integration.spec.ts` with Testcontainers
- **E2E tests**: Separate `*-e2e` projects in apps folder
- **Coverage requirements**: Aim for 80%+ on business logic

### Response Format
- **Success**: `{ "data": { ... } }` or `{ "data": [...], "meta": { ... } }`
- **Error**: `{ "error": { "code": "ERROR_CODE", "message": "...", "details": { ... } } }`

## External Services

- **PostgreSQL**: Primary database (via Prisma)
- **DigitalOcean API**: VPS provisioning (`DO_ACCESS_TOKEN`)
- **Redis** (planned): Caching and session storage
- **catalog-service**: Plan/image/coupon validation (internal service)
- **auth-service**: JWT token validation (internal service)

## Documentation

- **API docs**: `apps/<service>/docs/api-consumer.md`
- **PRD & Tasks**: `tasks/prd-*.md` and `tasks/tasks-*.md`
- **README updates**: Update when adding new features or changing setup steps
- **Code comments**: JSDoc for public methods, inline comments for complex logic only
