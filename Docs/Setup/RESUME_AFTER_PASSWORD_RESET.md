# Resume Multi-Account Setup After Password Reset

**Current Status**: Everything is configured EXCEPT domain-wide delegation (blocked by admin console password issue)

---

## What's Already Done ✅

1. ✅ **Organization policy disabled** - Service account key creation is allowed
2. ✅ **Service account created** - `subscription-scanner@act-subscription-tracker.iam.gserviceaccount.com`
3. ✅ **Service account key downloaded** - Saved to `apps/backend/subscription-tracker/config/service-account.json`
4. ✅ **Environment variables configured** - `.env` has multi-account settings
5. ✅ **Security configured** - Service account key in `.gitignore` with 600 permissions
6. ✅ **Code ready** - Multi-account scanner using service account

---

## What You Need to Do (5 minutes)

### Step 1: Get Admin Console Access

Once your password reset lockout expires (48 hours from when it started):

1. Go to: https://admin.google.com/
2. Sign in with: nicholas@act.place (or your admin account)
3. Use your working password

### Step 2: Configure Domain-Wide Delegation

**Direct Link**: https://admin.google.com/ac/owl/domainwidedelegation

**OR navigate manually**:
1. In the search bar at the top, type: `domain wide delegation`
2. Click the result

**Then**:
1. Click **Add new** button
2. Fill in:
   - **Client ID**: `106740829315613258776`
   - **OAuth Scopes**: `https://www.googleapis.com/auth/gmail.readonly`
3. Click **AUTHORIZE**

✅ **Done!** Domain-wide delegation is now configured.

---

## Step 3: Test Multi-Account Scanning

Wait 10 minutes for delegation to propagate, then:

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker"
node test-multi-account.js
```

**Expected output**:
```
✅ SUCCESS! Multi-account scanning is working!

📊 Results: Found X total messages

📈 Message Distribution:
   nicholas@act.place              X messages
   hi@act.place                    X messages
   accounts@act.place              X messages
```

---

## If You Get Errors:

### Error: "Not Authorized" or "unauthorized_client"

**Cause**: Domain-wide delegation not configured or not propagated yet

**Fix**:
1. Wait 15 minutes (Google's systems can be slow)
2. Verify Client ID matches exactly: `106740829315613258776`
3. Verify scope is exactly: `https://www.googleapis.com/auth/gmail.readonly`
4. Try signing out and back into admin console

### Error: "Service account file not found"

**Cause**: Service account key is not where the code expects it

**Fix**:
```bash
ls -la "/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker/config/service-account.json"
```

Should show: `-rw------- 1 benknight staff 2406 ...`

If missing, re-download from Google Cloud Console.

### Error: "Failed to authenticate as nicholas@act.place"

**Cause**: Domain-wide delegation scope mismatch

**Fix**: Double-check the OAuth scope in admin console is exactly:
```
https://www.googleapis.com/auth/gmail.readonly
```

(No extra spaces, exact URL)

---

## Step 4: Deploy to Vercel (Optional)

Once multi-account scanning works locally, you can deploy to Vercel:

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend"

# Convert service account JSON to base64 (avoids newline issues)
cat subscription-tracker/config/service-account.json | base64 > /tmp/service-account-b64.txt

# Add to Vercel environment variable
vercel env add GOOGLE_SERVICE_ACCOUNT < /tmp/service-account-b64.txt

# Then in your code, decode it:
# const serviceAccount = JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT, 'base64').toString())
```

---

## Summary

**You're 99% done!** Just need to:
1. Wait for password lockout to expire
2. Log into admin.google.com
3. Add Client ID `106740829315613258776` with scope `https://www.googleapis.com/auth/gmail.readonly`
4. Test with `node test-multi-account.js`

**Total time after admin access restored**: ~15 minutes (10 min wait for propagation, 5 min testing)

---

## Client ID (for copy-paste):

```
106740829315613258776
```

## OAuth Scope (for copy-paste):

```
https://www.googleapis.com/auth/gmail.readonly
```

---

**Everything else is ready to go! 🚀**
