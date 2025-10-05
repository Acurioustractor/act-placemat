#!/usr/bin/env bash
set -euo pipefail
PORT=${PORT:-4000}
PID=/tmp/act_backend.pid

if [[ -f "$PID" ]]; then
  echo "🛑 Stopping backend PID $(cat "$PID")"
  kill $(cat "$PID") || true
  rm -f "$PID"
fi

if lsof -ti :$PORT >/dev/null 2>&1; then
  echo "🛑 Stopping processes on :$PORT"
  kill $(lsof -ti :$PORT) || true
fi

echo "✅ Backend stopped"

