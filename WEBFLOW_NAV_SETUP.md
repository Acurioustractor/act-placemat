# Webflow Navigation Integration Guide

This guide shows you how to share the same menu bar and footer between your Webflow site and ACT Placemat dashboard.

## Current Setup

You have two separate applications:

1. **Webflow Site** (Main website - `yoursite.webflow.io` or custom domain)
2. **ACT Placemat Dashboard** (This React app - analytics/internal dashboard)

## Goal

Use the same navigation menu and footer on both sites for a seamless user experience.

---

## 🚀 Quick Start (Option 1: JavaScript Embed - Recommended)

### Step 1: Get Your Webflow Site URL

Find your Webflow site URL:
- Published Webflow site: `https://yoursite.webflow.io`
- Custom domain: `https://www.yoursite.com`

### Step 2: Configure in ACT Placemat

Create a `.env` file in the root of this project:

```env
# Webflow Configuration
VITE_WEBFLOW_SITE_URL=https://yoursite.webflow.io
VITE_USE_WEBFLOW_NAV=true
```

Replace `yoursite.webflow.io` with your actual Webflow site URL.

### Step 3: Update App Layout

Edit `/src/components/layout/AppLayout.tsx`:

```typescript
import { WebflowNav } from '../webflow/WebflowNav';

const useWebflowNav = import.meta.env.VITE_USE_WEBFLOW_NAV === 'true';
const webflowSiteUrl = import.meta.env.VITE_WEBFLOW_SITE_URL || '';

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Use Webflow nav if configured, otherwise default Header */}
      {useWebflowNav && webflowSiteUrl ? (
        <WebflowNav webflowSiteUrl={webflowSiteUrl} position="header" />
      ) : (
        <Header />
      )}

      <main>{children}</main>

      {/* Use Webflow footer if configured, otherwise default Footer */}
      {useWebflowNav && webflowSiteUrl ? (
        <WebflowNav webflowSiteUrl={webflowSiteUrl} position="footer" />
      ) : (
        <Footer />
      )}
    </div>
  );
};
```

### Step 4: Test

```bash
npm run dev
```

Visit `http://localhost:5173` and you should see your Webflow navigation!

---

## 🎨 Option 2: Webflow Custom Code (More Control)

If you want more control, you can use Webflow's Custom Code feature:

### In Webflow:

1. Go to your Webflow Project Settings → Custom Code
2. Add this to **Before `</head>` tag**:

```html
<script>
  // Export navigation HTML for external use
  window.webflowNavExport = {
    header: document.querySelector('nav').outerHTML,
    footer: document.querySelector('footer').outerHTML,
    css: Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n')
  };
</script>
```

3. Publish your Webflow site

### In ACT Placemat:

Create `/src/services/webflowNavService.ts`:

```typescript
import { apiLogger } from '../utils/logger';

class WebflowNavService {
  private webflowSiteUrl: string;
  private cache: {
    header?: string;
    footer?: string;
    css?: string;
    timestamp?: number;
  } = {};

  private cacheDuration = 30 * 60 * 1000; // 30 minutes

  constructor(siteUrl: string) {
    this.webflowSiteUrl = siteUrl;
  }

  async getNavigation(position: 'header' | 'footer'): Promise<string> {
    // Check cache
    if (
      this.cache[position] &&
      this.cache.timestamp &&
      Date.now() - this.cache.timestamp < this.cacheDuration
    ) {
      apiLogger.debug(`Using cached Webflow ${position}`);
      return this.cache[position]!;
    }

    try {
      // Fetch from Webflow site
      const response = await fetch(this.webflowSiteUrl);
      const html = await response.text();

      // Parse and extract
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      let element: Element | null = null;

      if (position === 'header') {
        element = doc.querySelector('nav, [role="navigation"], .navigation');
      } else {
        element = doc.querySelector('footer, .footer');
      }

      if (!element) {
        throw new Error(`Could not find ${position} in Webflow site`);
      }

      const navHtml = element.outerHTML;

      // Cache it
      this.cache[position] = navHtml;
      this.cache.timestamp = Date.now();

      apiLogger.info(`Successfully fetched Webflow ${position}`);
      return navHtml;
    } catch (error: any) {
      apiLogger.error(`Failed to fetch Webflow ${position}:`, error);
      throw error;
    }
  }

  async injectStyles(): Promise<void> {
    try {
      const response = await fetch(this.webflowSiteUrl);
      const html = await response.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Find Webflow CSS links
      const cssLinks = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
        .map(link => link.getAttribute('href'))
        .filter(href => href && (href.includes('webflow') || href.includes('uploads')));

      // Inject into document
      cssLinks.forEach(href => {
        if (href && !document.querySelector(`link[href="${href}"]`)) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = href.startsWith('http') ? href : `${this.webflowSiteUrl}${href}`;
          document.head.appendChild(link);
          apiLogger.debug(`Injected Webflow stylesheet: ${href}`);
        }
      });
    } catch (error) {
      apiLogger.error('Failed to inject Webflow styles:', error);
    }
  }

  clearCache(): void {
    this.cache = {};
    apiLogger.info('Webflow navigation cache cleared');
  }
}

// Export singleton
export const webflowNavService = new WebflowNavService(
  import.meta.env.VITE_WEBFLOW_SITE_URL || 'https://yoursite.webflow.io'
);

export default WebflowNavService;
```

