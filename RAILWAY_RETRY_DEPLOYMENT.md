# Railway Deployment - Retry with Config

I've created two configuration files to help Railway understand the monorepo structure:
- `apps/backend/railway.json`
- `apps/backend/nixpacks.toml`

## Option 1: Redeploy via Dashboard (Easiest)

1. Go to your Railway dashboard
2. Click on your service (the one that failed)
3. Click **"Deployments"** tab
4. Click **"Redeploy"** button on the failed deployment

Railway will pick up the new config files and should build successfully!

## Option 2: Configure Settings Manually

If Option 1 doesn't work:

1. Click on your service
2. Go to **Settings** tab
3. Scroll to **Deploy** section
4. Set these values:
   - **Custom Start Command**: `node server.js`
   - **Install Command**: `npm install --legacy-peer-deps && cd core && npm install --legacy-peer-deps`

5. Click **Save**
6. Go back to **Deployments** tab
7. Click **"Redeploy"**

## After Successful Deployment

Once it deploys successfully, we need to:

1. **Add environment variables** (from your `.env` file)
2. **Get the public URL**
3. **Update frontend** to use that URL

---

**Try Option 1 first** - just click "Redeploy" and see if it works with the new config files!
