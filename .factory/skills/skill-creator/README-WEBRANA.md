# Onboarding: skill-creator Skill

## Selamat Datang di Tim WeBrana Cloud!

### Project Overview
**WeBrana Cloud** adalah platform VPS hosting Indonesia dengan arsitektur microservices. Tim ini terus berkembang dan mungkin membutuhkan skill baru untuk kebutuhan spesifik.

### Scope & Tanggung Jawab

**PRIMARY SCOPE:**
1. **Create New Skills** - Membuat skill baru sesuai kebutuhan tim
2. **Update Existing Skills** - Iterate dan improve skill yang sudah ada
3. **Skill Architecture** - Design skill structure yang efektif
4. **Team Expansion** - Expand capabilities tim dengan skill spesifik

**WHEN TO USE:**
- Tim butuh capability baru yang tidak ada di skill existing
- Workflow repetitif yang bisa di-automate
- Domain-specific knowledge yang perlu di-package
- Tool integrations untuk project-specific needs

### Potential New Skills untuk WeBrana

Berdasarkan PRD dan architecture, berikut kandidat skill baru yang mungkin dibutuhkan:

| Potential Skill | Use Case | Priority |
|-----------------|----------|----------|
| `tripay-integration` | Payment gateway integration patterns | High (v1.1) |
| `digitalocean-provisioning` | DO API patterns & troubleshooting | Medium |
| `nestjs-microservice` | NestJS microservice patterns | Medium |
| `prisma-management` | Database schema & migrations | Medium |
| `telegram-bot` | Notification bot development | Low (v1.1) |
| `vps-monitoring` | Instance health & metrics | Low (v1.2) |

### Skill Creation Workflow

```
1. Understand → Concrete examples dari user/team
2. Plan → Identify scripts, references, assets needed
3. Initialize → Run init_skill.py
4. Edit → Implement resources + SKILL.md
5. Package → Run package_skill.py
6. Iterate → Improve based on real usage
```

### Skill Structure Template

```
skill-name/
├── SKILL.md                    # Required - Instructions
├── README-WEBRANA.md           # Onboarding untuk WeBrana context
├── scripts/                    # Executable code
├── references/                 # Documentation to load as needed
└── assets/                     # Templates, images, etc.
```

### Integration dengan Tim

| Scenario | Action |
|----------|--------|
| Backend butuh new pattern | Create skill dengan references/ untuk patterns |
| Frontend butuh new workflow | Create skill dengan scripts/ untuk automation |
| QA butuh test helpers | Create skill dengan scripts/ untuk test tools |
| Design butuh templates | Create skill dengan assets/ untuk templates |

### Best Practices untuk WeBrana Skills

1. **Naming**: `webrana-{domain}` untuk project-specific skills
2. **Onboarding**: Selalu include `README-WEBRANA.md` dengan project context
3. **Alignment**: Reference PRD di setiap skill
4. **Collaboration**: Define kolaborasi dengan existing droids/skills

### Script Locations

```bash
# Initialize new skill
~/.factory/skills/skill-creator/scripts/init_skill.py <skill-name> --path .factory/skills/

# Package skill for distribution
~/.factory/skills/skill-creator/scripts/package_skill.py .factory/skills/<skill-name>
```

### Example: Creating a New Skill

```bash
# 1. Initialize
~/.factory/skills/skill-creator/scripts/init_skill.py tripay-integration --path .factory/skills/

# 2. Edit SKILL.md dengan payment gateway patterns
# 3. Add references/tripay-api.md dengan API docs
# 4. Add scripts/validate-payment.py untuk validation
# 5. Create README-WEBRANA.md dengan project context

# 6. Package
~/.factory/skills/skill-creator/scripts/package_skill.py .factory/skills/tripay-integration
```

---
**Onboarding Date:** 2024-11-30
**Status:** Active Team Member (Meta Skill)
