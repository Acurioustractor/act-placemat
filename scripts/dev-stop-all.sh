#!/bin/bash

# Clean shutdown script for all development processes
echo "🛑 Stopping all development processes..."

# Kill processes on common development ports
echo "Killing processes on ports 3000, 4000, 5173, 5175, 8080..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:5175 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Kill npm run dev processes
echo "Killing npm run dev processes..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "node.*dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Kill any Node.js processes related to our project
echo "Killing Node.js processes related to ACT Placemat..."
pkill -f "ACT.*Placemat" 2>/dev/null || true

# Wait a moment for processes to terminate
sleep 2

# Check if any processes are still running
echo "Checking for remaining processes..."
REMAINING_PROCS=$(lsof -ti:3000,4000,5173,5175,8080 2>/dev/null | wc -l)

if [ "$REMAINING_PROCS" -gt 0 ]; then
  echo "⚠️  Some processes are still running. Force killing..."
  lsof -ti:3000,4000,5173,5175,8080 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

echo "✅ All development processes stopped"