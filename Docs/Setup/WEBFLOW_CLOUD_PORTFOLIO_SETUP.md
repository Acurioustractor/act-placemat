# ACT Project Portfolio - Webflow Cloud Integration Guide

**Date:** November 4, 2025
**Purpose:** Build project portfolio as a native Webflow Cloud component for act.place
**Approach:** Next.js app with DevLink (Webflow design system sync)

---

## 🎯 What We're Building

A **native Webflow component** that:
- ✅ Shows all 72 projects from your Notion database
- ✅ Filters by theme, status, and health
- ✅ Uses your ACT brand styles from Webflow automatically
- ✅ Updates via GitHub pushes (no manual deployment)
- ✅ Feels like a built-in Webflow page (not an iframe!)

---

## 📋 Prerequisites (You Already Have These!)

✅ Webflow account with Cloud access
✅ GitHub account
✅ Experience linking GitHub to Webflow
✅ act.place website in Webflow
✅ Backend API running (http://localhost:4000)

---

## 🚀 Step-by-Step Setup

### Step 1: Install Webflow CLI

```bash
# Install globally
npm install -g @webflow/webflow-cli

# Verify installation
webflow --version
```

### Step 2: Create New Webflow Cloud App

**Option A: Via Webflow Dashboard (Recommended)**

1. Go to https://webflow.com/dashboard
2. Click **Apps** in sidebar
3. Click **Create App**
4. Choose:
   - **Framework:** Next.js (for React + API routes)
   - **Name:** ACT Project Portfolio
   - **Site:** act.place

**Option B: Via CLI**

```bash
# Create new Next.js app
webflow apps create

# Follow prompts:
# - Name: act-project-portfolio
# - Framework: Next.js
# - Site: act.place
```

### Step 3: Clone Your New App Locally

```bash
# Webflow will give you a git URL
git clone [your-webflow-cloud-repo-url]
cd act-project-portfolio

# Install dependencies
npm install
```

### Step 4: Connect DevLink (Import ACT Brand)

This is the MAGIC step - DevLink imports your Webflow design system!

```bash
# Initialize DevLink
webflow devlink init

# This will:
# - Connect to act.place
# - Import your colors, fonts, spacing
# - Create a /devlink folder with your components
# - Sync your design tokens
```

**What You'll Get:**
```
/devlink/
  ├── global.css          # Your ACT global styles
  ├── [ComponentName].tsx # Any Webflow components you've built
  └── utils.ts            # Style utilities
```

### Step 5: Set Up Environment Variables

```bash
# Create .env.local
cat > .env.local <<EOF
# Backend API (your existing API)
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# For local development
# NEXT_PUBLIC_API_URL=http://localhost:4000

# Webflow (auto-populated by CLI)
WEBFLOW_SITE_ID=your-site-id
WEBFLOW_API_TOKEN=your-token
EOF
```

### Step 6: Build Project Portfolio Component

**File Structure:**
```
act-project-portfolio/
├── app/
│   ├── layout.tsx         # Use Webflow global styles
│   └── page.tsx           # Main portfolio page
├── components/
│   ├── ProjectCard.tsx    # Card component
│   ├── FilterBar.tsx      # Theme/status filters
│   └── ProjectGrid.tsx    # Grid layout
├── lib/
│   └── api.ts             # Fetch from your backend
├── devlink/               # Auto-generated from Webflow
│   └── global.css         # ACT brand styles
└── public/
```

I'll create these files for you in a moment!

### Step 7: Run Locally

```bash
# Start dev server
npm run dev

# Opens at http://localhost:3000
# Live reloads when you change code
# Uses your ACT brand styles from DevLink!
```

### Step 8: Deploy to Webflow Cloud

**Method 1: Push to GitHub (Auto-Deploy)**
```bash
git add .
git commit -m "Add project portfolio component"
git push origin main

# Webflow Cloud automatically:
# - Detects the push
# - Builds your app
# - Deploys it
# - Makes it available in Webflow Designer
```

**Method 2: Deploy via CLI**
```bash
webflow deploy
```

### Step 9: Add to act.place in Webflow Designer

1. Open act.place in Webflow Designer
2. Go to **Add Panel** (left sidebar)
3. Find **Apps** section
4. Drag **ACT Project Portfolio** onto your page
5. Publish site!

---

## 💻 Code Implementation

### 1. Main Portfolio Page (`app/page.tsx`)

```tsx
import { ProjectGrid } from '@/components/ProjectGrid';
import { FilterBar } from '@/components/FilterBar';
import '@/devlink/global.css'; // Your ACT brand styles!

export default function PortfolioPage() {
  return (
    <div className="portfolio-container">
      <header className="portfolio-header">
        <h1>Our Project Portfolio</h1>
        <p>72 projects building community strength and sovereignty</p>
      </header>

      <FilterBar />
      <ProjectGrid />
    </div>
  );
}
```

**Key Point:** `@/devlink/global.css` contains YOUR ACT brand from Webflow!

### 2. Fetch Projects (`lib/api.ts`)

```tsx
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getProjects() {
  const response = await fetch(`${API_URL}/api/real/projects`, {
    next: { revalidate: 300 } // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error('Failed to fetch projects');
  }

  const data = await response.json();
  return data.projects;
}
```

### 3. Project Card (`components/ProjectCard.tsx`)

```tsx
import { motion } from 'framer-motion';

export function ProjectCard({ project }) {
  return (
    <motion.div
      className="project-card" // Uses Webflow styles!
      whileHover={{ y: -4 }}
    >
      <div className="card-header" style={{
        background: project.coverImageUrl
          ? `url(${project.coverImageUrl})`
          : 'var(--theme-color)' // Webflow CSS variable!
      }}>
        {!project.coverImageUrl && <span>{getThemeIcon(project.themes[0])}</span>}
      </div>

      <div className="card-body">
        <h3>{project.name}</h3>
        <div className="themes">
          {project.themes.map(theme => (
            <span key={theme} className="theme-tag">
              {theme}
            </span>
          ))}
        </div>
        {/* More content */}
      </div>
    </motion.div>
  );
}
```

**Key Point:** CSS classes like `.project-card` can be styled in Webflow Designer, then synced via DevLink!

### 4. Project Grid with Filtering (`components/ProjectGrid.tsx`)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectCard } from './ProjectCard';
import { getProjects } from '@/lib/api';

export function ProjectGrid() {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getProjects().then(setProjects);
  }, []);

  const filtered = filter === 'all'
    ? projects
    : projects.filter(p => p.themes.includes(filter));

  return (
    <div className="project-grid">
      <AnimatePresence mode="wait">
        {filtered.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </AnimatePresence>
    </div>
  );
}
```

---

## 🎨 How DevLink Syncs Your ACT Brand

Once you run `webflow devlink init`, you can:

### Option 1: Use Webflow CSS Classes
Style components in Webflow Designer, sync to code:

```tsx
// In Webflow: Create a component called "Project Card"
// Style it with your brand colors, fonts, spacing

