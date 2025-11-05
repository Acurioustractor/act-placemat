#!/bin/bash

echo "🧹 Cleaning up all old processes..."

# Kill all node servers on port 4000
lsof -ti:4000 | xargs kill -9 2>/dev/null

# Kill all railway log processes
pkill -f "railway logs" 2>/dev/null

# Kill all sleep processes
pkill -f "sleep 180" 2>/dev/null
pkill -f "sleep 120" 2>/dev/null
pkill -f "sleep 45" 2>/dev/null
pkill -f "sleep 30" 2>/dev/null

# Kill all Python batch processes
pkill -f "batch" 2>/dev/null

# Kill all curl processes
pkill -f "curl.*batch-discover" 2>/dev/null

echo "✅ All old processes killed"
echo ""
echo "🚀 Starting fresh dev environment..."
echo ""

# Start npm run dev
npm run dev
