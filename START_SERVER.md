# ACT Placemat - Server Startup Guide

## ✅ Correct Way to Start the Server

From the **project root** directory:

```bash
npm run dev
```

This will:
- Load environment variables from `.env` (at project root)
- Start backend on http://localhost:4000
- Start frontend on http://localhost:5174 (or next available port)

## ❌ Common Issues

### Issue: "No Notion token found" or "No Supabase credentials"

**Cause**: Running the server from wrong directory or `.env` file missing

**Fix**:
1. Ensure you're in the project root: `/Users/benknight/Code/ACT Placemat`
2. Verify `.env` exists at project root
3. Check `.env` has these variables:
   ```bash
   NOTION_TOKEN=ntn_...
   SUPABASE_URL=https://...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

### Issue: "Port 5174 is in use"

**Cause**: Previous dev server still running

**Fix**:
```bash
# Kill processes on port 4000 and 5174
lsof -ti:4000 | xargs kill -9
lsof -ti:5174 | xargs kill -9

# Then restart
npm run dev
```

## 🔍 What Gets Loaded

When you run `npm run dev`, the backend will show:
```
📍 Loaded 18 places, 70 organizations, and 97 people for relation resolution
✅ Loaded 65 projects (next fetch in 5min)
```

If you see `0 projects` or warnings about missing credentials, check the steps above.

## 📊 Accessing the Application

- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/api/real/health
- **Projects API**: http://localhost:4000/api/real/projects
