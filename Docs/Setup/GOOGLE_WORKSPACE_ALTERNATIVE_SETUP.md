# Google Workspace Setup - Alternative Approach (No Service Account Keys)

**Issue**: Organization policy blocks service account key creation
**Solution**: Use OAuth 2.0 with multiple authorized users OR Workload Identity Federation

---

## Recommended Approach: Multiple OAuth Tokens

Since your org blocks service account keys (for good security reasons!), we'll use **multiple OAuth tokens** instead - one per email account.

### Pros
- ✅ No service account keys needed
- ✅ Works within your security policy
- ✅ Same end result (scan multiple accounts)
- ✅ Easy to set up

### Cons
- ⚠️ Need to authorize each account once
- ⚠️ Tokens need periodic refresh (handled automatically)

---

## Step 1: Understand Current Setup

Right now, you have OAuth working for `ben.knight.au@gmail.com` with token stored at:
```
/Users/benknight/Code/ACT Placemat/apps/backend/.gmail_tokens.json
```

We'll extend this to support multiple accounts.

---

## Step 2: Update Gmail Service for Multi-Token Support

Let's modify the existing Gmail service to support multiple OAuth tokens instead of a service account.

### 2.1 Create Token Storage Structure

Instead of one token file, we'll have:
```
apps/backend/.gmail_tokens/
├── ben.knight.au@gmail.com.json
├── nicholas@act.place.json
├── hi@act.place.json
└── accounts@act.place.json
```

### 2.2 Update OAuth Flow

We'll create a helper script to authorize each account:

```bash
# Run this for each account
node apps/backend/subscription-tracker/authorize-account.js nicholas@act.place
node apps/backend/subscription-tracker/authorize-account.js hi@act.place
node apps/backend/subscription-tracker/authorize-account.js accounts@act.place
```

Each will open a browser for that specific account's authorization.

---

## Step 3: Implementation Plan

I'll create:

1. **Multi-token storage manager** - Handles multiple OAuth tokens
2. **Account authorization script** - Easy CLI to add new accounts
3. **Updated multi-account scanner** - Uses OAuth tokens instead of service account
4. **Token refresh handler** - Automatically refreshes expired tokens

This approach is actually **more secure** than service account keys because:
- ✅ Tokens are user-scoped (can be revoked individually)
- ✅ Follows your org's security policy
- ✅ No long-lived keys to manage
- ✅ Granular access control

---

## Step 4: Quick Implementation

Would you like me to:

**Option A**: Implement the multi-OAuth token approach (recommended)
- Takes ~30 min to implement
- You'll need to authorize each account once (5 min per account)
- Works within your security policies
- Same end result as service account

**Option B**: Keep single-account scanning for now
- Already working with ben.knight.au@gmail.com
- Simpler, but only scans one account
- Can add multi-account later when needed

**Option C**: Use Workload Identity Federation (advanced)
- More complex setup
- No keys required
- Works with GCP infrastructure
- Overkill for this use case

---

## My Recommendation

**Go with Option A** - Multi-OAuth token approach.

Here's why:
1. ✅ Works with your security policies
2. ✅ Actually more secure than service account keys
3. ✅ Easy to set up (I'll build it now)
4. ✅ Achieves the same goal (scan 3 accounts)
5. ✅ Tokens auto-refresh, so low maintenance

The only "downside" is you need to click "Allow" 3 times (once per account) during initial setup. After that, it's fully automated.

---

## What I'll Build (Option A)

### New Files:
1. **`gmailTokenManager.js`** - Manages multiple OAuth tokens
2. **`authorize-account.js`** - CLI tool to add/authorize accounts
3. **`multiAccountScannerOAuth.js`** - Updated scanner using OAuth (not service account)

### Changes to Existing:
- Update `subscriptionDetector.js` to use OAuth-based multi-account scanner
- Update config to specify which accounts to scan
- Migration from `.gmail_tokens.json` → `.gmail_tokens/` directory

### User Experience:
```bash
# One-time setup (5 min per account)
cd apps/backend/subscription-tracker
node authorize-account.js nicholas@act.place   # Opens browser, you click Allow
node authorize-account.js hi@act.place         # Opens browser, you click Allow
node authorize-account.js accounts@act.place   # Opens browser, you click Allow

# Done! Now multi-account scanning works automatically
node test-multi-account.js
# ✅ Scanning nicholas@act.place...
# ✅ Scanning hi@act.place...
# ✅ Scanning accounts@act.place...
```

---

## Let Me Know

Would you like me to implement **Option A** (multi-OAuth approach)?

I can have it ready in about 30 minutes, then you just need to authorize each account once (browser will open, you sign in with each email and click "Allow").

This is the **best solution** given your organization's security policy!
