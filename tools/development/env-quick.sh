#!/bin/bash

# 🚀 ACT Placemat - Quick Environment Access
# Never search for .env commands again!

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Quick logging
log() { echo -e "${BLUE}💡 $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

# Show quick help
if [[ $# -eq 0 ]]; then
    echo -e "${BLUE}🔒 ACT Environment Quick Commands${NC}\n"
    echo "💨 Super fast .env management:"
    echo
    echo "  ./env-quick.sh fix      # Fix all environment issues"
    echo "  ./env-quick.sh check    # Check environment health" 
    echo "  ./env-quick.sh backup   # Create backup now"
    echo "  ./env-quick.sh restore  # Emergency restore"
    echo "  ./env-quick.sh status   # Show current status"
    echo
    echo "📋 Full commands available:"
    echo "  npm run env:fix         # Complete fix & validation"
    echo "  npm run env:status      # Detailed status report"
    echo "  npm run env:backup      # Create secure backup"
    echo "  npm run env:recovery    # Emergency recovery mode"
    echo
    exit 0
fi

command="$1"

case "$command" in
    "fix")
        log "🔧 Running environment fix..."
        npm run env:fix
        ;;
    "check")
        log "🔍 Checking environment health..."
        npm run env:check
        ;;
    "status")
        log "📊 Getting environment status..."
        npm run env:status
        ;;
    "backup")
        log "💾 Creating environment backup..."
        npm run env:backup
        ;;
    "restore")
        warn "⚠️  Starting emergency recovery..."
        npm run env:recovery
        ;;
    "sync")
        log "🔄 Synchronizing environments..."
        npm run env:sync
        ;;
    *)
        error "Unknown command: $command"
        echo "Run './env-quick.sh' for help"
        exit 1
        ;;
esac