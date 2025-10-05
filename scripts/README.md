# 🔧 Scripts Directory

Development and maintenance scripts organized by purpose.

## 📂 Directory Structure

### 📊 [analysis/](analysis/)
Ecosystem and data analysis scripts:
- `analyze-act-ecosystem.js` - Analyze ACT ecosystem data
- `analyze-complete-ecosystem.js` - Complete ecosystem analysis

### 💾 [data/](data/)
Data fetching and validation:
- `fetch-complete-act-data.js` - Fetch complete ACT data from APIs
- `check-real-data.js` - Validate real data integrity
- `check-total-contacts.js` - Count and verify contact records

### 🗄️ [db/](db/)
Database operations and migrations:
- `apply-migrations.js` - Run database migrations
- `apply-single-migration.js` - Run a single migration file
- `inspect-supabase-schema.js` - Inspect Supabase database schema
- `fix-rls-quick.js` - Quick RLS policy fixes

### 🧪 [testing/](testing/)
Test scripts and validation:
- `test-all-apis.js` - Test all API endpoints
- `test-financial-automation.js` - Test financial automation system
- `test-notion-api.js` - Test Notion API integration

### 🗄️ [archive/](archive/)
Obsolete and one-time scripts (kept for reference)

## 🚀 Common Commands

### Analysis
```bash
# Analyze ecosystem
node scripts/analysis/analyze-complete-ecosystem.js

# Check data integrity
node scripts/data/check-real-data.js
```

### Database
```bash
# Run migrations
node scripts/db/apply-migrations.js

# Inspect schema
node scripts/db/inspect-supabase-schema.js
```

### Testing
```bash
# Test all APIs
node scripts/testing/test-all-apis.js

# Test financial system
node scripts/testing/test-financial-automation.js
```

---

**Best Practices**:
- Always run from project root: `node scripts/category/script.js`
- Check script help: `node scripts/category/script.js --help` (if supported)
- Test scripts are safe to run anytime
- DB scripts require caution (read code first!)
