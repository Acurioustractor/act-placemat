# Google Workspace Service Account Setup Guide

**Goal**: Enable multi-account Gmail scanning for nicholas@act.place, hi@act.place, and accounts@act.place

**Time Required**: ~30 minutes

---

## Step 1: Create Service Account in Google Cloud Console

### 1.1 Access Google Cloud Console

1. Go to: https://console.cloud.google.com/
2. Select your project (or create one if needed)
   - Recommended project name: **"ACT Platform"** or **"ACT Subscription Tracker"**

### 1.2 Enable Gmail API

1. Go to **APIs & Services** → **Library**
2. Search for **"Gmail API"**
3. Click **Enable** (if not already enabled)

### 1.3 Create Service Account

1. Go to **IAM & Admin** → **Service Accounts**
   - Direct link: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Click **+ CREATE SERVICE ACCOUNT**
3. Fill in details:
   - **Service account name**: `subscription-scanner`
   - **Service account ID**: `subscription-scanner` (auto-filled)
   - **Description**: `Multi-account Gmail scanner for subscription tracking`
4. Click **CREATE AND CONTINUE**
5. Skip **Grant this service account access to project** (click **CONTINUE**)
6. Skip **Grant users access to this service account** (click **DONE**)

### 1.4 Create & Download Service Account Key

1. Click on the newly created service account (`subscription-scanner@...`)
2. Go to **KEYS** tab
3. Click **ADD KEY** → **Create new key**
4. Select **JSON** format
5. Click **CREATE**
6. The JSON key file will download automatically
7. **Important**: Save this file as `service-account.json` - we'll move it to the right location in Step 3

### 1.5 Note the Client ID

1. While still on the service account page, go to the **DETAILS** tab
2. Copy the **Unique ID** (also called **OAuth 2 Client ID**)
   - It looks like: `1234567890123456789`
3. Keep this handy - you'll need it in Step 2

---

## Step 2: Enable Domain-Wide Delegation in Google Workspace Admin

**Note**: You must be a Google Workspace Super Admin to complete this step.

### 2.1 Access Admin Console

1. Go to: https://admin.google.com/
2. Sign in with your Google Workspace admin account

### 2.2 Navigate to Domain-Wide Delegation

1. Click **Security** in the left sidebar (or use the search bar)
2. Click **Access and data control**
3. Click **API controls**
4. Scroll down to **Domain-wide delegation**
5. Click **MANAGE DOMAIN WIDE DELEGATION**

### 2.3 Add Service Account Authorization

1. Click **Add new**
2. Fill in the form:
   - **Client ID**: Paste the **Unique ID** from Step 1.5
   - **OAuth Scopes**: `https://www.googleapis.com/auth/gmail.readonly`
3. Click **AUTHORIZE**

### 2.4 Verify Configuration

You should see your service account listed with:
- **Client ID**: (your ID)
- **Scopes**: `https://www.googleapis.com/auth/gmail.readonly`

---

## Step 3: Configure Backend

### 3.1 Move Service Account Key File

1. Locate the downloaded `service-account.json` file (probably in Downloads folder)
2. Move it to: `/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker/config/`

```bash
# Example command (adjust path to your Downloads folder):
mkdir -p "/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker/config"
mv ~/Downloads/act-platform-*.json "/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker/config/service-account.json"
```

### 3.2 Update .env File

Add these lines to `/Users/benknight/Code/ACT Placemat/apps/backend/.env`:

```ini
# Google Workspace Multi-Account
GOOGLE_WORKSPACE_MULTI_ACCOUNT=true
GOOGLE_SERVICE_ACCOUNT_PATH=./subscription-tracker/config/service-account.json
GOOGLE_WORKSPACE_DOMAIN=act.place
GOOGLE_WORKSPACE_ACCOUNTS=nicholas@act.place,hi@act.place,accounts@act.place
```

### 3.3 Secure the Service Account File

```bash
# Ensure the file is not committed to git
echo "apps/backend/subscription-tracker/config/service-account.json" >> .gitignore

# Set restrictive permissions
chmod 600 "/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker/config/service-account.json"
```

---

## Step 4: Test the Configuration

### 4.1 Create a Test Script

Create a file: `/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker/test-multi-account.js`

