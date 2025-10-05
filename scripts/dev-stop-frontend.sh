#!/usr/bin/env bash
set -euo pipefail

PORT=${FRONTEND_PORT:-5175}
PID=/tmp/act_frontend.pid

if [[ -f "$PID" ]]; then
  echo "🛑 Stopping frontend PID $(cat "$PID")"
  kill $(cat "$PID") || true
  rm -f "$PID"
fi

if lsof -ti :$PORT >/dev/null 2>&1; then
  echo "🛑 Stopping processes on :$PORT"
  kill $(lsof -ti :$PORT) || true
fi

echo "✅ Frontend stopped"

