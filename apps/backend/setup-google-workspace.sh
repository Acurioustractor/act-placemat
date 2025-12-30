#!/bin/bash

# Google Workspace Multi-Account Setup Helper
# This script helps configure the service account for multi-account Gmail scanning

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}Google Workspace Multi-Account Setup${NC}"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must be run from /apps/backend directory${NC}"
    exit 1
fi

# Step 1: Check for service account file
echo -e "${BOLD}Step 1: Checking for service account file...${NC}"

SERVICE_ACCOUNT_PATH="./subscription-tracker/config/service-account.json"

if [ -f "$SERVICE_ACCOUNT_PATH" ]; then
    echo -e "${GREEN}✓ Service account file found${NC}"
else
    echo -e "${YELLOW}✗ Service account file not found${NC}"
    echo ""
    echo "Please download your service account key from:"
    echo "https://console.cloud.google.com/iam-admin/serviceaccounts"
    echo ""
    echo "Then move it to:"
    echo "$(pwd)/$SERVICE_ACCOUNT_PATH"
    echo ""
    read -p "Press Enter once you've placed the file, or Ctrl+C to exit..."

    if [ ! -f "$SERVICE_ACCOUNT_PATH" ]; then
        echo -e "${RED}✗ File still not found. Exiting.${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Service account file found${NC}"
fi

# Secure the file
chmod 600 "$SERVICE_ACCOUNT_PATH"
echo -e "${GREEN}✓ Set secure permissions (600) on service account file${NC}"

# Extract client ID from service account file
CLIENT_ID=$(grep -o '"client_id": "[^"]*' "$SERVICE_ACCOUNT_PATH" | sed 's/"client_id": "//')
PROJECT_ID=$(grep -o '"project_id": "[^"]*' "$SERVICE_ACCOUNT_PATH" | sed 's/"project_id": "//')

echo ""
echo -e "${BOLD}Service Account Details:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Client ID: $CLIENT_ID"

# Step 2: Update .gitignore
echo ""
echo -e "${BOLD}Step 2: Updating .gitignore...${NC}"

if grep -q "service-account.json" ../../.gitignore 2>/dev/null; then
    echo -e "${GREEN}✓ .gitignore already includes service-account.json${NC}"
else
    echo "subscription-tracker/config/service-account.json" >> ../../.gitignore
    echo "apps/backend/subscription-tracker/config/service-account.json" >> ../../.gitignore
    echo -e "${GREEN}✓ Added service-account.json to .gitignore${NC}"
fi

# Step 3: Update .env
echo ""
echo -e "${BOLD}Step 3: Updating .env file...${NC}"

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}✗ .env file not found, creating...${NC}"
    touch "$ENV_FILE"
fi

# Add Google Workspace config if not present
if grep -q "GOOGLE_WORKSPACE_MULTI_ACCOUNT" "$ENV_FILE"; then
    echo -e "${YELLOW}! Google Workspace config already exists in .env${NC}"
    echo "  Please verify the settings manually"
else
    echo "" >> "$ENV_FILE"
    echo "# Google Workspace Multi-Account (added by setup script)" >> "$ENV_FILE"
    echo "GOOGLE_WORKSPACE_MULTI_ACCOUNT=true" >> "$ENV_FILE"
    echo "GOOGLE_SERVICE_ACCOUNT_PATH=./subscription-tracker/config/service-account.json" >> "$ENV_FILE"
    echo "GOOGLE_WORKSPACE_DOMAIN=act.place" >> "$ENV_FILE"
    echo "GOOGLE_WORKSPACE_ACCOUNTS=nicholas@act.place,hi@act.place,accounts@act.place" >> "$ENV_FILE"
    echo -e "${GREEN}✓ Added Google Workspace config to .env${NC}"
fi

# Step 4: Domain-wide delegation instructions
echo ""
echo -e "${BOLD}Step 4: Configure Domain-Wide Delegation${NC}"
echo ""
echo "You need to authorize this service account in Google Workspace Admin Console:"
echo ""
echo "1. Go to: https://admin.google.com/"
echo "2. Navigate to: Security → Access and data control → API controls"
echo "3. Click 'MANAGE DOMAIN WIDE DELEGATION'"
echo "4. Click 'Add new' and enter:"
echo ""
echo -e "   ${BOLD}Client ID:${NC} ${GREEN}$CLIENT_ID${NC}"
echo -e "   ${BOLD}OAuth Scopes:${NC} ${GREEN}https://www.googleapis.com/auth/gmail.readonly${NC}"
echo ""
echo "5. Click 'AUTHORIZE'"
echo ""
read -p "Press Enter once you've completed this step, or Ctrl+C to do it later..."

# Step 5: Test the configuration
echo ""
echo -e "${BOLD}Step 5: Testing multi-account scanning...${NC}"
echo ""

cd subscription-tracker
if node test-multi-account.js; then
    echo ""
    echo -e "${GREEN}${BOLD}✓ SUCCESS!${NC} ${GREEN}Multi-account scanning is configured correctly!${NC}"
    echo ""
    echo "You can now:"
    echo "  • Scan all 3 @act.place email accounts simultaneously"
    echo "  • Track which account discovered each subscription"
    echo "  • Migrate vendors to accounts@act.place"
    echo ""
else
    echo ""
    echo -e "${YELLOW}Test failed. This could mean:${NC}"
    echo "  1. Domain-wide delegation needs 10-15 min to propagate"
    echo "  2. Client ID doesn't match in Admin Console"
    echo "  3. OAuth scope is incorrect"
    echo ""
    echo "Wait 15 minutes and run the test again:"
    echo "  cd subscription-tracker && node test-multi-account.js"
    echo ""
    echo -e "${YELLOW}Note: System will automatically fall back to single-account OAuth${NC}"
fi

echo ""
echo "Setup script complete!"
echo ""
