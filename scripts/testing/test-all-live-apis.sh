#!/bin/bash

echo "🧪 Testing All Live APIs"
echo "=========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    
    echo -e "${BLUE}Testing:${NC} $name"
    echo "  URL: $url"
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" -H "Content-Type: application/json" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" == "200" ] || [ "$http_code" == "201" ]; then
        echo -e "  ${GREEN}✅ PASS${NC} (HTTP $http_code)"
    else
        echo -e "  ${RED}❌ FAIL${NC} (HTTP $http_code)"
    fi
    echo ""
}

echo "1️⃣ CONTACT INTELLIGENCE HUB (Port 4000)"
echo "========================================="
test_endpoint "Platform Statistics" "http://localhost:4000/api/stats"
test_endpoint "Search Contacts" "http://localhost:4000/api/contacts/search?limit=5"
test_endpoint "Contacts with Email" "http://localhost:4000/api/contacts/search?hasEmail=true&limit=5"

echo ""
echo "2️⃣ AI-ENHANCED CONTACT HUB (Port 4001)"
echo "========================================"
test_endpoint "AI System Status" "http://localhost:4001/api/status"

echo ""
echo "3️⃣ OLLAMA LOCAL AI (Port 11434)"
echo "================================"
response=$(curl -s http://localhost:11434/api/tags 2>&1)
if echo "$response" | grep -q "llama3.1:8b"; then
    echo -e "${GREEN}✅ Ollama is running${NC}"
    echo "  Models available:"
    echo "$response" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | sed 's/^/    - /'
else
    echo -e "${RED}❌ Ollama not responding${NC}"
fi

echo ""
echo "========================================="
echo "📊 Test Summary"
echo "========================================="
echo ""
echo "Tested services:"
echo "  ✅ Contact Intelligence Hub (Port 4000)"
echo "  ✅ AI-Enhanced Contact Hub (Port 4001)"
echo "  ✅ Ollama Local AI (Port 11434)"
echo ""
echo "Run individual tests:"
echo "  curl http://localhost:4000/api/stats | jq"
echo "  curl http://localhost:4001/api/status | jq"
echo "  curl http://localhost:11434/api/tags | jq"
echo ""
