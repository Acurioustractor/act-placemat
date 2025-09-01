#!/bin/bash

# ACT Intelligence Platform Launcher
# This script starts the unified intelligence system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Header
clear
echo -e "${CYAN}${BOLD}"
echo "════════════════════════════════════════════════════════════"
echo "   🧠  ACT UNIFIED INTELLIGENCE PLATFORM"
echo "   Revolutionary Business Intelligence for Communities"
echo "════════════════════════════════════════════════════════════"
echo -e "${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}Navigating to project root...${NC}"
    cd /Users/benknight/Code/ACT\ Placemat
fi

# Check if intelligence app exists
if [ ! -d "apps/intelligence" ]; then
    echo -e "${RED}❌ Intelligence app not found!${NC}"
    echo -e "${YELLOW}Run the setup first:${NC}"
    echo "  git checkout unified-intelligence"
    echo "  cd apps/intelligence"
    echo "  npm install"
    exit 1
fi

cd apps/intelligence

# Check for node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file${NC}"
    echo -e "${YELLOW}Add your API keys to .env for live data${NC}"
fi

# Check if API keys are configured
if grep -q "ANTHROPIC_API_KEY=demo-mode" .env || grep -q "OPENAI_API_KEY=demo-mode" .env; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  Running in DEMO MODE (no API keys configured)${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}To enable live data, add API keys to apps/intelligence/.env:${NC}"
    echo "  • Anthropic: https://console.anthropic.com/"
    echo "  • OpenAI: https://platform.openai.com/"
    echo "  • Perplexity: https://www.perplexity.ai/settings/api"
    echo ""
else
    echo -e "${GREEN}✅ API keys detected - Live mode available${NC}"
fi

# Menu
echo -e "${BOLD}Select an option:${NC}"
echo "  1) 🎮 Interactive Demo (recommended for first time)"
echo "  2) 🚀 Start API Server (for production)"
echo "  3) 🧪 Run Test Queries"
echo "  4) 📚 View Documentation"
echo "  5) ⚙️  Configure API Keys"
echo "  0) Exit"
echo ""

read -p "$(echo -e ${CYAN}Enter choice [1-5]: ${NC})" choice

case $choice in
    1)
        echo -e "${GREEN}Starting Interactive Demo...${NC}"
        npm run demo
        ;;
    2)
        echo -e "${GREEN}Starting Intelligence API Server...${NC}"
        echo -e "${CYAN}API will be available at: http://localhost:3100${NC}"
        npm start
        ;;
    3)
        echo -e "${GREEN}Running Test Queries...${NC}"
        npm run query
        ;;
    4)
        echo -e "${GREEN}Opening Documentation...${NC}"
        if command -v code &> /dev/null; then
            code README.md
        else
            cat README.md | less
        fi
        ;;
    5)
        echo -e "${GREEN}Opening .env for configuration...${NC}"
        if command -v code &> /dev/null; then
            code .env
        elif command -v nano &> /dev/null; then
            nano .env
        else
            vi .env
        fi
        echo -e "${YELLOW}After adding keys, restart this script${NC}"
        ;;
    0)
        echo -e "${GREEN}Goodbye! 👋${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac