# Railway Deployment Guide - Step by Step

You're logged into Railway! Now let's deploy your backend.

## Step 1: Create a New Project

1. In Railway dashboard, click **"New Project"**
2. Select **"Empty Project"**
3. Name it: `act-backend` (or whatever you prefer)
4. Click **"Create"**

## Step 2: Create a Service

1. In your new project, click **"+ New"**
2. Select **"Empty Service"**
3. Name it: `backend`

## Step 3: Add Your Code

You have two options:

### Option A: Deploy from GitHub (Recommended - Easier)

1. Click on your `backend` service
2. Go to **Settings** tab
3. Click **"Connect Repo"**
4. Select your GitHub repository: `ACT Placemat`
5. Set **Root Directory**: `apps/backend`
6. Railway will automatically detect it's a Node.js app!

### Option B: Deploy via CLI (We'll do this together)

We'll use this method since the CLI is already installed.

## Step 4: Set Environment Variables

Click on your service → **Variables** tab → Add all these:

```
NOTION_TOKEN=<your_notion_token>
SUPABASE_URL=<your_supabase_url>
SUPABASE_SERVICE_ROLE_KEY=<your_supabase_key>
ANTHROPIC_API_KEY=<your_anthropic_key>
PERPLEXITY_API_KEY=<your_perplexity_key>
OPENAI_API_KEY=<your_openai_key>
GROQ_API_KEY=<your_groq_key>
GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
GMAIL_OAUTH_REDIRECT_URI=<your_gmail_redirect_uri>
PORT=4000
```

## Step 5: Configure Build Settings

1. In **Settings** tab
2. Under **Build**:
   - **Install Command**: `npm install --legacy-peer-deps && cd core && npm install --legacy-peer-deps`
   - **Start Command**: `node server.js`

## Step 6: Deploy!

Railway will automatically deploy once you connect the repo or we push via CLI.

---

**Let me know when you're ready and I'll help you with the CLI deployment method!**
