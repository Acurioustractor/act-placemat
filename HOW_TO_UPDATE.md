# How to Update Your ACT Placemat App

Simple guide to control what shows up in your app.

## 🎛️ Control Features

Edit the `.env` file to turn features on/off:

```env
# Show Webflow navigation from your main site?
VITE_SHOW_WEBFLOW_NAV=true

# Show these pages?
VITE_SHOW_DASHBOARD=true
VITE_SHOW_PROJECTS=true
VITE_SHOW_OPPORTUNITIES=true
VITE_SHOW_ANALYTICS=true
VITE_SHOW_NETWORK=true
VITE_SHOW_ARTIFACTS=true
```

**To hide something**: Change `true` to `false`

**Example**: Hide the Analytics page:
```env
VITE_SHOW_ANALYTICS=false
```

## 🔗 Use Your Main Site's Navigation

Your main Webflow site: `https://act-revised-site.webflow.io`

To show the same menu bar and footer on your React app:

1. Set in `.env`:
   ```env
   VITE_SHOW_WEBFLOW_NAV=true
   VITE_MAIN_SITE_URL=https://act-revised-site.webflow.io
   ```

2. Rebuild:
   ```bash
   npm run build
   ```

3. Push to GitHub - Webflow Cloud will auto-deploy

**That's it!** Your React app will now have the same navigation as your main site.

## 📝 After Changing .env

1. **Local testing**:
   ```bash
   npm run dev
   ```

2. **Deploy to production**:
   ```bash
   git add .env
   git commit -m "Update features"
   git push
   ```

Webflow Cloud will rebuild automatically.

## 🚀 Quick Checks

**Is my main site nav working?**
- Visit your deployed app at `/portfolio`
- Check if the menu bar looks the same as your main site

**Something broken?**
- Set `VITE_SHOW_WEBFLOW_NAV=false` to use the default nav
- Rebuild and redeploy

## 💡 Common Updates

**Add a new page to sidebar**:
Edit `src/components/layout/Sidebar.tsx`

**Change what data shows**:
Edit the page component in `src/pages/`

**Update styles**:
Edit `src/styles/` or component Tailwind classes

**Backend URL (for API calls)**:
```env
VITE_API_BASE_URL=https://your-backend-api.com/api
```

## ❓ Need Help?

Check these files:
- `.env` - All your settings
- `src/config/features.ts` - Feature flags logic
- `src/components/layout/AppLayout.tsx` - Layout with Webflow nav
- `src/components/webflow/SimpleWebflowNav.tsx` - Pulls nav from main site
