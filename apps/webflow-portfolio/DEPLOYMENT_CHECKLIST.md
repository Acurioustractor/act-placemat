# Webflow Cloud Deployment Checklist

## ✅ Pre-Deployment Verification (COMPLETED)

All systems verified and ready for deployment:

- [x] **Production Build**: Successfully built with OpenNext Cloudflare
  - Build output: `.open-next/` directory created
  - Worker bundle: `worker.js` (2.6KB)
  - Server functions: `handler.mjs` (2.2MB) with dynamic route support
  - Static assets: Properly organized in `/portfolio` path

- [x] **Local Development**: Working correctly
  - URL: http://localhost:3001/portfolio
  - All routes functional including dynamic `/projects/[id]`

- [x] **Backend API**: Verified and accessible
  - Railway URL: https://act-backend-production.up.railway.app
  - Status: ✅ Online and returning 72 projects
  - Response: `{"success":true,"count":72,"projects":[...]}`

- [x] **Configuration Files**: All properly configured
  - `next.config.ts`: basePath, standalone output
  - `package.json`: Build scripts with NODE_ENV
  - `.env.production`: Production API URL
  - `wrangler.toml`: Minimal Cloudflare config
  - `open-next.config.ts`: Default configuration

## 📦 Deployment Package

The `.open-next/` directory contains everything needed for Webflow Cloud:

```
.open-next/
├── worker.js              # Main Cloudflare Worker entry point
├── assets/                # Static files (CSS, JS, images)
│   └── portfolio/         # Respects basePath configuration
├── server-functions/      # Dynamic route handlers
│   └── default/
│       ├── handler.mjs    # Next.js server-side logic (2.2MB)
│       └── ...
├── middleware/            # Middleware function
├── cache/                 # Cache assets
└── cloudflare/            # Cloudflare-specific files
```

## 🚀 Deployment Steps

### Step 1: Build for Production
```bash
cd apps/webflow-portfolio
npm run build
```

### Step 2: Deploy to Webflow Cloud
1. Access your Webflow Cloud dashboard
2. Navigate to your site's hosting settings
3. Select **Cloudflare Workers** deployment option
4. Upload the entire `.open-next/` directory
5. Configure mount path: `/portfolio`
6. Set environment variable:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://act-backend-production.up.railway.app`

### Step 3: Verify Deployment
After deployment, test these URLs:

1. **Portfolio Homepage**:
   - `https://your-site.webflow.io/portfolio`
   - Should show grid of 34 Active projects

2. **Project Detail Page** (test with any project ID):
   - `https://your-site.webflow.io/portfolio/projects/[project-id]`
   - Should display full project details with timeline, metrics, etc.

3. **Navigation**:
   - Click on any project card
   - Should navigate to detail page without 404 errors

## 🔍 Testing Checklist

After deployment, verify:

- [ ] Portfolio homepage loads at `/portfolio`
- [ ] Projects grid displays (should show 34 Active projects)
- [ ] Project cards are clickable
- [ ] Clicking a project navigates to `/portfolio/projects/[id]`
- [ ] Project detail page loads with all data
- [ ] "Back to Portfolio" button works
- [ ] All static assets load (CSS, images)
- [ ] API requests to Railway backend succeed
- [ ] No console errors in browser dev tools

## 🐛 Troubleshooting

### If project detail pages show 404:

1. **Check basePath in Webflow Cloud**:
   - Ensure mount path is set to `/portfolio`
   - Verify it matches `basePath` in next.config.ts

2. **Check browser console**:
   - Look for routing or API errors
   - Verify network requests are going to correct URLs

3. **Test direct URL access**:
   - Try accessing a project directly: `/portfolio/projects/[some-id]`
   - Should work without navigating from homepage first

4. **Verify environment variables**:
   - Confirm `NEXT_PUBLIC_API_URL` is set in Webflow Cloud
   - Should be: `https://act-backend-production.up.railway.app`

### If no projects appear:

1. **Check API connectivity**:
   ```bash
   curl https://act-backend-production.up.railway.app/api/real/projects
   ```
   - Should return 72 projects with `"success":true`

2. **Check CORS**:
   - Backend should allow requests from your Webflow domain
   - Railway backend already configured for CORS

3. **Check browser network tab**:
   - Look for failed API requests
   - Verify correct API URL is being used

## 📊 Monitoring

After deployment, monitor:

1. **Cloudflare Workers Dashboard**:
   - Request count
   - Error rate
   - Response time

2. **Railway Backend**:
   - API response times
   - Error logs
   - Active connections

3. **User Experience**:
   - Page load times
   - Navigation smoothness
   - Data freshness (projects updating from Notion)

## 🔄 Redeployment

If you need to redeploy with changes:

1. Make code changes in `apps/webflow-portfolio/`
2. Run `npm run build` to rebuild
3. Upload new `.open-next/` directory to Webflow Cloud
4. Cloudflare Workers will automatically use new version

## 📝 Important Notes

- **Build Output**: Always deploy the `.open-next/` directory, not `.next/`
- **Environment**: Production build uses `.env.production` values
- **NODE_ENV**: Build scripts automatically set to `production`
- **Cache**: Cloudflare Workers cache assets, may take a few minutes to update
- **Dynamic Routes**: Fully supported via server functions in `.open-next/server-functions/`

## ✨ Success Criteria

Deployment is successful when:

✅ Portfolio homepage loads instantly
✅ 34 Active projects display in grid
✅ Project cards are clickable
✅ Project detail pages load with full data
✅ Navigation between pages works smoothly
✅ No console errors
✅ API requests succeed
✅ All static assets load

---

**Deployment Package Ready**: All systems verified and ready for Webflow Cloud deployment.
