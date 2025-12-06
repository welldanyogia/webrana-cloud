#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════════════════════════
# WeBrana Cloud - Initial VPS Setup Script
# Run this once on a fresh Ubuntu 22.04/24.04 VPS
# ═══════════════════════════════════════════════════════════════════════════════

if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root"
  exit 1
fi

echo "🚀 Starting VPS Setup..."

# 1. Update System
echo "📦 Updating system packages..."
apt update && apt upgrade -y
apt install -y curl wget git nano htop unzip ufw fail2ban

# 2. Setup Firewall (UFW)
echo "🛡️ Setting up Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

# 3. Setup Fail2Ban
echo "🚫 Configuring Fail2Ban..."
systemctl start fail2ban
systemctl enable fail2ban

# 4. Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# 5. Create Deploy User
echo "👤 Creating deploy user..."
if id "deploy" &>/dev/null; then
    echo "   User 'deploy' already exists"
else
    adduser --disabled-password --gecos "" deploy
    usermod -aG sudo,docker deploy
    
    # Setup SSH directory
    mkdir -p /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    
    # Copy root keys if exist, otherwise user must setup manually
    if [ -f /root/.ssh/authorized_keys ]; then
        cp /root/.ssh/authorized_keys /home/deploy/.ssh/
        chmod 600 /home/deploy/.ssh/authorized_keys
        chown -R deploy:deploy /home/deploy/.ssh
    fi
fi

# 6. Setup Directory Structure
echo "📂 Setting up directories..."
mkdir -p /opt/webrana-cloud
chown -R deploy:deploy /opt/webrana-cloud

echo "✅ VPS Setup Complete!"
echo "👉 Next steps:"
echo "   1. SSH as deploy user: ssh deploy@<your-ip>"
echo "   2. Clone repo: git clone https://github.com/welldanyogia/webrana-cloud.git"
echo "   3. Setup SSL: Place cloudflare-origin.pem and .key in docker/nginx/ssl/"
echo "   4. Configure .env.production"
