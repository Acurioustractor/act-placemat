#!/bin/bash

# Stop Intelligence Dashboard

cd "$(dirname "$0")"

if [ -f ".intelligence-dashboard.pid" ]; then
  PID=$(cat .intelligence-dashboard.pid)
  echo "🛑 Stopping Intelligence Dashboard (PID: $PID)..."
  kill $PID 2>/dev/null
  rm .intelligence-dashboard.pid
  echo "✅ Intelligence Dashboard stopped"
else
  echo "⚠️  No PID file found. Searching for running processes..."
  pkill -f "api-intelligence-briefing.js"
  echo "✅ Stopped any running intelligence dashboard processes"
fi
