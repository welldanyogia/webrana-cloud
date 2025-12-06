#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════════════════════════
# WeBrana Cloud - Production Deployment Script
# ═══════════════════════════════════════════════════════════════════════════════

# Default values if not set by CI
: "${IMAGE_PREFIX:=ghcr.io/welldan/webrana-cloud}"
: "${IMAGE_TAG:=latest}"
: "${COMPOSE_FILE:=docker/docker-compose.prod.yml}"

echo "🚀 Starting deployment for tag: $IMAGE_TAG"
echo "📍 Registry: $IMAGE_PREFIX"

# 1. Login to Registry
if [ -n "$GITHUB_TOKEN" ]; then
    echo "🔑 Logging into Container Registry..."
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin
else
    echo "⚠️  GITHUB_TOKEN not provided, assuming already logged in or public."
fi

# 2. Environment Setup
if [ ! -f docker/.env.production ]; then
    echo "⚠️  docker/.env.production not found! Copying docker/.env.example..."
    cp docker/.env.example docker/.env.production
    echo "❌ PLEASE CONFIGURE docker/.env.production BEFORE DEPLOYING"
    exit 1
fi

# Symlink for docker-compose compatibility
if [ ! -f docker/.env ]; then
    ln -sf .env.production docker/.env
fi

# 3. Pull New Images
echo "📦 Pulling images..."
# We need to explicitly export variables for docker-compose interpolation
export IMAGE_PREFIX
export IMAGE_TAG

docker compose -f "$COMPOSE_FILE" pull

# 4. Deploy Services
echo "🚀 updating services..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# 5. Wait for Health
echo "⏳ Waiting for services to stabilize..."
sleep 30

# 6. Health Check
if [ -f "scripts/health-check.sh" ]; then
    chmod +x scripts/health-check.sh
    ./scripts/health-check.sh
else
    echo "⚠️  Health check script not found, skipping..."
fi

# 7. Cleanup
echo "🧹 Cleaning up old images..."
docker image prune -a -f --filter "until=24h"

echo "✅ Deployment Successful!"
