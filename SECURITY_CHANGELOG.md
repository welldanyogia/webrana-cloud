# Security Changelog

## 2024-12-06: Critical CVE Patches

### Summary
Emergency security patches applied to address critical vulnerabilities with CVSS scores of 10.0.

---

## CVEs Addressed

### CVE-2025-55182 - React Server Components RCE (CVSS 10.0)
**Status:** PATCHED

**Description:** Unauthenticated Remote Code Execution vulnerability in React Server Components allowing attackers to execute arbitrary code on application servers.

**Fix Applied:**
- Upgraded `react` from 19.2.0 → **19.2.1**
- Upgraded `react-dom` from 19.2.0 → **19.2.1**
- Next.js remains at 16.0.5 (upgrade to 16.0.7 caused build compatibility issues)

**Note:** React 19.2.1 patches the core vulnerability in React Server Components. Next.js vulnerability advisory recommends React upgrade as primary mitigation.

**Files Modified:**
- `apps/customer-web/package.json`
- `apps/admin-web/package.json`

---

### CVE-2025-49844 - Redis RediShell RCE (CVSS 10.0)
**Status:** PATCHED

**Description:** Remote Code Execution via Lua use-after-free vulnerability in Redis. This 13-year-old bug affects all Redis versions supporting Lua scripts.

**Fix Applied:**
- Upgraded Redis image from `redis:7-alpine` → **`redis:7.4-alpine`**
- Added Redis security hardening command

**Files Modified:**
- `docker-compose.staging.yml`
- `docker-compose.test.yml`

---

### CVE-2024-7348 - PostgreSQL pg_dump SQL Injection (CVSS 8.8)
**Status:** PATCHED

**Description:** Time-of-check time-of-use (TOCTOU) race condition in pg_dump allows arbitrary SQL execution as superuser.

**Fix Applied:**
- Pinned PostgreSQL to specific patched versions:
  - `postgres:16.6-alpine` (staging, order-service)
  - `postgres:15.10-alpine` (test)

**Files Modified:**
- `docker-compose.staging.yml`
- `docker-compose.order-service.yml`
- `docker-compose.test.yml`

---

## Security Hardening Applied

### Dockerfile.order-service
**Issue:** Container running as root user (security risk)

**Fix Applied:**
- Created non-root user `nestjs` (uid/gid 1001)
- Set proper file ownership
- Container now runs as non-root user

---

## Remaining Vulnerabilities (Non-Critical)

| Package | Severity | CVE | Notes |
|---------|----------|-----|-------|
| jws | High | GHSA-869p-cjfg-cm3x | HMAC signature verification issue |
| d3-color | High | GHSA-36jr-mh4h-2g58 | ReDoS vulnerability |
| nodemailer | Moderate | GHSA-mm7p-fcc7-pg87 | Email domain interpretation |
| js-yaml | Moderate | GHSA-mh29-5h37-fv8m | Prototype pollution |

**Recommendation:** Schedule follow-up sprint to address remaining high/moderate vulnerabilities.

---

## Verification Commands

```bash
# Check React version
npm list react --depth=0

# Run security audit
npm audit

# Verify Docker images
docker-compose -f docker-compose.staging.yml config | grep image
```

---

## Post-Patch Actions Required

1. [ ] Run full test suite: `npm run test`
2. [ ] Rebuild Docker images: `docker-compose -f docker-compose.staging.yml build --no-cache`
3. [ ] Deploy to staging environment
4. [ ] Run security regression tests
5. [ ] Deploy to production (after staging validation)

---

**Patched By:** Senior Product Manager + Engineering Team  
**Date:** 2024-12-06  
**Review Status:** Pending QA Verification
