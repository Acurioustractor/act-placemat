#!/bin/bash

# ACT Placemat Clean Start Script
# Kills all dev processes and starts fresh

echo "🧹 Cleaning up old processes..."

# Kill all node/npm/vite processes related to this project
pkill -f "node server.js" 2>/dev/null
pkill -f "npm.*dev" 2>/dev/null
pkill -f "npm start" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "concurrently" 2>/dev/null

# Clear ports
lsof -ti:4000 | xargs kill -9 2>/dev/null
lsof -ti:5174 | xargs kill -9 2>/dev/null
lsof -ti:5175 | xargs kill -9 2>/dev/null
lsof -ti:5176 | xargs kill -9 2>/dev/null

echo "⏳ Waiting for processes to die..."
sleep 3

echo "🚀 Starting clean dev environment..."
cd "$(dirname "$0")/.."
npm run dev
