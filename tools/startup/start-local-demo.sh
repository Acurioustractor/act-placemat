#!/bin/bash

echo "🚀 Starting ACT Placemat Local Demo"
echo "=================================="

# Navigate to the frontend app directory
cd "apps/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "🌟 Starting development server..."
echo "The app will open in your browser at http://localhost:3000"
echo ""
echo "📱 Features you can explore:"
echo "  • Homepage with community stories"
echo "  • Dashboard (when signed in)"
echo "  • Cultural protocol integration"
echo "  • Responsive design"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the development server
npm run dev