#!/bin/bash

# ACT Intelligence Hub - Clean Server Startup Script
# This script ensures only ONE server is running

echo "🧹 Cleaning up old server processes..."
killall -9 node 2>/dev/null
sleep 3

echo "✅ Starting ACT Intelligence Hub server..."
cd "/Users/benknight/Code/ACT Placemat/apps/backend"
node server.js

# Note: This runs in the foreground. Press Ctrl+C to stop.
