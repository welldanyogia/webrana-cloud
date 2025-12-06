# Panduan Lengkap: Setup VPS Staging WeBrana Cloud

Panduan step-by-step untuk deploy WeBrana Cloud ke VPS staging dengan Nginx, SSL, dan Cloudflare.

---

## Daftar Isi

1. [Arsitektur & Requirements](#1-arsitektur--requirements)
2. [Setup DNS di Cloudflare](#2-setup-dns-di-cloudflare)
3. [Initial VPS Setup](#3-initial-vps-setup)
4. [Security Hardening](#4-security-hardening)
5. [Install Docker](#5-install-docker)
6. [Clone & Configure Project](#6-clone--configure-project)
7. [Setup SSL dengan Cloudflare](#7-setup-ssl-dengan-cloudflare)
8. [Konfigurasi Nginx untuk Cloudflare](#8-konfigurasi-nginx-untuk-cloudflare)
9. [Deploy Stack](#9-deploy-stack)
10. [Verifikasi & Testing](#10-verifikasi--testing)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Arsitektur & Requirements

### Arsitektur Subdomain

| Subdomain | Fungsi | Port Internal |
|-----------|--------|---------------|
| `staging.webrana.id` | Landing Page (Public) | customer-web:3000 |
| `console.staging.webrana.id` | Dashboard (Protected) | customer-web:3000 |
| `admin.staging.webrana.id` | Admin Panel | admin-web:3100 |
| `api.staging.webrana.id` | API Gateway | api-gateway:4000 |

### Minimum VPS Specs

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 60 GB SSD | 100 GB NVMe |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Bandwidth | 1 TB | Unlimited |

### Checklist Sebelum Mulai

- [ ] VPS sudah aktif dengan IP publik
- [ ] Domain terdaftar dan bisa diakses di Cloudflare
- [ ] SSH access ke VPS (root atau sudo user)
- [ ] Repository access ke GitHub

---

## 2. Setup DNS di Cloudflare

### 2.1 Login ke Cloudflare Dashboard

1. Buka https://dash.cloudflare.com
2. Pilih domain Anda (contoh: `webrana.id`)
3. Klik **DNS** di sidebar

### 2.2 Tambahkan DNS Records

Tambahkan A records berikut (ganti `YOUR_VPS_IP` dengan IP VPS Anda):

```
Type    Name                    Content         Proxy Status    TTL
────────────────────────────────────────────────────────────────────────
A       staging                 YOUR_VPS_IP     Proxied (🟠)    Auto
A       api.staging             YOUR_VPS_IP     Proxied (🟠)    Auto
A       console.staging         YOUR_VPS_IP     Proxied (🟠)    Auto
A       admin.staging           YOUR_VPS_IP     Proxied (🟠)    Auto
```

> **Penting:** Pastikan **Proxy Status** = Proxied (awan oranye) untuk mendapatkan SSL dari Cloudflare.

### 2.3 Konfigurasi SSL/TLS di Cloudflare

1. Klik **SSL/TLS** di sidebar
2. Pilih **Overview**
3. Set encryption mode ke **Full (strict)**

   ```
   ┌─────────────────────────────────────────────────────────────┐
   │  SSL/TLS Encryption Mode                                    │
   │                                                             │
   │  ○ Off (not secure)                                         │
   │  ○ Flexible                                                 │
   │  ○ Full                                                     │
   │  ● Full (strict)  ← PILIH INI                               │
   └─────────────────────────────────────────────────────────────┘
   ```

### 2.4 Generate Cloudflare Origin Certificate

1. Klik **SSL/TLS** → **Origin Server**
2. Klik **Create Certificate**
3. Isi form:
   - **Private key type:** RSA (2048)
   - **Hostnames:** 
     ```
     staging.webrana.id
     *.staging.webrana.id
     ```
   - **Certificate Validity:** 15 years
4. Klik **Create**
5. **SIMPAN** kedua nilai berikut (hanya ditampilkan sekali!):
   - **Origin Certificate** → simpan sebagai `cloudflare-origin.pem`
   - **Private Key** → simpan sebagai `cloudflare-origin.key`

### 2.5 Konfigurasi Tambahan Cloudflare

**Edge Certificates** (SSL/TLS → Edge Certificates):
- Always Use HTTPS: **ON**
- Automatic HTTPS Rewrites: **ON**
- Minimum TLS Version: **TLS 1.2**

**Page Rules** (opsional untuk redirect):
```
URL: http://*staging.webrana.id/*
Setting: Always Use HTTPS
```

---

## 3. Initial VPS Setup

### 3.1 SSH ke VPS

```bash
ssh root@YOUR_VPS_IP
```

### 3.2 Update System

```bash
# Update package list dan upgrade
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git nano htop unzip software-properties-common

# Set timezone
timedatectl set-timezone Asia/Jakarta

# Set hostname
hostnamectl set-hostname webrana-staging
```

### 3.3 Create Deploy User

```bash
# Create user
adduser deploy
# Ikuti prompt untuk set password

# Add to sudo group
usermod -aG sudo deploy

# Setup SSH key untuk deploy user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### 3.4 Test Login dengan Deploy User

```bash
# Dari terminal lokal Anda
ssh deploy@YOUR_VPS_IP
```

---

## 4. Security Hardening

### 4.1 Setup UFW Firewall

```bash
# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (PENTING: lakukan ini SEBELUM enable!)
sudo ufw allow 22/tcp comment 'SSH'

# Allow HTTP dan HTTPS
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

Output yang diharapkan:
```
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere         # SSH
80/tcp                     ALLOW IN    Anywhere         # HTTP
443/tcp                    ALLOW IN    Anywhere         # HTTPS
```

### 4.2 Install Fail2Ban

```bash
# Install
sudo apt install -y fail2ban

# Create local config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
```

Tambahkan/edit section berikut:

```ini
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 1h
```

```bash
# Restart fail2ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status sshd
```

### 4.3 Setup Automatic Security Updates

```bash
sudo apt install -y unattended-upgrades

# Configure
sudo dpkg-reconfigure -plow unattended-upgrades
# Pilih "Yes"
```

---

## 5. Install Docker

### 5.1 Install Docker Engine

```bash
# Login sebagai deploy user
su - deploy

# Download dan install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add deploy user ke docker group
sudo usermod -aG docker deploy

# PENTING: Logout dan login kembali untuk apply group
exit
su - deploy

# Verify installation
docker --version
docker compose version
```

Output yang diharapkan:
```
Docker version 24.x.x, build xxxxxxx
Docker Compose version v2.x.x
```

### 5.2 Configure Docker Daemon

```bash
sudo mkdir -p /etc/docker

sudo tee /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "default-address-pools": [
    {
      "base": "172.20.0.0/16",
      "size": 24
    }
  ]
}
EOF

# Restart Docker
sudo systemctl restart docker
sudo systemctl enable docker

# Verify
docker info | grep -E "Storage Driver|Logging Driver"
```

---

## 6. Clone & Configure Project

### 6.1 Clone Repository

```bash
cd /home/deploy
git clone https://github.com/welldanyogia/webrana-cloud.git
cd webrana-cloud
```

### 6.2 Setup Environment Variables

```bash
# Copy template
cp .env.staging.example .env

# Edit environment file
nano .env
```

### 6.3 Environment Variables (LENGKAP)

Edit `.env` dengan nilai berikut:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# WEBRANA CLOUD - STAGING ENVIRONMENT
# ═══════════════════════════════════════════════════════════════════════════════

NODE_ENV=staging
DEBUG=true
LOG_LEVEL=debug

# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE (PostgreSQL)
# ═══════════════════════════════════════════════════════════════════════════════
DATABASE_HOST=postgres-staging
DATABASE_PORT=5432
DATABASE_USER=webrana_staging
DATABASE_PASSWORD=GANTI_DENGAN_PASSWORD_KUAT_32_CHAR
DATABASE_NAME=webrana_staging

# Connection URLs untuk setiap service
DATABASE_URL=postgresql://webrana_staging:GANTI_DENGAN_PASSWORD_KUAT_32_CHAR@postgres-staging:5432/webrana_staging
DATABASE_URL_AUTH=postgresql://webrana_staging:GANTI_DENGAN_PASSWORD_KUAT_32_CHAR@postgres-staging:5432/webrana_staging?schema=auth
DATABASE_URL_CATALOG=postgresql://webrana_staging:GANTI_DENGAN_PASSWORD_KUAT_32_CHAR@postgres-staging:5432/webrana_staging?schema=catalog
DATABASE_URL_ORDER=postgresql://webrana_staging:GANTI_DENGAN_PASSWORD_KUAT_32_CHAR@postgres-staging:5432/webrana_staging?schema=order
DATABASE_URL_BILLING=postgresql://webrana_staging:GANTI_DENGAN_PASSWORD_KUAT_32_CHAR@postgres-staging:5432/webrana_staging?schema=billing
DATABASE_URL_NOTIFICATION=postgresql://webrana_staging:GANTI_DENGAN_PASSWORD_KUAT_32_CHAR@postgres-staging:5432/webrana_staging?schema=notification

# ═══════════════════════════════════════════════════════════════════════════════
# REDIS
# ═══════════════════════════════════════════════════════════════════════════════
REDIS_HOST=redis-staging
REDIS_PORT=6379
REDIS_URL=redis://redis-staging:6379

# ═══════════════════════════════════════════════════════════════════════════════
# JWT AUTHENTICATION
# ═══════════════════════════════════════════════════════════════════════════════
JWT_ALGORITHM=HS256
JWT_SECRET=GANTI_DENGAN_SECRET_64_CHAR_RANDOM_STRING_YANG_SANGAT_PANJANG
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# ═══════════════════════════════════════════════════════════════════════════════
# INTERNAL SERVICE COMMUNICATION
# ═══════════════════════════════════════════════════════════════════════════════
INTERNAL_API_KEY=GANTI_DENGAN_API_KEY_32_CHAR_RANDOM

# ═══════════════════════════════════════════════════════════════════════════════
# DIGITALOCEAN (Staging - gunakan project terpisah!)
# ═══════════════════════════════════════════════════════════════════════════════
DO_ACCESS_TOKEN=dop_v1_staging_token_dari_digitalocean
DIGITALOCEAN_DEFAULT_REGION=sgp1

# ═══════════════════════════════════════════════════════════════════════════════
# TRIPAY PAYMENT GATEWAY (SANDBOX MODE)
# ═══════════════════════════════════════════════════════════════════════════════
TRIPAY_API_KEY=DEV-your-tripay-sandbox-api-key
TRIPAY_PRIVATE_KEY=your-tripay-sandbox-private-key
TRIPAY_MERCHANT_CODE=T12345
TRIPAY_MODE=sandbox
TRIPAY_CALLBACK_URL=https://api.staging.webrana.id/api/v1/billing/webhook/tripay

# ═══════════════════════════════════════════════════════════════════════════════
# EMAIL (SMTP)
# ═══════════════════════════════════════════════════════════════════════════════
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=staging@webrana.id
SMTP_PASS=app_password_dari_google
SMTP_FROM=WeBrana Staging <staging@webrana.id>

# ═══════════════════════════════════════════════════════════════════════════════
# FRONTEND URLs
# ═══════════════════════════════════════════════════════════════════════════════
NEXT_PUBLIC_API_URL=https://api.staging.webrana.id
NEXT_PUBLIC_WS_URL=wss://api.staging.webrana.id
NEXT_PUBLIC_LANDING_URL=https://staging.webrana.id
NEXT_PUBLIC_CONSOLE_URL=https://console.staging.webrana.id

# ═══════════════════════════════════════════════════════════════════════════════
# CORS (Cloudflare proxied domains)
# ═══════════════════════════════════════════════════════════════════════════════
CORS_ORIGINS=https://staging.webrana.id,https://console.staging.webrana.id,https://admin.staging.webrana.id
```

### 6.4 Generate Secure Secrets

Gunakan command ini untuk generate random strings:

```bash
# Generate DATABASE_PASSWORD (32 chars)
openssl rand -base64 24

# Generate JWT_SECRET (64 chars)
openssl rand -base64 48

# Generate INTERNAL_API_KEY (32 chars)
openssl rand -hex 16
```

---

## 7. Setup SSL dengan Cloudflare

### 7.1 Upload Cloudflare Origin Certificate

```bash
# Buat direktori SSL
mkdir -p /home/deploy/webrana-cloud/docker/nginx/ssl
cd /home/deploy/webrana-cloud/docker/nginx/ssl

# Buat file certificate (paste dari Cloudflare)
nano cloudflare-origin.pem
# Paste isi Origin Certificate, lalu save (Ctrl+X, Y, Enter)

# Buat file private key (paste dari Cloudflare)
nano cloudflare-origin.key
# Paste isi Private Key, lalu save

# Set permissions
chmod 600 cloudflare-origin.key
chmod 644 cloudflare-origin.pem
```

### 7.2 Verify Certificate Files

```bash
# Check certificate info
openssl x509 -in cloudflare-origin.pem -text -noout | head -20

# Verify key matches certificate
openssl x509 -noout -modulus -in cloudflare-origin.pem | openssl md5
openssl rsa -noout -modulus -in cloudflare-origin.key | openssl md5
# Kedua MD5 hash harus SAMA
```

---

## 8. Konfigurasi Nginx untuk Cloudflare

### 8.1 Buat Nginx Config untuk Staging

```bash
nano /home/deploy/webrana-cloud/docker/nginx/conf.d/staging.conf
```

Paste konfigurasi berikut:

```nginx
# ═══════════════════════════════════════════════════════════════════════════════
# WeBrana Cloud - Staging Server Configuration
# With Cloudflare SSL (Full Strict Mode)
# ═══════════════════════════════════════════════════════════════════════════════

# Cloudflare IP Ranges (untuk real IP logging)
# Update berkala dari: https://www.cloudflare.com/ips/
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;
real_ip_header CF-Connecting-IP;

# ─────────────────────────────────────────────────────────────────────────────
# HTTP → HTTPS Redirect (handled by Cloudflare, but keep as fallback)
# ─────────────────────────────────────────────────────────────────────────────
server {
    listen 80;
    listen [::]:80;
    server_name staging.webrana.id 
                console.staging.webrana.id 
                admin.staging.webrana.id 
                api.staging.webrana.id;

    # Health check untuk load balancer
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Redirect semua ke HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# API GATEWAY (api.staging.webrana.id)
# ─────────────────────────────────────────────────────────────────────────────
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.staging.webrana.id;

    # SSL Configuration (Cloudflare Origin Certificate)
    ssl_certificate /etc/nginx/ssl/cloudflare-origin.pem;
    ssl_certificate_key /etc/nginx/ssl/cloudflare-origin.key;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API Routes
    location / {
        limit_req zone=api_limit burst=50 nodelay;
        
        proxy_pass http://api-gateway:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Auth endpoints dengan rate limit lebih ketat
    location /api/v1/auth/ {
        limit_req zone=auth_limit burst=10 nodelay;
        
        proxy_pass http://api-gateway:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

    # WebSocket untuk notifications
    location /ws {
        proxy_pass http://api-gateway:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Webhook endpoints
    location /api/v1/webhooks/ {
        limit_req zone=webhook_limit burst=100 nodelay;
        
        proxy_pass http://api-gateway:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass_request_body on;
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# LANDING PAGE (staging.webrana.id)
# ─────────────────────────────────────────────────────────────────────────────
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name staging.webrana.id;

    ssl_certificate /etc/nginx/ssl/cloudflare-origin.pem;
    ssl_certificate_key /etc/nginx/ssl/cloudflare-origin.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://customer-web:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

    # Static assets caching
    location ~* ^/_next/static/ {
        proxy_pass http://customer-web:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# CONSOLE/DASHBOARD (console.staging.webrana.id)
# ─────────────────────────────────────────────────────────────────────────────
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name console.staging.webrana.id;

    ssl_certificate /etc/nginx/ssl/cloudflare-origin.pem;
    ssl_certificate_key /etc/nginx/ssl/cloudflare-origin.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://customer-web:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

    location ~* ^/_next/static/ {
        proxy_pass http://customer-web:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# ADMIN PANEL (admin.staging.webrana.id)
# ─────────────────────────────────────────────────────────────────────────────
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name admin.staging.webrana.id;

    ssl_certificate /etc/nginx/ssl/cloudflare-origin.pem;
    ssl_certificate_key /etc/nginx/ssl/cloudflare-origin.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Extra security untuk admin
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;

    location / {
        proxy_pass http://admin-web:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

    location ~* ^/_next/static/ {
        proxy_pass http://admin-web:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

### 8.2 Backup Default Config

```bash
# Rename default.conf agar tidak conflict
mv /home/deploy/webrana-cloud/docker/nginx/conf.d/default.conf \
   /home/deploy/webrana-cloud/docker/nginx/conf.d/default.conf.backup
```

---

## 9. Deploy Stack

### 9.1 Verify Struktur Direktori

```bash
cd /home/deploy/webrana-cloud

# Check struktur
ls -la docker/nginx/
ls -la docker/nginx/ssl/
ls -la docker/nginx/conf.d/
```

Output yang diharapkan:
```
docker/nginx/
├── conf.d/
│   ├── staging.conf
│   └── default.conf.backup
├── ssl/
│   ├── cloudflare-origin.pem
│   └── cloudflare-origin.key
└── nginx.conf
```

### 9.2 Build dan Start Services

```bash
cd /home/deploy/webrana-cloud

# Pull base images
docker compose -f docker-compose.staging.yml pull

# Build semua services
docker compose -f docker-compose.staging.yml build --no-cache

# Start infrastructure dulu (postgres, redis)
docker compose -f docker-compose.staging.yml up -d postgres-staging redis-staging

# Tunggu sampai healthy (30 detik)
sleep 30

# Check status
docker compose -f docker-compose.staging.yml ps

# Start semua services
docker compose -f docker-compose.staging.yml up -d

# Monitor logs
docker compose -f docker-compose.staging.yml logs -f
```

### 9.3 Run Database Migrations

```bash
# Tunggu services ready (1-2 menit)
sleep 60

# Run migrations untuk setiap service
docker compose -f docker-compose.staging.yml exec auth-service \
  npx prisma migrate deploy --schema=prisma/schema.prisma || echo "Auth migration done or skipped"

docker compose -f docker-compose.staging.yml exec catalog-service \
  npx prisma migrate deploy --schema=prisma/schema.prisma || echo "Catalog migration done or skipped"

docker compose -f docker-compose.staging.yml exec order-service \
  npx prisma migrate deploy --schema=prisma/schema.prisma || echo "Order migration done or skipped"

docker compose -f docker-compose.staging.yml exec billing-service \
  npx prisma migrate deploy --schema=prisma/schema.prisma || echo "Billing migration done or skipped"

docker compose -f docker-compose.staging.yml exec notification-service \
  npx prisma migrate deploy --schema=prisma/schema.prisma || echo "Notification migration done or skipped"
```

### 9.4 Seed Default Data (Optional)

```bash
# Seed admin users
docker compose -f docker-compose.staging.yml exec auth-service \
  npx prisma db seed --schema=prisma/schema.prisma || echo "Seed completed or skipped"
```

---

## 10. Verifikasi & Testing

### 10.1 Check Container Status

```bash
docker compose -f docker-compose.staging.yml ps
```

Semua container harus **healthy** atau **running**:
```
NAME                         STATUS                   PORTS
webrana-postgres-staging     Up (healthy)             5432/tcp
webrana-redis-staging        Up (healthy)             6379/tcp
webrana-api-gateway          Up (healthy)             3000/tcp
webrana-auth-service         Up (healthy)             3001/tcp
webrana-catalog-service      Up (healthy)             3002/tcp
webrana-order-service        Up (healthy)             3003/tcp
webrana-billing-service      Up (healthy)             3004/tcp
webrana-instance-service     Up (healthy)             3005/tcp
webrana-notification-service Up (healthy)             3006/tcp
webrana-customer-web         Up (healthy)             3000/tcp
webrana-admin-web            Up (healthy)             3100/tcp
```

### 10.2 Test Health Endpoints (Internal)

```bash
# Test dari dalam VPS
curl -s http://localhost:3000/api/v1/health  # API Gateway
curl -s http://localhost:3001/api/v1/auth/health  # Auth Service
curl -s http://localhost:3002/api/v1/health  # Catalog Service
```

### 10.3 Test via Cloudflare (External)

Dari komputer lokal Anda:

```bash
# Test API
curl -s https://api.staging.webrana.id/api/v1/health

# Test Landing Page
curl -sI https://staging.webrana.id | head -10

# Test Console
curl -sI https://console.staging.webrana.id | head -10

# Test Admin
curl -sI https://admin.staging.webrana.id | head -10
```

### 10.4 Browser Testing

Buka di browser:

1. **Landing Page:** https://staging.webrana.id
2. **Console:** https://console.staging.webrana.id
3. **Admin:** https://admin.staging.webrana.id
4. **API Health:** https://api.staging.webrana.id/api/v1/health

### 10.5 SSL Certificate Check

```bash
# Check SSL dari external
curl -vI https://staging.webrana.id 2>&1 | grep -E "SSL|subject|issuer|expire"
```

---

## 11. Troubleshooting

### Container Tidak Start

```bash
# Check logs specific container
docker compose -f docker-compose.staging.yml logs auth-service

# Check resource usage
docker stats

# Restart specific service
docker compose -f docker-compose.staging.yml restart auth-service
```

### Database Connection Error

```bash
# Check postgres logs
docker compose -f docker-compose.staging.yml logs postgres-staging

# Test connection
docker compose -f docker-compose.staging.yml exec postgres-staging \
  psql -U webrana_staging -d webrana_staging -c "SELECT 1"
```

### SSL/Cloudflare Error

1. Pastikan Cloudflare SSL mode = **Full (strict)**
2. Verify Origin Certificate belum expired:
   ```bash
   openssl x509 -in docker/nginx/ssl/cloudflare-origin.pem -noout -dates
   ```
3. Check nginx logs:
   ```bash
   docker compose -f docker-compose.staging.yml logs nginx 2>&1 | tail -50
   ```

### 502 Bad Gateway

```bash
# Check apakah backend service running
docker compose -f docker-compose.staging.yml ps

# Check nginx dapat reach backend
docker compose -f docker-compose.staging.yml exec nginx \
  wget -qO- http://api-gateway:4000/api/v1/health
```

### Reset Everything

```bash
# Stop semua
docker compose -f docker-compose.staging.yml down -v

# Remove semua volumes (HATI-HATI: data akan hilang!)
docker volume prune -f

# Build ulang dari awal
docker compose -f docker-compose.staging.yml up -d --build --force-recreate
```

---

## Quick Reference Commands

```bash
# ═══════════════════════════════════════════════════════════════
# DAILY COMMANDS
# ═══════════════════════════════════════════════════════════════

# Status
docker compose -f docker-compose.staging.yml ps

# Logs (all)
docker compose -f docker-compose.staging.yml logs -f

# Logs (specific)
docker compose -f docker-compose.staging.yml logs -f api-gateway

# Restart all
docker compose -f docker-compose.staging.yml restart

# Restart specific
docker compose -f docker-compose.staging.yml restart order-service

# ═══════════════════════════════════════════════════════════════
# UPDATE DEPLOYMENT
# ═══════════════════════════════════════════════════════════════

cd /home/deploy/webrana-cloud
git pull origin master
docker compose -f docker-compose.staging.yml up -d --build

# ═══════════════════════════════════════════════════════════════
# MAINTENANCE
# ═══════════════════════════════════════════════════════════════

# Backup database
docker compose -f docker-compose.staging.yml exec postgres-staging \
  pg_dump -U webrana_staging webrana_staging > backup_$(date +%Y%m%d).sql

# Cleanup unused images
docker image prune -f

# Check disk usage
docker system df
```

---

## Default Accounts (Setelah Seed)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@webrana.id | SuperAdmin123! |
| Admin | admin@webrana.id | Admin123! |

> ⚠️ **GANTI PASSWORD SEGERA SETELAH LOGIN PERTAMA!**

---

## Support & Referensi

- **Cloudflare Docs:** https://developers.cloudflare.com/ssl/origin-configuration/
- **Docker Docs:** https://docs.docker.com/compose/
- **Nginx Docs:** https://nginx.org/en/docs/

---

*Dokumen ini dibuat untuk WeBrana Cloud Staging Environment*
*Last updated: 2025*
