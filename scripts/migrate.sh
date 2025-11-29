#!/bin/bash
# ==============================================================================
# Database Migration Script for WeBrana Cloud
# ==============================================================================
# 
# This script runs all Prisma migrations in the correct order for production
# deployment. It uses `migrate deploy` which is safe for production
# (unlike `migrate dev` which is for development only).
#
# Prerequisites:
# - DATABASE_URL environment variable must be set for each service
# - PostgreSQL database must be running and accessible
#
# Usage:
#   ./scripts/migrate.sh                    # Run all migrations
#   ./scripts/migrate.sh --service=auth     # Run specific service migration
#   ./scripts/migrate.sh --dry-run          # Show what would be run
#
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DRY_RUN=false
SPECIFIC_SERVICE=""

# Parse arguments
for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --service=*)
      SPECIFIC_SERVICE="${arg#*=}"
      shift
      ;;
    *)
      echo -e "${RED}Unknown argument: $arg${NC}"
      exit 1
      ;;
  esac
done

echo "=============================================="
echo "WeBrana Cloud - Database Migration"
echo "=============================================="
echo ""

# Function to run migration for a service
run_migration() {
  local service=$1
  local schema_path="apps/${service}/prisma/schema.prisma"
  
  if [ ! -f "$schema_path" ]; then
    echo -e "${YELLOW}⚠ Skipping $service: schema not found at $schema_path${NC}"
    return 0
  fi

  echo -e "${GREEN}→ Migrating $service...${NC}"
  
  if [ "$DRY_RUN" = true ]; then
    echo "  [DRY RUN] npx prisma migrate deploy --schema=$schema_path"
  else
    npx prisma migrate deploy --schema="$schema_path"
  fi
  
  echo -e "${GREEN}✓ $service migration completed${NC}"
  echo ""
}

# Services in order of dependency
# 1. auth-service: No dependencies (users/auth are foundational)
# 2. catalog-service: No dependencies (catalog data is reference data)
# 3. order-service: Depends on auth (user_id) and catalog (plan_id, image_id)
# 4. billing-service: Depends on order (order_id) and auth (user_id)

SERVICES=("auth-service" "catalog-service" "order-service" "billing-service")

if [ -n "$SPECIFIC_SERVICE" ]; then
  # Run specific service only
  run_migration "$SPECIFIC_SERVICE"
else
  # Run all services in order
  for service in "${SERVICES[@]}"; do
    run_migration "$service"
  done
fi

echo "=============================================="
echo -e "${GREEN}All migrations completed successfully!${NC}"
echo "=============================================="
