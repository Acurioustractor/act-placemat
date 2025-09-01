# 🛠️ ACT Placemat Tools & Scripts

## Directory Structure

### 📊 `/database`
Database management and inspection tools
- `check-all-tables.js` - Verify all database tables
- `check-existing-stories.js` - Check stories in database
- `comprehensive-table-scan.js` - Full database scan
- `get-all-tables.js` - List all tables
- `get-stories-data.js` - Extract stories data
- `setup-database.js` - Initialize database
- `simple-table-check.js` - Quick table verification
- `supabase-table-scan.js` - Scan Supabase tables

### 🧪 `/testing`
Test scripts for various components
- `test-*.js` - Various integration and unit tests
- Tests cover: ecosystem, farmhand, LinkedIn, Supabase, business intelligence

### 🔍 `/diagnostics`
Debugging and diagnostic tools
- `diagnose-supabase.js` - Supabase connection diagnostics
- `diagnose.sh` - General system diagnostics
- `fix-missing-methods.js` - Fix missing method issues
- `fix-and-test.sh` - Fix and verify fixes

### ✅ `/validation`
Data validation scripts
- `validate-documentation.js` - Validate docs structure
- `validate-linkedin-data.js` - Validate LinkedIn data
- `check-linkedin-data.js` - Check LinkedIn data integrity

### 🚀 `/startup`
Application startup scripts
- `LAUNCH.sh` - Main launch script
- `START_INTELLIGENCE.sh` - Start intelligence platform
- `start-bulletproof.sh` - Bulletproof startup
- `start-ecosystem-bulletproof.sh` - Ecosystem bulletproof startup
- `start-farmhand.sh` - Start Farmhand app
- `start-full-platform.sh` - Start entire platform
- `start-servers.sh` - Start all servers
- `bulletproof-restart.sh` - Restart with recovery
- `auto-recovery.sh` - Auto-recovery mechanism

### 🛑 `/shutdown`
Application shutdown scripts
- `stop.sh` - Quick stop
- `stop-servers.sh` - Stop all servers
- `stop-ecosystem.sh` - Stop ecosystem
- `stop-full-platform.sh` - Stop entire platform

### 🛠️ `/development`
Development utilities
- `dev.sh` - Development environment setup
- `quick-build.sh` - Quick build script

### 🎭 `/demo`
Demo and presentation tools
- `demo-ecosystem-simple.js` - Simple ecosystem demo
- `/html` - Demo HTML pages
  - `empathy-ledger-demo.html` - Empathy Ledger demo
  - `empathy-ledger-working-demo.html` - Working Empathy Ledger demo
  - `simple-test.html` - Simple test page
  - `working-placemat.html` - Working placemat demo

### ⚙️ `/servers`
Server-related files
- `ecosystem-server.js` - Ecosystem server implementation
- `/static` - Static file servers
  - `serve-react.py` - Python server for React apps
  - `serve-static.py` - Python static file server

### 📊 `/analysis`
Analysis output and reports
- `notion-full-analysis.json` - Complete Notion analysis
- `phase1-assessment-report.json` - Phase 1 assessment results
- `supabase-diagnostics.json` - Supabase diagnostic output

## Usage Examples

### Starting the Platform
```bash
# Full platform launch
./tools/startup/LAUNCH.sh

# Start intelligence platform only
./tools/startup/START_INTELLIGENCE.sh

# Development mode
./tools/development/dev.sh
```

### Running Tests
```bash
# Test ecosystem integration
node tools/testing/test-ecosystem-integration.js

# Test Supabase connection
node tools/testing/test-supabase-connection.js
```

### Database Operations
```bash
# Setup database
node tools/database/setup-database.js

# Check all tables
node tools/database/check-all-tables.js

# Scan for issues
node tools/database/comprehensive-table-scan.js
```

### Diagnostics
```bash
# Run system diagnostics
./tools/diagnostics/diagnose.sh

# Check Supabase connection
node tools/diagnostics/diagnose-supabase.js
```

### Validation
```bash
# Validate documentation
node tools/validation/validate-documentation.js

# Check LinkedIn data
node tools/validation/check-linkedin-data.js
```

## Quick Commands

### 🚀 Start Everything
```bash
./tools/startup/start-full-platform.sh
```

### 🛑 Stop Everything
```bash
./tools/shutdown/stop-full-platform.sh
```

### 🔄 Restart with Recovery
```bash
./tools/startup/bulletproof-restart.sh
```

### 🧪 Run All Tests
```bash
for test in tools/testing/*.js; do
  echo "Running $test..."
  node "$test"
done
```

### 🔍 Full Diagnostics
```bash
./tools/diagnostics/diagnose.sh
```

---

*Tools are organized by function to make them easy to find and use.*
*Each category has a specific purpose in the development and operation workflow.*
