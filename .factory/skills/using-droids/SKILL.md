---
name: using-droids
description: Gateway skill for task analysis and routing. Analyzes incoming tasks, identifies applicable droids/skills, and recommends the optimal workflow. Always start here for complex tasks.
---

# Using Droids - Task Analysis & Routing Gateway

## Purpose

This is the **mandatory first step** for any non-trivial task. It analyzes the incoming request, determines scope, identifies risks, and routes to the appropriate specialized droids.

## When This Skill Activates

- User submits a new feature request or bug fix
- Task involves multiple disciplines (BE, FE, QA, DevOps)
- Task requires planning before implementation
- User explicitly requests task analysis

## Instructions

### Step 1: Task Classification

Classify the incoming task into one or more categories:

| Category | Indicators | Primary Droid |
|----------|------------|---------------|
| **New Feature** | "implement", "create", "add", "build" | senior-product-manager |
| **Bug Fix** | "fix", "broken", "not working", "error" | Depends on layer |
| **Backend Work** | API, database, service, endpoint, migration | senior-backend-engineer |
| **Frontend Work** | UI, component, page, form, styling | senior-frontend-engineer |
| **Testing** | test, coverage, QA, validation | senior-qa-engineer |
| **Infrastructure** | deploy, CI/CD, Docker, Kubernetes, monitoring | senior-devops-engineer |
| **Documentation** | docs, README, API docs | Contextual |
| **Refactoring** | refactor, cleanup, optimize, improve | Depends on layer |

### Step 2: Complexity Assessment

Evaluate task complexity:

```
[ ] Simple (1 file, < 1 hour) → Execute directly
[ ] Medium (2-5 files, 1-4 hours) → Single droid delegation
[ ] Complex (5+ files, multi-day) → PM orchestration required
[ ] Epic (cross-service, multi-sprint) → Full PRD needed
```

### Step 3: Dependency Analysis

Identify dependencies and prerequisites:

- [ ] Does this require database changes?
- [ ] Does this need API changes first?
- [ ] Are there cross-service dependencies?
- [ ] Does this need design/UX input?
- [ ] Are there external service integrations?

### Step 4: Risk Assessment

Flag potential risks:

| Risk Level | Criteria | Action |
|------------|----------|--------|
| 🟢 Low | No prod impact, reversible | Proceed |
| 🟡 Medium | Prod impact, feature-flaggable | Review plan |
| 🔴 High | Data migration, breaking changes | Require approval |

### Step 5: Routing Decision

Based on analysis, route to appropriate workflow:

#### Route A: Direct Execution
```
Criteria: Simple task, single responsibility
Action: Execute task directly without delegation
```

#### Route B: Single Droid Delegation
```
Criteria: Medium complexity, clear ownership
Action: Delegate to specific droid with context

Examples:
- "API endpoint needed" → /droid senior-backend-engineer
- "UI component needed" → /droid senior-frontend-engineer
- "Need test coverage" → /droid senior-qa-engineer
- "Deploy/infra needed" → /droid senior-devops-engineer
```

#### Route C: PM Orchestration
```
Criteria: Complex task, multi-discipline
Action: Delegate to senior-product-manager for breakdown

/droid senior-product-manager
Task: [Original task]
Request: Break down into tasks and delegate appropriately
```

#### Route D: Full PRD Required
```
Criteria: Epic-level work, strategic initiative
Action: Request PRD creation before any implementation

/droid senior-product-manager
Task: Create PRD for [Feature Name]
```

## Output Format

After analysis, provide structured output:

```markdown
## Task Analysis Report

### Classification
- **Type**: [New Feature | Bug Fix | Refactor | Infrastructure | etc.]
- **Complexity**: [Simple | Medium | Complex | Epic]
- **Risk Level**: [🟢 Low | 🟡 Medium | 🔴 High]

### Scope
- **Primary Layer**: [Backend | Frontend | Full-stack | Infrastructure]
- **Estimated Files**: [X files]
- **Services Affected**: [List services]

### Dependencies
- [List any dependencies or prerequisites]

### Recommended Workflow
- **Route**: [A | B | C | D]
- **Primary Droid**: [droid name]
- **Supporting Droids**: [if applicable]

### Suggested Task Breakdown
1. [Task 1] → [Droid]
2. [Task 2] → [Droid]
3. [Task 3] → [Droid]

### Risks & Mitigations
- [Risk 1]: [Mitigation]

### Next Action
[Specific next step to take]
```

## Available Droids Reference

| Droid | Command | Specialization |
|-------|---------|----------------|
| Senior Product Manager | `/droid senior-product-manager` | PRD, task breakdown, orchestration |
| Senior Backend Engineer | `/droid senior-backend-engineer` | API, database, services, integrations |
| Senior Frontend Engineer | `/droid senior-frontend-engineer` | UI, components, state, accessibility |
| Senior QA Engineer | `/droid senior-qa-engineer` | Testing strategy, automation, quality |
| Senior DevOps Engineer | `/droid senior-devops-engineer` | CI/CD, infrastructure, monitoring |

## Best Practices

1. **Always analyze before acting** - Don't jump into implementation without understanding scope
2. **Identify the critical path** - What must be done first?
3. **Flag blockers early** - Surface dependencies and risks upfront
4. **Right-size the solution** - Don't over-engineer simple tasks
5. **Document decisions** - Capture why a particular route was chosen

## Anti-Patterns

- ❌ Starting implementation without analysis
- ❌ Delegating to wrong droid (e.g., FE task to BE droid)
- ❌ Skipping complexity assessment for "quick" tasks
- ❌ Ignoring cross-service dependencies
- ❌ Not considering testing requirements upfront

---

*This skill is the gateway to effective task execution. Use it consistently for predictable, high-quality outcomes.*
