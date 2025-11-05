#!/bin/bash

echo "🌱 Testing Curious Tractor Research System"
echo "=========================================="
echo ""

# Test 1: Check if all services are running
echo "📋 Test 1: Checking Services..."
echo ""

# Ollama
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "  ✅ Ollama running (localhost:11434)"
    ollama list | grep -E "llama3.1|nomic-embed"
else
    echo "  ❌ Ollama not running"
fi

# Perplexica
if curl -s http://localhost:3030 > /dev/null 2>&1; then
    echo "  ✅ Perplexica running (localhost:3030)"
else
    echo "  ❌ Perplexica not running"
    echo "     Run: cd /Users/benknight/Code/Perplexica && docker-compose up -d"
fi

# SearxNG
if curl -s http://localhost:4000 > /dev/null 2>&1; then
    echo "  ✅ SearxNG running (localhost:4000)"
else
    echo "  ⚠️  SearxNG not running (optional)"
fi

# Backend
if curl -s http://localhost:4001/health > /dev/null 2>&1; then
    echo "  ✅ Backend running (localhost:4001)"
else
    echo "  ❌ Backend not running"
    echo "     Run: cd apps/backend && node stable-real-data-server.js"
fi

echo ""
echo "📋 Test 2: Testing Custom Research Query..."
echo ""

# Test custom research
curl -X POST http://localhost:4001/api/curious-tractor/research/custom \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the benefits of community land trusts in Australia?",
    "tool": "perplexica",
    "depth": "standard"
  }' \
  2>/dev/null | jq -r '.result.answer' | head -20

echo ""
echo "=========================================="
echo "🌱 Next Steps:"
echo ""
echo "1. Open the research interface:"
echo "   http://localhost:5174/?tab=tractor"
echo ""
echo "2. Run a full research program (10-15 hours):"
echo "   Click '🚀 Start Full Research'"
echo ""
echo "3. Or research individual phases:"
echo "   - Entity Structure (3-4 hours)"
echo "   - R&D Tax Credits (1-2 hours)"
echo "   - Triday Integration (1-2 hours)"
echo "   - Innovation Economics (2-3 hours)"
echo "   - AI Assistant (2 hours)"
echo ""
echo "4. Custom research queries:"
echo "   Type any question in the custom query box"
echo ""