// In code: Import and use it
import { ProjectCard as WebflowProjectCard } from '@/devlink/ProjectCard';

<WebflowProjectCard />
```

### Option 2: Use CSS Variables
Webflow exports your design tokens as CSS variables:

```tsx
// Automatically available:
<div style={{
  color: 'var(--primary-color)',      // Your ACT primary color
  fontFamily: 'var(--body-font)',     // Your ACT font
  padding: 'var(--spacing-medium)',   // Your spacing system
}}>
```

### Option 3: Import Global Styles
Just import the global CSS:

```tsx
import '@/devlink/global.css';

// Now all your Webflow styles apply!
<div className="container">
  <h1 className="heading-large">Our Projects</h1>
</div>
```

---

## 🔄 Development Workflow

### Day-to-Day Development

```bash
# 1. Make changes locally
npm run dev

# 2. Test at localhost:3000

# 3. Commit and push
git add .
git commit -m "Add theme filtering"
git push

# 4. Webflow Cloud auto-deploys!
# 5. Component updates on act.place automatically
```

### Syncing Design Changes

If you update styles in Webflow Designer:

```bash
# Re-sync DevLink
webflow devlink sync

# Your code now has the latest Webflow styles!
```

---

## 📊 What Makes This Better Than Iframe

| Feature | Iframe Embed | Webflow Cloud |
|---------|--------------|---------------|
| **Brand Consistency** | Manual CSS matching | Automatic via DevLink |
| **Performance** | Extra HTTP request | Native integration |
| **SEO** | Not indexed | Fully indexed |
| **Responsiveness** | Complex iframe resizing | Native responsive |
| **Deployment** | Separate Vercel deploy | GitHub push = live |
| **Editing in Webflow** | Can't edit | Can style in Designer |
| **Loading Speed** | Slower (extra load) | Faster (same domain) |
| **Feels Native** | No (iframe borders) | Yes (seamless) |

---

## 🚀 Quick Start Commands (Copy-Paste Ready)

```bash
# 1. Install CLI
npm install -g @webflow/webflow-cli

# 2. Create app via Webflow Dashboard
# (Go to webflow.com/dashboard → Apps → Create App)

# 3. Clone your repo
git clone [your-webflow-cloud-repo]
cd [repo-name]

# 4. Install dependencies
npm install

# 5. Install Framer Motion
npm install framer-motion

# 6. Initialize DevLink (imports ACT brand)
webflow devlink init

# 7. Set up environment variables
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=http://localhost:4000
EOF

# 8. Start development
npm run dev

# 9. Deploy
git push origin main
```

---

## 🎯 Next Steps

**I'll now:**
1. ✅ Create the Next.js components for you
2. ✅ Show you how to connect to your existing backend API
3. ✅ Give you the exact files to add to your Webflow Cloud repo
4. ✅ Help you deploy it to act.place

**You'll:**
1. Create the Webflow Cloud app in your dashboard
2. Clone the repo
3. Copy the files I create into it
4. Run `webflow devlink init` to import your ACT brand
5. Push to GitHub → Auto-deploys! 🚀

Ready to create the app in your Webflow dashboard?

---

## 💡 Pro Tips

**1. Use Webflow CMS If Needed**
You can also pull data from Webflow CMS:
```tsx
import { getCollectionItems } from '@webflow/webflow-data';

const projects = await getCollectionItems('projects');
```

**2. Server-Side Rendering**
Next.js in Webflow Cloud supports SSR for SEO:
```tsx
export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map(p => ({ id: p.id }));
}
```

**3. Preview Mode**
Test changes before deploying:
```bash
webflow deploy --preview
```

**4. Environment-Specific APIs**
```tsx
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-backend.railway.app'
  : 'http://localhost:4000';
```

---

**Let's build this as a Webflow Cloud app!** This will be WAY better than an iframe embed. 🚜✨

Should I create the Next.js files for your Webflow Cloud repo?