---

## 🔗 Option 3: API-Based Sync (Most Reliable)

For production, the best approach is to sync navigation through your backend:

### Backend Setup (Express):

```javascript
// backend/routes/webflow.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Cache for navigation
let navCache = {
  header: null,
  footer: null,
  timestamp: null,
  ttl: 30 * 60 * 1000 // 30 minutes
};

router.get('/navigation/:position', async (req, res) => {
  const { position } = req.params; // 'header' or 'footer'
  const webflowSiteUrl = process.env.WEBFLOW_SITE_URL;

  // Check cache
  if (
    navCache[position] &&
    navCache.timestamp &&
    Date.now() - navCache.timestamp < navCache.ttl
  ) {
    return res.json({ html: navCache[position] });
  }

  try {
    // Fetch from Webflow
    const response = await fetch(webflowSiteUrl);
    const html = await response.text();

    // Parse and extract navigation
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(html);
    const document = dom.window.document;

    let element;
    if (position === 'header') {
      element = document.querySelector('nav, [role="navigation"]');
    } else {
      element = document.querySelector('footer');
    }

    if (!element) {
      return res.status(404).json({ error: `${position} not found` });
    }

    const navHtml = element.outerHTML;

    // Cache it
    navCache[position] = navHtml;
    navCache.timestamp = Date.now();

    res.json({ html: navHtml });
  } catch (error) {
    console.error(`Error fetching Webflow ${position}:`, error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### Frontend Hook:

```typescript
// src/hooks/useWebflowNav.ts
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/apiService';

