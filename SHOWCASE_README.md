# 🌟 World-Class Project Showcase - Complete Guide
**ACT Placemat**
January 2025

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Quick Start](#quick-start)
4. [User Guide](#user-guide)
5. [Data Setup](#data-setup)
6. [Component Reference](#component-reference)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The ACT Placemat Showcase is a world-class, production-ready system for displaying community projects with:
- Beautiful individual project pages with rich media
- Interactive geographic impact map
- Animated statistics and testimonials
- Full SEO optimization for discoverability
- Mobile-optimized with touch gestures
- Performance-optimized for fast loading

**Built in 10 Phases over 3 days:**
1. ✅ Data Models & Architecture
2. ✅ Core Components (Video, Gallery, Testimonials, Stats)
3. ✅ Individual Project Pages
4. ✅ Interactive Impact Map
5. ✅ Real-time Stats & Animations
6. ✅ CTA & Integration (Share, Donate, Contact)
7. ✅ SEO & Analytics
8. ✅ Performance Optimization
9. ✅ Mobile Optimization
10. ✅ Testing & Polish

---

## Features

### 🎬 Rich Media Support
- **Video Embeds:** YouTube/Vimeo with lazy loading
- **Photo Galleries:** Lightbox with keyboard/swipe navigation
- **Hero Images:** Full-width, optimized for impact

### 📖 Storytelling Structure
- **The Challenge:** Problem being addressed
- **Our Approach:** Solution methodology
- **How It Works:** Process description
- **Impact Stats:** Animated counters showing results
- **Testimonials:** Real stories from beneficiaries

### 🗺️ Interactive Impact Map
- **Geographic Visualization:** SVG Australia map
- **Project Markers:** Color-coded by area
- **Pulse Animations:** Draw attention to locations
- **Click to Navigate:** Direct links to project pages

### 📊 Impact Statistics
- **Animated Counters:** Smooth count-up animations
- **Scroll-Triggered:** Only animate when visible
- **Flexible Metrics:** People served, locations, funding, custom metrics
- **Three Variants:** Default cards, compact row, hero display

### 💬 Testimonials
- **Three Layouts:** Featured (large), default (card), compact (inline)
- **Author Photos:** Round, professional display
- **Organization Tags:** Context for credibility

### 🔗 Call-to-Action
- **Five Types:** Donate, Partner, Volunteer, Learn, Contact
- **Pre-styled:** Type-specific colors and icons
- **Three Sizes:** Small (44px), Medium (52px), Large (60px)
- **Three Variants:** Primary (filled), Secondary (subtle), Outline (border)

### 🌐 Social Sharing
- **Six Platforms:** Twitter, LinkedIn, Facebook, Email, Native Share, Copy Link
- **One-Click:** Pre-populated with project details
- **Native Share API:** App-like sharing on mobile
- **Visual Feedback:** "Copied!" confirmation

### 📧 Contact Form
- **Full Validation:** Email, required fields, character limits
- **Loading States:** Smooth submission UX
- **Success Feedback:** Confirmation message
- **Mailto Fallback:** Works without backend

### 🔍 SEO Optimization
- **Meta Tags:** Title, description, canonical URLs
- **Open Graph:** Facebook/LinkedIn rich previews
- **Twitter Cards:** Beautiful Twitter sharing
- **Schema.org:** Structured data for Google
- **Automatic:** Works out of the box

### ⚡ Performance
- **Image Lazy Loading:** Only load when visible
- **Code Splitting:** Showcase pages load on-demand
- **Video On-Demand:** Thumbnails first, video when clicked
- **Smart Caching:** 5-minute fresh data, 10-minute cache
- **60fps Animations:** Smooth requestAnimationFrame

### 📱 Mobile Optimized
- **Touch Swipes:** Navigate photos with gestures
- **Responsive Typography:** Perfect text size on all screens
- **Thumb-Friendly:** 44px+ touch targets
- **Responsive Grids:** 1→2→3→4 columns
- **Native Features:** Web Share API integration

---

## Quick Start

### 1. Installation

```bash
# Clone and install
git clone https://github.com/your-org/act-placemat.git
cd act-placemat
npm install

# Start development server
npm run dev

# Navigate to showcase
http://localhost:5173/showcase
```

### 2. Add Showcase Data to Notion

See [Data Setup](#data-setup) section below for full guide.

Minimum required fields:
- **Name** (text)
- **Description** (rich text)
- **Status** (select: Active/Completed/Planning)
- **Publicly Visible** (checkbox) ← Must be checked!

### 3. View Showcase

- **Homepage:** `/showcase` - All projects with map
- **Project Page:** `/showcase/:slug` - Individual project detail

---

## User Guide

### For Visitors (Public)

#### Browsing Projects

1. Visit `/showcase` to see all active projects
2. Use filters to narrow by:
   - **Scale:** Community, Regional, National, International
   - **Theme:** Youth Justice, Economic Freedom, etc.
   - **Status:** Active, Completed, Planning
3. Click map markers to jump to projects by location
4. Click project cards to view full details

#### Viewing Project Details

1. Click any project to open its detail page
2. Watch hero video (if available)
3. Scroll through:
   - Impact statistics (animated)
   - The story (Challenge → Approach → Process)
   - Photo gallery (click for lightbox)
   - Testimonials from participants
4. Share on social media (Twitter, LinkedIn, Facebook)
5. Take action (Donate, Partner, Contact)

#### Navigating Photo Gallery

**Desktop:**
- Click image to open lightbox
- Use arrow keys (← →) to navigate
- Press ESC to close
- Click outside image to close

**Mobile:**
- Tap image to open lightbox
- Swipe left/right to navigate
- Tap X to close

### For Administrators

#### Adding a New Project to Showcase

1. Go to Notion Projects database
2. Create new project (or edit existing)
3. Fill in showcase fields:
   - **Hero Media** (Video URL or Image)
   - **Gallery Images** (Upload multiple photos)
   - **Storytelling** (Challenge, Approach, Process)
   - **Impact Stats** (People Served, Locations, etc.)
   - **Testimonials** (Add 1-3 testimonials)
   - **CTA** (Link, Text, Type)
   - **SEO** (Meta Description, Social Image)
4. Set **Publicly Visible** checkbox to ✅
5. Check **Featured on Homepage** (optional)
6. Save and wait ~5 minutes for cache refresh

#### Editing Showcase Content

Changes in Notion sync automatically:
- **Immediate:** New projects, major updates
- **Cached (5 min):** Existing project details
- **Force Refresh:** Close and reopen browser

---

## Data Setup

### Required Notion Fields

These fields must exist in your Projects database:

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| Name | Title | ✅ | Project name |
| Description | Rich Text | ✅ | Short description |
| Status | Select | ✅ | Active/Completed/Planning |
| Publicly Visible | Checkbox | ✅ | Show on showcase |

### Optional Showcase Fields

Add these fields to enhance your project pages:

#### Hero Media
| Field Name | Type | Description |
|------------|------|-------------|
| Hero Video URL | URL | YouTube or Vimeo embed link |
| Hero Image | Files & media | Main hero image (1920x1080 recommended) |
| Hero Caption | Text | Photo/video credit or description |

#### Photo Gallery
| Field Name | Type | Description |
|------------|------|-------------|
| Gallery Images | Files & media | Multiple project photos (add multiple files) |
| Photography Credit | Text | Photographer attribution |

#### Storytelling
| Field Name | Type | Description |
|------------|------|-------------|
| Challenge Description | Rich Text | The problem being addressed |
| Solution Description | Rich Text | How you're solving it |
| Process Description | Rich Text | Your approach/methodology |

#### Impact Statistics
| Field Name | Type | Description |
|------------|------|-------------|
| People Served | Number | Total participants/beneficiaries |
| Locations Reached | Number | Number of locations/communities |
| Partners Involved | Number | Number of partner organizations |
| Success Rate | Number | Success percentage (0-100) |
| Funding Raised | Number | Total funding in AUD |
| Hours Delivered | Number | Total program hours |

#### Testimonials
Create a separate "Testimonials" relation database:

| Field Name | Type | Description |
|------------|------|-------------|
| Quote | Rich Text | The testimonial text |
| Author Name | Text | Person's name |
| Author Role | Text | Their role/title |
| Author Photo | Files & media | Headshot (400x400 recommended) |
| Author Organization | Text | Organization name |
| Featured | Checkbox | Show prominently |
| Related Project | Relation | Link to project |

#### Call-to-Action
| Field Name | Type | Description |
|------------|------|-------------|
| CTA Link | URL | Where button should go |
| CTA Text | Text | Button text (optional, defaults by type) |
| CTA Type | Select | donate/partner/volunteer/learn/contact |

#### SEO & Sharing
| Field Name | Type | Description |
|------------|------|-------------|
| Slug | Text | URL-friendly name (auto-generated if empty) |
| Meta Description | Text | For search results (155 chars max) |
| Social Image | URL | For social media previews (1200x630) |

#### Geographic Data
| Field Name | Type | Description |
|------------|------|-------------|
| Location | Text | City/region name (e.g., "Canberra") |
| Latitude | Number | Geographic latitude |
| Longitude | Number | Geographic longitude |

#### Visibility
| Field Name | Type | Description |
|------------|------|-------------|
| Publicly Visible | Checkbox | Show on public showcase |
| Featured on Homepage | Checkbox | Highlight on homepage |
| Display Order | Number | Manual sort order (lower = first) |

### Data Entry Tips

1. **Hero Video URLs:**
   - YouTube: `https://www.youtube.com/watch?v=VIDEO_ID`
   - Vimeo: `https://vimeo.com/VIDEO_ID`
   - Don't use share/embed codes, use regular URLs

2. **Images:**
   - Recommended size: 1920x1080 for hero images
   - Gallery images: 1200x800 minimum
   - Testimonial photos: 400x400 square
   - Format: JPG or PNG (WebP coming soon)

3. **Descriptions:**
   - **Challenge:** 100-200 words, describe the problem
   - **Approach:** 100-200 words, explain your solution
   - **Process:** 100-200 words, detail methodology

4. **Impact Stats:**
   - Use real numbers from program data
   - Round to meaningful precision (e.g., 1,234 not 1,234.56)
   - Success Rate: Enter as percentage (85, not 0.85)

5. **Testimonials:**
   - Keep quotes under 100 words
   - Get written permission to use names/photos
   - Mark 1 testimonial as "Featured" for each project

6. **SEO:**
   - Meta Description: 120-155 characters
   - Include main keywords naturally
   - Don't duplicate across projects

---

## Component Reference

### VideoEmbed

Embeds YouTube or Vimeo videos with lazy loading.

```tsx
import { VideoEmbed } from '@/components/showcase';

<VideoEmbed
  url="https://www.youtube.com/watch?v=abc123"
  title="Youth Justice Program Overview"
  caption="Filmed in Canberra, 2024"
  thumbnail="https://example.com/thumb.jpg" // optional
  className="mb-8"
/>
```

**Props:**
- `url` (string, required): YouTube or Vimeo URL
- `title` (string, required): Video title (for accessibility)
- `caption` (string): Optional caption below video
- `thumbnail` (string): Custom thumbnail (auto-generated if not provided)
- `className` (string): Additional CSS classes

### PhotoGallery

Responsive photo gallery with lightbox.

```tsx
import { PhotoGallery } from '@/components/showcase';

<PhotoGallery
  images={[
    'https://example.com/photo1.jpg',
    'https://example.com/photo2.jpg'
  ]}
  captions={['Caption 1', 'Caption 2']}
  columns={3}
  className="my-12"
/>
```

**Props:**
- `images` (string[], required): Array of image URLs
- `captions` (string[]): Optional captions for each image
- `columns` (2 | 3 | 4): Grid columns (default: 3)
- `className` (string): Additional CSS classes

**Features:**
- Click to open lightbox
- Keyboard navigation (arrow keys, ESC)
- Touch swipe navigation (mobile)
- Image counter (2 / 10)

### TestimonialCard

Displays testimonials in 3 variants.

```tsx
import { TestimonialCard } from '@/components/showcase';

<TestimonialCard
  testimonial={{
    quote: "This program changed my life.",
    authorName: "Jane Smith",
    authorRole: "Participant",
    authorPhotoUrl: "https://example.com/jane.jpg",
    authorOrganization: "ACT Youth Program",
    featured: true
  }}
  variant="featured"
  className="mb-8"
/>
```

**Props:**
- `testimonial` (object, required):
  - `quote` (string): The testimonial text
  - `authorName` (string): Person's name
  - `authorRole` (string, optional): Their role/title
  - `authorPhotoUrl` (string, optional): Headshot URL
  - `authorOrganization` (string, optional): Organization
  - `featured` (boolean, optional): Highlight this testimonial
- `variant` ('featured' | 'default' | 'compact'): Layout style
- `className` (string): Additional CSS classes

**Variants:**
- **Featured:** Large, centered, gradient background
- **Default:** Card with border, medium size
- **Compact:** Inline, minimal, for sidebars

### ImpactStats

Animated impact statistics.

```tsx
import { ImpactStats } from '@/components/showcase';

<ImpactStats
  stats={{
    peopleServed: 1234,
    locationsReached: 25,
    partnersInvolved: 12,
    successRate: 85,
    fundingRaised: 500000,
    hoursDelivered: 10000,
    customMetrics: [
      { label: 'Workshops', value: 52, unit: 'sessions' }
    ]
  }}
  variant="hero"
  animated={true}
  className="my-16"
/>
```

**Props:**
- `stats` (object, required): Impact metrics
  - `peopleServed` (number): Total participants
  - `locationsReached` (number): Number of locations
  - `partnersInvolved` (number): Partner count
  - `successRate` (number): Success percentage (0-100)
  - `fundingRaised` (number): Total funding (AUD)
  - `hoursDelivered` (number): Program hours
  - `customMetrics` (array): Custom metrics
- `variant` ('default' | 'compact' | 'hero'): Display style
- `animated` (boolean): Enable counter animations
- `className` (string): Additional CSS classes

**Variants:**
- **Default:** Grid of cards with borders
- **Compact:** Horizontal row, minimal
- **Hero:** Large, centered, no borders

### InteractiveImpactMap

Geographic visualization of projects across Australia.

```tsx
import { InteractiveImpactMap } from '@/components/showcase';

<InteractiveImpactMap
  projects={allProjects}
  onProjectClick={(project) => navigate(`/showcase/${project.slug}`)}
  className="my-12"
/>
```

**Props:**
- `projects` (array, required): Array of project objects
- `onProjectClick` (function): Called when marker clicked
- `className` (string): Additional CSS classes

**Features:**
- Color-coded markers by project area
- Pulse animations on markers
- Hover cards with project details
- Click to navigate to project
- Legend showing project areas
- Summary statistics

### ShareButtons

Social media sharing buttons.

```tsx
import { ShareButtons } from '@/components/showcase';

<ShareButtons
  title="Youth Justice Program"
  description="Empowering young people in Canberra"
  url={window.location.href}
  hashtags={['YouthJustice', 'Canberra']}
  className="flex gap-3"
/>
```

**Props:**
- `title` (string, required): Page title
- `description` (string): Share description
- `url` (string): URL to share (defaults to current page)
- `hashtags` (string[]): Twitter hashtags
- `className` (string): Additional CSS classes

**Platforms:**
- Twitter
- LinkedIn
- Facebook
- Email
- Native Share (mobile)
- Copy Link

### CTAButton

Pre-styled call-to-action buttons.

```tsx
import { CTAButton } from '@/components/showcase';

<CTAButton
  type="donate"
  text="Support This Project"
  href="https://donate.example.com"
  size="lg"
  variant="primary"
  className="mb-4"
/>
```

**Props:**
- `type` ('donate' | 'partner' | 'volunteer' | 'learn' | 'contact'): Button type
- `text` (string): Button text (optional, defaults by type)
- `href` (string): Link URL (for link buttons)
- `onClick` (function): Click handler (for button elements)
- `size` ('sm' | 'md' | 'lg'): Button size
- `variant` ('primary' | 'secondary' | 'outline'): Style variant
- `icon` (ReactNode): Custom icon (optional)
- `className` (string): Additional CSS classes

**Type Defaults:**
- **Donate:** Red, heart icon, "Support This Project"
- **Partner:** Blue, users icon, "Partner With Us"
- **Volunteer:** Green, sparkles icon, "Get Involved"
- **Learn:** Purple, academic cap icon, "Learn More"
- **Contact:** Gray, envelope icon, "Contact Us"

### ContactForm

Full-featured contact form.

```tsx
import { ContactForm } from '@/components/showcase';

<ContactForm
  projectName="Youth Justice Program"
  onSubmit={async (data) => {
    // Send to your backend
    await sendEmail(data);
  }}
  className="my-12"
/>
```

**Props:**
- `projectName` (string): Pre-fill subject with project name
- `onSubmit` (function): Called on form submission
- `className` (string): Additional CSS classes

**Features:**
- Name, email, subject, message fields
- Full validation (email format, required fields, min length)
- Loading state during submission
- Success confirmation message
- Error handling
- Mailto fallback (if no onSubmit provided)

### SEOHead

Comprehensive SEO meta tags.

```tsx
import { SEOHead, generateProjectSchema } from '@/components/showcase';

<SEOHead
  title="Youth Justice Program"
  description="Empowering young people in Canberra through..."
  url={window.location.href}
  image="https://example.com/hero.jpg"
  type="article"
  publishedTime={project.startDate?.toISOString()}
  tags={['Youth Justice', 'Canberra']}
  schema={generateProjectSchema({
    name: project.name,
    description: project.description,
    url: window.location.href,
    image: project.heroImageUrl,
    location: project.location,
    startDate: project.startDate,
    fundingAmount: project.revenueActual,
    organizationName: 'ACT Placemat'
  })}
/>
```

**Props:**
- `title` (string, required): Page title
- `description` (string, required): Meta description (155 chars max)
- `url` (string): Canonical URL
- `image` (string): Social media preview image
- `type` ('website' | 'article'): Open Graph type
- `publishedTime` (string): Article published date (ISO 8601)
- `modifiedTime` (string): Article modified date
- `author` (string): Article author
- `tags` (string[]): Article tags/keywords
- `schema` (object): Schema.org structured data
- `twitterCard` ('summary' | 'summary_large_image'): Twitter card type
- `twitterSite` (string): Twitter @username for site
- `twitterCreator` (string): Twitter @username for creator

**Generates:**
- Basic SEO (title, description, canonical)
- Open Graph (Facebook, LinkedIn)
- Twitter Cards
- Schema.org structured data
- Article-specific tags

---

## Deployment

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+ or yarn 1.22+
- Notion API access (for database sync)
- Domain with SSL (for production)

### Environment Variables

Create a `.env.production` file:

```bash
# Notion API
VITE_NOTION_API_KEY=your_notion_api_key
VITE_NOTION_PROJECTS_DB_ID=your_projects_database_id
VITE_NOTION_OPPORTUNITIES_DB_ID=your_opportunities_database_id
VITE_NOTION_ORGANIZATIONS_DB_ID=your_organizations_database_id
VITE_NOTION_PEOPLE_DB_ID=your_people_database_id
VITE_NOTION_ARTIFACTS_DB_ID=your_artifacts_database_id

# App Config
VITE_APP_URL=https://yoursite.com
```

### Build for Production

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview production build (optional)
npm run preview

# Output will be in /dist folder
```

### Deploy to Vercel (Recommended)

1. **Connect Repository:**
   ```bash
   # Install Vercel CLI
   npm install -g vercel

   # Login
   vercel login

   # Deploy
   vercel --prod
   ```

2. **Configure Environment Variables:**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all variables from `.env.production`

3. **Configure Build Settings:**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Deploy:**
   ```bash
   vercel --prod
   ```

### Deploy to Netlify

1. **Create `netlify.toml`:**
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Deploy:**
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli

   # Login
   netlify login

   # Deploy
   netlify deploy --prod
   ```

3. **Configure Environment Variables:**
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add all variables from `.env.production`

### Deploy to AWS S3 + CloudFront

1. **Build:**
   ```bash
   npm run build
   ```

2. **Upload to S3:**
   ```bash
   aws s3 sync dist/ s3://your-bucket-name --delete
   ```

3. **Invalidate CloudFront:**
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id YOUR_DIST_ID \
     --paths "/*"
   ```

### Post-Deployment Checklist

- [ ] Test showcase homepage: `https://yoursite.com/showcase`
- [ ] Test individual project page: `https://yoursite.com/showcase/youth-justice`
- [ ] Verify images load correctly
- [ ] Verify videos play correctly
- [ ] Test mobile responsiveness
- [ ] Test touch gestures on mobile device
- [ ] Verify SEO meta tags (view-source or Facebook Debugger)
- [ ] Test social sharing (Twitter, LinkedIn, Facebook)
- [ ] Check Lighthouse scores (Performance, Accessibility, SEO)
- [ ] Verify contact form works
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)

### Performance Monitoring

1. **Lighthouse CI:**
   ```bash
   npm install -g @lhci/cli

   # Run Lighthouse CI
   lhci autorun
   ```

2. **Real User Monitoring:**
   - Add Google Analytics
   - Add Sentry for error tracking
   - Monitor Core Web Vitals

3. **Performance Budgets:**
   - First Contentful Paint: < 1.5s
   - Largest Contentful Paint: < 2.5s
   - Total Blocking Time: < 300ms
   - Cumulative Layout Shift: < 0.1

---

## Troubleshooting

### Projects Not Showing on Showcase

**Problem:** No projects appear on `/showcase` page.

**Solution:**
1. Check "Publicly Visible" checkbox is ✅ in Notion
2. Check "Status" is set to "Active" or "Completed"
3. Wait 5 minutes for cache to refresh
4. Hard refresh browser (Ctrl+Shift+R)

### Video Not Playing

**Problem:** Video thumbnail shows but video doesn't play.

**Solution:**
1. Check video URL format:
   - ✅ Good: `https://www.youtube.com/watch?v=abc123`
   - ❌ Bad: `https://youtu.be/abc123` (use full URL)
2. Ensure video is public (not unlisted or private)
3. Check for YouTube/Vimeo embed restrictions

### Images Not Loading

**Problem:** Images show broken icon.

**Solution:**
1. Check image URLs are accessible:
   - Open URL in browser to verify
   - Ensure HTTPS (not HTTP)
2. Check CORS settings:
   - Images must allow cross-origin loading
   - Host images on same domain or CDN with CORS
3. Check file format:
   - Supported: JPG, PNG, WebP
   - Not supported: HEIC, BMP, TIFF

### Lightbox Not Opening

**Problem:** Clicking gallery images does nothing.

**Solution:**
1. Check browser console for JavaScript errors
2. Ensure React is loaded correctly
3. Check z-index conflicts with other modals
4. Verify no event.preventDefault() blocking clicks

### Touch Swipes Not Working (Mobile)

**Problem:** Can't swipe between gallery images on mobile.

**Solution:**
1. Test on real device (not desktop emulator)
2. Ensure touch events aren't blocked
3. Check minimum swipe distance (50px)
4. Verify no scroll-blocking CSS

### SEO Meta Tags Not Showing

**Problem:** Facebook/Twitter shows generic preview.

**Solution:**
1. Check SEOHead component is in page
2. Verify Open Graph tags in page source (view-source:)
3. Use Facebook Debugger: https://developers.facebook.com/tools/debug/
4. Use Twitter Card Validator: https://cards-dev.twitter.com/validator
5. Clear social media cache (may take 24 hours)

### Slow Page Loading

**Problem:** Showcase pages load slowly.

**Solution:**
1. Check image sizes:
   - Optimize images to < 500KB each
   - Use tools like TinyPNG or Squoosh
2. Check video embeds:
   - Videos should use lazy loading (thumbnail first)
   - Don't autoplay videos
3. Check network:
   - Use browser DevTools → Network tab
   - Look for large files (> 1MB)
4. Check React Query cache:
   - Should cache for 5 minutes
   - Force refresh if needed

### Build Errors

**Problem:** `npm run build` fails.

**Solution:**
1. Check TypeScript errors:
   ```bash
   npm run type-check
   ```
2. Check for missing dependencies:
   ```bash
   npm install
   ```
3. Check Node version:
   ```bash
   node --version  # Should be 18+
   ```
4. Clear cache and rebuild:
   ```bash
   rm -rf node_modules dist
   npm install
   npm run build
   ```

### Contact Form Not Sending

**Problem:** Contact form submits but nothing happens.

**Solution:**
1. Check if `onSubmit` prop is provided:
   - If not provided, uses mailto: fallback
   - Ensure email client is configured
2. Check console for errors
3. Verify backend endpoint is accessible
4. Check CORS settings on backend

---

## Support

For issues, questions, or feature requests:

1. **Documentation:**
   - Read full documentation in this file
   - Check PERFORMANCE_OPTIMIZATION.md
   - Check MOBILE_OPTIMIZATION.md

2. **GitHub Issues:**
   - Search existing issues
   - Create new issue with reproduction steps

3. **Contact:**
   - Email: dev@act.org
   - Slack: #act-placemat

---

## License

Copyright © 2025 ACT Placemat
All rights reserved.

---

**Built with ❤️ by the ACT Placemat Team**
