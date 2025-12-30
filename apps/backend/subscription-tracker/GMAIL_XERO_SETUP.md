# Gmail & Xero API Setup Guide

**For ACT Subscription Tracker**

This guide helps you configure the Gmail and Xero API credentials needed for the subscription tracker to discover subscriptions.

---

## Overview

The subscription tracker reuses ACT's existing Gmail and Xero integrations. You don't need to create new OAuth apps - just ensure the existing services are configured.

---

## ✅ Quick Check: Are You Already Set Up?

Run this to check if credentials are configured:

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend"

# Check .env file
grep -E "(GMAIL|XERO)" ../../.env | grep -v "^#"

# Expected output should include:
# - GMAIL_CLIENT_ID
# - GMAIL_CLIENT_SECRET
# - XERO_CLIENT_ID
# - XERO_CLIENT_SECRET
```

If you see these variables, you're likely **already set up** and can skip to [Testing](#testing).

---

## Gmail API Setup

### Option 1: Use Existing ACT Gmail Service (Recommended)

ACT already has Gmail OAuth configured. The subscription tracker will automatically use the existing `gmailService` instance.

**Check if it's working:**

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend"

# Test Gmail API access
node -e "
import('./core/src/services/gmailService.js').then(({ default: gmail }) => {
  console.log('Gmail service:', gmail ? '✅ Available' : '❌ Not found');
}).catch(err => console.error('Error:', err.message));
"
```

### Option 2: Verify OAuth Tokens

Gmail tokens are stored at:
```
/Users/benknight/Code/ACT Placemat/apps/backend/.gmail_tokens.json
```

Check token status:
```bash
cat apps/backend/.gmail_tokens.json | python3 -m json.tool
```

If tokens are expired or missing, you'll need to re-authenticate:

```bash
cd apps/backend
node core/src/services/gmailService.js
# Follow the OAuth flow in your browser
```

### Option 3: Fresh Gmail OAuth Setup (If Needed)

If Gmail isn't configured at all:

1. **Get OAuth Credentials** from Google Cloud Console:
   - Project: ACT Placemat (or create new)
   - Enable Gmail API
   - Create OAuth 2.0 Client ID (Desktop app)
   - Download credentials JSON

2. **Add to .env**:
   ```ini
   GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=your_client_secret
   GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback
   ```

3. **Authenticate**:
   ```bash
   node core/src/services/gmailService.js
   ```

---

## Xero API Setup

### Option 1: Use Existing ACT Xero Service (Recommended)

ACT already has Xero OAuth configured. The subscription tracker uses the existing Xero integration.

**Check if it's working:**

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend"

# Check Xero tokens
ls -la .xero_tokens.json 2>/dev/null && echo "✅ Xero tokens exist" || echo "❌ No Xero tokens"
```

### Option 2: Verify Xero Connection

Test Xero API access:

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend"

# Test Xero connection (requires tokens)
curl -X GET "http://localhost:4000/api/xero/organisations" | jq
```

If this returns organization data, Xero is working!

### Option 3: Fresh Xero OAuth Setup (If Needed)

If Xero isn't configured:

1. **Get OAuth Credentials** from Xero Developer Portal:
   - App: ACT Placemat (or create new)
   - OAuth 2.0 credentials
   - Scopes: `accounting.transactions.read`, `accounting.contacts.read`

2. **Add to .env**:
   ```ini
   XERO_CLIENT_ID=your_xero_client_id
   XERO_CLIENT_SECRET=your_xero_client_secret
   XERO_REDIRECT_URI=http://localhost:4000/api/xero/callback
   ```

3. **Authenticate**:
   ```bash
   # Visit OAuth flow
   open "http://localhost:4000/api/xero/auth"
   # Follow prompts to authorize
   ```

---

## Testing the Integration

### Test 1: Gmail Receipt Scanner

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker"

# Create test script
cat > test-gmail.js << 'EOF'
import gmailService from '../core/src/services/gmailService.js';
import { ReceiptScanner } from './services/gmail/receiptScanner.js';

async function test() {
  const scanner = new ReceiptScanner(gmailService);

  console.log('Testing Gmail receipt scanning...');
  const messages = await scanner.scanForReceipts({ maxResults: 10 });

  console.log(`✅ Found ${messages.length} potential subscription emails`);

  if (messages.length > 0) {
    const sample = messages[0];
    const { confidence } = scanner.analyzeEmailForSubscription(sample);
    console.log(`Sample: "${sample.subject}" - Confidence: ${confidence.toFixed(2)}`);
  }
}

test().catch(console.error);
EOF

node test-gmail.js
```

**Expected Output:**
```
Testing Gmail receipt scanning...
✅ Found 15 potential subscription emails
Sample: "Your Netflix subscription receipt" - Confidence: 0.85
```

### Test 2: Xero Transaction Analyzer

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker"

# Create test script
cat > test-xero.js << 'EOF'
import { TransactionAnalyzer } from './services/xero/transactionAnalyzer.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const analyzer = new TransactionAnalyzer(supabase);

  console.log('Testing Xero transaction analysis...');

  // Note: This requires financial_transactions table to exist
  const recurring = await analyzer.findRecurringTransactions('your-tenant-id');

  console.log(`✅ Found ${recurring.length} recurring transaction patterns`);

  if (recurring.length > 0) {
    const sample = recurring[0];
    console.log(`Sample: ${sample.vendor} - ${sample.pattern.frequency} - Confidence: ${sample.confidence.toFixed(2)}`);
  }
}

test().catch(err => {
  console.error('Error:', err.message);
  if (err.message.includes('does not exist')) {
    console.log('\n⚠️  This is expected if you haven\'t run Xero sync yet.');
    console.log('Run the Xero sync first to populate financial_transactions table.');
  }
});
EOF

node test-xero.js
```

