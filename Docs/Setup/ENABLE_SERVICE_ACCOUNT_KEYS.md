# Enable Service Account Key Creation - Organization Policy Guide

**Time Required**: 5-10 minutes (if you're a Super Admin)

---

## Current Issue

Your organization has this policy enabled:
```
iam.disableServiceAccountKeyCreation
```

This blocks you from downloading service account keys, which is why you got the error:
> "Service account key creation is disabled. An Organization Policy that blocks service accounts key creation has been enforced on your organization."

---

## Prerequisites

✅ You must be a **Google Workspace Super Administrator**
✅ You must have **Organization Policy Admin** role in Google Cloud

---

## Step 1: Check Your Admin Status

### Google Workspace Admin:
1. Go to https://admin.google.com/
2. Check if you see all admin options (Security, Users, etc.)
3. If you can access everything → You're a Super Admin ✅

### Google Cloud Admin:
1. Go to https://console.cloud.google.com/
2. Click your profile (top right) → Check your roles
3. You need: **Organization Policy Administrator** or **Owner**

If you don't have these permissions, you'll need to ask someone who does.

---

## Step 2: Modify the Organization Policy

### Option A: Disable the Policy Completely (Simplest)

**Warning**: This allows service account key creation for all projects in your organization. If you're the only admin, this is fine.

1. Go to **Google Cloud Console**: https://console.cloud.google.com/
2. Select your organization (top dropdown)
3. Navigate to: **IAM & Admin** → **Organization Policies**
   - Direct link: https://console.cloud.google.com/iam-admin/orgpolicies
4. Search for: `iam.disableServiceAccountKeyCreation`
5. Click on the policy
6. Click **EDIT**
7. Select **Customize**
8. Under "Policy values":
   - Select **Not enforced** (or remove the enforcement rule)
9. Click **SET POLICY**

✅ **Done!** Service account key creation is now allowed.

### Option B: Allow Keys for Specific Project Only (More Secure)

This keeps the organization-wide restriction but creates an exception for your ACT Platform project.

1. Go to **Google Cloud Console**: https://console.cloud.google.com/
2. Select **your ACT Platform project** (not organization)
3. Navigate to: **IAM & Admin** → **Organization Policies**
4. Search for: `iam.disableServiceAccountKeyCreation`
5. Click **MANAGE PROJECT POLICY**
6. Select **Override parent's policy**
7. Select **Not enforced**
8. Click **SET POLICY**

✅ **Done!** Service account keys are now allowed for this project only.

### Option C: Allow Keys for Specific Service Account

Most granular approach - only allow keys for your subscription scanner service account:

1. Follow Option B to override at project level
2. Additionally, use IAM conditions to restrict which service accounts can create keys
3. This requires more advanced IAM configuration

---

## Step 3: Verify the Change

Wait 5-10 minutes for the policy to propagate, then test:

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Click on your `subscription-scanner` service account (or create it if needed)
3. Go to **KEYS** tab
4. Click **ADD KEY** → **Create new key**
5. Select **JSON**
6. Click **CREATE**

✅ **Success**: If the key downloads, the policy change worked!
❌ **Failed**: If you still see the error, wait a few more minutes and try again

---

## Step 4: Resume Service Account Setup

Now that you can create keys, go back to the original service account setup:

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker"

# Follow the setup guide
open ../GOOGLE_WORKSPACE_SETUP_GUIDE.md
```

Or use the automated setup script:

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend"
bash setup-google-workspace.sh
```

---

## Security Considerations

### If You Disabled the Policy (Option A):

**Risks**:
- Anyone with "Service Account Admin" role can now create keys
- More potential for key leakage if keys are created carelessly

**Mitigations**:
1. Limit who has "Service Account Admin" role
2. Enable **Cloud Asset Inventory** to track service account keys
3. Set up **audit logging** to monitor key creation
4. Rotate keys regularly (every 90 days)
5. Use **Secrets Manager** to store keys (not in code)

### If You Used Project-Level Override (Option B):

**Lower Risk**:
- Policy only affects your specific project
- Rest of organization still protected
- Recommended approach ✅

### Best Practices Going Forward:

1. **Store keys securely**:
   ```bash
   # Never commit to git
   echo "service-account.json" >> .gitignore

   # Set restrictive permissions
   chmod 600 service-account.json
   ```

2. **Use Vercel Secrets** for production:
   ```bash
   # Upload as base64 to avoid newline issues
   cat service-account.json | base64 | vercel env add GOOGLE_SERVICE_ACCOUNT
   ```

3. **Monitor key usage**:
   - Check Cloud Logging for service account activity
   - Set up alerts for unusual API calls

4. **Key rotation schedule**:
   - Create new key every 90 days
   - Delete old key after confirming new one works
   - Update Vercel environment variable

---

## Alternative: Keep Policy Enabled, Use OAuth

If your organization's security team won't allow disabling this policy (or you don't want to), the OAuth approach I already built still works:

- ✅ More secure than service account keys
- ✅ Compliant with your org policy
- ✅ One-time authorization per account (~15 min total)
- ✅ Tokens auto-refresh forever

See: [OAUTH_MULTI_ACCOUNT_SETUP.md](OAUTH_MULTI_ACCOUNT_SETUP.md)

---

## Troubleshooting

### "You don't have permission to modify organization policies"

**Solution**: You need **Organization Policy Administrator** role.

Ask someone with Owner/Admin to grant you this role:
1. Go to https://console.cloud.google.com/iam-admin/iam
2. Select your organization
3. Find your user → Edit
4. Add role: **Organization Policy Administrator**

### Policy change not taking effect

**Wait longer**: Organization policies can take up to 15 minutes to propagate.

**Clear your browser cache** and try again in an incognito window.

### Still seeing "disabled" error after 15+ minutes

**Check the hierarchy**:
- Organization-level policies override project-level
- If policy is still enforced at org level, project override won't work
- You need to disable it at the organization level

---

## Summary

**Quickest Path** (if you're Super Admin):
1. Disable `iam.disableServiceAccountKeyCreation` at organization or project level
2. Wait 10 minutes
3. Create service account key
4. Resume original setup guide

**Time**: 15 minutes total (10 min policy propagation + 5 min setup)

**Most Secure Path** (if you want to keep policy):
1. Use OAuth multi-account approach (already built)
2. Authorize 3 accounts once
3. Store tokens in Vercel secrets

**Time**: 20 minutes total (15 min authorization + 5 min Vercel setup)

Your choice! Both work perfectly. The service account approach is slightly simpler for deployment to Vercel.

---

**Need Help?**

If you're not a Super Admin, you'll need to:
1. Request permission from your Google Workspace Admin
2. Explain you need it for internal subscription tracking tool
3. Show this guide to explain why it's safe (project-level override recommended)

Or just use the OAuth approach - it's actually more secure! 🔒
