#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WeBrana Cloud - Deployment Script
# Usage: ./deploy.sh [command] [options]
# Commands: start, stop, restart, update, status, logs
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$DOCKER_DIR")"

# Compose files
COMPOSE_FILE="$DOCKER_DIR/docker-compose.yml"
COMPOSE_PROD_FILE="$DOCKER_DIR/docker-compose.prod.yml"
ENV_FILE="$DOCKER_DIR/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose V2 is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found at $ENV_FILE"
        log_info "Please copy .env.example to .env and configure it."
        exit 1
    fi
    
    log_success "All requirements met."
}

get_compose_cmd() {
    echo "docker compose -f $COMPOSE_FILE -f $COMPOSE_PROD_FILE --env-file $ENV_FILE"
}

# ─────────────────────────────────────────────────────────────────────────────
# COMMANDS
# ─────────────────────────────────────────────────────────────────────────────

cmd_start() {
    log_info "Starting WeBrana Cloud services..."
    check_requirements
    
    cd "$DOCKER_DIR"
    
    # Create required directories
    mkdir -p nginx/ssl
    mkdir -p init-db
    
    # Pull latest images
    log_info "Pulling latest images..."
    $(get_compose_cmd) pull
    
    # Build custom images
    log_info "Building custom images..."
    $(get_compose_cmd) build --no-cache
    
    # Start services
    log_info "Starting services..."
    $(get_compose_cmd) up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 10
    
    # Run health check
    cmd_health
    
    log_success "WeBrana Cloud services started successfully!"
}

cmd_stop() {
    log_info "Stopping WeBrana Cloud services..."
    check_requirements
    
    cd "$DOCKER_DIR"
    $(get_compose_cmd) down
    
    log_success "Services stopped."
}

cmd_restart() {
    log_info "Restarting WeBrana Cloud services..."
    cmd_stop
    cmd_start
}

cmd_update() {
    log_info "Updating WeBrana Cloud services..."
    check_requirements
    
    cd "$PROJECT_DIR"
    
    # Pull latest code
    log_info "Pulling latest code from repository..."
    git pull origin main || git pull origin master || log_warning "Could not pull from git"
    
    cd "$DOCKER_DIR"
    
    # Rebuild and restart
    log_info "Rebuilding services..."
    $(get_compose_cmd) build --no-cache
    
    log_info "Restarting services with new images..."
    $(get_compose_cmd) up -d --force-recreate
    
    # Run migrations
    log_info "Running database migrations..."
    cmd_migrate
    
    # Health check
    cmd_health
    
    log_success "Update completed successfully!"
}

cmd_migrate() {
    log_info "Running database migrations for all services..."
    check_requirements
    
    cd "$DOCKER_DIR"
    
    # List of services with Prisma
    PRISMA_SERVICES="auth-service catalog-service order-service billing-service notification-service"
    
    for service in $PRISMA_SERVICES; do
        log_info "Running migrations for $service..."
        $(get_compose_cmd) exec -T $service npx prisma migrate deploy 2>/dev/null || \
            log_warning "Migration for $service skipped (service may not be ready)"
    done
    
    log_success "Migrations completed."
}

cmd_status() {
    log_info "Checking service status..."
    check_requirements
    
    cd "$DOCKER_DIR"
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════"
    echo "                    WEBRANA CLOUD SERVICE STATUS                        "
    echo "═══════════════════════════════════════════════════════════════════════"
    echo ""
    $(get_compose_cmd) ps
    echo ""
}

cmd_logs() {
    local service="${1:-}"
    check_requirements
    
    cd "$DOCKER_DIR"
    
    if [ -n "$service" ]; then
        log_info "Showing logs for $service..."
        $(get_compose_cmd) logs -f --tail=100 "$service"
    else
        log_info "Showing logs for all services..."
        $(get_compose_cmd) logs -f --tail=50
    fi
}

cmd_health() {
    log_info "Running health checks..."
    
    cd "$DOCKER_DIR"
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════"
    echo "                       HEALTH CHECK RESULTS                             "
    echo "═══════════════════════════════════════════════════════════════════════"
    echo ""
    
    # Call external health check script
    if [ -f "$SCRIPT_DIR/health-check.sh" ]; then
        bash "$SCRIPT_DIR/health-check.sh"
    else
        log_warning "Health check script not found. Checking container status instead..."
        $(get_compose_cmd) ps
    fi
}

cmd_backup() {
    log_info "Running database backup..."
    
    if [ -f "$SCRIPT_DIR/backup-db.sh" ]; then
        bash "$SCRIPT_DIR/backup-db.sh"
    else
        log_error "Backup script not found at $SCRIPT_DIR/backup-db.sh"
        exit 1
    fi
}

cmd_shell() {
    local service="${1:-}"
    check_requirements
    
    if [ -z "$service" ]; then
        log_error "Please specify a service name: ./deploy.sh shell <service>"
        exit 1
    fi
    
    cd "$DOCKER_DIR"
    log_info "Opening shell in $service..."
    $(get_compose_cmd) exec "$service" sh
}

cmd_help() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════"
    echo "                    WEBRANA CLOUD DEPLOYMENT SCRIPT                     "
    echo "═══════════════════════════════════════════════════════════════════════"
    echo ""
    echo "Usage: ./deploy.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start       - Start all services"
    echo "  stop        - Stop all services"
    echo "  restart     - Restart all services"
    echo "  update      - Pull latest code and redeploy"
    echo "  migrate     - Run database migrations"
    echo "  status      - Show service status"
    echo "  logs [svc]  - Show logs (optionally for specific service)"
    echo "  health      - Run health checks"
    echo "  backup      - Backup database"
    echo "  shell <svc> - Open shell in a service container"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh start"
    echo "  ./deploy.sh logs api-gateway"
    echo "  ./deploy.sh shell postgres"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
main() {
    case "${1:-help}" in
        start)
            cmd_start
            ;;
        stop)
            cmd_stop
            ;;
        restart)
            cmd_restart
            ;;
        update)
            cmd_update
            ;;
        migrate)
            cmd_migrate
            ;;
        status)
            cmd_status
            ;;
        logs)
            cmd_logs "${2:-}"
            ;;
        health)
            cmd_health
            ;;
        backup)
            cmd_backup
            ;;
        shell)
            cmd_shell "${2:-}"
            ;;
        help|--help|-h)
            cmd_help
            ;;
        *)
            log_error "Unknown command: $1"
            cmd_help
            exit 1
            ;;
    esac
}

main "$@"
