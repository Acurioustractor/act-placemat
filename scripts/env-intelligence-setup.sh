#!/usr/bin/env bash

# =============================================================================
# 🧠 ACT PLACEMAT - INTELLIGENCE ENVIRONMENT SETUP SCRIPT
# =============================================================================
# Bulletproof environment setup for world-class AI intelligence

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}🧠 ACT Placemat Intelligence Environment Setup${NC}"
echo "=========================================="

# =============================================================================
# ENVIRONMENT VALIDATION
# =============================================================================

validate_ai_keys() {
    echo -e "\n${BLUE}🔑 Validating AI Provider Keys...${NC}"
    
    local missing_keys=()
    
    # Check critical AI keys
    if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
        missing_keys+=("ANTHROPIC_API_KEY (Primary AI - Critical)")
    fi
    
    if [[ -z "${PERPLEXITY_API_KEY:-}" ]]; then
        missing_keys+=("PERPLEXITY_API_KEY (Research AI - Highly Recommended)")
    fi
    
    if [[ -z "${OPENAI_API_KEY:-}" ]]; then
        missing_keys+=("OPENAI_API_KEY (Fallback AI - Recommended)")
    fi
    
    if [[ ${#missing_keys[@]} -eq 0 ]]; then
        echo -e "${GREEN}✅ All critical AI keys are configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Missing AI keys:${NC}"
        for key in "${missing_keys[@]}"; do
            echo -e "   - ${key}"
        done
        echo -e "\n${YELLOW}💡 Intelligence will work with partial setup, but full functionality requires all keys${NC}"
    fi
}

validate_business_integrations() {
    echo -e "\n${BLUE}🏢 Validating Business Integrations...${NC}"
    
    local integrations=()
    
    if [[ -n "${NOTION_TOKEN:-}" ]]; then
        integrations+=("✅ Notion (Knowledge Management)")
    else
        integrations+=("❌ Notion (Knowledge Management)")
    fi
    
    if [[ -n "${XERO_CLIENT_ID:-}" && -n "${XERO_CLIENT_SECRET:-}" ]]; then
        integrations+=("✅ Xero (Financial Intelligence)")
    else
        integrations+=("❌ Xero (Financial Intelligence)")
    fi
    
    if [[ -n "${SUPABASE_URL:-}" && -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
        integrations+=("✅ Supabase (Database)")
    else
        integrations+=("❌ Supabase (Database)")
    fi
    
    if [[ -n "${GMAIL_CLIENT_ID:-}" && -n "${GMAIL_CLIENT_SECRET:-}" ]]; then
        integrations+=("✅ Gmail (Email Intelligence)")
    else
        integrations+=("❌ Gmail (Email Intelligence)")
    fi
    
    echo "Business Integration Status:"
    for integration in "${integrations[@]}"; do
        echo -e "   ${integration}"
    done
}

# =============================================================================
# INTELLIGENT ENVIRONMENT SETUP
# =============================================================================

setup_intelligence_config() {
    echo -e "\n${BLUE}🎯 Setting up Intelligence Configuration...${NC}"
    
    # Load intelligence environment if it exists
    if [[ -f "$PROJECT_ROOT/config/intelligence.env" ]]; then
        echo -e "${GREEN}✅ Loading enhanced intelligence configuration${NC}"
        set -a
        source "$PROJECT_ROOT/config/intelligence.env"
        set +a
    else
        echo -e "${YELLOW}⚠️  Intelligence configuration not found at config/intelligence.env${NC}"
    fi
    
    # Set intelligent defaults if not configured
    export AI_PRIMARY_MODEL="${AI_PRIMARY_MODEL:-claude-3-5-sonnet-20241022}"
    export AI_RESEARCH_MODEL="${AI_RESEARCH_MODEL:-perplexity-llama-3.1-sonar-large-128k-online}"
    export AI_FALLBACK_MODEL="${AI_FALLBACK_MODEL:-gpt-4o}"
    export AI_COST_LIMIT_PER_QUERY="${AI_COST_LIMIT_PER_QUERY:-5.00}"
    
    export INTELLIGENCE_MAX_CONCURRENT_QUERIES="${INTELLIGENCE_MAX_CONCURRENT_QUERIES:-3}"
    export INTELLIGENCE_TIMEOUT_SECONDS="${INTELLIGENCE_TIMEOUT_SECONDS:-120}"
    export INTELLIGENCE_CACHE_TTL_MINUTES="${INTELLIGENCE_CACHE_TTL_MINUTES:-15}"
    export INTELLIGENCE_CONFIDENCE_THRESHOLD="${INTELLIGENCE_CONFIDENCE_THRESHOLD:-0.75}"
    
    echo -e "${GREEN}✅ Intelligence configuration applied${NC}"
}

create_env_backup() {
    echo -e "\n${BLUE}💾 Creating Environment Backup...${NC}"
    
    local backup_file="$PROJECT_ROOT/.env.backup.$(date +%Y%m%d_%H%M%S)"
    
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        cp "$PROJECT_ROOT/.env" "$backup_file"
        echo -e "${GREEN}✅ Environment backed up to: $(basename "$backup_file")${NC}"
    else
        echo -e "${YELLOW}⚠️  No .env file found to backup${NC}"
    fi
}

enhance_env_file() {
    echo -e "\n${BLUE}⚡ Enhancing .env file with intelligence settings...${NC}"
    
    local env_file="$PROJECT_ROOT/.env"
    
    # Add intelligence settings if not present
    if ! grep -q "# Intelligence Settings" "$env_file" 2>/dev/null; then
        echo -e "\n# =============================================================================\n# Intelligence Settings\n# =============================================================================" >> "$env_file"
        echo "AI_PRIMARY_MODEL=claude-3-5-sonnet-20241022" >> "$env_file"
        echo "AI_RESEARCH_MODEL=perplexity-llama-3.1-sonar-large-128k-online" >> "$env_file"
        echo "AI_FALLBACK_MODEL=gpt-4o" >> "$env_file"
        echo "AI_COST_LIMIT_PER_QUERY=5.00" >> "$env_file"
        echo "" >> "$env_file"
        echo "INTELLIGENCE_MAX_CONCURRENT_QUERIES=3" >> "$env_file"
        echo "INTELLIGENCE_TIMEOUT_SECONDS=120" >> "$env_file"
        echo "INTELLIGENCE_CACHE_TTL_MINUTES=15" >> "$env_file"
        echo "INTELLIGENCE_CONFIDENCE_THRESHOLD=0.75" >> "$env_file"
        
        echo -e "${GREEN}✅ Enhanced .env file with intelligence settings${NC}"
    else
        echo -e "${YELLOW}⚠️  Intelligence settings already present in .env${NC}"
    fi
}

# =============================================================================
# SYSTEM HEALTH CHECKS
# =============================================================================

check_system_health() {
    echo -e "\n${BLUE}🔍 System Health Check...${NC}"
    
    # Check Node.js version
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        echo -e "${GREEN}✅ Node.js: $node_version${NC}"
    else
        echo -e "${RED}❌ Node.js not found${NC}"
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        echo -e "${GREEN}✅ npm: v$npm_version${NC}"
    else
        echo -e "${RED}❌ npm not found${NC}"
    fi
    
    # Check direnv
    if command -v direnv >/dev/null 2>&1; then
        echo -e "${GREEN}✅ direnv: Available${NC}"
    else
        echo -e "${YELLOW}⚠️  direnv not found (optional but recommended)${NC}"
        echo -e "   Install with: ${BLUE}brew install direnv${NC}"
    fi
    
    # Check Redis (optional but helpful for caching)
    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli ping >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Redis: Running${NC}"
        else
            echo -e "${YELLOW}⚠️  Redis: Installed but not running${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Redis: Not installed (optional for caching)${NC}"
    fi
}

test_intelligence_connectivity() {
    echo -e "\n${BLUE}🧠 Testing Intelligence Connectivity...${NC}"
    
    # Test if backend is running
    if curl -s "http://localhost:4000/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend: Responding on port 4000${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend: Not responding (start with: cd apps/backend && npm start)${NC}"
    fi
    
    # Test if frontend is running
    if curl -s "http://localhost:5173" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend: Responding on port 5173${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend: Not responding (start with: cd apps/frontend && npm run dev)${NC}"
    fi
}

# =============================================================================
# PERFORMANCE OPTIMIZATION
# =============================================================================

optimize_for_intelligence() {
    echo -e "\n${BLUE}⚡ Optimizing for Intelligence Performance...${NC}"
    
    # Set Node.js memory limits for large AI operations
    export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
    
    # Set concurrent connection limits
    export UV_THREADPOOL_SIZE="${UV_THREADPOOL_SIZE:-16}"
    
    # Optimize for Australian timezone
    export TZ="Australia/Sydney"
    
    echo -e "${GREEN}✅ Performance optimizations applied${NC}"
    echo -e "   - Node.js memory: 4GB limit"
    echo -e "   - Thread pool: 16 threads"
    echo -e "   - Timezone: Australia/Sydney"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    echo -e "${BLUE}Starting intelligence environment setup...${NC}\n"
    
    # Navigate to project root
    cd "$PROJECT_ROOT"
    
    # Load existing environment
    if [[ -f ".env" ]]; then
        set -a
        source ".env"
        set +a
    fi
    
    # Run setup steps
    create_env_backup
    validate_ai_keys
    validate_business_integrations
    setup_intelligence_config
    enhance_env_file
    check_system_health
    test_intelligence_connectivity
    optimize_for_intelligence
    
    echo -e "\n${GREEN}🎉 Intelligence Environment Setup Complete!${NC}"
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo -e "1. ${YELLOW}Start Backend:${NC} cd apps/backend && npm start"
    echo -e "2. ${YELLOW}Start Frontend:${NC} cd apps/frontend && npm run dev"
    echo -e "3. ${YELLOW}Test Intelligence:${NC} Visit http://localhost:5173"
    echo -e "4. ${YELLOW}Query AI:${NC} Use the Investment-Grade Mission Control interface"
    
    echo -e "\n${BLUE}Available Intelligence Features:${NC}"
    echo -e "🧠 Universal Intelligence Orchestrator"
    echo -e "🛡️  10 Specialized Skill Pods"
    echo -e "🤖 8 Automated Bots"
    echo -e "💰 Investment-Grade Financial Analysis"
    echo -e "🏦 Bank-Level Validation & Reporting"
    
    echo -e "\n${GREEN}Your ACT Placemat is ready for world-class intelligence! 🚀${NC}"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
