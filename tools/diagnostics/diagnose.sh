#!/bin/bash

# Quick diagnostic script to identify issues

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}   ACT Placemat Diagnostics       ${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

# Check Node/npm
echo -e "${YELLOW}System Check:${NC}"
node_version=$(node -v 2>/dev/null || echo "NOT INSTALLED")
npm_version=$(npm -v 2>/dev/null || echo "NOT INSTALLED")
echo "  Node: $node_version"
echo "  NPM: $npm_version"
echo ""

# Check ports
echo -e "${YELLOW}Port Status:${NC}"
if lsof -i :5173 > /dev/null 2>&1; then
    echo -e "  Port 5173: ${GREEN}IN USE${NC}"
else
    echo -e "  Port 5173: ${RED}FREE${NC}"
fi

if lsof -i :4000 > /dev/null 2>&1; then
    echo -e "  Port 4000: ${GREEN}IN USE${NC}"
else
    echo -e "  Port 4000: ${RED}FREE${NC}"
fi
echo ""

# Check dependencies
echo -e "${YELLOW}Dependency Status:${NC}"

# Root deps
if [ -d "node_modules" ]; then
    echo -e "  Root node_modules: ${GREEN}EXISTS${NC}"
else
    echo -e "  Root node_modules: ${RED}MISSING${NC}"
fi

# Frontend deps
if [ -d "apps/frontend/node_modules" ]; then
    echo -e "  Frontend node_modules: ${GREEN}EXISTS${NC}"
    
    # Check critical packages
    critical_packages=(
        "@tanstack/react-query"
        "react-router-dom"
        "react"
        "react-dom"
        "vite"
    )
    
    echo ""
    echo -e "${YELLOW}Critical Frontend Packages:${NC}"
    for package in "${critical_packages[@]}"; do
        if [ -d "apps/frontend/node_modules/$package" ]; then
            echo -e "  $package: ${GREEN}✓${NC}"
        else
            echo -e "  $package: ${RED}✗ MISSING${NC}"
        fi
    done
else
    echo -e "  Frontend node_modules: ${RED}MISSING - RUN: cd apps/frontend && npm install${NC}"
fi

# Backend deps
if [ -d "apps/backend/node_modules" ]; then
    echo -e "  Backend node_modules: ${GREEN}EXISTS${NC}"
else
    echo -e "  Backend node_modules: ${RED}MISSING${NC}"
fi
echo ""

# Check if servers are responding
echo -e "${YELLOW}Server Status:${NC}"
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "  Frontend (5173): ${GREEN}RESPONDING${NC}"
else
    echo -e "  Frontend (5173): ${RED}NOT RESPONDING${NC}"
fi

if curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "  Backend (4000): ${GREEN}RESPONDING${NC}"
else
    echo -e "  Backend (4000): ${RED}NOT RESPONDING${NC}"
fi
echo ""

# Check for common issues
echo -e "${YELLOW}Common Issues Detected:${NC}"
issues_found=false

if [ ! -d "apps/frontend/node_modules/@tanstack/react-query" ]; then
    echo -e "  ${RED}❌ Missing @tanstack/react-query - This will cause white screen${NC}"
    issues_found=true
fi

if [ ! -d "apps/frontend/node_modules/react-router-dom" ]; then
    echo -e "  ${RED}❌ Missing react-router-dom - This will cause import errors${NC}"
    issues_found=true
fi

if [ ! -d "apps/frontend/node_modules" ]; then
    echo -e "  ${RED}❌ No frontend dependencies installed at all${NC}"
    issues_found=true
fi

if [ "$issues_found" = false ]; then
    echo -e "  ${GREEN}✓ No critical issues detected${NC}"
fi

echo ""
echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}Recommended Actions:${NC}"
echo -e "${BLUE}==================================${NC}"

if [ ! -d "apps/frontend/node_modules/@tanstack/react-query" ] || [ ! -d "apps/frontend/node_modules" ]; then
    echo ""
    echo -e "${YELLOW}To fix missing dependencies, run:${NC}"
    echo -e "${GREEN}./fix-and-test.sh${NC}"
    echo ""
    echo "Or manually:"
    echo "  cd apps/frontend"
    echo "  rm -rf node_modules package-lock.json"
    echo "  npm install"
    echo "  npm run dev"
else
    echo ""
    echo -e "${GREEN}Dependencies look OK. Try:${NC}"
    echo "  ./test-local.sh"
    echo ""
    echo "Then visit:"
    echo "  http://localhost:5173/test.html (static test)"
    echo "  http://localhost:5173 (main app)"
fi