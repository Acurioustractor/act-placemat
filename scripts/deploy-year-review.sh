#!/bin/bash

# Year in Review - Vercel Deployment Script
# This script handles the full deployment process for the webflow-portfolio app
#
# Usage:
#   ./scripts/deploy-year-review.sh           # Deploy to production
#   ./scripts/deploy-year-review.sh --preview # Deploy preview only
#   ./scripts/deploy-year-review.sh --sync    # Sync data to Supabase first

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WEBFLOW_DIR="$PROJECT_ROOT/apps/webflow-portfolio"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Year in Review Deployment ===${NC}"
echo ""

# Load environment variables from .env
if [ -f "$PROJECT_ROOT/.env" ]; then
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | grep -E '^SUPABASE_URL=' | xargs)
fi

# Set Next.js public variables
# Note: The .env file has keys labeled backwards, so we use the correct anon key explicitly
# This is the PUBLIC anon key (role="anon") - safe to use in client-side code
export NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL:-https://tednluwflfhxyucgwigh.supabase.co}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDYyMjksImV4cCI6MjA2NzkyMjIyOX0.PG0iGZQR2d8yo4y3q1e2tEIMa3J0AdFkI1Q6P7IDgrg"

echo "  Using Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"

# Parse arguments
SYNC_DATA=false
PREVIEW_ONLY=false

for arg in "$@"; do
  case $arg in
    --sync)
      SYNC_DATA=true
      ;;
    --preview)
      PREVIEW_ONLY=true
      ;;
  esac
done

# Step 1: Optionally sync data to Supabase
if [ "$SYNC_DATA" = true ]; then
  echo -e "${YELLOW}Step 1: Syncing curated data to Supabase...${NC}"
  node "$SCRIPT_DIR/supabase-exec.js" --sync-curated
  echo ""
fi

# Step 2: Verify Supabase tables have data
echo -e "${YELLOW}Step 2: Verifying Supabase data...${NC}"
node "$SCRIPT_DIR/supabase-exec.js" --check review_curated_entries
echo ""

# Step 3: Clean previous build (including node_modules cache to prevent stale builds)
echo -e "${YELLOW}Step 3: Cleaning previous build...${NC}"
cd "$WEBFLOW_DIR"
rm -rf .next .vercel/output node_modules/.cache
echo "  ✓ Cleaned .next, .vercel/output, and node_modules/.cache"
echo ""

# Step 4: Build with Vercel
echo -e "${YELLOW}Step 4: Building for Vercel...${NC}"
vercel build --prod
echo ""

# Step 5: Deploy
if [ "$PREVIEW_ONLY" = true ]; then
  echo -e "${YELLOW}Step 5: Deploying preview...${NC}"
  vercel deploy --prebuilt
else
  echo -e "${YELLOW}Step 5: Deploying to production...${NC}"
  vercel deploy --prebuilt --prod
fi

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Production URL: https://webflow-portfolio-one.vercel.app/2025-review"
echo ""

# Step 6: Quick health check
echo -e "${YELLOW}Step 6: Health check...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://webflow-portfolio-one.vercel.app/2025-review")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "  ${GREEN}✓ Site responding with HTTP $HTTP_CODE${NC}"
else
  echo -e "  ${RED}✗ Site returned HTTP $HTTP_CODE${NC}"
fi
