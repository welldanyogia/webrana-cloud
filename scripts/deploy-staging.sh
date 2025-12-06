#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════════════════════════
# WeBrana Cloud - Staging Deployment Script
# ═══════════════════════════════════════════════════════════════════════════════

# Default values if not set by CI
: "${IMAGE_PREFIX:=ghcr.io/welldan/webrana-cloud}"
: "${IMAGE_TAG:=latest}"
: "${COMPOSE_FILE:=docker-compose.staging.yml}"

echo "🚀 Starting STAGING deployment for tag: $IMAGE_TAG"
echo "📍 Registry: $IMAGE_PREFIX"

# 1. Login to Registry
if [ -n "$GITHUB_TOKEN" ]; then
    echo "🔑 Logging into Container Registry..."
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin
else
    echo "⚠️  GITHUB_TOKEN not provided, assuming already logged in or public."
fi

# 2. Environment Setup
if [ ! -f .env ]; then
    echo "⚠️  .env not found! Copying .env.staging.example..."
    cp .env.staging.example .env
    echo "❌ PLEASE CONFIGURE .env BEFORE DEPLOYING"
    # Don't exit on staging, maybe they want default? No, usually .env is required.
    # But for automation, we fail.
    exit 1
fi

# 3. Pull New Images
echo "📦 Pulling images..."
export IMAGE_PREFIX
export IMAGE_TAG

docker compose -f "$COMPOSE_FILE" pull

# 4. Deploy Services
echo "🚀 updating services..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# 5. Wait for Health
echo "⏳ Waiting for services to stabilize..."
sleep 30

# 6. Health Check (Assuming internal health check script or curl)
# Staging usually runs on same VPS logic but different ports/domains
if [ -f "scripts/health-check.sh" ]; then
    # Modify health-check for staging?
    # Our health-check.sh checks localhost:3000 etc.
    # Staging ports are mapped 3000:3000 etc.
    ./scripts/health-check.sh
else
    echo "⚠️  Health check script not found, skipping..."
fi

# 7. Cleanup
echo "🧹 Cleaning up old images..."
docker image prune -a -f --filter "until=24h"

echo "✅ Staging Deployment Successful!"
