# Webflow Cloud Deployment Fix

## Problem
Project detail pages (click-through pages) were not working on the Webflow Cloud deployment.

## Root Causes Identified
1. **Incorrect build process**: Using standard `next build` instead of OpenNext Cloudflare build
2. **NODE_ENV issue**: Build was running with NODE_ENV=development instead of production
3. **Missing standalone output**: OpenNext requires standalone output mode in Next.js
4. **AssetPrefix conflict**: assetPrefix was causing routing conflicts with OpenNext Cloudflare

## Fixes Applied

### 1. Next.js Configuration ([next.config.ts](next.config.ts:1))
```typescript
export default {
  basePath: '/portfolio',           // ✅ Kept for Webflow Cloud mount path
  output: 'standalone',             // ✅ Added for OpenNext compatibility
  // assetPrefix removed              ✅ Removed - OpenNext handles this
  images: {
    domains: ['localhost'],
  },
}
```

### 2. Build Scripts ([package.json](package.json:7))
```json
{
  "build": "NODE_ENV=production next build && NODE_ENV=production npx @opennextjs/cloudflare build --skip-build",
  "build:next": "NODE_ENV=production next build",
  "build:cloudflare": "NODE_ENV=production npx @opennextjs/cloudflare build --skip-build"
}
```

### 3. Production Environment ([.env.production](.env.production:1))
```
NEXT_PUBLIC_API_URL=https://act-backend-production.up.railway.app
```

### 4. Wrangler Configuration ([wrangler.toml](wrangler.toml:1))
Created minimal wrangler.toml to prevent interactive prompts during build.

### 5. OpenNext Configuration ([open-next.config.ts](open-next.config.ts:1))
Using default configuration - basePath is automatically handled.

## Build Output
After running `npm run build`, you'll have:
- `.next/` - Standard Next.js build
- `.open-next/` - OpenNext Cloudflare build with:
  - `worker.js` - Main Cloudflare Worker
  - `assets/` - Static assets
  - `cache/` - Cache assets
  - `middleware/` - Middleware function
  - `server-functions/` - Dynamic route handlers

## Deployment to Webflow Cloud

### Option 1: Using Webflow Cloud Interface
1. Build the project: `npm run build`
2. In Webflow Cloud, upload the `.open-next/` directory
3. Configure the mount path as `/portfolio`
4. Ensure environment variable is set: `NEXT_PUBLIC_API_URL=https://act-backend-production.up.railway.app`

### Option 2: Using Cloudflare Workers (Alternative)
If deploying directly to Cloudflare Workers instead of Webflow Cloud:
```bash
cd .open-next/cloudflare
npx wrangler deploy
```

## Testing

### Local Development (still works)
```bash
npm run dev
# Visit: http://localhost:3001/portfolio
```

### Local Production Build Test
```bash
npm run build
cd .next/standalone
node server.js
# Visit: http://localhost:3000/portfolio
```

## What Changed for Dynamic Routes

**Before:** Link paths weren't working on Cloudflare Workers because:
- Not using OpenNext Cloudflare adapter
- NODE_ENV mismatch causing build errors
- AssetPrefix interfering with routing

**After:**
- OpenNext Cloudflare properly handles dynamic routes (`/projects/[id]`)
- basePath (`/portfolio`) is automatically prepended by Next.js
- Client-side navigation works correctly
- Server-side rendering works for dynamic routes

## Key Technical Points

1. **basePath Handling**: Next.js automatically prepends `/portfolio` to all Link hrefs - you don't need to include it manually in your code.

2. **Dynamic Routes**: The `[id]` parameter in `/projects/[id]` is properly handled by OpenNext's server functions.

3. **Environment Variables**: Production build uses `.env.production`, development uses `.env.local`.

4. **NODE_ENV**: Must be set to 'production' during build to avoid HTML import errors.

## Verification Checklist

Before deploying to Webflow Cloud:
- [ ] Run `npm run build` successfully without errors
- [ ] Verify `.open-next/worker.js` exists
- [ ] Verify `.open-next/server-functions/` contains dynamic route handlers
- [ ] Test local dev still works: `http://localhost:3001/portfolio`
- [ ] Confirm Railway backend is returning 72 projects: https://act-backend-production.up.railway.app/api/real/projects

## Next Steps

1. **Deploy to Webflow Cloud**: Upload the `.open-next/` build output
2. **Test in Production**:
   - Visit your portfolio at the Webflow Cloud URL + `/portfolio`
   - Click on a project card
   - Verify it navigates to `/portfolio/projects/[id]`
   - Verify project detail page loads with all data
3. **Monitor**: Check that API calls to Railway backend work correctly

## Troubleshooting

If project pages still don't work after deployment:

1. **Check Browser Console**: Look for 404 errors or routing issues
2. **Verify basePath**: Ensure Webflow Cloud is correctly mounting at `/portfolio`
3. **Check API URL**: Verify the production environment variable is set
4. **Test Direct URL**: Try accessing a project directly: `/portfolio/projects/[some-project-id]`
5. **Check Cloudflare Workers Logs**: If available, review worker execution logs

## Files Modified

- [next.config.ts](next.config.ts) - Added standalone output, removed assetPrefix
- [package.json](package.json) - Updated build scripts with NODE_ENV
- [.env.production](.env.production) - Created with Railway backend URL
- [wrangler.toml](wrangler.toml) - Created minimal config
- [open-next.config.ts](open-next.config.ts) - Using default config

## Success Criteria

✅ npm run build completes without errors
✅ .open-next/ directory is created
✅ Local dev still works at localhost:3001/portfolio
🔄 **Next**: Deploy to Webflow Cloud and test project detail pages

---

**Ready to deploy!** The build is now properly configured for Webflow Cloud with OpenNext Cloudflare.
