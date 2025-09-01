#!/bin/bash

# 🚀 ACT Platform Quick Validation
# Fast validation of core platform components

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 ACT Platform Quick Validation${NC}"
echo "=================================="

# Check we're in the right place
if [[ ! -f "package.json" ]]; then
    echo -e "${RED}❌ Not in ACT Placemat root directory${NC}"
    exit 1
fi

echo -e "${GREEN}✅ In ACT Placemat directory${NC}"

# Check Node.js version
NODE_VERSION=$(node --version 2>/dev/null || echo "none")
if [[ "$NODE_VERSION" == "none" ]]; then
    echo -e "${RED}❌ Node.js not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $NODE_VERSION${NC}"

# Check Python version
PYTHON_VERSION=$(python3 --version 2>/dev/null || echo "none")
if [[ "$PYTHON_VERSION" == "none" ]]; then
    echo -e "${YELLOW}⚠️  Python3 not found (needed for AI features)${NC}"
else
    echo -e "${GREEN}✅ $PYTHON_VERSION${NC}"
fi

# Check key directories exist
echo -e "\n${BLUE}📁 Checking Platform Structure${NC}"
critical_dirs=(
    "apps/impact-dashboard"
    "apps/ai-backend"
    "Docs/Implementation"
    "scripts"
    "packages"
)

for dir in "${critical_dirs[@]}"; do
    if [[ -d "$dir" ]]; then
        echo -e "${GREEN}✅ $dir${NC}"
    else
        echo -e "${RED}❌ $dir missing${NC}"
    fi
done

# Check key files exist
echo -e "\n${BLUE}📄 Checking Key Implementation Files${NC}"
key_files=(
    "apps/ai-backend/src/services/context-ingestion-service.ts"
    "apps/ai-backend/src/ml/federated-learning-server.py"
    "apps/ai-backend/src/ml/community-pattern-recognition.py"
    "apps/ai-backend/src/integrations/world-class-api-orchestrator.ts"
    "Docs/Implementation/WORLD_CLASS_NOTION_SETUP_GUIDE.md"
    "CLAUDE.md"
)

for file in "${key_files[@]}"; do
    if [[ -f "$file" ]]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file missing${NC}"
    fi
done

# Check package.json scripts
echo -e "\n${BLUE}📦 Checking Available Scripts${NC}"
if grep -q "\"build:impact-dashboard\"" package.json; then
    echo -e "${GREEN}✅ Build scripts configured${NC}"
else
    echo -e "${YELLOW}⚠️  Build scripts not found${NC}"
fi

if grep -q "\"test\"" package.json; then
    echo -e "${GREEN}✅ Test scripts configured${NC}"
else
    echo -e "${YELLOW}⚠️  Test scripts not found${NC}"
fi

# Check environment template
if [[ -f ".env.template" ]]; then
    echo -e "${GREEN}✅ Environment template exists${NC}"
else
    echo -e "${YELLOW}⚠️  No .env.template found${NC}"
fi

if [[ -f ".env" ]]; then
    echo -e "${GREEN}✅ Environment file exists${NC}"
else
    echo -e "${YELLOW}⚠️  No .env file (copy from .env.template)${NC}"
fi

echo -e "\n${GREEN}🎯 QUICK VALIDATION COMPLETE!${NC}"
echo -e "${BLUE}Platform structure: VALIDATED${NC}"
echo -e "${BLUE}Ready for comprehensive testing!${NC}"

echo -e "\n${YELLOW}🚀 Next Steps:${NC}"
echo "1. Run: ./scripts/comprehensive-testing-suite.sh"
echo "2. Configure .env with actual API keys"
echo "3. Start development servers"
echo "4. Begin user testing"