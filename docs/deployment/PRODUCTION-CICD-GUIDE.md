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
| Customer Console | `console.webrana.id` |
| Admin Panel | `admin.webrana.id` |
| API Gateway | `api.webrana.id` |
| Monitoring (Grafana) | `monitor.webrana.id` |

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

## 7. Cloudflare Setup Guide

### Step 1: Add Domain to Cloudflare

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Klik **"Add a Site"** → masukkan `webrana.id`
3. Pilih plan **Free** (cukup untuk production)
4. Cloudflare akan scan DNS records existing
5. **Update Nameservers** di registrar domain kamu ke Cloudflare NS:
   ```
   ns1.cloudflare.com
   ns2.cloudflare.com
   ```
   > Propagasi DNS bisa 1-24 jam

### Step 2: Configure DNS Records

Setelah nameserver aktif, tambahkan DNS records:

| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| A | `@` | `<VPS-IP>` | ✅ Proxied | Auto |
| A | `console` | `<VPS-IP>` | ✅ Proxied | Auto |
| A | `admin` | `<VPS-IP>` | ✅ Proxied | Auto |
| A | `api` | `<VPS-IP>` | ✅ Proxied | Auto |
| A | `monitor` | `<VPS-IP>` | ✅ Proxied | Auto |

> **Penting**: Pastikan semua record dalam status **Proxied** (orange cloud) untuk mendapat proteksi DDoS dan SSL.

### Step 3: SSL/TLS Configuration

1. Pergi ke **SSL/TLS** → **Overview**
2. Set encryption mode ke **Full (strict)**
   
   ```
   ┌─────────┐      HTTPS      ┌────────────┐      HTTPS      ┌─────────┐
   │ Browser │ ◄──────────────► │ Cloudflare │ ◄──────────────► │   VPS   │
   └─────────┘                  └────────────┘                  └─────────┘
                                     Full (strict) = encrypted both sides
   ```

3. **Generate Origin Certificate**:
   - Pergi ke **SSL/TLS** → **Origin Server**
   - Klik **"Create Certificate"**
   - Pilih:
     - Private key type: **RSA (2048)**
     - Hostnames: `webrana.id, *.webrana.id`
     - Validity: **15 years** (recommended)
   - Klik **"Create"**
   - **PENTING**: Copy dan simpan:
     - **Origin Certificate** → simpan sebagai `cloudflare-origin.pem`
     - **Private Key** → simpan sebagai `cloudflare-origin.key`
   
   > ⚠️ Private key hanya ditampilkan SEKALI. Simpan dengan aman!

4. **Upload Certificate ke VPS**:
   ```bash
   # SSH ke VPS sebagai deploy user
   ssh deploy@<VPS-IP>
   cd ~/webrana-cloud
   mkdir -p docker/nginx/ssl
   
   # Paste certificate
   nano docker/nginx/ssl/cloudflare-origin.pem
   # [Paste Origin Certificate, lalu Ctrl+X, Y, Enter]
   
   # Paste private key
   nano docker/nginx/ssl/cloudflare-origin.key
   # [Paste Private Key, lalu Ctrl+X, Y, Enter]
   
   # Secure the key file
   chmod 600 docker/nginx/ssl/cloudflare-origin.key
   ```

### Step 4: Edge Certificates (Optional but Recommended)

1. **SSL/TLS** → **Edge Certificates**
2. Enable:
   - ✅ **Always Use HTTPS** - Redirect semua HTTP ke HTTPS
   - ✅ **Automatic HTTPS Rewrites** - Fix mixed content
   - ✅ **TLS 1.3** - Enable latest TLS
   - Minimum TLS Version: **TLS 1.2**

### Step 5: Security Settings

1. **Security** → **Settings**:
   - Security Level: **Medium** (atau High jika banyak attack)
   - Challenge Passage: **30 minutes**
   - Browser Integrity Check: ✅ **On**

2. **Security** → **WAF** (Web Application Firewall):
   - Managed Rules: **On** (Free plan sudah include basic rules)

3. **Security** → **Bots**:
   - Bot Fight Mode: ✅ **On**

### Step 6: Performance Settings (Recommended)

1. **Speed** → **Optimization**:
   - ✅ Auto Minify: JavaScript, CSS, HTML
   - ✅ Brotli compression

2. **Caching** → **Configuration**:
   - Caching Level: **Standard**
   - Browser Cache TTL: **4 hours**

3. **Caching** → **Cache Rules** (untuk API):
   Buat rule untuk bypass cache di API:
   ```
   If: Hostname equals "api.webrana.id"
   Then: Bypass cache
   ```

### Step 7: Page Rules (Optional)

Buat Page Rules untuk konfigurasi spesifik:

| Rule | URL Pattern | Settings |
|------|-------------|----------|
| API No Cache | `api.webrana.id/*` | Cache Level: Bypass |
| Force HTTPS | `*webrana.id/*` | Always Use HTTPS: On |

### Verification Checklist

Setelah setup selesai, verifikasi:

```bash
# Test SSL dari luar (tunggu propagasi selesai)
curl -I https://webrana.id
curl -I https://console.webrana.id
curl -I https://admin.webrana.id
curl -I https://api.webrana.id/health
curl -I https://monitor.webrana.id

# Expected: HTTP/2 200 dengan header Cloudflare
# cf-ray: xxxxx-SIN (atau lokasi terdekat)
```

### Troubleshooting Cloudflare

| Issue | Solution |
|-------|----------|
| Error 521 (Web server down) | VPS nginx tidak running, cek `docker ps` |
| Error 522 (Connection timed out) | Firewall VPS block port 443, cek `ufw status` |
| Error 525 (SSL handshake failed) | Origin certificate salah atau expired |
| Error 526 (Invalid SSL cert) | SSL mode bukan "Full (strict)" atau cert tidak match domain |
| Mixed content warnings | Enable "Automatic HTTPS Rewrites" |

---

## 8. Security Notes

- **Firewall**: Only ports 22, 80, 443 are open.
- **Database**: Port 5432 is exposed to Docker network only, not public internet.
- **SSL**: Cloudflare Full (Strict) ensures encryption between User <-> Cloudflare <-> VPS.
- **Secrets**: Managed via `.env.production` (on server) and GitHub Secrets (for pipeline).
