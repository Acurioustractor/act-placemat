#!/bin/bash

echo "🚀 Starting Chrome with remote debugging..."

# Kill any existing Chrome instances
pkill -f "Google Chrome"
sleep 2

# Start Chrome with remote debugging enabled
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --disable-web-security \
  --disable-features=VizDisplayCompositor \
  --user-data-dir=/tmp/chrome-debug \
  http://localhost:5175/enhanced-goods-demo &

sleep 3

echo "📍 Getting console messages..."

# Get the tab ID
TAB_ID=$(curl -s http://localhost:9222/json | jq -r '.[0].id')

echo "Tab ID: $TAB_ID"

# Enable Runtime domain and get console messages
curl -s -X POST "http://localhost:9222/json/runtime/evaluate" \
  -H "Content-Type: application/json" \
  -d "{\"expression\":\"console.log('Debug script running'); window.setTimeout(() => { const logs = window.console._logs || []; console.log('Available logs:', logs); }, 2000);\"}"

echo "✅ Chrome started. Check the browser window and console for debug output."
echo "Press Ctrl+C to stop this script"

# Keep script running
while true; do
  sleep 1
done