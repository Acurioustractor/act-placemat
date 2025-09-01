#!/bin/bash

# ACT Placemat Automation Setup Script
# This script sets up the automation system for immediate use

echo "🚀 ACT Placemat Automation Setup"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js is installed: $(node --version)"

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies are installed"
fi

# Create necessary directories
echo ""
echo "📁 Creating directory structure..."
mkdir -p alerts
mkdir -p automations
mkdir -p logs
mkdir -p templates

# Check environment setup
echo ""
echo "🔧 Checking environment configuration..."

if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "   Please edit .env with your Notion and Airtable credentials"
else
    # Check if Notion is configured
    if grep -q "NOTION_TOKEN=." .env && grep -q "NOTION_DATABASE_ID=." .env; then
        echo "✅ Notion credentials are configured"
    else
        echo "⚠️  Notion credentials are not configured in .env"
    fi
    
    # Check if Airtable is configured
    if grep -q "AIRTABLE_API_KEY=." .env; then
        echo "✅ Airtable credentials are configured"
    else
        echo "ℹ️  Airtable credentials are not configured (optional)"
    fi
fi

# Test server
echo ""
echo "🖥️  Testing server..."
timeout 5s node server.js > /dev/null 2>&1 &
SERVER_PID=$!
sleep 2

if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Server starts successfully"
    kill $SERVER_PID 2>/dev/null
else
    echo "⚠️  Server failed to start. Check error messages above."
fi

# Make automation scripts executable
echo ""
echo "🔧 Setting up automation scripts..."
chmod +x automations/*.js
chmod +x test-integrations.js

# Create cron job examples
echo ""
echo "⏰ Creating cron job examples..."

cat > cron-examples.txt << 'EOF'
# ACT Placemat Automation Cron Jobs
# Add these to your crontab with: crontab -e

# Daily Opportunity Alerts (8am every day)
0 8 * * * cd /path/to/ACT-Placemat && node automations/opportunity-alerts.js >> logs/opportunity-alerts.log 2>&1

# Weekly Action Email (7am every Monday)
0 7 * * 1 cd /path/to/ACT-Placemat && node automations/weekly-action-email.js >> logs/weekly-email.log 2>&1

# Integration Test (9am daily)
0 9 * * * cd /path/to/ACT-Placemat && node test-integrations.js >> logs/integration-test.log 2>&1

# Data Sync (every 30 minutes during business hours)
*/30 8-18 * * 1-5 cd /path/to/ACT-Placemat && node sync-data.js >> logs/sync.log 2>&1
EOF

echo "✅ Cron examples saved to cron-examples.txt"

# Create quick start guide
echo ""
echo "📚 Creating quick start guide..."

cat > QUICK_START.md << 'EOF'
# ACT Placemat Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Configure Your Credentials
Edit `.env` file with your Notion credentials:
```
NOTION_TOKEN=your_token_here
NOTION_DATABASE_ID=your_database_id_here
```

### 2. Test Your Connection
```bash
npm test
```

### 3. Start the Server
```bash
npm start
```

### 4. Run Your First Automation

#### Check for Opportunity Alerts:
```bash
node automations/opportunity-alerts.js
```

#### Generate Weekly Action Email:
```bash
node automations/weekly-action-email.js
```

### 5. View Results
Check the `alerts/` directory for generated reports.

## 📅 Setting Up Daily Automations

### Option 1: Cron Jobs (Linux/Mac)
```bash
crontab -e
# Add the lines from cron-examples.txt
```

### Option 2: Task Scheduler (Windows)
Use Windows Task Scheduler to run the scripts daily.

### Option 3: Manual Daily Check
Run this each morning:
```bash
./daily-check.sh
```

## 🎯 First Week Goals

1. **Monday**: Run opportunity alerts, review output
2. **Tuesday**: Set up weekly email, test with team
3. **Wednesday**: Configure cron jobs for automation
4. **Thursday**: Customize alert thresholds
5. **Friday**: Review first week's metrics

## 🆘 Need Help?

- Check logs in `logs/` directory
- Run `npm test` to diagnose issues
- Review `INTEGRATION_SETUP_GUIDE.md` for detailed setup
- Contact support: tech@act.org.au
EOF

echo "✅ Quick start guide created"

# Create daily check script
echo ""
echo "🔨 Creating daily check script..."

cat > daily-check.sh << 'EOF'
#!/bin/bash
# ACT Daily Check Script

echo "☀️ Good morning! Running ACT daily checks..."
echo "Date: $(date)"
echo ""

# Run opportunity alerts
echo "🎯 Checking opportunities..."
node automations/opportunity-alerts.js

echo ""
echo "✅ Daily check complete!"
echo ""
echo "Check the alerts/ directory for detailed reports."
EOF

chmod +x daily-check.sh
echo "✅ Daily check script created"

# Final summary
echo ""
echo "✅ Setup Complete!"
echo "================="
echo ""
echo "Next Steps:"
echo "1. Edit .env with your Notion/Airtable credentials"
echo "2. Run 'npm test' to verify setup"
echo "3. Run './daily-check.sh' for your first automation"
echo "4. Check 'alerts/' directory for results"
echo ""
echo "📚 Resources:"
echo "   - Quick Start: QUICK_START.md"
echo "   - Full Guide: INTEGRATION_SETUP_GUIDE.md"
echo "   - Implementation Plan: PRACTICAL_IMPLEMENTATION_PLAN.md"
echo ""
echo "🎉 Ready to transform your data into action!"
EOF