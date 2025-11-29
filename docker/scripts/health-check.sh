#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WeBrana Cloud - Health Check Script
# Usage: ./health-check.sh [options]
# Options:
#   -v, --verbose  Show detailed output
#   -j, --json     Output as JSON
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

VERBOSE=false
JSON_OUTPUT=false

# Service definitions
declare -A SERVICES=(
    ["postgres"]="webrana-postgres:5432"
    ["redis"]="webrana-redis:6379"
    ["api-gateway"]="webrana-api-gateway:4000"
    ["auth-service"]="webrana-auth-service:3001"
    ["catalog-service"]="webrana-catalog-service:3002"
    ["order-service"]="webrana-order-service:3003"
    ["billing-service"]="webrana-billing-service:3004"
    ["instance-service"]="webrana-instance-service:3005"
    ["notification-service"]="webrana-notification-service:3006"
    ["customer-web"]="webrana-customer-web:3000"
    ["admin-web"]="webrana-admin-web:3100"
    ["nginx"]="webrana-nginx:80"
)

# Health check endpoints
declare -A HEALTH_ENDPOINTS=(
    ["api-gateway"]="/api/v1/health"
    ["auth-service"]="/api/v1/auth/health"
    ["catalog-service"]="/api/v1/health"
    ["order-service"]="/api/v1/health"
    ["billing-service"]="/api/v1/health"
    ["instance-service"]="/api/v1/health"
    ["notification-service"]="/api/v1/health"
    ["customer-web"]="/"
    ["admin-web"]="/"
    ["nginx"]="/health"
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -j|--json)
                JSON_OUTPUT=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                shift
                ;;
        esac
    done
}

show_help() {
    echo ""
    echo "Usage: ./health-check.sh [options]"
    echo ""
    echo "Options:"
    echo "  -v, --verbose  Show detailed output"
    echo "  -j, --json     Output as JSON"
    echo "  -h, --help     Show this help"
    echo ""
}

print_status() {
    local service="$1"
    local status="$2"
    local details="$3"
    
    if [ "$JSON_OUTPUT" = true ]; then
        return
    fi
    
    local status_icon
    local status_color
    
    case "$status" in
        "healthy")
            status_icon="✅"
            status_color="$GREEN"
            ;;
        "unhealthy")
            status_icon="❌"
            status_color="$RED"
            ;;
        "warning")
            status_icon="⚠️"
            status_color="$YELLOW"
            ;;
        *)
            status_icon="❓"
            status_color="$NC"
            ;;
    esac
    
    printf "%-22s ${status_color}%-10s${NC} %s\n" "$service" "$status_icon $status" "$details"
}

# ─────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
check_container_running() {
    local container_name="$1"
    docker ps --format '{{.Names}}' | grep -q "^${container_name}$"
}

check_container_healthy() {
    local container_name="$1"
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null)
    [ "$health_status" = "healthy" ]
}

check_http_endpoint() {
    local container_name="$1"
    local port="$2"
    local endpoint="$3"
    
    local response=$(docker exec "$container_name" wget -q -O - --timeout=5 \
        "http://localhost:${port}${endpoint}" 2>/dev/null || echo "failed")
    
    [ "$response" != "failed" ]
}

check_postgres() {
    local container_name="webrana-postgres"
    
    if ! check_container_running "$container_name"; then
        echo "not_running"
        return
    fi
    
    local result=$(docker exec "$container_name" pg_isready -U webrana 2>/dev/null)
    if echo "$result" | grep -q "accepting connections"; then
        echo "healthy"
    else
        echo "unhealthy"
    fi
}

check_redis() {
    local container_name="webrana-redis"
    
    if ! check_container_running "$container_name"; then
        echo "not_running"
        return
    fi
    
    local result=$(docker exec "$container_name" redis-cli ping 2>/dev/null)
    if [ "$result" = "PONG" ]; then
        echo "healthy"
    else
        echo "unhealthy"
    fi
}

check_web_service() {
    local service_name="$1"
    local container_name="$2"
    local port="$3"
    local endpoint="${HEALTH_ENDPOINTS[$service_name]:-/}"
    
    if ! check_container_running "$container_name"; then
        echo "not_running"
        return
    fi
    
    # First check Docker health status
    if check_container_healthy "$container_name"; then
        echo "healthy"
        return
    fi
    
    # Fallback to HTTP check
    if check_http_endpoint "$container_name" "$port" "$endpoint"; then
        echo "healthy"
    else
        echo "unhealthy"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
main() {
    parse_args "$@"
    
    local total_services=0
    local healthy_services=0
    local unhealthy_services=0
    local json_results=()
    
    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        echo "═══════════════════════════════════════════════════════════════════════"
        echo "                    WEBRANA CLOUD HEALTH CHECK                          "
        echo "═══════════════════════════════════════════════════════════════════════"
        echo ""
        printf "%-22s %-12s %s\n" "SERVICE" "STATUS" "DETAILS"
        echo "─────────────────────────────────────────────────────────────────────────"
    fi
    
    # Check each service
    for service_name in postgres redis api-gateway auth-service catalog-service order-service billing-service instance-service notification-service customer-web admin-web nginx; do
        local service_info="${SERVICES[$service_name]}"
        local container_name=$(echo "$service_info" | cut -d: -f1)
        local port=$(echo "$service_info" | cut -d: -f2)
        local status
        local details=""
        
        ((total_services++))
        
        case "$service_name" in
            postgres)
                status=$(check_postgres)
                details="PostgreSQL database"
                ;;
            redis)
                status=$(check_redis)
                details="Redis cache"
                ;;
            *)
                status=$(check_web_service "$service_name" "$container_name" "$port")
                details="Port $port"
                ;;
        esac
        
        if [ "$status" = "healthy" ]; then
            ((healthy_services++))
        else
            ((unhealthy_services++))
        fi
        
        if [ "$JSON_OUTPUT" = true ]; then
            json_results+=("{\"service\":\"$service_name\",\"status\":\"$status\",\"container\":\"$container_name\",\"port\":\"$port\"}")
        else
            print_status "$service_name" "$status" "$details"
        fi
    done
    
    # Output results
    if [ "$JSON_OUTPUT" = true ]; then
        local json_array=$(IFS=,; echo "${json_results[*]}")
        echo "{\"timestamp\":\"$(date -Iseconds)\",\"total\":$total_services,\"healthy\":$healthy_services,\"unhealthy\":$unhealthy_services,\"services\":[$json_array]}"
    else
        echo "─────────────────────────────────────────────────────────────────────────"
        echo ""
        echo "Summary: $healthy_services/$total_services services healthy"
        
        if [ $unhealthy_services -gt 0 ]; then
            echo -e "${RED}WARNING: $unhealthy_services service(s) unhealthy!${NC}"
            echo ""
            exit 1
        else
            echo -e "${GREEN}All services are healthy!${NC}"
            echo ""
            exit 0
        fi
    fi
}

main "$@"
