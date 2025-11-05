#!/bin/bash
# Stop Daily Sync Service

cd "$(dirname "$0")"

if [ -f .daily-sync.pid ]; then
    PID=$(cat .daily-sync.pid)
    echo "🛑 Stopping daily sync service (PID: $PID)..."
    kill $PID 2>/dev/null

    if [ $? -eq 0 ]; then
        echo "✅ Service stopped successfully"
        rm .daily-sync.pid
    else
        echo "⚠️  Process not found (may have already stopped)"
        rm .daily-sync.pid
    fi
else
    echo "ℹ️  No PID file found - service may not be running"
    echo "   Check manually with: ps aux | grep daily-sync"
fi
