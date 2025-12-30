# OAuth Multi-Account Setup Guide

**Setup Time**: ~15 minutes (5 min per account)
**Approach**: Individual OAuth 2.0 tokens instead of service account keys

---

## Why OAuth Instead of Service Account?

Your organization blocks service account key creation (security policy: `iam.disableServiceAccountKeyCreation`).

**OAuth Benefits**:
- ✅ Works within your security policies
- ✅ Actually more secure than service account keys
- ✅ User-scoped tokens (can be revoked individually)
- ✅ No long-lived keys to manage
- ✅ Automatic token refresh
- ✅ Granular access control

**Trade-off**: You need to authorize each account once (browser opens, you click "Allow"). After that, it's fully automated.

---

## Prerequisites

1. **OAuth 2.0 Credentials** from Google Cloud Console
2. **Gmail API** enabled in Google Cloud Console
3. **Access** to the 3 email accounts: nicholas@act.place, hi@act.place, accounts@act.place

---

## Step 1: Check OAuth Credentials File

The OAuth credentials should already exist from your single-account setup:

```bash
ls -la "/Users/benknight/Code/ACT Placemat/apps/backend/.gmail_credentials.json"
```

**Expected**: File exists (from previous ben.knight.au@gmail.com setup)

If the file doesn't exist, download it from Google Cloud Console:
1. Go to https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID (type: Desktop app or Web app)
3. Click download icon (⬇) to download JSON
4. Save as `/Users/benknight/Code/ACT Placemat/apps/backend/.gmail_credentials.json`

---

## Step 2: Migrate Existing Token (Optional)

If you have an existing `.gmail_tokens.json` file from single-account setup, migrate it:

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker"

node -e "
const { GmailTokenManager } = await import('./services/gmail/gmailTokenManager.js');
const tm = new GmailTokenManager();
const result = tm.migrateOldTokenFormat();
console.log('Migration result:', result);
"
```

This preserves your existing `ben.knight.au@gmail.com` token.

---

## Step 3: Authorize Each @act.place Account

Run the authorization script for each account:

### 3.1 Authorize nicholas@act.place

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker"
node authorize-account.js nicholas@act.place
```

**What happens**:
1. Script opens browser to Google's OAuth consent screen
2. Sign in with **nicholas@act.place**
3. Click "Allow" to grant read-only Gmail access
4. Copy the authorization code from the browser
5. Paste code back into terminal
6. Token is saved automatically

### 3.2 Authorize hi@act.place

```bash
node authorize-account.js hi@act.place
```

Repeat same process, but sign in with **hi@act.place** this time.

### 3.3 Authorize accounts@act.place

```bash
node authorize-account.js accounts@act.place
```

Repeat same process, but sign in with **accounts@act.place** this time.

---

## Step 4: Verify All Tokens

List authorized accounts:

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker"
node authorize-account.js --list
```

**Expected output**:
```
Authorized Accounts (3):
  ✓ nicholas@act.place
  ✓ hi@act.place
  ✓ accounts@act.place
```

Validate tokens work:

```bash
node authorize-account.js --list
# When prompted, type: y
```

This will test each token by making a simple Gmail API call.

---

## Step 5: Enable Multi-Account Scanning

Update your `.env` file:

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend"

# Add or update these lines in .env
cat >> .env << 'EOF'

# Multi-Account Gmail Scanning (OAuth 2.0)
GOOGLE_WORKSPACE_MULTI_ACCOUNT=true
GOOGLE_WORKSPACE_DOMAIN=act.place
GOOGLE_WORKSPACE_ACCOUNTS=nicholas@act.place,hi@act.place,accounts@act.place
EOF
```

**Note**: We don't need `GOOGLE_SERVICE_ACCOUNT_PATH` anymore since we're using OAuth tokens.

---

## Step 6: Test Multi-Account Scanning

Run the test script:

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker"
node test-multi-account.js
```

**Expected output**:
```
🔍 Testing Multi-Account Gmail Scanning...
════════════════════════════════════════════════════════════

[Multi-Account] Initialized OAuth-based scanner for accounts: [ 'nicholas@act.place', 'hi@act.place', 'accounts@act.place' ]

📧 Scanning accounts for subscription receipts...
   - Timeframe: Last 1 month
   - Max results: 5 per query

[Multi-Account] Starting parallel scan of 3 accounts
[Multi-Account] Found 4 unique messages in nicholas@act.place
[Multi-Account] Found 2 unique messages in hi@act.place
[Multi-Account] Found 1 unique messages in accounts@act.place
[Multi-Account] Scan complete in 8.3s
[Multi-Account] Total messages: 7, Unique: 6
[Multi-Account] Deduplication rate: 14.3%

✅ SUCCESS! Multi-account scanning is working!

