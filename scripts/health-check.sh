#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# WeBrana Cloud - Health Check Script
# Checks services via Docker network (ports not exposed to host)
# ═══════════════════════════════════════════════════════════════════════════════

echo "🏥 Running Health Checks..."

FAILED=0

# Check service via docker exec (services not exposed to host)
check_internal_service() {
    local name=$1
    local url=$2
    
    if docker exec webrana-api-gateway wget -qO- --timeout=5 "$url" > /dev/null 2>&1; then
        echo "✅ $name is healthy"
    else
        echo "❌ $name is UNHEALTHY ($url)"
        FAILED=1
    fi
}

# Check public endpoint (nginx exposed on port 80)
check_public() {
    local name=$1
    local url=$2
    
    if curl -sf --max-time 5 "$url" > /dev/null 2>&1; then
        echo "✅ $name is healthy"
    else
        echo "❌ $name is UNHEALTHY ($url)"
        FAILED=1
    fi
}

# Check Nginx (Public Entrypoint - exposed on port 80)
check_public "Nginx/Public" "http://localhost/health"

# Check Internal Services via Docker network
check_internal_service "API Gateway" "http://api-gateway:3000/api/v1/health"
check_internal_service "Auth Service" "http://auth-service:3001/api/v1/auth/health"
check_internal_service "Catalog Service" "http://catalog-service:3002/api/v1/health"
check_internal_service "Order Service" "http://order-service:3003/api/v1/health"
check_internal_service "Billing Service" "http://billing-service:3004/api/v1/health"
check_internal_service "Instance Service" "http://instance-service:3005/api/v1/health"
check_internal_service "Notification Service" "http://notification-service:3005/api/v1/health"

if [ $FAILED -eq 0 ]; then
    echo "✨ All systems operational"
    exit 0
else
    echo "🔥 Some services failed health checks"
    exit 1
fi
