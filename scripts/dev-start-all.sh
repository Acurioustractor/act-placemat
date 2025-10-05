#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Starting ACT Placemat (backend + frontend)"

# Optional: quick env sanity
if [ -f tools/development/env-manager.js ]; then
  echo "🔎 Checking environment..."
  node tools/development/env-manager.js check || true
fi

echo "🗄️  Backend → :4000"
npm run -s backend:start

echo "🌐 Frontend → :5175"
npm run -s frontend:start

echo ""
echo "✅ All services started"
echo "   Backend:  http://localhost:4000/health"
echo "   Frontend: http://localhost:5175/"

