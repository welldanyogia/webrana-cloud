# Setup VPS dengan Docker - WeBrana Cloud

Panduan deployment WeBrana Cloud menggunakan Docker + CI/CD pada VPS baru (Ubuntu 22.04/24.04 LTS).

## Daftar Isi

1. [Requirements](#1-requirements)
2. [Setup VPS](#2-setup-vps)
3. [Install Docker](#3-install-docker)
4. [Setup GitHub Actions Runner (Self-hosted)](#4-setup-github-actions-runner)
5. [Configure Environment](#5-configure-environment)
6. [Initial Deployment](#6-initial-deployment)
7. [Setup SSL dengan Certbot](#7-setup-ssl-dengan-certbot)
8. [CI/CD Auto Deployment](#8-cicd-auto-deployment)
9. [Monitoring & Logging](#9-monitoring--logging)
10. [Maintenance Commands](#10-maintenance-commands)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Requirements

### Minimum VPS Specs (Docker)
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 60 GB SSD | 100 GB NVMe |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

> **Note:** Docker membutuhkan lebih banyak storage untuk images dan volumes.

### Domain & DNS
Setup DNS records sebelum deployment:

```
A     @              YOUR_SERVER_IP
A     api            YOUR_SERVER_IP
A     app            YOUR_SERVER_IP
A     admin          YOUR_SERVER_IP
A     monitor        YOUR_SERVER_IP (optional)
```

### GitHub Repository Access
- Repository: `github.com/welldanyogia/webrana-cloud`
- Personal Access Token dengan `repo` dan `workflow` scope
- SSH key untuk server

---

## 2. Setup VPS

### 2.1 Initial Access

```bash
# SSH ke server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Set timezone
timedatectl set-timezone Asia/Jakarta

# Set hostname
hostnamectl set-hostname webrana-prod
```

### 2.2 Create Deploy User

```bash
# Create user
adduser deploy
usermod -aG sudo deploy

# Setup SSH key
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### 2.3 Basic Security

```bash
# Disable root login
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# Setup UFW Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw enable

# Install fail2ban
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 3. Install Docker

### 3.1 Install Docker Engine

```bash
# Login sebagai deploy user
su - deploy

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add deploy user ke docker group
sudo usermod -aG docker deploy

# Logout dan login kembali untuk apply group
exit
su - deploy

# Verify Docker
docker --version
docker compose version
```

### 3.2 Configure Docker

```bash
# Create Docker daemon config untuk production
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  },
  "storage-driver": "overlay2",
  "live-restore": true
}
EOF

# Restart Docker
sudo systemctl restart docker
sudo systemctl enable docker
```

---

## 4. Setup GitHub Actions Runner (Self-hosted)

### 4.1 Create Runner Directory

```bash
mkdir -p /home/deploy/actions-runner
cd /home/deploy/actions-runner
```

### 4.2 Download Runner

```bash
# Download latest runner (check GitHub for latest version)
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz
```

### 4.3 Configure Runner

```bash
# Get token from: GitHub Repo → Settings → Actions → Runners → New self-hosted runner

# Configure runner
./config.sh --url https://github.com/welldanyogia/webrana-cloud \
  --token YOUR_RUNNER_TOKEN \
  --name webrana-prod \
  --labels production,docker \
  --work _work
```

### 4.4 Install as Service

```bash
# Install service
sudo ./svc.sh install deploy

# Start service
sudo ./svc.sh start

# Check status
sudo ./svc.sh status
```

---

## 5. Configure Environment

### 5.1 Clone Repository

```bash
cd /home/deploy
git clone https://github.com/welldanyogia/webrana-cloud.git
cd webrana-cloud
```

### 5.2 Create Environment File

```bash
# Copy template
cp .env.example .env

# Edit environment
nano .env
```

### 5.3 Production Environment Variables

```env
# ═══════════════════════════════════════════════════════════════
# WEBRANA CLOUD - DOCKER PRODUCTION ENVIRONMENT
# ═══════════════════════════════════════════════════════════════

NODE_ENV=production

# ═══════════════════════════════════════════════════════════════
# DATABASE (PostgreSQL dalam Docker)
# ═══════════════════════════════════════════════════════════════
POSTGRES_USER=webrana
POSTGRES_PASSWORD=YOUR_STRONG_DB_PASSWORD
POSTGRES_DB=webrana

# Database URLs untuk setiap service (menggunakan container name)
DATABASE_URL=postgresql://webrana:YOUR_STRONG_DB_PASSWORD@postgres:5432/webrana
AUTH_DATABASE_URL=postgresql://webrana:YOUR_STRONG_DB_PASSWORD@postgres:5432/webrana_auth
ORDER_DATABASE_URL=postgresql://webrana:YOUR_STRONG_DB_PASSWORD@postgres:5432/webrana_order
BILLING_DATABASE_URL=postgresql://webrana:YOUR_STRONG_DB_PASSWORD@postgres:5432/webrana_billing
CATALOG_DATABASE_URL=postgresql://webrana:YOUR_STRONG_DB_PASSWORD@postgres:5432/webrana_catalog
NOTIFICATION_DATABASE_URL=postgresql://webrana:YOUR_STRONG_DB_PASSWORD@postgres:5432/webrana_notification
INSTANCE_DATABASE_URL=postgresql://webrana:YOUR_STRONG_DB_PASSWORD@postgres:5432/webrana_instance

# ═══════════════════════════════════════════════════════════════
# REDIS (dalam Docker)
# ═══════════════════════════════════════════════════════════════
REDIS_PASSWORD=YOUR_STRONG_REDIS_PASSWORD
REDIS_URL=redis://:YOUR_STRONG_REDIS_PASSWORD@redis:6379

# ═══════════════════════════════════════════════════════════════
# JWT AUTHENTICATION
# ═══════════════════════════════════════════════════════════════
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_ALGORITHM=HS256
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# ═══════════════════════════════════════════════════════════════
# INTERNAL API KEY (untuk service-to-service)
# ═══════════════════════════════════════════════════════════════
INTERNAL_API_KEY=your-internal-api-key-for-service-communication

# ═══════════════════════════════════════════════════════════════
# DIGITALOCEAN
# ═══════════════════════════════════════════════════════════════
DO_ACCESS_TOKEN=your-digitalocean-api-token

# ═══════════════════════════════════════════════════════════════
# TRIPAY PAYMENT GATEWAY
# ═══════════════════════════════════════════════════════════════
TRIPAY_API_KEY=your-tripay-api-key
TRIPAY_PRIVATE_KEY=your-tripay-private-key
TRIPAY_MERCHANT_CODE=your-merchant-code
TRIPAY_MODE=production
TRIPAY_CALLBACK_URL=https://api.webrana.cloud/api/v1/billing/webhook/tripay

# ═══════════════════════════════════════════════════════════════
# EMAIL (SMTP)
# ═══════════════════════════════════════════════════════════════
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=WeBrana Cloud <noreply@webrana.cloud>

# ═══════════════════════════════════════════════════════════════
# TELEGRAM (Optional)
# ═══════════════════════════════════════════════════════════════
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-admin-chat-id

# ═══════════════════════════════════════════════════════════════
# SENTRY (Optional)
# ═══════════════════════════════════════════════════════════════
SENTRY_DSN=https://xxx@sentry.io/xxx

# ═══════════════════════════════════════════════════════════════
# FRONTEND URLs
# ═══════════════════════════════════════════════════════════════
NEXT_PUBLIC_API_URL=https://api.webrana.cloud
NEXT_PUBLIC_WS_URL=wss://api.webrana.cloud

# ═══════════════════════════════════════════════════════════════
# CORS
# ═══════════════════════════════════════════════════════════════
CORS_ORIGINS=https://app.webrana.cloud,https://admin.webrana.cloud
```

### 5.4 Create Database Init Script

```bash
mkdir -p docker/init-db
nano docker/init-db/01-init-databases.sql
```

```sql
-- Create databases untuk setiap service
CREATE DATABASE webrana_auth;
CREATE DATABASE webrana_order;
CREATE DATABASE webrana_billing;
CREATE DATABASE webrana_catalog;
CREATE DATABASE webrana_notification;
CREATE DATABASE webrana_instance;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE webrana_auth TO webrana;
GRANT ALL PRIVILEGES ON DATABASE webrana_order TO webrana;
GRANT ALL PRIVILEGES ON DATABASE webrana_billing TO webrana;
GRANT ALL PRIVILEGES ON DATABASE webrana_catalog TO webrana;
GRANT ALL PRIVILEGES ON DATABASE webrana_notification TO webrana;
GRANT ALL PRIVILEGES ON DATABASE webrana_instance TO webrana;
```

---

## 6. Initial Deployment

### 6.1 Build & Start Services

```bash
cd /home/deploy/webrana-cloud

# Build semua images
docker compose -f docker/docker-compose.yml build

# Start infrastructure dulu (postgres, redis)
docker compose -f docker/docker-compose.yml up -d postgres redis

# Tunggu sampai healthy
docker compose -f docker/docker-compose.yml ps

# Start semua services
docker compose -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml up -d
```

### 6.2 Verify Deployment

```bash
# Check semua containers running
docker compose -f docker/docker-compose.yml ps

# Check logs
docker compose -f docker/docker-compose.yml logs -f

# Test health endpoints
curl http://localhost:4000/api/v1/health  # API Gateway
curl http://localhost:3001/api/v1/auth/health  # Auth Service
```

### 6.3 Run Database Migrations

```bash
# Migrations akan otomatis jalan saat container start
# Tapi bisa manual jika perlu:

docker compose -f docker/docker-compose.yml exec auth-service \
  npx prisma migrate deploy --schema=apps/auth-service/prisma/schema.prisma

docker compose -f docker/docker-compose.yml exec order-service \
  npx prisma migrate deploy --schema=apps/order-service/prisma/schema.prisma
```

---

## 7. Setup SSL dengan Certbot

### 7.1 Install Certbot

```bash
sudo apt install certbot -y
```

### 7.2 Stop Nginx Container (temporarily)

```bash
docker compose -f docker/docker-compose.yml stop nginx
```

### 7.3 Generate Certificates

```bash
sudo certbot certonly --standalone \
  -d api.webrana.cloud \
  -d app.webrana.cloud \
  -d admin.webrana.cloud \
  --email admin@webrana.cloud \
  --agree-tos
```

### 7.4 Copy Certificates ke Docker

```bash
mkdir -p docker/nginx/ssl
sudo cp /etc/letsencrypt/live/api.webrana.cloud/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/api.webrana.cloud/privkey.pem docker/nginx/ssl/
sudo chown -R deploy:deploy docker/nginx/ssl/
```

### 7.5 Update Nginx Config

```bash
nano docker/nginx/conf.d/default.conf
```

```nginx
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name api.webrana.cloud app.webrana.cloud admin.webrana.cloud;
    return 301 https://$server_name$request_uri;
}

# API Gateway
server {
    listen 443 ssl http2;
    server_name api.webrana.cloud;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://api-gateway:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket untuk notifications
    location /socket.io/ {
        proxy_pass http://notification-service:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

# Customer Web
server {
    listen 443 ssl http2;
    server_name app.webrana.cloud;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://customer-web:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Admin Web
server {
    listen 443 ssl http2;
    server_name admin.webrana.cloud;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://admin-web:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Health check endpoint
server {
    listen 80;
    server_name localhost;

    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
```

### 7.6 Restart Nginx

```bash
docker compose -f docker/docker-compose.yml up -d nginx
```

### 7.7 Setup Auto-Renewal

```bash
# Create renewal script
sudo nano /etc/cron.d/certbot-renew
```

```
0 0 1 * * root certbot renew --quiet && cp /etc/letsencrypt/live/api.webrana.cloud/*.pem /home/deploy/webrana-cloud/docker/nginx/ssl/ && docker compose -f /home/deploy/webrana-cloud/docker/docker-compose.yml restart nginx
```

---

## 8. CI/CD Auto Deployment

### 8.1 Deployment Workflow

CI/CD pipeline akan:
1. **Push ke `master`** → Lint → Test → Build → Deploy ke Production
2. **Push ke `develop`** → Lint → Test → Build → Deploy ke Staging

### 8.2 GitHub Secrets

Setup secrets di GitHub repository:
- `DEPLOY_HOST` - Server IP
- `DEPLOY_USER` - deploy
- `DEPLOY_SSH_KEY` - SSH private key
- `DEPLOY_PATH` - /home/deploy/webrana-cloud

### 8.3 Deployment Script

```bash
# Create deployment script
nano /home/deploy/webrana-cloud/scripts/deploy.sh
chmod +x /home/deploy/webrana-cloud/scripts/deploy.sh
```

```bash
#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════════
# WeBrana Cloud - Docker Deployment Script
# ═══════════════════════════════════════════════════════════════

DEPLOY_DIR="/home/deploy/webrana-cloud"
COMPOSE_FILE="docker/docker-compose.yml"
COMPOSE_PROD="docker/docker-compose.prod.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

cd $DEPLOY_DIR

case "$1" in
  update)
    log "Pulling latest code..."
    git fetch origin
    git reset --hard origin/master
    
    log "Building new images..."
    docker compose -f $COMPOSE_FILE build --parallel
    
    log "Deploying with zero-downtime..."
    docker compose -f $COMPOSE_FILE -f $COMPOSE_PROD up -d --remove-orphans
    
    log "Cleaning up old images..."
    docker image prune -f
    
    log "✅ Deployment complete!"
    ;;
    
  rollback)
    log "Rolling back to previous version..."
    git reset --hard HEAD~1
    docker compose -f $COMPOSE_FILE build --parallel
    docker compose -f $COMPOSE_FILE -f $COMPOSE_PROD up -d
    log "✅ Rollback complete!"
    ;;
    
  restart)
    log "Restarting all services..."
    docker compose -f $COMPOSE_FILE -f $COMPOSE_PROD restart
    log "✅ Restart complete!"
    ;;
    
  status)
    docker compose -f $COMPOSE_FILE ps
    ;;
    
  logs)
    docker compose -f $COMPOSE_FILE logs -f ${2:-}
    ;;
    
  health)
    log "Checking health endpoints..."
    services=("api-gateway:4000" "auth-service:3001" "catalog-service:3002" 
              "order-service:3003" "billing-service:3004" "instance-service:3005"
              "notification-service:3006")
    
    for svc in "${services[@]}"; do
      name="${svc%%:*}"
      port="${svc##*:}"
      if curl -sf "http://localhost:$port/api/v1/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name"
      else
        echo -e "${RED}✗${NC} $name"
      fi
    done
    ;;
    
  backup)
    log "Backing up databases..."
    BACKUP_DIR="/home/deploy/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p $BACKUP_DIR
    
    docker compose -f $COMPOSE_FILE exec -T postgres pg_dumpall -U webrana > "$BACKUP_DIR/all_databases.sql"
    
    log "✅ Backup saved to $BACKUP_DIR"
    ;;
    
  *)
    echo "Usage: $0 {update|rollback|restart|status|logs|health|backup}"
    exit 1
    ;;
esac
```

---

## 9. Monitoring & Logging

### 9.1 Start Monitoring Stack

```bash
cd /home/deploy/webrana-cloud/docker/monitoring
docker compose up -d
```

### 9.2 Access Monitoring

- **Prometheus**: http://YOUR_IP:9090
- **Grafana**: http://YOUR_IP:3001 (admin/admin)

### 9.3 View Logs

```bash
# All logs
docker compose -f docker/docker-compose.yml logs -f

# Specific service
docker compose -f docker/docker-compose.yml logs -f order-service

# Last 100 lines
docker compose -f docker/docker-compose.yml logs --tail=100 order-service
```

---

## 10. Maintenance Commands

### 10.1 Update Application (Manual)

```bash
cd /home/deploy/webrana-cloud
./scripts/deploy.sh update
```

### 10.2 Restart Services

```bash
# Restart all
./scripts/deploy.sh restart

# Restart specific service
docker compose -f docker/docker-compose.yml restart order-service
```

### 10.3 Scale Services

```bash
# Scale order-service to 3 instances
docker compose -f docker/docker-compose.yml up -d --scale order-service=3
```

### 10.4 Database Backup

```bash
./scripts/deploy.sh backup
```

### 10.5 View Resource Usage

```bash
docker stats
```

### 10.6 Clean Up

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (CAUTION!)
docker volume prune

# Full cleanup
docker system prune -a
```

---

## 11. Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose -f docker/docker-compose.yml logs service-name

# Check container status
docker inspect webrana-order-service

# Enter container for debugging
docker compose -f docker/docker-compose.yml exec order-service sh
```

### Database Connection Failed

```bash
# Check postgres container
docker compose -f docker/docker-compose.yml logs postgres

# Test connection
docker compose -f docker/docker-compose.yml exec postgres \
  psql -U webrana -d webrana -c "SELECT 1"
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Docker disk usage
docker system df

# Clean up
docker system prune -a --volumes
```

### SSL Certificate Issues

```bash
# Check certificate expiry
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Copy new certs
sudo cp /etc/letsencrypt/live/api.webrana.cloud/*.pem docker/nginx/ssl/
docker compose -f docker/docker-compose.yml restart nginx
```

### Service Health Check Failing

```bash
# Run health check manually
./scripts/deploy.sh health

# Check specific service logs
docker compose -f docker/docker-compose.yml logs --tail=50 order-service
```

---

## Quick Reference

```bash
# ═══════════════════════════════════════════════════════════════
# DAILY COMMANDS
# ═══════════════════════════════════════════════════════════════

# Check status
./scripts/deploy.sh status

# View logs
./scripts/deploy.sh logs
./scripts/deploy.sh logs order-service

# Health check
./scripts/deploy.sh health

# ═══════════════════════════════════════════════════════════════
# DEPLOYMENT
# ═══════════════════════════════════════════════════════════════

# Deploy latest
./scripts/deploy.sh update

# Rollback
./scripts/deploy.sh rollback

# Restart
./scripts/deploy.sh restart

# ═══════════════════════════════════════════════════════════════
# MAINTENANCE
# ═══════════════════════════════════════════════════════════════

# Backup database
./scripts/deploy.sh backup

# Resource usage
docker stats

# Cleanup
docker system prune -a
```

---

## 12. Default Accounts

### 12.1 Run Database Seed

Setelah deployment pertama, jalankan seed untuk membuat akun default:

```bash
# Masuk ke container auth-service
docker compose -f docker/docker-compose.yml exec auth-service sh

# Run seed
npx prisma db seed --schema=apps/auth-service/prisma/schema.prisma
```

### 12.2 Default Login Credentials

| Role | Email | Default Password |
|------|-------|------------------|
| **Super Admin** | `superadmin@webrana.cloud` | `SuperAdmin123!` |
| **Admin** | `admin@webrana.cloud` | `Admin123!` |
| **Customer** (dev only) | `customer@webrana.cloud` | `Customer123!` |

> ⚠️ **PENTING:** Segera ganti password setelah login pertama!

### 12.3 Custom Password saat Seed (Production)

```bash
# Set custom password via environment
docker compose -f docker/docker-compose.yml exec \
  -e SUPER_ADMIN_PASSWORD="YourSecurePassword123!" \
  -e ADMIN_PASSWORD="YourAdminPassword123!" \
  auth-service npx prisma db seed --schema=apps/auth-service/prisma/schema.prisma
```

### 12.4 Role Permissions

| Role | Customer Portal | Admin Panel | System Settings |
|------|-----------------|-------------|-----------------|
| `customer` | ✅ | ❌ | ❌ |
| `admin` | ✅ | ✅ | ❌ |
| `super_admin` | ✅ | ✅ | ✅ |

---

## Support

Jika mengalami masalah:
1. Check logs: `./scripts/deploy.sh logs`
2. Check health: `./scripts/deploy.sh health`
3. Review dokumentasi di `/docs`
4. Contact: support@webrana.cloud
