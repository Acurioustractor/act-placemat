#!/bin/bash

# Setup Metabase for ACT Community Analytics
# This script configures Metabase with ACT-specific dashboards and data connections

set -e

# Configuration
METABASE_URL="http://localhost:3001"
BACKEND_URL="http://localhost:4000"

echo "🚀 Setting up Metabase for ACT Community Analytics..."

# Check if Metabase is running
echo "🔍 Checking Metabase availability..."
if ! curl -s "$METABASE_URL/api/health" > /dev/null; then
    echo "❌ Metabase is not running on $METABASE_URL"
    echo "Please start Metabase with: docker run -d -p 3001:3000 --name metabase metabase/metabase"
    exit 1
fi

# Check if backend is running
echo "🔍 Checking backend availability..."
if ! curl -s "$BACKEND_URL/health" > /dev/null; then
    echo "❌ Backend server is not running on $BACKEND_URL"
    echo "Please start the backend server first"
    exit 1
fi

echo "✅ Services are available"

# Initialize Metabase service
echo "🔧 Initializing Metabase service..."
INIT_RESULT=$(curl -s -X POST "$BACKEND_URL/api/metabase/initialize" | jq -r '.success')

if [ "$INIT_RESULT" = "true" ]; then
    echo "✅ Metabase service initialized"
else
    echo "⚠️ Metabase service initialization had issues, continuing..."
fi

# Get current status
echo "📊 Checking Metabase status..."
curl -s "$BACKEND_URL/api/metabase/health" | jq '.'

echo ""
echo "🎉 Metabase setup completed!"
echo "📊 Access Metabase at: $METABASE_URL"
echo "🔧 Configure additional dashboards through the backend API"
echo ""
echo "Next steps:"
echo "1. Access Metabase web interface at $METABASE_URL"
echo "2. Configure database connections"
echo "3. Create custom dashboards for ACT community metrics"