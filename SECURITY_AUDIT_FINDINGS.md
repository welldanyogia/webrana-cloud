# Security Audit Report: Infrastructure CVEs

**Date:** 2025-12-06
**Auditor:** Senior DevOps Engineer
**Scope:** `docker-compose.order-service.yml`, `docker-compose.staging.yml`, `Dockerfile.order-service`

## 1. Executive Summary

Infrastructure audit performed to assess exposure to **CVE-2025-49844 (Redis RediShell)** and **CVE-2024-7348 (PostgreSQL pg_dump)**. Critical vulnerabilities were identified in image tagging practices and container privileges.

**Risk Level:** 🔴 **CRITICAL**

---

## 2. Vulnerability Analysis

### 2.1 Redis (CVE-2025-49844 - RediShell)
- **Severity:** CVSS 10.0 (Critical) - Remote Code Execution
- **Finding:** `docker-compose.staging.yml` uses `redis:7-alpine`.
- **Status:** **VULNERABLE**. The generic `7-alpine` tag does not guarantee the latest patch level and lacks specific hardening against Lua-based RCE.
- **Impact:** Attackers can execute arbitrary code on the Redis container via Lua scripts if authentication is bypassed or compromised.

### 2.2 PostgreSQL (CVE-2024-7348 - pg_dump SQL Injection)
- **Severity:** CVSS 8.8 (High)
- **Finding:** `docker-compose.order-service.yml` and `docker-compose.staging.yml` use `postgres:16-alpine`.
- **Status:** **POTENTIALLY VULNERABLE**. `16-alpine` is a rolling tag. If the image on the host is not pulled frequently, it may be an older version vulnerable to the `pg_dump` Time-of-Check Time-of-Use (TOCTOU) race condition.
- **Impact:** An attacker with limited database access could execute arbitrary SQL during a backup operation (`pg_dump`).

### 2.3 Docker Base Images & Privileges
- **Finding:** `Dockerfile.order-service` runs the application as **root**.
- **Status:** **HIGH RISK**. Unlike `docker/Dockerfile.backend`, the order-service specific Dockerfile lacks a non-root user switch.
- **Finding:** Images use generic tags (`node:20-alpine`), making builds non-deterministic and potentially including older vulnerabilities.

---

## 3. Upgrade Path Recommendations

### 3.1 Redis Upgrade
**Current:** `image: redis:7-alpine`
**Recommended:**
```yaml
services:
  redis-staging:
    image: redis:7.4.2-alpine3.20  # Pin to specific patch version
    command: redis-server --script-load-lua-disabled yes --protected-mode yes
```
*Action:* Upgrade to >= 7.4.2 to patch CVE-2025-49844 and disable Lua scripting if not strictly required by application logic.

### 3.2 PostgreSQL Upgrade
**Current:** `image: postgres:16-alpine`
**Recommended:**
```yaml
services:
  order-service-db:
    image: postgres:16.6-alpine3.20  # Pin to specific patch version
```
*Action:* Upgrade to >= 16.6 (or latest 16.x patch) which resolves CVE-2024-7348.

### 3.3 Dockerfile Remediation
**Target:** `Dockerfile.order-service`
**Action:** Implement non-root user pattern similar to `docker/Dockerfile.backend`.

```dockerfile
# Add to Dockerfile.order-service before CMD
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001
USER nestjs
```

---

## 4. Security Hardening Checklist

### Container Security
- [ ] **Pin Image Versions:** Replace mutable tags (`latest`, `16-alpine`) with immutable SHAs or specific version tags (`16.6-alpine3.20`).
- [ ] **Non-Root Execution:** Refactor `Dockerfile.order-service` to run as a non-privileged user (`USER nestjs`).
- [ ] **Read-Only Root Filesystem:** Enable `read_only: true` in docker-compose where possible.

### Network Security
- [ ] **Close Exposed Ports:** 
    - `docker-compose.staging.yml`: Remove `ports: "5432:5432"` and `"6379:6379"` unless external access is strictly required. Use internal Docker networks for service communication.
    - Current configuration exposes DB and Redis to the host network interface.
- [ ] **Internal Network Only:** Ensure sensitive services (`postgres`, `redis`) are only on the backend network.

### Configuration
- [ ] **Redis Hardening:** 
    - Rename dangerous commands (`FLUSHDB`, `FLUSHALL`, `CONFIG`) in `redis.conf`.
    - Disable Lua scripting if not used (`script-load-lua-disabled yes`).
- [ ] **PostgreSQL Hardening:**
    - Ensure `POSTGRES_PASSWORD` is not using default values in production.
    - Use `scram-sha-256` authentication.

### CI/CD
- [ ] **Trivy Scanning:** Add a Trivy scan step to the CI pipeline to block builds with Critical/High CVEs.
- [ ] **Dependabot:** Enable Dependabot for Docker to automate base image updates.
