#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WeBrana Cloud - Database Backup Script
# Usage: ./backup-db.sh [options]
# Options:
#   -d, --dir     Backup directory (default: /backups)
#   -r, --retain  Retention days (default: 7)
#   -c, --compress Compress backup (default: true)
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

# Default values (can be overridden by environment or arguments)
BACKUP_DIR="${BACKUP_PATH:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
COMPRESS="true"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Load environment
if [ -f "$DOCKER_DIR/.env" ]; then
    source "$DOCKER_DIR/.env"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--dir)
                BACKUP_DIR="$2"
                shift 2
                ;;
            -r|--retain)
                RETENTION_DAYS="$2"
                shift 2
                ;;
            -c|--compress)
                COMPRESS="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    echo ""
    echo "Usage: ./backup-db.sh [options]"
    echo ""
    echo "Options:"
    echo "  -d, --dir DIR        Backup directory (default: /backups)"
    echo "  -r, --retain DAYS    Retention days (default: 7)"
    echo "  -c, --compress BOOL  Compress backup (default: true)"
    echo "  -h, --help           Show this help"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# BACKUP FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
create_backup_dir() {
    log_info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"
}

backup_postgres() {
    local backup_file="$BACKUP_DIR/webrana_db_$TIMESTAMP.sql"
    
    log_info "Starting PostgreSQL backup..."
    
    # Check if postgres container is running
    if ! docker ps --format '{{.Names}}' | grep -q "webrana-postgres"; then
        log_error "PostgreSQL container is not running!"
        return 1
    fi
    
    # Create backup using pg_dump
    log_info "Running pg_dump..."
    docker exec webrana-postgres pg_dumpall \
        -U "${POSTGRES_USER:-webrana}" \
        --clean \
        --if-exists \
        > "$backup_file"
    
    if [ $? -eq 0 ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_success "Database backup created: $backup_file ($size)"
        
        # Compress if enabled
        if [ "$COMPRESS" = "true" ]; then
            log_info "Compressing backup..."
            gzip -9 "$backup_file"
            local compressed_size=$(du -h "${backup_file}.gz" | cut -f1)
            log_success "Backup compressed: ${backup_file}.gz ($compressed_size)"
        fi
        
        return 0
    else
        log_error "Database backup failed!"
        return 1
    fi
}

backup_redis() {
    local backup_file="$BACKUP_DIR/webrana_redis_$TIMESTAMP.rdb"
    
    log_info "Starting Redis backup..."
    
    # Check if redis container is running
    if ! docker ps --format '{{.Names}}' | grep -q "webrana-redis"; then
        log_warning "Redis container is not running, skipping Redis backup."
        return 0
    fi
    
    # Trigger Redis BGSAVE and copy RDB file
    log_info "Triggering Redis BGSAVE..."
    docker exec webrana-redis redis-cli \
        -a "${REDIS_PASSWORD}" \
        BGSAVE 2>/dev/null
    
    # Wait for BGSAVE to complete
    sleep 5
    
    # Copy RDB file
    docker cp webrana-redis:/data/dump.rdb "$backup_file" 2>/dev/null || {
        log_warning "Redis RDB file not found, backup may be empty."
        return 0
    }
    
    if [ -f "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_success "Redis backup created: $backup_file ($size)"
    fi
    
    return 0
}

cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."
    
    local count=$(find "$BACKUP_DIR" -name "webrana_*" -mtime +$RETENTION_DAYS 2>/dev/null | wc -l)
    
    if [ "$count" -gt 0 ]; then
        find "$BACKUP_DIR" -name "webrana_*" -mtime +$RETENTION_DAYS -delete
        log_success "Removed $count old backup(s)."
    else
        log_info "No old backups to clean up."
    fi
}

generate_backup_report() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════"
    echo "                         BACKUP REPORT                                  "
    echo "═══════════════════════════════════════════════════════════════════════"
    echo ""
    echo "Timestamp:        $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Backup Directory: $BACKUP_DIR"
    echo "Retention Days:   $RETENTION_DAYS"
    echo ""
    echo "Current Backups:"
    echo "─────────────────────────────────────────────────────────────────────────"
    ls -lh "$BACKUP_DIR"/webrana_* 2>/dev/null || echo "No backups found."
    echo ""
    echo "Total Size:       $(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)"
    echo "═══════════════════════════════════════════════════════════════════════"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
main() {
    parse_args "$@"
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════"
    echo "                  WEBRANA CLOUD DATABASE BACKUP                         "
    echo "═══════════════════════════════════════════════════════════════════════"
    echo ""
    
    # Validate requirements
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed!"
        exit 1
    fi
    
    # Create backup directory
    create_backup_dir
    
    # Perform backups
    local backup_success=true
    
    backup_postgres || backup_success=false
    backup_redis || backup_success=false
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Generate report
    generate_backup_report
    
    if [ "$backup_success" = true ]; then
        log_success "Backup completed successfully!"
        exit 0
    else
        log_error "Backup completed with errors!"
        exit 1
    fi
}

main "$@"
