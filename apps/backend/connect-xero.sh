#!/bin/bash

# Xero OAuth Connection Helper Script
# Automates the process of connecting to Xero

set -e  # Exit on error

echo ""
echo "🔗 Xero OAuth Connection Helper"
echo "================================"
echo ""

# Step 1: Check if port 4000 is in use
PORT_PID=$(lsof -ti :4000 || echo "")

if [ -n "$PORT_PID" ]; then
  echo "⚠️  Port 4000 is currently in use by process $PORT_PID"
  echo ""
  read -p "Stop this process to continue? (y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🛑 Stopping process $PORT_PID..."
    kill $PORT_PID
    sleep 2
    echo "✅ Process stopped"
  else
    echo "❌ Cannot proceed - port 4000 must be available"
    echo "   Manually stop the process and try again"
    exit 1
  fi
else
  echo "✅ Port 4000 is available"
fi

echo ""
echo "📋 Configuration Check:"
echo "   Client ID: ${XERO_CLIENT_ID:0:20}..."
echo "   Client Secret: ${XERO_CLIENT_SECRET:0:20}..."
echo "   Redirect URI: ${XERO_REDIRECT_URI}"
echo ""

# Step 2: Run the OAuth server
echo "🚀 Starting Xero OAuth server..."
echo "   Server will run on http://localhost:4000"
echo ""
echo "📍 NEXT STEP: Open this URL in your browser:"
echo ""
echo "   ✨ http://localhost:4000/connect"
echo ""
echo "⏳ Press Ctrl+C to cancel, or wait for authorization..."
echo ""

node xero-connect-simple.js

# After OAuth completes (script will auto-shutdown)
echo ""
echo "✅ OAuth flow complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Restart your main backend server:"
echo "      npm start"
echo ""
echo "   2. Test the Xero connection:"
echo "      curl -X POST http://localhost:4000/api/v2/xero/sync/start"
echo ""
echo "   3. Check your subscription dashboard:"
echo "      http://localhost:5176/?tab=subscriptions"
echo ""
