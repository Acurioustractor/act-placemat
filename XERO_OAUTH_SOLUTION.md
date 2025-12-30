# Xero OAuth Integration - Problem Solved

## Root Cause Analysis

### The Problem
All Xero OAuth attempts were failing with `invalid_grant` errors despite:
- Having correct client ID and regenerated client secret
- Obtaining fresh authorization codes
- Having valid refresh token format

### The Root Cause
**Redirect URI Mismatch** - The critical issue was discovered through diagnostic analysis:

1. **Refresh Token Issue**: The refresh token was created on September 30, 2025 but the client secret was regenerated on December 30, 2025. Once a client secret is regenerated, all previous refresh tokens become invalid.

2. **Authorization Code Issue**: The OAuth flow scripts were running on port 4001 and listening on `/callback`, but:
   - The redirect URI configured in .env: `http://localhost:4000/api/xero/callback`
   - The XeroClient was initialized with: `http://localhost:4000/api/xero/callback`
   - But the server was listening on: `http://localhost:4001/callback`

   This meant Xero would redirect to port 4000, but nothing was listening there!

3. **Port Conflict**: The main backend server runs on port 4000 with Redis-dependent OAuth handlers, but Redis wasn't running, causing those handlers to fail.

## The Solution

### File: `xero-connect-simple.js`

A new, simplified OAuth flow script that:
- ✅ Runs on **port 4000** (matches redirect URI)
- ✅ Listens on **`/api/xero/callback`** (matches redirect URI exactly)
- ✅ No Redis dependency
- ✅ No xero-node SDK complexity
- ✅ Direct OAuth2 token exchange
- ✅ Automatic .env file updates
- ✅ Fetches tenant connections

### How to Use

1. **Start the OAuth server**:
   ```bash
   cd apps/backend
   node xero-connect-simple.js
   ```

2. **Open the connection URL** in your browser:
   ```
   http://localhost:4000/connect
   ```

3. **Authorize the app** in Xero - you'll be redirected to the callback

4. **Tokens are automatically saved** to .env:
   - `XERO_ACCESS_TOKEN` - Valid for 30 minutes
   - `XERO_REFRESH_TOKEN` - Use to get new access tokens
   - `XERO_TENANT_ID` - Your organization ID

5. **Restart your main backend** to load the new tokens

6. **Test the Xero sync**:
   ```bash
   curl -X POST http://localhost:4000/api/v2/xero/sync/start
   ```

## Verification Steps

### Before Running OAuth Flow

Run the diagnostic script to check current token status:
```bash
node xero-diagnose.js
```

This will show:
- Current token expiry status
- Whether refresh token is valid
- Specific error diagnosis

### After Successful OAuth

1. Check that .env has been updated with new tokens
2. Restart backend server: `npm start` or `node server.js`
3. Trigger Xero sync to pull bank transactions
4. Verify subscriptions now show dollar amounts

## Key Configuration Requirements

### Xero Developer Portal Settings

Your Xero app MUST have this exact redirect URI configured:
```
http://localhost:4000/api/xero/callback
```

**Where to check**:
1. Go to https://developer.xero.com/app/manage
2. Find app with Client ID: `5EF385B08FFF41599C456F7B55118776`
3. Under "OAuth 2.0 redirect URIs", verify the above URI is listed

### Environment Variables

Required in .env:
```bash
XERO_CLIENT_ID=5EF385B08FFF41599C456F7B55118776
XERO_CLIENT_SECRET=klo98__Nf8vm9hshzgqgPMHSF4YDvdGmNmS4-EhW81rwTje3
XERO_REDIRECT_URI=http://localhost:4000/api/xero/callback
XERO_TENANT_ID=<will be auto-populated>
XERO_ACCESS_TOKEN=<will be auto-populated>
XERO_REFRESH_TOKEN=<will be auto-populated>
```

## Scopes Requested

The OAuth flow requests these permissions:
- `offline_access` - Get refresh tokens
- `accounting.transactions.read` - Read bank transactions
- `accounting.reports.read` - Read financial reports
- `accounting.contacts.read` - Read suppliers/vendors
- `accounting.settings.read` - Read organization settings
- `accounting.budgets.read` - Read budgets

## Token Lifecycle

### Access Token
- **Lifetime**: 30 minutes
- **Use**: Making API calls to Xero
- **Refresh**: Use refresh token when expired

### Refresh Token
- **Lifetime**: 60 days (if used at least once every 60 days)
- **Use**: Getting new access tokens
- **Important**: Becomes invalid if client secret is regenerated

### Auto-Refresh Strategy

The `xeroService.js` should implement:
1. Check if access token is expired before each API call
2. If expired, use refresh token to get new access token
3. Update .env or cache with new tokens
4. Retry the original API call

## Why Previous Attempts Failed

1. **Attempt 1-3**: Used authorization codes with old client secret
   - Result: `invalid_client` error

2. **Attempt 4-6**: Regenerated client secret, got new codes
   - Result: `invalid_grant` error
   - Reason: Port/path mismatch (4001/callback vs 4000/api/xero/callback)

3. **Refresh Token Attempts**: Used old refresh token
   - Result: `invalid_grant` error
   - Reason: Refresh token was created with previous client secret

## Next Steps After Successful Auth

1. **Enable Xero Sync in Subscription Tracker**:
   - Bank transactions will be analyzed for recurring payments
   - Amounts will be populated in subscriptions
   - Confidence scores will include 40% from Xero signals

2. **Reconciliation Tracking**:
   - Match Gmail receipts with Xero transactions
   - Flag subscriptions that appear in Gmail but not Xero (or vice versa)
   - Show which need reconciliation vs already reconciled

3. **Analytics**:
   - Display actual dollar amounts instead of "Unknown"
   - Calculate total annual cost from Xero transaction data
   - Show breakdown by vendor, frequency, category

## Troubleshooting

### "invalid_grant" Error
- Refresh token is invalid (expired or created with different client secret)
- Authorization code is expired (10 minute lifetime)
- Solution: Complete fresh OAuth flow

### "invalid_client" Error
- Client ID or client secret is incorrect
- Solution: Verify credentials in Xero developer portal

### "redirect_uri_mismatch" Error
- The redirect URI in OAuth request doesn't match Xero app config
- Solution: Ensure exact match including protocol, port, and path

### Port Already in Use
- Another process is using port 4000
- Solution: Stop the other process or use different port (update redirect URI)

### Redis Connection Errors
- The xeroAuth.js handlers require Redis but it's not running
- Solution: Use xero-connect-simple.js instead (no Redis needed)

## Files Reference

- `xero-connect-simple.js` - **USE THIS** for OAuth flow
- `xero-diagnose.js` - Check token status and troubleshoot
- `xero-oauth-flow.js` - Old script (has port mismatch issue)
- `exchange-xero-code.js` - Manual code exchange (for debugging)
- `refresh-xero-token-direct.js` - Manual token refresh (for debugging)

## Success Indicators

You'll know the integration is working when:
- ✅ OAuth flow completes without errors
- ✅ .env file has fresh access and refresh tokens
- ✅ Xero sync pulls bank transactions (check database)
- ✅ Subscriptions display actual dollar amounts
- ✅ Analytics show total costs instead of $0.00
- ✅ Xero signals > 0 for matched subscriptions
