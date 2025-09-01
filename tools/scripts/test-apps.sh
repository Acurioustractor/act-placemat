#!/bin/bash

echo "🚜 ACT Platform - Testing Apps"
echo "================================="

echo ""
echo "🎛️ Testing Internal Strategy (Client + Server)..."
echo "📍 URL: http://localhost:5173"
echo "💻 Command: npm run dev"
echo ""

echo "🌐 Testing Public Website..."  
echo "📍 URL: http://localhost:5174"
echo "💻 Command: cd frontend-new && npm run dev"
echo ""

echo "💡 To test both apps:"
echo "1. Terminal 1: npm run dev"
echo "2. Terminal 2: cd frontend-new && npm run dev"
echo "3. Open: file://$(pwd)/launcher.html"
echo ""

echo "🔧 Apps configured:"
echo "✅ Client vite.config.ts created (port 5173)"
echo "✅ Frontend-new configured (port 5174)" 
echo "✅ Dependencies installed"
echo "✅ API proxy configured (3004 → 5173)"