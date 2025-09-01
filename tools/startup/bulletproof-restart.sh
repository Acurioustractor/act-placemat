#!/bin/bash

# Bulletproof Server Restart with Cache Clearing
# Ensures no cached modules interfere with fixes

echo "🛡️ ACT Bulletproof Server Restart"
echo "================================="

cd "/Users/benknight/Code/ACT Placemat/apps/backend"

# 1. Kill all existing processes completely
echo "🧹 Killing all server processes..."
pkill -f "src/server.js" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true
pkill -f "act-backend" 2>/dev/null || true
lsof -ti:4000 | xargs kill -9 2>/dev/null || true

# Wait for processes to die
sleep 3

# 2. Clear Node.js module cache by deleting node_modules/.cache if it exists
echo "🗑️ Clearing Node.js cache..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .cache 2>/dev/null || true

# 3. Start server with fresh process
echo "🚀 Starting server with fresh cache..."
NODE_OPTIONS="--no-compilation-cache" nohup npm start > server_fresh.log 2>&1 & 
NEW_PID=$!

echo "📊 New server PID: $NEW_PID"
echo $NEW_PID > server.pid

# 4. Wait for startup
echo "⏳ Waiting for server initialization..."
sleep 8

# 5. Verify server is responding
echo "🔍 Verifying server health..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>/dev/null || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo "✅ Server is healthy and responding!"
    echo "🌐 Access: http://localhost:4000"
    echo "🏥 Health: http://localhost:4000/health"
    echo "🌾 Farm Workflow: http://localhost:4000/api/farm-workflow/status"
    exit 0
else
    echo "❌ Server health check failed (HTTP $HEALTH_CHECK)"
    echo "📋 Last 20 lines of server log:"
    tail -20 server_fresh.log 2>/dev/null || echo "No log file found"
    exit 1
fi