```javascript
import { MultiAccountScanner } from './services/gmail/multiAccountScanner.js';

const scanner = new MultiAccountScanner();

console.log('Testing multi-account Gmail scanning...\n');

scanner.scanAllAccounts({ maxResults: 5, timeframe: '1m' })
  .then(messages => {
    if (messages === null) {
      console.error('❌ Multi-account scanning failed - check configuration');
      process.exit(1);
    } else {
      console.log(`✅ Success! Found ${messages.length} messages across accounts`);

      // Show distribution
      const accountDist = {};
      messages.forEach(msg => {
        const acct = msg.accountEmail || 'unknown';
        accountDist[acct] = (accountDist[acct] || 0) + 1;
      });

      console.log('\nMessage distribution:');
      Object.entries(accountDist).forEach(([email, count]) => {
        console.log(`  ${email}: ${count} messages`);
      });

      process.exit(0);
    }
  })
  .catch(error => {
    console.error('❌ Error during test:', error.message);
    process.exit(1);
  });
```

### 4.2 Run the Test

```bash
cd /Users/benknight/Code/ACT\ Placemat/apps/backend/subscription-tracker
node test-multi-account.js
```

**Expected Output**:
```
Testing multi-account Gmail scanning...

[Multi-Account] Initialized with accounts: [ 'nicholas@act.place', 'hi@act.place', 'accounts@act.place' ]
[Multi-Account] Starting parallel scan of 3 accounts
[Multi-Account] Found X unique messages in nicholas@act.place
[Multi-Account] Found Y unique messages in hi@act.place
[Multi-Account] Found Z unique messages in accounts@act.place
[Multi-Account] Scan complete in 12.5s
[Multi-Account] Total messages: 15, Unique: 14
[Multi-Account] Deduplication rate: 6.7%

✅ Success! Found 14 messages across accounts

Message distribution:
  nicholas@act.place: 8 messages
  hi@act.place: 4 messages
  accounts@act.place: 2 messages
```

---

## Troubleshooting

### Error: "Tenant or user not found" or "Service account not found"

**Cause**: Service account JSON file not found or invalid path

**Fix**:
1. Verify file exists: `ls -la apps/backend/subscription-tracker/config/service-account.json`
2. Check path in `.env` matches actual location
3. Ensure JSON file is valid (open in text editor - should start with `{`)

### Error: "Insufficient Permission" or "Request had insufficient authentication scopes"

**Cause**: Domain-wide delegation not configured correctly

**Fix**:
1. Verify Client ID matches in Admin Console
2. Confirm scope is exactly: `https://www.googleapis.com/auth/gmail.readonly`
3. Wait 10-15 minutes for Google's systems to propagate the changes
4. Try signing out and back into Google Workspace Admin Console

### Error: "User does not have access to this resource"

**Cause**: Service account doesn't have permission to impersonate users

**Fix**:
1. Ensure domain-wide delegation is authorized for **all users** (not specific OUs)
2. Confirm the accounts (nicholas@, hi@, accounts@) exist in your Google Workspace
3. Check that emails in `GOOGLE_WORKSPACE_ACCOUNTS` match exactly (case-sensitive)

### Messages: "Multi-account scan unavailable, falling back to single-account"

**Cause**: Multi-account feature is disabled or service account setup incomplete

**Fix**:
1. Check `GOOGLE_WORKSPACE_MULTI_ACCOUNT=true` in `.env`
2. Verify service account file exists and is readable
3. Look for detailed error messages in console logs

---

## Security Best Practices

✅ **DO**:
- Keep `service-account.json` in `.gitignore`
- Use restrictive file permissions (600)
- Store production keys in secure vault (1Password, AWS Secrets Manager)
- Rotate keys annually
- Use read-only scope (`gmail.readonly`)

❌ **DON'T**:
- Commit service account keys to git
- Share keys via email or Slack
- Use broader scopes than needed
- Use same key across multiple environments

---

## Next Steps After Setup

Once multi-account scanning is working:

1. **Run First Scan**:
   ```bash
   # This will now scan all 3 accounts
   curl -X POST "http://localhost:4000/api/v1/subscriptions/discover?tenantId=YOUR_TENANT_ID"
   ```

2. **Monitor Performance**:
   - Check scan time (target: <45s for 3 accounts)
   - Verify deduplication rate (target: >95%)
   - Confirm messages from all accounts

3. **Update Discovery**:
   - Compare results vs single-account scan
   - Check which account found each subscription
   - Identify subscriptions unique to each account

---

## Support

If you encounter issues:
1. Check logs for detailed error messages
2. Verify each step completed successfully
3. Wait 10-15 minutes if you just configured domain-wide delegation
4. Ensure you're a Google Workspace Super Admin

**Current Status**: Single-account OAuth works as fallback, so existing functionality is preserved!
