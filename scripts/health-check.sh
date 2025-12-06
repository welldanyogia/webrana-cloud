#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# WeBrana Cloud - Health Check Script
# ═══════════════════════════════════════════════════════════════════════════════

echo "🏥 Running Health Checks..."

FAILED=0

check_service() {
    local name=$1
    local url=$2
    
    if curl -sf "$url" > /dev/null 2>&1; then
        echo "✅ $name is healthy"
    else
        echo "❌ $name is UNHEALTHY ($url)"
        FAILED=1
    fi
}

# Check Nginx (Public Entrypoint)
check_service "Nginx/Public" "http://localhost/health"

# Check Internal Services (Localhost Ports)
# API Gateway
check_service "API Gateway" "http://localhost:3000/api/v1/health"
# Auth Service
check_service "Auth Service" "http://localhost:3001/api/v1/health"
# Catalog Service
check_service "Catalog Service" "http://localhost:3002/api/v1/health"
# Order Service
check_service "Order Service" "http://localhost:3003/api/v1/health"

if [ $FAILED -eq 0 ]; then
    echo "✨ All systems operational"
    exit 0
else
    echo "🔥 Some services failed health checks"
    exit 1
fi
