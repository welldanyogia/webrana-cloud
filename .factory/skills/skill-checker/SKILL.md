---
name: skill-checker
description: Automatic routing skill that matches tasks to applicable droids and skills based on keywords, patterns, and context. Runs automatically to suggest optimal workflow.
---

# Skill Checker - Automatic Droid/Skill Router

## Purpose

Automatically analyzes task descriptions and routes to the most appropriate droid(s) and skill(s). This skill provides quick routing recommendations without full task analysis.

## When This Skill Activates

- Any new task or request is received
- User asks "which droid should handle this?"
- Automatic pre-processing before task execution

## Routing Rules

### Keyword-Based Routing

#### Backend Keywords → `senior-backend-engineer`
```
API, endpoint, REST, GraphQL, database, migration, schema, 
service, repository, controller, middleware, authentication,
authorization, JWT, OAuth, PostgreSQL, Redis, queue, worker,
transaction, CRUD, validation, Prisma, TypeORM, NestJS module
```

#### Frontend Keywords → `senior-frontend-engineer`
```
UI, component, React, Vue, Angular, CSS, Tailwind, styled,
responsive, mobile, form, input, button, modal, page, layout,
state, Redux, Zustand, hook, useEffect, useState, accessibility,
a11y, ARIA, Lighthouse, Core Web Vitals, Storybook, animation
```

#### QA Keywords → `senior-qa-engineer`
```
test, testing, spec, coverage, Jest, Vitest, Cypress, Playwright,
E2E, integration test, unit test, mock, stub, fixture, assertion,
bug, defect, regression, smoke test, load test, performance test,
security test, OWASP, test plan, test case, QA
```

#### DevOps Keywords → `senior-devops-engineer`
```
deploy, deployment, CI/CD, pipeline, Docker, Kubernetes, K8s,
Helm, Terraform, AWS, GCP, Azure, DigitalOcean, monitoring,
Prometheus, Grafana, logging, ELK, infrastructure, IaC, 
container, image, registry, secrets, vault, nginx, load balancer
```

#### PM/Orchestration Keywords → `senior-product-manager`
```
PRD, BRD, requirements, user story, epic, sprint, milestone,
roadmap, stakeholder, feature, specification, acceptance criteria,
breakdown, delegate, orchestrate, plan, timeline, priority
```

### Pattern-Based Routing

| Pattern | Route To |
|---------|----------|
| "implement * API" | senior-backend-engineer |
| "create * endpoint" | senior-backend-engineer |
| "add * migration" | senior-backend-engineer |
| "build * component" | senior-frontend-engineer |
| "create * page" | senior-frontend-engineer |
| "fix * UI" | senior-frontend-engineer |
| "write * test" | senior-qa-engineer |
| "add * coverage" | senior-qa-engineer |
| "setup * pipeline" | senior-devops-engineer |
| "deploy * service" | senior-devops-engineer |
| "create PRD for *" | senior-product-manager |
| "break down *" | senior-product-manager |

### Context-Based Routing

```
If task mentions multiple layers:
  → Route to senior-product-manager for orchestration

If task is in specific directory:
  apps/order-service/ → senior-backend-engineer
  apps/*-web/ → senior-frontend-engineer
  **/test/** → senior-qa-engineer
  docker-compose* → senior-devops-engineer
  tasks/*.md → senior-product-manager
```

## Quick Routing Decision Tree

```
START
  │
  ├─ Is this a new feature/epic?
  │   └─ YES → senior-product-manager (create PRD first)
  │
  ├─ Is this a bug fix?
  │   ├─ Backend bug → senior-backend-engineer
  │   ├─ Frontend bug → senior-frontend-engineer
  │   └─ Test failure → senior-qa-engineer
  │
  ├─ Is this infrastructure/deployment?
  │   └─ YES → senior-devops-engineer
  │
  ├─ Does it need testing?
  │   └─ YES → senior-qa-engineer
  │
  ├─ Is it API/database work?
  │   └─ YES → senior-backend-engineer
  │
  ├─ Is it UI/component work?
  │   └─ YES → senior-frontend-engineer
  │
  └─ Unclear/Complex?
      └─ → using-droids skill (full analysis)
```

## Output Format

```markdown
## Skill Check Result

**Task**: [Brief task description]

### Routing Recommendation

| Priority | Droid | Reason |
|----------|-------|--------|
| Primary | [droid-name] | [why this droid] |
| Secondary | [droid-name] | [if applicable] |

### Matched Keywords
- [keyword1], [keyword2], [keyword3]

### Matched Patterns
- [pattern if any]

### Confidence
- [ ] High (clear single-droid task)
- [ ] Medium (may need coordination)
- [ ] Low (recommend full analysis with using-droids)

### Suggested Command
\`/droid [recommended-droid]\`

### Alternative
If task is complex, run: `/droid using-droids` for full analysis
```

## Routing Matrix

| Task Type | Primary | May Also Need |
|-----------|---------|---------------|
| New API endpoint | BE | QA (tests) |
| New UI feature | FE | BE (API), QA |
| Database migration | BE | DevOps (deploy) |
| Fix failing tests | QA | BE/FE (code fix) |
| Setup monitoring | DevOps | BE (metrics) |
| New microservice | PM | BE, DevOps, QA |
| Performance issue | QA | BE/FE (optimize) |
| Security fix | BE | QA (security test) |

## Integration with using-droids

```
skill-checker = Quick routing (< 30 seconds)
using-droids = Full analysis (comprehensive planning)

Use skill-checker for:
- Clear, single-responsibility tasks
- Quick delegation decisions
- Familiar task patterns

Use using-droids for:
- Complex multi-step tasks
- New/unfamiliar features
- Tasks requiring breakdown
- Risk assessment needed
```

---

*Fast routing for efficient task delegation. When in doubt, escalate to using-droids for full analysis.*
