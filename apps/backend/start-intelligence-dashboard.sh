#!/bin/bash

# Start Intelligence Dashboard API
# This provides a real-time view of your relationship intelligence

cd "$(dirname "$0")"

echo "🧠 Starting ACT Intelligence Dashboard..."
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "❌ Error: .env file not found"
  echo "Please create .env file with required credentials"
  exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

echo "✅ Starting Intelligence API on port 4001..."
echo "📊 Dashboard will be available at: http://localhost:4001/intelligence-dashboard.html"
echo ""

node api-intelligence-briefing.js