### Test 3: Full Discovery

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker"

# Use the standalone test we created earlier
node test-discovery.js
```

---

## Troubleshooting

### Gmail Issues

**Error: "Gmail API not enabled"**
- Enable Gmail API in Google Cloud Console
- Project: ACT Placemat

**Error: "Invalid credentials"**
- Check GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env
- Ensure OAuth consent screen is configured
- Re-download credentials from Google Cloud Console

**Error: "Token expired"**
- Delete `.gmail_tokens.json`
- Re-authenticate: `node core/src/services/gmailService.js`

**No subscription emails found**
- Normal! Gmail scanner looks for specific keywords
- Try searching manually in Gmail: `(subscription OR recurring) AND receipt`
- Adjust keywords in `config/settings.js` if needed

### Xero Issues

**Error: "Xero API not connected"**
- Visit: `http://localhost:4000/api/xero/auth`
- Complete OAuth flow
- Check `.xero_tokens.json` exists

**Error: "relation financial_transactions does not exist"**
- This table is created by Xero sync process
- Run: `curl -X POST http://localhost:4000/api/xero/sync`
- Or use ACT's existing Xero sync functionality

**Error: "Invalid token"**
- Xero tokens expire every 30 days
- Re-authenticate: Visit `/api/xero/auth` endpoint

**No recurring transactions found**
- Normal if you have few transactions or irregular patterns
- Analyzer requires 2+ transactions with similar amounts
- Check settings in `config/settings.js`:
  - `minOccurrences: 2` (lower to 1 for testing)
  - `maxDayVariance: 5` (increase to 10 for less strict matching)

### Discovery Issues

**"No subscriptions found"**

This is expected if:
1. Gmail/Xero aren't configured yet ← Most likely
2. No actual subscriptions in your data
3. Confidence threshold too high

**Debug checklist:**
```bash
# 1. Check Gmail works
node test-gmail.js

# 2. Check Xero works
node test-xero.js

# 3. Check database tables exist
node scripts/verify-subscription-tables.mjs

# 4. Lower confidence threshold temporarily
# Edit config/settings.js:
# minSubscriptionConfidence: 0.3  // Was 0.6
```

---

## Configuration Reference

### Minimum .env Variables Needed

```ini
# Gmail (existing ACT credentials)
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback

# Xero (existing ACT credentials)
XERO_CLIENT_ID=...
XERO_CLIENT_SECRET=...
XERO_REDIRECT_URI=http://localhost:4000/api/xero/callback

# Supabase (already configured)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Subscription Tracker (optional)
NOTION_RD_DATABASE_ID=...  # For R&D logging
PYTHON_PATH=/opt/homebrew/bin/python3
OCR_CONFIDENCE_THRESHOLD=0.75
NER_MODEL=dslim/bert-base-NER
SUBSCRIPTION_CACHE_TTL=86400
RD_TRACKING_ENABLED=true
```

### Subscription Tracker Config

Edit `apps/backend/subscription-tracker/config/settings.js`:

```javascript
export const config = {
  // Lower this for testing (default: 0.6)
  minSubscriptionConfidence: 0.5,

  // Adjust for your Xero data patterns
  xero: {
    minOccurrences: 2,      // Require 2+ matching transactions
    maxDayVariance: 5,      // Within 5 days of expected
    amountTolerance: 0.05,  // 5% variance allowed
    lookbackDays: 90        // Analyze last 90 days
  },

  // Gmail search configuration
  gmail: {
    maxResults: 200,        // Max emails per query
    defaultTimeframe: '3m', // 3 months lookback
    keywords: {
      strong: ['subscription', 'recurring', 'auto-renew'],
      moderate: ['payment', 'billing', 'invoice', 'receipt']
    }
  }
};
```

---

## Next Steps

Once Gmail and Xero are configured:

1. **Run full discovery**:
   ```bash
   node test-discovery.js
   ```

2. **Test API endpoint** (once server is running):
   ```bash
   curl -X POST "http://localhost:4000/api/v1/subscriptions/discover?tenantId=your-tenant-id"
   ```

3. **View results**:
   ```bash
   curl "http://localhost:4000/api/v1/subscriptions?tenantId=your-tenant-id&limit=10"
   ```

4. **Build frontend** to display discovered subscriptions

---

## Support

If you're stuck:
- Check ACT's existing Gmail/Xero setup in `apps/backend/core/src/services/`
- Review API credentials in `.env`
- Test each component individually (Gmail → Xero → Discovery)
- Lower confidence thresholds for testing
- Check logs in `/tmp/server.log`

**Built by ACT for the JusticeHub community** 🚜💚
