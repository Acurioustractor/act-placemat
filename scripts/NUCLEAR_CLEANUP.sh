#!/bin/bash

echo "🧹 NUCLEAR CLEANUP - Killing EVERYTHING..."

# Kill absolutely everything on port 4000
lsof -ti:4000 | xargs kill -9 2>/dev/null
sleep 1
lsof -ti:4000 | xargs kill -9 2>/dev/null

# Kill all node processes
pkill -9 node 2>/dev/null

# Kill all Python processes
pkill -9 python3 2>/dev/null

# Kill all railway processes
pkill -9 -f railway 2>/dev/null

# Kill all curl processes
pkill -9 curl 2>/dev/null

# Kill all sleep processes
pkill -9 -f "sleep" 2>/dev/null

echo "✅ Everything killed"
sleep 2

# Verify port 4000 is free
if lsof -ti:4000 > /dev/null 2>&1; then
    echo "❌ Port 4000 still in use!"
    lsof -ti:4000
else
    echo "✅ Port 4000 is free"
fi

echo ""
echo "Now you can run: npm run dev"
