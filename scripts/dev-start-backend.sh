#!/usr/bin/env bash
set -euo pipefail

PORT=${PORT:-4000}
LOG=/tmp/act_backend.log
PID=/tmp/act_backend.pid

echo "🔧 Stopping any process on :$PORT (if present)"
if lsof -ti :$PORT >/dev/null 2>&1; then
  kill $(lsof -ti :$PORT) || true
  sleep 1
fi

echo "🚀 Starting backend on :$PORT"
cd "$(dirname "$0")/../apps/backend" 2>/dev/null || cd ../apps/backend 2>/dev/null || cd apps/backend
nohup npx tsx src/server.js > "$LOG" 2>&1 & echo $! > "$PID"

echo "⏳ Waiting for server to accept connections..."
for i in {1..30}; do
  if curl -fsS "http://localhost:$PORT/health" >/dev/null 2>&1; then
    echo "✅ Backend is up on :$PORT"
    curl -fsS "http://localhost:$PORT/health" || true
    exit 0
  fi
  sleep 1
done

echo "❌ Backend did not become ready in time. Tail logs: $LOG"
tail -n 80 "$LOG" || true
exit 1

