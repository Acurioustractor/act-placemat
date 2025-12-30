#!/bin/bash

# ACT Subscription Tracker - Quick Setup Script
# Automates initial setup for development

set -e  # Exit on error

echo "🚜 ACT Subscription Tracker - Setup Script"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} Found $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found!"
    echo "Install from: https://nodejs.org/"
    exit 1
fi

# Check Python
echo -n "Checking Python... "
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    PYTHON_PATH=$(which python3)
    echo -e "${GREEN}✓${NC} Found $PYTHON_VERSION at $PYTHON_PATH"
else
    echo -e "${RED}✗${NC} Python 3 not found!"
    echo "Install from: https://www.python.org/"
    exit 1
fi

# Check Tesseract OCR
echo -n "Checking Tesseract OCR... "
if command -v tesseract &> /dev/null; then
    TESSERACT_VERSION=$(tesseract --version 2>&1 | head -n 1)
    echo -e "${GREEN}✓${NC} Found $TESSERACT_VERSION"
else
    echo -e "${YELLOW}⚠${NC} Tesseract OCR not found"
    echo "Install with:"
    echo "  macOS:   brew install tesseract"
    echo "  Ubuntu:  sudo apt-get install tesseract-ocr"
    echo "  Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create Python virtual environment
echo ""
echo "Setting up Python environment..."
cd services/ai

if [ ! -d "venv" ]; then
    echo -n "Creating virtual environment... "
    python3 -m venv venv
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC} Virtual environment already exists"
fi

# Activate virtual environment
echo -n "Activating virtual environment... "
source venv/bin/activate
echo -e "${GREEN}✓${NC}"

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Python dependencies installed"
else
    echo -e "${RED}✗${NC} Failed to install Python dependencies"
    exit 1
fi

deactivate

# Back to project root
cd ../..

# Check .env file
echo ""
echo "Checking environment configuration..."

ENV_FILE="../../.env"

if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"

    # Check for subscription tracker variables
    if grep -q "SUBSCRIPTION_TRACKER" "$ENV_FILE"; then
        echo -e "${GREEN}✓${NC} Subscription tracker variables found"
    else
        echo -e "${YELLOW}⚠${NC} Subscription tracker variables not found in .env"
        echo ""
        echo "Add these to your .env file:"
        echo ""
        echo "# === SUBSCRIPTION TRACKER ==="
        echo "NOTION_RD_DATABASE_ID=your_notion_database_id"
        echo "PYTHON_PATH=$PYTHON_PATH"
        echo "OCR_CONFIDENCE_THRESHOLD=0.75"
        echo "NER_MODEL=dslim/bert-base-NER"
        echo "SUBSCRIPTION_CACHE_TTL=86400"
        echo "RD_TRACKING_ENABLED=true"
        echo "RD_DEFAULT_DEVELOPER=Your Name"
        echo ""
    fi
else
    echo -e "${RED}✗${NC} .env file not found at $ENV_FILE"
    echo "Create .env file with required variables (see DEPLOYMENT.md)"
    exit 1
fi

# Check database migration
echo ""
echo "Database migration:"
echo -e "${YELLOW}⚠${NC} You need to manually run the database migration:"
echo ""
echo "  cd /Users/benknight/Code/ACT\\ Placemat"
echo "  npx supabase db push --file apps/backend/subscription-tracker/migrations/20260101000000_subscription_tracker.sql"
echo ""
echo "Or apply via Supabase SQL editor (see DEPLOYMENT.md)"

# Success summary
echo ""
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Configure .env variables (if not done)"
echo "  2. Run database migration (see above)"
echo "  3. Start server: npm run dev"
echo "  4. Test discovery: curl -X POST 'http://localhost:4000/api/v1/subscriptions/discover?tenantId=test'"
echo ""
echo "Documentation:"
echo "  - README.md - Full documentation"
echo "  - DEPLOYMENT.md - Deployment guide"
echo "  - API endpoints at: http://localhost:4000/api/v1/subscriptions"
echo ""
echo "Happy tracking! 🚜"
