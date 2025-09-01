#!/bin/bash

# ACT Placemat Development Setup Script
# This script sets up a complete development environment for the ACT Placemat application

set -e

echo "🚀 Setting up ACT Placemat Development Environment"
echo "================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 14+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "❌ Node.js version 14+ is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd client
npm install
cd ..

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📄 Creating .env file from template..."
    cp .env.example .env 2>/dev/null || echo "⚠️  No .env.example found. Please create .env manually."
    echo "⚠️  Please configure your .env file with your Notion credentials:"
    echo "   - NOTION_TOKEN=your_notion_token"
    echo "   - NOTION_DATABASE_ID=your_database_id"
else
    echo "✅ .env file already exists"
fi

# Check environment variables
echo "🔧 Checking environment configuration..."
if grep -q "NOTION_TOKEN=" .env && ! grep -q "NOTION_TOKEN=$" .env; then
    echo "✅ NOTION_TOKEN configured"
else
    echo "⚠️  NOTION_TOKEN not configured in .env"
fi

if grep -q "NOTION_DATABASE_ID=" .env && ! grep -q "NOTION_DATABASE_ID=$" .env; then
    echo "✅ NOTION_DATABASE_ID configured"
else
    echo "⚠️  NOTION_DATABASE_ID not configured in .env"
fi

# Test backend startup
echo "🧪 Testing backend startup..."
timeout 5s npm run dev:server &> /dev/null &
SERVER_PID=$!
sleep 3

if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Backend starts successfully"
    kill $SERVER_PID 2>/dev/null || true
else
    echo "❌ Backend failed to start. Check your configuration."
fi

# Test frontend build
echo "🧪 Testing frontend build..."
cd client
if npm run build &> build.log; then
    echo "✅ Frontend builds successfully"
    rm -f build.log
else
    echo "❌ Frontend build failed. Check client/build.log for details"
    cd ..
    exit 1
fi
cd ..

# Create development script
echo "📝 Creating development scripts..."
cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting ACT Placemat Development Environment"
echo "Backend: http://localhost:5001"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both servers"
npm run dev
EOF

chmod +x start-dev.sh

# Create quick test script
cat > test-connection.sh << 'EOF'
#!/bin/bash
echo "🔍 Testing ACT Placemat Connection"
echo "=================================="

# Test backend health
echo "Testing backend health..."
if curl -s http://localhost:5001/api/health | jq .status | grep -q "ok"; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
fi

# Test Notion connection
echo "Testing Notion connection..."
if curl -s http://localhost:5001/api/config | jq .status.notion_configured | grep -q "true"; then
    echo "✅ Notion connection configured"
else
    echo "❌ Notion connection not configured"
fi

# Test database query
echo "Testing database query..."
RESPONSE=$(curl -s -X POST http://localhost:5001/api/notion/query \
  -H "Content-Type: application/json" \
  -d '{"databaseId":"test"}')

if echo "$RESPONSE" | jq -e .results > /dev/null 2>&1; then
    echo "✅ Database query endpoint working"
else
    echo "❌ Database query endpoint failed"
fi
EOF

chmod +x test-connection.sh

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📋 Next Steps:"
echo "1. Configure your .env file with Notion credentials"
echo "2. Run './start-dev.sh' to start development servers"
echo "3. Run './test-connection.sh' to test connections"
echo ""
echo "🌐 URLs:"
echo "• Backend API: http://localhost:5001"
echo "• Frontend: http://localhost:5173"
echo "• Health Check: http://localhost:5001/api/health"
echo "• Config Check: http://localhost:5001/api/config"
echo ""
echo "📚 Documentation:"
echo "• README.md - Project overview"
echo "• QUICKSTART.md - Quick start guide"
echo "• Docs/ - Detailed documentation"
echo ""
echo "🐛 Troubleshooting:"
echo "• Check .env configuration"
echo "• Verify Notion token and database ID"
echo "• Check server.log for backend errors"
echo "• Run 'npm run test' for integration tests"