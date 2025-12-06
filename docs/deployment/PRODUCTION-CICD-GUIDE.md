# Production CI/CD & Deployment Guide

This guide details the production deployment pipeline for WeBrana Cloud, leveraging GitHub Actions, Docker, and Nginx.

## 1. Architecture Overview

- **CI/CD**: GitHub Actions (`.github/workflows/cd-production.yml`)
- **Registry**: GitHub Container Registry (ghcr.io)
- **Runtime**: Docker Compose on Ubuntu VPS
- **Proxy**: Nginx with Cloudflare SSL (Full Strict)
- **Database**: PostgreSQL (Dockerized for VPS setup)

### Domain Structure (Production)
| Service | Domain |
|---------|--------|
| Landing Page | `webrana.id` |
| Customer App | `app.webrana.id` |
| Admin Panel | `admin.webrana.id` |
| API Gateway | `api.webrana.id` |

---

## 2. Initial VPS Preparation

Run this **one-time setup** on your fresh Ubuntu 22.04/24.04 VPS.

1. **SSH into VPS as root**:
   ```bash
   ssh root@<your-vps-ip>
   ```

2. **Upload and Run Setup Script**:
   Copy the content of `scripts/setup-vps.sh` or upload it:
   ```bash
   # On VPS
   nano setup-vps.sh
   # Paste content...
   chmod +x setup-vps.sh
   ./setup-vps.sh
   ```

3. **Verify Deploy User**:
   ```bash
   su - deploy
   docker ps
   # Should show empty list (no permission errors)
   ```

4. **Clone Repository**:
   ```bash
   su - deploy
   git clone https://github.com/welldanyogia/webrana-cloud.git
   cd webrana-cloud
   ```

5. **Setup SSL Certificates**:
   Get your **Origin Certificate** and **Private Key** from Cloudflare Dashboard (SSL/TLS > Origin Server).
   ```bash
   mkdir -p docker/nginx/ssl
   nano docker/nginx/ssl/cloudflare-origin.pem  # Paste Certificate
   nano docker/nginx/ssl/cloudflare-origin.key  # Paste Private Key
   chmod 600 docker/nginx/ssl/cloudflare-origin.key
   ```

6. **Create Production Environment Config**:
   ```bash
   cp .env.staging.example .env.production
   nano .env.production
   # Update DATABASE_PASSWORD, JWT_SECRET, DOMAINS, etc.
   ```

---

## 3. GitHub Configuration

### Secrets Setup
Go to **Settings > Secrets and variables > Actions** and add:

| Secret | Description | Example |
|--------|-------------|---------|
| `DEPLOY_HOST` | VPS IP Address | `103.x.x.x` |
| `DEPLOY_USER` | Deployment User | `deploy` |
| `DEPLOY_SSH_KEY` | SSH Private Key | `-----BEGIN OPENSSH PRIVATE KEY...` |
| `DEPLOY_PATH` | Path on VPS | `/home/deploy/webrana-cloud` |

> **Note:** The `DEPLOY_SSH_KEY` must correspond to the public key in `/home/deploy/.ssh/authorized_keys` on the VPS.

### Permissions
Ensure "Read and write permissions" are enabled for **Workflow permissions** in Settings > Actions > General.

---

## 4. Deployment Pipeline

The pipeline is defined in `.github/workflows/cd-production.yml`.

### Triggers
- Push to `master` branch
- Publishing a GitHub Release
- Manual dispatch (Actions tab)

### Stages
1. **Build & Push**:
   - Builds Docker images for all services (Parallel).
   - Tags with `sha-<commit-hash>` and `latest`.
   - Pushes to `ghcr.io/welldanyogia/webrana-cloud/<service>`.

2. **Deploy**:
   - SSH into VPS.
   - Pulls latest `docker-compose.prod.yml` and scripts via git.
   - Executes `scripts/deploy-prod.sh`.
   - Pulls new images from GHCR.
   - Updates running containers (Zero-downtime-ish rolling update where possible).
   - Prunes old images.
   - Runs Health Checks.

---

## 5. Deployment Scripts

### `scripts/deploy-prod.sh`
The core script that runs on the server.
- Handles `docker login` using ephemeral GITHUB_TOKEN.
- Sets environment variables (`IMAGE_TAG`).
- Runs `docker compose up -d`.

### `scripts/health-check.sh`
Verifies that all services are responding 200 OK on their health endpoints before marking deployment as success.

---

## 6. Troubleshooting & Rollback

### View Logs
```bash
# On VPS
cd ~/webrana-cloud
docker compose -f docker/docker-compose.prod.yml logs -f --tail=100
```

### Manual Rollback
If a deployment fails, you can manually deploy a previous stable tag or image.

1. **Revert commit** in git and push to master (Recommended).
   - This triggers a new pipeline run with the old code.

2. **Emergency Server Rollback**:
   ```bash
   # Edit docker-compose.prod.yml to point to previous tag if needed, or:
   docker compose -f docker/docker-compose.prod.yml down
   # Pull specific tag
   export IMAGE_TAG=sha-<old-hash>
   docker compose -f docker/docker-compose.prod.yml up -d
   ```

---

## 7. Security Notes

- **Firewall**: Only ports 22, 80, 443 are open.
- **Database**: Port 5432 is exposed to Docker network only, not public internet.
- **SSL**: Cloudflare Full (Strict) ensures encryption between User <-> Cloudflare <-> VPS.
- **Secrets**: Managed via `.env.production` (on server) and GitHub Secrets (for pipeline).
