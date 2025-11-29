#!/bin/bash
# ==============================================================================
# Database Seed Script for WeBrana Cloud
# ==============================================================================
# 
# This script runs all Prisma seed scripts to populate initial data.
# Seeds are idempotent (use upsert) so they can be run multiple times safely.
#
# Prerequisites:
# - DATABASE_URL environment variable must be set for each service
# - Migrations must have been run first
# - For auth-service: optionally set SUPER_ADMIN_PASSWORD and ADMIN_PASSWORD
#
# Usage:
#   ./scripts/seed.sh                       # Run all seeds
#   ./scripts/seed.sh --service=catalog     # Run specific service seed
#   ./scripts/seed.sh --dry-run             # Show what would be run
#
# Environment Variables (optional):
#   SUPER_ADMIN_PASSWORD  - Password for super admin user
#   ADMIN_PASSWORD        - Password for admin user
#   DEMO_CUSTOMER_PASSWORD - Password for demo customer (non-production only)
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
echo "WeBrana Cloud - Database Seeding"
echo "=============================================="
echo ""

# Function to run seed for a service
run_seed() {
  local service=$1
  local schema_path="apps/${service}/prisma/schema.prisma"
  local seed_path="apps/${service}/prisma/seed.ts"
  
  if [ ! -f "$seed_path" ]; then
    echo -e "${YELLOW}⚠ Skipping $service: seed script not found at $seed_path${NC}"
    return 0
  fi

  echo -e "${GREEN}→ Seeding $service...${NC}"
  
  if [ "$DRY_RUN" = true ]; then
    echo "  [DRY RUN] npx prisma db seed --schema=$schema_path"
  else
    npx prisma db seed --schema="$schema_path"
  fi
  
  echo -e "${GREEN}✓ $service seeding completed${NC}"
  echo ""
}

# Services with seed scripts (in order)
# 1. auth-service: Admin users (needed for other services)
# 2. catalog-service: Plans, images, coupons (needed for orders)
# Note: order-service seed is for development/testing only

SEEDABLE_SERVICES=("auth-service" "catalog-service")

if [ -n "$SPECIFIC_SERVICE" ]; then
  # Run specific service only
  run_seed "$SPECIFIC_SERVICE"
else
  # Run all seedable services in order
  for service in "${SEEDABLE_SERVICES[@]}"; do
    run_seed "$service"
  done
fi

echo "=============================================="
echo -e "${GREEN}All seeding completed successfully!${NC}"
echo "=============================================="
echo ""
echo "NOTE: For production, please ensure you have changed"
echo "      the default admin passwords immediately!"