═══════════════════════════════════════════════════════════

📊 Results: Found 6 total messages

📈 Message Distribution:
   nicholas@act.place              4 (66.7%) ██
   hi@act.place                    2 (33.3%) █
   accounts@act.place              1 (16.7%)

📝 Sample Messages:

   1. From: nicholas@act.place
      Subject: Netflix - Your monthly payment receipt
      ID: abc123...

✨ Multi-account scanning is ready to use!
```

---

## Token Storage

Tokens are stored in:

```
/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker/.gmail_tokens/
├── nicholas_at_act.place.json
├── hi_at_act.place.json
└── accounts_at_act.place.json
```

**Security**:
- Files have `600` permissions (owner read/write only)
- Directory is in `.gitignore` (not committed to git)
- Tokens auto-refresh when they expire (handled by Google's API client)

---

## Usage in Production

Once authorized, the system automatically uses multi-account scanning:

```bash
# This now scans all 3 @act.place accounts
curl -X POST "http://localhost:4000/api/v1/subscriptions/discover?tenantId=YOUR_TENANT_ID"
```

The subscription detector will:
1. Check if `GOOGLE_WORKSPACE_MULTI_ACCOUNT=true`
2. Check which accounts have valid tokens
3. Scan all authorized accounts in parallel
4. Deduplicate messages across accounts
5. Track which account found each subscription
6. Fall back to single-account if multi-account unavailable

---

## Maintenance

### Re-authorize an Account

If a token expires or becomes invalid:

```bash
node authorize-account.js nicholas@act.place
# When prompted, type: y (to overwrite existing token)
```

### Revoke an Account

To remove authorization:

```bash
node authorize-account.js --revoke nicholas@act.place
```

**Note**: This only deletes the local token. To fully revoke access, go to:
https://myaccount.google.com/permissions

### Check Token Health

```bash
node authorize-account.js --list
# When prompted, type: y (to validate all tokens)
```

---

## Troubleshooting

### Error: "No token found for <email>"

**Fix**: Authorize the account:
```bash
node authorize-account.js <email>
```

### Error: "invalid_grant" or "Token has been expired or revoked"

**Fix**: Re-authorize the account:
```bash
node authorize-account.js <email>
```

### Error: "The OAuth client was not found"

**Fix**: Check OAuth credentials file exists:
```bash
ls -la "/Users/benknight/Code/ACT Placemat/apps/backend/.gmail_credentials.json"
```

If missing, download from Google Cloud Console.

### Multi-Account Scanning Not Working?

Check status:
```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker"
node -e "
const { MultiAccountScanner } = await import('./services/gmail/multiAccountScanner.js');
const scanner = new MultiAccountScanner();
const status = await scanner.getStatus();
console.log('Status:', JSON.stringify(status, null, 2));
"
```

**Expected output**:
```json
{
  "enabled": true,
  "configuredAccounts": [
    "nicholas@act.place",
    "hi@act.place",
    "accounts@act.place"
  ],
  "authorizedAccounts": [
    "nicholas@act.place",
    "hi@act.place",
    "accounts@act.place"
  ],
  "missingAccounts": [],
  "ready": true
}
```

If `ready: false`, authorize the missing accounts.

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Scan Time | <= 45s for 3 accounts | Check test output: "Scan complete in X.Xs" |
| Deduplication | >= 95% | Check test output: "Deduplication rate: X%" |
| Token Refresh | Zero failures over 30 days | Monitor logs for "Refreshed token for" messages |
| Account Coverage | 100% (all 3 accounts) | `node authorize-account.js --list` |

---

## Next Steps

Once multi-account scanning is working:

1. **Run First Full Scan**:
   ```bash
   curl -X POST "http://localhost:4000/api/v1/subscriptions/discover?tenantId=YOUR_TENANT_ID"
   ```

2. **Compare Results**:
   - Check which account found each subscription
   - Identify subscriptions unique to each account
   - Verify deduplication is working (no duplicate subscriptions)

3. **Monitor Performance**:
   - Track scan time over multiple runs
   - Watch for token refresh messages (should be automatic)
   - Check for any "invalid_grant" errors (indicates token issues)

4. **Start Email Consolidation**:
   - Export vendor contact list
   - Update vendor billing emails to accounts@act.place
   - Track migration progress

---

## Support

If you encounter issues:

1. Check logs for detailed error messages
2. Verify tokens with `node authorize-account.js --list`
3. Re-authorize accounts if needed
4. Ensure Gmail API is enabled in Google Cloud Console

**Current Fallback**: If multi-account fails, system automatically falls back to single-account OAuth (ben.knight.au@gmail.com).

---

**Implementation Complete**: OAuth-based multi-account scanner ready! ✅

Now just authorize the 3 accounts and test.
