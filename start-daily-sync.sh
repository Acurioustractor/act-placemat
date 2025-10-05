#!/bin/bash
# Start Daily Sync Service for ACT Platform
# This runs the sync automation in the background

cd "$(dirname "$0")"

echo "🚀 Starting ACT Daily Sync Service..."
echo "   Sync will run daily at 6:00 AM"
echo ""

# Run the daily sync script in cron mode
node apps/backend/core/scripts/daily-sync.js --cron &

SYNC_PID=$!

echo "✅ Daily sync service started (PID: $SYNC_PID)"
echo ""
echo "To stop the service:"
echo "   kill $SYNC_PID"
echo ""
echo "To check if it's running:"
echo "   ps aux | grep daily-sync"
echo ""

# Save PID to file for easy stopping later
echo $SYNC_PID > .daily-sync.pid
echo "PID saved to .daily-sync.pid"
