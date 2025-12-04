#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════════
# WeBrana Cloud - Docker Deployment Script
# Usage: ./scripts/deploy.sh {update|rollback|restart|status|logs|health|backup}
# ═══════════════════════════════════════════════════════════════

DEPLOY_DIR="${DEPLOY_DIR:-/home/deploy/webrana-cloud}"
COMPOSE_FILE="docker/docker-compose.yml"
COMPOSE_PROD="docker/docker-compose.prod.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

cd "$DEPLOY_DIR" || error "Cannot cd to $DEPLOY_DIR"

case "$1" in
  # ─────────────────────────────────────────────────────────────
  # UPDATE: Pull latest code and deploy
  # ─────────────────────────────────────────────────────────────
  update)
    log "Starting deployment..."
    
    log "📦 Pulling latest code..."
    git fetch origin
    git reset --hard origin/master
    
    log "🔨 Building Docker images..."
    docker compose -f "$COMPOSE_FILE" build --parallel
    
    log "🚀 Deploying services with zero-downtime..."
    docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_PROD" up -d --remove-orphans
    
    log "⏳ Waiting for services to be healthy..."
    sleep 30
    
    log "🧹 Cleaning up old images..."
    docker image prune -f
    
    log "✅ Deployment complete!"
    $0 health
    ;;
    
  # ─────────────────────────────────────────────────────────────
  # ROLLBACK: Revert to previous commit and redeploy
  # ─────────────────────────────────────────────────────────────
  rollback)
    warn "Rolling back to previous version..."
    git reset --hard HEAD~1
    
    log "🔨 Rebuilding Docker images..."
    docker compose -f "$COMPOSE_FILE" build --parallel
    
    log "🚀 Deploying previous version..."
    docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_PROD" up -d --remove-orphans
    
    log "✅ Rollback complete!"
    $0 health
    ;;
    
  # ─────────────────────────────────────────────────────────────
  # RESTART: Restart all services
  # ─────────────────────────────────────────────────────────────
  restart)
    log "Restarting all services..."
    docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_PROD" restart
    log "✅ Restart complete!"
    ;;
    
  # ─────────────────────────────────────────────────────────────
  # STATUS: Show container status
  # ─────────────────────────────────────────────────────────────
  status)
    docker compose -f "$COMPOSE_FILE" ps
    ;;
    
  # ─────────────────────────────────────────────────────────────
  # LOGS: Show logs
  # ─────────────────────────────────────────────────────────────
  logs)
    if [ -n "$2" ]; then
      docker compose -f "$COMPOSE_FILE" logs -f "$2"
    else
      docker compose -f "$COMPOSE_FILE" logs -f
    fi
    ;;
    
  # ─────────────────────────────────────────────────────────────
  # HEALTH: Check health of all services
  # ─────────────────────────────────────────────────────────────
  health)
    log "🏥 Checking service health..."
    echo ""
    
    declare -A services=(
      ["api-gateway"]="4000"
      ["auth-service"]="3001"
      ["catalog-service"]="3002"
      ["order-service"]="3003"
      ["billing-service"]="3004"
      ["instance-service"]="3005"
      ["notification-service"]="3006"
    )
    
    all_healthy=true
    for name in "${!services[@]}"; do
      port="${services[$name]}"
      if curl -sf "http://localhost:$port/api/v1/health" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $name (port $port)"
      else
        echo -e "  ${RED}✗${NC} $name (port $port)"
        all_healthy=false
      fi
    done
    
    echo ""
    if $all_healthy; then
      log "All services are healthy! ✅"
    else
      warn "Some services are unhealthy!"
    fi
    ;;
    
  # ─────────────────────────────────────────────────────────────
  # BACKUP: Backup databases
  # ─────────────────────────────────────────────────────────────
  backup)
    BACKUP_DIR="/home/deploy/backups/$(date +%Y%m%d_%H%M%S)"
    log "📦 Backing up databases to $BACKUP_DIR..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup all databases
    docker compose -f "$COMPOSE_FILE" exec -T postgres \
      pg_dumpall -U webrana > "$BACKUP_DIR/all_databases.sql"
    
    # Compress
    gzip "$BACKUP_DIR/all_databases.sql"
    
    log "✅ Backup saved to $BACKUP_DIR/all_databases.sql.gz"
    
    # Clean old backups (keep last 7 days)
    find /home/deploy/backups -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
    ;;
    
  # ─────────────────────────────────────────────────────────────
  # STOP: Stop all services
  # ─────────────────────────────────────────────────────────────
  stop)
    warn "Stopping all services..."
    docker compose -f "$COMPOSE_FILE" down
    log "✅ All services stopped"
    ;;
    
  # ─────────────────────────────────────────────────────────────
  # START: Start all services
  # ─────────────────────────────────────────────────────────────
  start)
    log "Starting all services..."
    docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_PROD" up -d
    log "✅ All services started"
    $0 health
    ;;
    
  # ─────────────────────────────────────────────────────────────
  # CLEAN: Clean up Docker resources
  # ─────────────────────────────────────────────────────────────
  clean)
    warn "Cleaning up Docker resources..."
    docker system prune -af
    log "✅ Cleanup complete"
    ;;
    
  # ─────────────────────────────────────────────────────────────
  # SHELL: Enter a container shell
  # ─────────────────────────────────────────────────────────────
  shell)
    if [ -z "$2" ]; then
      error "Usage: $0 shell <service-name>"
    fi
    docker compose -f "$COMPOSE_FILE" exec "$2" sh
    ;;
    
  # ─────────────────────────────────────────────────────────────
  # HELP: Show usage
  # ─────────────────────────────────────────────────────────────
  *)
    echo ""
    echo "WeBrana Cloud - Deployment Script"
    echo "=================================="
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  update      Pull latest code and deploy"
    echo "  rollback    Rollback to previous version"
    echo "  restart     Restart all services"
    echo "  start       Start all services"
    echo "  stop        Stop all services"
    echo "  status      Show container status"
    echo "  logs [svc]  Show logs (optionally for specific service)"
    echo "  health      Check health of all services"
    echo "  backup      Backup databases"
    echo "  clean       Clean up Docker resources"
    echo "  shell <svc> Enter container shell"
    echo ""
    exit 1
    ;;
esac
