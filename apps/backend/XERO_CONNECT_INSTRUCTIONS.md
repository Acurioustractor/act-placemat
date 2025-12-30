# Xero OAuth Connection Instructions

## Current Status
✅ Diagnostic complete - refresh token invalid due to regenerated client secret
✅ Fixed OAuth script created - matches redirect URI exactly
⚠️  Backend server is currently running on port 4000 (PID: 36482)

## Steps to Connect Xero

### Step 1: Stop the Main Backend Server
The OAuth flow needs port 4000, which is currently in use.

```bash
# Stop the backend server
kill 36482

# Or use pkill
pkill -f "node.*server.js"
```

### Step 2: Start the OAuth Server
```bash
cd /Users/benknight/Code/ACT\ Placemat/apps/backend
node xero-connect-simple.js
```

You should see:
```
🚀 Xero OAuth Server Started

📍 IMPORTANT: Open this URL in your browser to connect:

   ✨ http://localhost:4000/connect

⏳ Waiting for authorization...

💡 Redirect URI: http://localhost:4000/api/xero/callback
   This MUST match exactly what is configured in your Xero app
```

### Step 3: Authorize in Browser
1. Open http://localhost:4000/connect in your browser
2. You'll be redirected to Xero
3. Log in to Xero if needed
4. Authorize the application
5. You'll be redirected back and see a success page

### Step 4: Verify Success
The OAuth server will:
- ✅ Exchange the authorization code for tokens
- ✅ Fetch your Xero tenant ID
- ✅ Update .env file automatically
- ✅ Show new token details in console
- ✅ Shut down automatically after 11 seconds

### Step 5: Restart Main Backend
```bash
cd /Users/benknight/Code/ACT\ Placemat/apps/backend
node server.js
```

### Step 6: Test Xero Sync
```bash
curl -X POST http://localhost:4000/api/v2/xero/sync/start
```

### Step 7: Check Subscriptions
Open the subscription dashboard:
```
http://localhost:5176/?tab=subscriptions
```

You should now see:
- 💰 Dollar amounts instead of "Unknown"
- 📊 Analytics with actual costs
- 🟢 Xero signals > 0 for matched vendors

## What This Fixes

### Before
- All OAuth attempts failed with `invalid_grant`
- Authorization codes expired unused
- Refresh token invalid due to regenerated client secret
- Port/path mismatch (4001/callback ≠ 4000/api/xero/callback)

### After
- OAuth flow completes successfully
- Fresh access and refresh tokens obtained
- Tokens saved to .env automatically
- Xero sync can pull bank transactions
- Subscription amounts populated from Xero data

## Troubleshooting

### Port 4000 Still in Use
```bash
# Find what's using the port
lsof -i :4000

# Stop it
kill <PID>
```

### Authorization Code Expired
Just go through the flow again - codes only last 10 minutes

### "redirect_uri_mismatch" Error
Verify in Xero developer portal (https://developer.xero.com/app/manage) that your app has this exact redirect URI:
```
http://localhost:4000/api/xero/callback
```

### Still Getting "invalid_grant"
This means:
1. Client secret doesn't match client ID - regenerate in Xero portal
2. Redirect URI mismatch - check Xero app configuration
3. Authorization code already used or expired - get a fresh one

## Expected Console Output

### Successful Flow
```
🔗 Redirecting to Xero authorization...
   Client ID: 5EF385B08FFF41599C45...
   Redirect URI: http://localhost:4000/api/xero/callback
   Scopes: offline_access, accounting.transactions.read, ...

✅ Received authorization code: mq0j8DkK5CUd...
📝 Exchanging code for tokens...

✅ Token exchange SUCCESSFUL!
📝 Fetching tenant connections...

✅ Connected to tenant: A Curious Tractor
   Tenant ID: 786af1ed-e3ce-42fc-9ea9-ddf3447d79d0

📋 New Xero credentials:
   Access token: eyJhbGciOiJSUzI1NiIsImtpZCI6...
   Refresh token: 7K0jRzxVfcOXyqk1UdL6mwf...
   Expires in: 1800 seconds (30 minutes)

   ✓ Updated XERO_TENANT_ID
   ✓ Updated XERO_ACCESS_TOKEN
   ✓ Updated XERO_REFRESH_TOKEN

✅ .env file updated successfully!

✅ OAuth flow complete! Shutting down...
```

## Next Features to Implement

Once Xero is connected:

1. **Reconciliation Dashboard**
   - Show subscriptions matched between Gmail & Xero
   - Flag discrepancies (in Gmail but not Xero, or vice versa)
   - Provide reconciliation workflow

2. **Smart Amount Detection**
   - Use Xero transaction amounts as primary source
   - Fall back to Gmail receipt parsing
   - Highlight when amounts don't match

3. **Renewal Tracking**
   - Predict next renewal date based on transaction history
   - Alert when renewals are upcoming
   - Show which subscriptions are past due

4. **Cost Optimization**
   - Identify unused subscriptions (no recent activity)
   - Compare similar services for savings opportunities
   - Show annual vs monthly payment savings

5. **Auto-Categorization**
   - Use Xero chart of accounts
   - Suggest expense categories
   - Bulk categorization for similar subscriptions
