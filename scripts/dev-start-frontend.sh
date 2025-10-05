#!/usr/bin/env bash
set -euo pipefail

PORT=${FRONTEND_PORT:-5175}
LOG=/tmp/act_frontend.log
PID=/tmp/act_frontend.pid

echo "🔧 Stopping any process on :$PORT (if present)"
if lsof -ti :$PORT >/dev/null 2>&1; then
  kill $(lsof -ti :$PORT) || true
  sleep 1
fi

echo "🚀 Starting frontend (Vite) on :$PORT"
cd "$(dirname "$0")/../apps/frontend" 2>/dev/null || cd ../apps/frontend 2>/dev/null || cd apps/frontend

# Ensure dependencies are installed if node_modules missing
if [ ! -d node_modules ]; then
  echo "📦 Installing frontend dependencies..."
  npm install --silent
fi

# Start Vite dev server in background with logs
VITE_PORT=$PORT PORT=$PORT nohup npm run dev > "$LOG" 2>&1 & echo $! > "$PID"

echo "⏳ Waiting for frontend to accept connections..."
for i in {1..30}; do
  if curl -fsS "http://localhost:$PORT/" >/dev/null 2>&1; then
    echo "✅ Frontend is up on :$PORT"
    exit 0
  fi
  sleep 1
done

echo "❌ Frontend did not become ready in time. Tail logs: $LOG"
tail -n 80 "$LOG" || true
exit 1

