#!/bin/bash
#
# Setup Subscription Automation
#
# This script sets up weekly cron jobs for subscription maintenance:
# 1. Weekly Xero sync + categorization + payment prediction
# 2. Creates log directory
# 3. Adds crontab entry
#
# Usage:
#   chmod +x scripts/setup-subscription-automation.sh
#   ./scripts/setup-subscription-automation.sh
#

PROJECT_DIR="/Users/benknight/Code/ACT Placemat"
LOG_DIR="$PROJECT_DIR/logs"

echo "🔧 Setting up Subscription Automation"
echo "═══════════════════════════════════════"
echo ""

# Create logs directory
if [ ! -d "$LOG_DIR" ]; then
  echo "📁 Creating logs directory..."
  mkdir -p "$LOG_DIR"
  echo "✅ Created: $LOG_DIR"
else
  echo "✅ Logs directory exists: $LOG_DIR"
fi

echo ""

# Check if crontab entry already exists
CRON_ENTRY="0 9 * * 1 cd \"$PROJECT_DIR\" && node apps/backend/subscription-tracker/jobs/weekly-subscription-maintenance.js >> logs/subscription-maintenance.log 2>&1"

if crontab -l 2>/dev/null | grep -q "weekly-subscription-maintenance.js"; then
  echo "⚠️  Crontab entry already exists!"
  echo ""
  echo "Current subscription automation cron jobs:"
  crontab -l | grep "subscription"
  echo ""
  echo "To remove existing entry:"
  echo "  crontab -e"
  echo ""
  exit 0
fi

# Add crontab entry
echo "📅 Adding weekly cron job..."
echo ""
echo "Schedule: Every Monday at 9:00 AM"
echo "Command: $CRON_ENTRY"
echo ""

read -p "Add this cron job? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Backup existing crontab
  crontab -l > /tmp/crontab_backup_$(date +%Y%m%d_%H%M%S).txt 2>/dev/null || true

  # Add new entry
  (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

  echo "✅ Cron job added successfully!"
  echo ""
  echo "Current crontab:"
  crontab -l | grep "subscription"
  echo ""
  echo "📋 Next Steps:"
  echo "  1. Test manually: node apps/backend/subscription-tracker/jobs/weekly-subscription-maintenance.js"
  echo "  2. Check logs: tail -f logs/subscription-maintenance.log"
  echo "  3. Verify cron runs next Monday at 9 AM"
  echo ""
else
  echo "❌ Cancelled. No changes made."
  echo ""
  echo "To add manually:"
  echo "  crontab -e"
  echo ""
  echo "Then add this line:"
  echo "  $CRON_ENTRY"
  echo ""
fi

echo "═══════════════════════════════════════"
echo "✨ Setup complete!"