export function useWebflowNav(position: 'header' | 'footer') {
  return useQuery({
    queryKey: ['webflow-nav', position],
    queryFn: async () => {
      const response = await apiService.get<{ html: string }>(
        `/webflow/navigation/${position}`
      );
      return response.html;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: 2
  });
}
```

---

## ⚙️ Configuration Options

### Environment Variables

```env
# Webflow Integration
VITE_WEBFLOW_SITE_URL=https://yoursite.webflow.io
VITE_USE_WEBFLOW_NAV=true

# Optional: Specific element selectors
VITE_WEBFLOW_NAV_SELECTOR=nav.main-navigation
VITE_WEBFLOW_FOOTER_SELECTOR=footer.main-footer
```

### Custom Selectors

If your Webflow site uses specific classes or IDs for navigation:

```typescript
// In WebflowNav.tsx, update the selectors:
const navSelector = import.meta.env.VITE_WEBFLOW_NAV_SELECTOR || 'nav';
const footerSelector = import.meta.env.VITE_WEBFLOW_FOOTER_SELECTOR || 'footer';

navElement = doc.querySelector(navSelector);
```

---

## 🎨 Styling Considerations

### CORS Issues

If you encounter CORS errors when fetching from Webflow:

**Solution 1: Use Backend Proxy** (Recommended)
- Fetch navigation through your backend
- Backend doesn't have CORS restrictions

**Solution 2: Webflow CORS Headers**
- In Webflow Project Settings → Custom Code → Head Code:

```html
<meta http-equiv="Access-Control-Allow-Origin" content="*">
```

Note: This won't actually enable CORS (Webflow doesn't support CORS headers), so backend proxy is best.

### Styling Conflicts

If Webflow styles conflict with Tailwind CSS:

```css
/* In your global CSS */
.webflow-nav-container * {
  all: revert; /* Reset Tailwind styles within Webflow nav */
}

/* Or scope Webflow styles */
.webflow-nav-container {
  isolation: isolate;
}
```

---

## 🧪 Testing

### Test Webflow Navigation Locally:

1. Set environment variables:
   ```env
   VITE_WEBFLOW_SITE_URL=https://your-actual-site.webflow.io
   VITE_USE_WEBFLOW_NAV=true
   ```

2. Start dev server:
   ```bash
   npm run dev
   ```

3. Check browser console for any errors

4. Inspect the navigation element to ensure styles loaded correctly

### Fallback Behavior

If Webflow navigation fails to load, ACT Placemat will automatically fall back to the default navigation.

---

## 📱 Responsive Design

Webflow's responsive navigation should work automatically, but ensure:

1. **Mobile Menu Works**: Test on mobile devices
2. **Breakpoints Match**: Webflow and Tailwind breakpoints might differ
3. **JavaScript Functionality**: Webflow interactions (dropdowns, hamburger menu) should work

If Webflow interactions don't work, you may need to also load Webflow's JavaScript:

```typescript
// In WebflowNav.tsx, add:
useEffect(() => {
  // Load Webflow JS
  const script = document.createElement('script');
  script.src = 'https://d3e54v103j8qbb.cloudfront.net/js/webflow.js';
  script.async = true;
  document.body.appendChild(script);

  return () => {
    document.body.removeChild(script);
  };
}, []);
```

---

## 🔒 Security Considerations

1. **Content Security Policy**: Ensure your CSP allows loading resources from Webflow domains
2. **XSS Prevention**: We use `dangerouslySetInnerHTML` - ensure Webflow content is trusted
3. **HTTPS Only**: Always use HTTPS URLs for Webflow site

---

## 🐛 Troubleshooting

### Navigation Not Showing

**Problem**: Navigation loads but doesn't display
**Solution**: Check browser console for CSS conflicts. Add:

```css
.webflow-nav-container {
  display: block !important;
  visibility: visible !important;
}
```

### Styles Not Loading

**Problem**: Navigation appears unstyled
**Solution**: Manually inject Webflow CSS:

```typescript
// In WebflowNav.tsx
useEffect(() => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://your-site.webflow.io/css/your-site.webflow.css';
  document.head.appendChild(link);
}, []);
```

### Links Don't Work

**Problem**: Navigation links don't navigate
**Solution**: Links might be relative. Update them:

```typescript
// After setting navHtml
const tempDiv = document.createElement('div');
tempDiv.innerHTML = navHtmlString;

// Fix relative links
tempDiv.querySelectorAll('a').forEach(link => {
  const href = link.getAttribute('href');
  if (href && !href.startsWith('http')) {
    link.setAttribute('href', `${webflowSiteUrl}${href}`);
  }
});

setNavHtml(tempDiv.innerHTML);
```

---

## 📊 Performance

### Caching Strategy

Navigation is cached for 30 minutes to avoid unnecessary requests:

```typescript
CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
```

### Loading State

While navigation loads, a skeleton loader is displayed to prevent layout shift.

### Preloading

To improve perceived performance, preload navigation on app initialization:

```typescript
// In App.tsx
useEffect(() => {
  if (webflowSiteUrl) {
    webflowNavService.getNavigation('header');
    webflowNavService.getNavigation('footer');
  }
}, []);
```

---

## 🚀 Next Steps

1. **Configure your Webflow site URL** in `.env`
2. **Choose an integration option** (JavaScript embed recommended for simplicity)
3. **Test locally** with `npm run dev`
4. **Deploy** and verify on production
5. **(Optional) Set up webhook** to clear cache when Webflow site updates

---

## ❓ FAQ

**Q: Can I use different navigation for dashboard vs. public site?**
A: Yes! Use conditional rendering:

```typescript
const isPublicPage = location.pathname.startsWith('/public');

{isPublicPage ? (
  <WebflowNav webflowSiteUrl={webflowSiteUrl} position="header" />
) : (
  <DashboardHeader />
)}
```

**Q: How do I handle authentication state in shared navigation?**
A: You can inject auth state into Webflow navigation:

```typescript
// After loading nav HTML
if (isAuthenticated) {
  // Replace login link with logout
  navHtml = navHtml.replace(
    '<a href="/login">Login</a>',
    '<a href="/logout">Logout</a>'
  );
}
```

**Q: What if my Webflow site updates?**
A: Navigation cache refreshes every 30 minutes automatically. To force refresh:

```typescript
webflowNavService.clearCache();
```

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify Webflow site URL is correct and accessible
3. Test Webflow site directly to ensure it's published
4. Review CORS and CSP policies

For more help, refer to:
- `WEBFLOW_INTEGRATION.md` - Full Webflow integration guide
- `SETUP.md` - General setup instructions
