# Quick Policy Override - Step by Step

You're looking at the right screen! Here's exactly what to click:

---

## Current Screen

You see:
```
Disable service account key creation

Applies to: Project "ACT Subscription Tracker"

Policy source:
○ Inherit parent's policy
○ Google-managed default
○ Override parent's policy
```

---

## What to Do Now

### Step 1: Select "Override parent's policy"

Click the radio button next to **"Override parent's policy"**

### Step 2: Configure the Override

After selecting "Override parent's policy", you'll see additional options:

**Select**: "Replace" (this replaces the parent's enforcement)

**Then under "Enforcement"**: Select **"Off"** or **"Not enforced"**

(The exact wording may vary - look for the option that says it will NOT enforce the restriction)

### Step 3: Save

Click the **"SET POLICY"** button at the bottom

---

## What This Does

- ✅ **Organization-level policy stays active** (other projects still protected)
- ✅ **Your ACT Subscription Tracker project gets an exception**
- ✅ **You can now create service account keys for this project only**
- ✅ **No security impact on rest of organization**

---

## After Saving

1. Wait **5-10 minutes** for policy to propagate
2. Try creating service account key again:
   - Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
   - Select your service account (or create `subscription-scanner`)
   - Go to **KEYS** tab
   - Click **ADD KEY** → **Create new key** → **JSON**
   - Click **CREATE**

✅ **Success**: Key will download as JSON file

---

## If You Don't See "Override parent's policy" Option

This means you don't have Organization Policy Admin permissions. You'll need to either:

**Option A**: Ask your Google Workspace Admin to grant you this role

**Option B**: Use the OAuth approach I already built (works perfectly, no policy change needed)

---

## Next Step After Policy Override Works

Once you can download the service account key:

```bash
# Save the downloaded key
mv ~/Downloads/act-subscription-tracker-*.json \
  "/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker/config/service-account.json"

# Run the setup script
cd "/Users/benknight/Code/ACT Placemat/apps/backend"
bash setup-google-workspace.sh
```

This will set up domain-wide delegation and test multi-account scanning.

---

**That's it!** Just click "Override parent's policy" → Configure as "Not enforced" → Save.
