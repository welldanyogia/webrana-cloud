# Setup VPS dari Awal - WeBrana Cloud

Panduan lengkap untuk deploy WeBrana Cloud di VPS baru (Ubuntu 22.04/24.04 LTS).

## Daftar Isi

1. [Requirements](#1-requirements)
2. [Setup VPS](#2-setup-vps)
3. [Install Dependencies](#3-install-dependencies)
4. [Setup Database](#4-setup-database)
5. [Setup Redis](#5-setup-redis)
6. [Clone & Configure Project](#6-clone--configure-project)
7. [Build & Deploy Services](#7-build--deploy-services)
8. [Setup Nginx Reverse Proxy](#8-setup-nginx-reverse-proxy)
9. [Setup SSL Certificate](#9-setup-ssl-certificate)
10. [Setup PM2 Process Manager](#10-setup-pm2-process-manager)
11. [Setup Monitoring](#11-setup-monitoring)
12. [Post-Deployment Checklist](#12-post-deployment-checklist)
13. [Maintenance Commands](#13-maintenance-commands)

---

## 1. Requirements

### Minimum VPS Specs
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 40 GB SSD | 80 GB NVMe |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

### Domain & DNS
- Domain untuk aplikasi (contoh: `webrana.cloud`)
- Subdomain untuk services:
  - `api.webrana.cloud` - API Gateway
  - `app.webrana.cloud` - Customer Portal
  - `admin.webrana.cloud` - Admin Dashboard
  - `monitor.webrana.cloud` - Grafana (optional)

### External Services
- DigitalOcean Account (untuk provisioning VPS customer)
- Tripay Account (payment gateway)
- SMTP Server (untuk email notifications)
- Telegram Bot Token (optional)
- Sentry Account (optional, untuk error tracking)

---

## 2. Setup VPS

### 2.1 Initial Server Access

```bash
# SSH ke server sebagai root
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
# Buat user untuk deployment
adduser deploy
usermod -aG sudo deploy

# Setup SSH key untuk deploy user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Test login dengan user deploy
su - deploy
```

### 2.3 Basic Security

```bash
# Disable root login (edit sebagai root dulu)
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no

sudo systemctl restart sshd

# Setup UFW Firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable

# Install fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 3. Install Dependencies

### 3.1 Install Node.js (v20 LTS)

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version  # v20.x.x
npm --version   # 10.x.x
```

### 3.2 Install Build Tools

```bash
sudo apt install -y build-essential git curl wget
```

### 3.3 Install Docker (Optional - untuk monitoring)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker deploy

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

---

## 4. Setup Database

### 4.1 Install PostgreSQL 15

```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update

# Install PostgreSQL 15
sudo apt install postgresql-15 postgresql-contrib-15 -y

# Start dan enable
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 4.2 Create Databases

```bash
# Login sebagai postgres user
sudo -u postgres psql

# Create databases untuk setiap service
CREATE DATABASE webrana_auth;
CREATE DATABASE webrana_order;
CREATE DATABASE webrana_billing;
CREATE DATABASE webrana_catalog;
CREATE DATABASE webrana_notification;

# Create user
CREATE USER webrana WITH ENCRYPTED PASSWORD 'YOUR_STRONG_PASSWORD';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE webrana_auth TO webrana;
GRANT ALL PRIVILEGES ON DATABASE webrana_order TO webrana;
GRANT ALL PRIVILEGES ON DATABASE webrana_billing TO webrana;
GRANT ALL PRIVILEGES ON DATABASE webrana_catalog TO webrana;
GRANT ALL PRIVILEGES ON DATABASE webrana_notification TO webrana;

# Exit
\q
```

### 4.3 Configure PostgreSQL

```bash
# Edit postgresql.conf untuk performance
sudo nano /etc/postgresql/15/main/postgresql.conf

# Recommended settings untuk 4GB RAM:
# shared_buffers = 1GB
# effective_cache_size = 3GB
# maintenance_work_mem = 256MB
# work_mem = 16MB
# max_connections = 200

# Edit pg_hba.conf jika perlu remote access
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Tambahkan: host all all 127.0.0.1/32 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## 5. Setup Redis

### 5.1 Install Redis

```bash
# Install Redis
sudo apt install redis-server -y

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: supervised systemd
# Set: maxmemory 512mb
# Set: maxmemory-policy allkeys-lru

# Enable dan start
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify
redis-cli ping  # Should return PONG
```

---

## 6. Clone & Configure Project

### 6.1 Clone Repository

```bash
# Sebagai user deploy
cd /home/deploy

# Clone repository
git clone https://github.com/welldanyogia/webrana-cloud.git
cd webrana-cloud

# Install dependencies
npm install --legacy-peer-deps
```

### 6.2 Create Environment Files

```bash
# Copy example env
cp .env.example .env

# Edit environment variables
nano .env
```

### 6.3 Environment Variables

```env
# ============================================
# WEBRANA CLOUD - PRODUCTION ENVIRONMENT
# ============================================

# Node Environment
NODE_ENV=production

# ============================================
# DATABASE CONNECTIONS
# ============================================
DATABASE_URL_AUTH=postgresql://webrana:YOUR_PASSWORD@localhost:5432/webrana_auth
DATABASE_URL_ORDER=postgresql://webrana:YOUR_PASSWORD@localhost:5432/webrana_order
DATABASE_URL_BILLING=postgresql://webrana:YOUR_PASSWORD@localhost:5432/webrana_billing
DATABASE_URL_CATALOG=postgresql://webrana:YOUR_PASSWORD@localhost:5432/webrana_catalog
DATABASE_URL_NOTIFICATION=postgresql://webrana:YOUR_PASSWORD@localhost:5432/webrana_notification

# ============================================
# REDIS
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379

# ============================================
# JWT AUTHENTICATION
# ============================================
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# ============================================
# INTERNAL API KEYS
# ============================================
INTERNAL_API_KEY=your-internal-api-key-for-service-communication

# ============================================
# SERVICE URLs (Internal)
# ============================================
AUTH_SERVICE_URL=http://localhost:3001
CATALOG_SERVICE_URL=http://localhost:3002
ORDER_SERVICE_URL=http://localhost:3003
BILLING_SERVICE_URL=http://localhost:3004
NOTIFICATION_SERVICE_URL=http://localhost:3005
INSTANCE_SERVICE_URL=http://localhost:3006

# ============================================
# DIGITALOCEAN
# ============================================
DO_ACCESS_TOKEN=your-digitalocean-api-token
DO_DEFAULT_REGION=sgp1

# ============================================
# TRIPAY PAYMENT GATEWAY
# ============================================
TRIPAY_API_KEY=your-tripay-api-key
TRIPAY_PRIVATE_KEY=your-tripay-private-key
TRIPAY_MERCHANT_CODE=your-merchant-code
TRIPAY_CALLBACK_URL=https://api.webrana.cloud/billing/webhook/tripay
TRIPAY_RETURN_URL=https://app.webrana.cloud/order/{orderId}/payment
TRIPAY_MODE=production

# ============================================
# EMAIL (SMTP)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=WeBrana Cloud <noreply@webrana.cloud>

# ============================================
# TELEGRAM (Optional)
# ============================================
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_ADMIN_CHAT_ID=your-admin-chat-id

# ============================================
# SENTRY (Optional)
# ============================================
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production

# ============================================
# FRONTEND URLs
# ============================================
CUSTOMER_WEB_URL=https://app.webrana.cloud
ADMIN_WEB_URL=https://admin.webrana.cloud
API_BASE_URL=https://api.webrana.cloud

# ============================================
# CORS
# ============================================
CORS_ORIGINS=https://app.webrana.cloud,https://admin.webrana.cloud
```

### 6.4 Generate Prisma Clients & Run Migrations

```bash
# Generate Prisma clients
npm run db:generate

# Run migrations
npm run db:migrate:deploy
```

---

## 7. Build & Deploy Services

### 7.1 Build All Services

```bash
# Build semua services
npm run build
```

### 7.2 Test Services Locally

```bash
# Test satu service
node dist/apps/auth-service/main.js

# Verify health check
curl http://localhost:3001/health
```

---

## 8. Setup Nginx Reverse Proxy

### 8.1 Install Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
```

### 8.2 Configure Nginx

```bash
# Create config untuk API Gateway
sudo nano /etc/nginx/sites-available/webrana-api
```

```nginx
# /etc/nginx/sites-available/webrana-api
upstream api_gateway {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name api.webrana.cloud;

    location / {
        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
        proxy_connect_timeout 90s;
    }

    # WebSocket support untuk notifications
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Create config untuk Customer Web
sudo nano /etc/nginx/sites-available/webrana-app
```

```nginx
# /etc/nginx/sites-available/webrana-app
server {
    listen 80;
    server_name app.webrana.cloud;

    location / {
        proxy_pass http://127.0.0.1:4200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Create config untuk Admin Web
sudo nano /etc/nginx/sites-available/webrana-admin
```

```nginx
# /etc/nginx/sites-available/webrana-admin
server {
    listen 80;
    server_name admin.webrana.cloud;

    location / {
        proxy_pass http://127.0.0.1:4201;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 8.3 Enable Sites

```bash
# Enable sites
sudo ln -s /etc/nginx/sites-available/webrana-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/webrana-app /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/webrana-admin /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## 9. Setup SSL Certificate

### 9.1 Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 9.2 Generate SSL Certificates

```bash
# Generate certs untuk semua domains
sudo certbot --nginx -d api.webrana.cloud -d app.webrana.cloud -d admin.webrana.cloud

# Auto-renewal sudah di-setup otomatis
# Verify dengan:
sudo certbot renew --dry-run
```

---

## 10. Setup PM2 Process Manager

### 10.1 Install PM2

```bash
npm install -g pm2
```

### 10.2 Create Ecosystem File

```bash
nano /home/deploy/webrana-cloud/ecosystem.config.js
```

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    // Backend Services
    {
      name: 'api-gateway',
      script: 'dist/apps/api-gateway/main.js',
      cwd: '/home/deploy/webrana-cloud',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'auth-service',
      script: 'dist/apps/auth-service/main.js',
      cwd: '/home/deploy/webrana-cloud',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'catalog-service',
      script: 'dist/apps/catalog-service/main.js',
      cwd: '/home/deploy/webrana-cloud',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    },
    {
      name: 'order-service',
      script: 'dist/apps/order-service/main.js',
      cwd: '/home/deploy/webrana-cloud',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      }
    },
    {
      name: 'billing-service',
      script: 'dist/apps/billing-service/main.js',
      cwd: '/home/deploy/webrana-cloud',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      }
    },
    {
      name: 'notification-service',
      script: 'dist/apps/notification-service/main.js',
      cwd: '/home/deploy/webrana-cloud',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3005
      }
    },
    {
      name: 'instance-service',
      script: 'dist/apps/instance-service/main.js',
      cwd: '/home/deploy/webrana-cloud',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3006
      }
    },
    // Frontend Apps
    {
      name: 'customer-web',
      script: 'npm',
      args: 'run start',
      cwd: '/home/deploy/webrana-cloud/dist/apps/customer-web',
      env: {
        NODE_ENV: 'production',
        PORT: 4200
      }
    },
    {
      name: 'admin-web',
      script: 'npm',
      args: 'run start',
      cwd: '/home/deploy/webrana-cloud/dist/apps/admin-web',
      env: {
        NODE_ENV: 'production',
        PORT: 4201
      }
    }
  ]
};
```

### 10.3 Start Services

```bash
# Start all services
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup
# Jalankan command yang diberikan oleh output di atas

# Monitor services
pm2 monit
```

### 10.4 PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs
pm2 logs order-service

# Restart service
pm2 restart order-service
pm2 restart all

# Stop service
pm2 stop order-service

# Reload (zero-downtime)
pm2 reload all
```

---

## 11. Setup Monitoring

### 11.1 Start Monitoring Stack (Docker)

```bash
cd /home/deploy/webrana-cloud/docker/monitoring
docker compose up -d
```

### 11.2 Access Monitoring

- **Prometheus**: http://YOUR_IP:9090
- **Grafana**: http://YOUR_IP:3001
  - Default login: admin / admin
  - Change password on first login

### 11.3 Configure Nginx for Grafana (Optional)

```bash
sudo nano /etc/nginx/sites-available/webrana-monitor
```

```nginx
server {
    listen 80;
    server_name monitor.webrana.cloud;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 12. Post-Deployment Checklist

### 12.1 Health Checks

```bash
# Check all services
curl -s http://localhost:3000/health | jq  # API Gateway
curl -s http://localhost:3001/health | jq  # Auth Service
curl -s http://localhost:3002/health | jq  # Catalog Service
curl -s http://localhost:3003/health | jq  # Order Service
curl -s http://localhost:3004/health | jq  # Billing Service
curl -s http://localhost:3005/health | jq  # Notification Service
curl -s http://localhost:3006/health | jq  # Instance Service
```

### 12.2 Verify External Access

```bash
# Test via domain
curl -I https://api.webrana.cloud/health
curl -I https://app.webrana.cloud
curl -I https://admin.webrana.cloud
```

### 12.3 Create Admin User

```bash
# Connect ke database
psql -U webrana -d webrana_auth

# Insert admin user (password harus di-hash dengan bcrypt)
INSERT INTO users (id, email, password, name, role, email_verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@webrana.cloud',
  '$2b$10$YOUR_BCRYPT_HASH',  -- Hash password dengan bcrypt
  'Admin WeBrana',
  'ADMIN',
  true,
  NOW(),
  NOW()
);
```

### 12.4 Test Core Flows

- [ ] Login ke Admin Dashboard
- [ ] Login ke Customer Portal
- [ ] Create test order
- [ ] Verify Tripay webhook
- [ ] Test email notification
- [ ] Test DigitalOcean API connection

---

## 13. Maintenance Commands

### 13.1 Update Application

```bash
cd /home/deploy/webrana-cloud

# Pull latest code
git pull origin master

# Install dependencies
npm install --legacy-peer-deps

# Run migrations
npm run db:migrate:deploy

# Rebuild
npm run build

# Reload services (zero-downtime)
pm2 reload all
```

### 13.2 Database Backup

```bash
# Manual backup
pg_dump -U webrana webrana_order > backup_order_$(date +%Y%m%d).sql
pg_dump -U webrana webrana_billing > backup_billing_$(date +%Y%m%d).sql

# Setup daily cron backup
crontab -e
# Add: 0 2 * * * /home/deploy/scripts/backup-db.sh
```

### 13.3 Log Management

```bash
# PM2 logs location
ls ~/.pm2/logs/

# Rotate logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 13.4 Monitor Resources

```bash
# System resources
htop

# Disk usage
df -h

# PM2 monitoring
pm2 monit

# Docker stats (jika pakai monitoring)
docker stats
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
pm2 logs service-name --lines 100

# Check if port is in use
sudo lsof -i :3000

# Check environment variables
pm2 env 0
```

### Database Connection Failed

```bash
# Test connection
psql -U webrana -h localhost -d webrana_order

# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Nginx 502 Bad Gateway

```bash
# Check if backend is running
pm2 status

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test backend directly
curl http://localhost:3000/health
```

### SSL Certificate Issues

```bash
# Renew certificates
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

---

## Security Recommendations

1. **Firewall**: Hanya buka port yang diperlukan (22, 80, 443)
2. **SSH**: Gunakan key-based authentication, disable password
3. **Database**: Jangan expose PostgreSQL ke public
4. **Secrets**: Gunakan environment variables, jangan hardcode
5. **Updates**: Regularly update system packages
6. **Backups**: Setup automated database backups
7. **Monitoring**: Setup alerts untuk downtime dan errors
8. **Rate Limiting**: Sudah configured di API Gateway

---

## Support

Jika mengalami masalah:
1. Check logs: `pm2 logs`
2. Check health endpoints
3. Review dokumentasi di `/docs`
4. Contact: support@webrana.cloud
