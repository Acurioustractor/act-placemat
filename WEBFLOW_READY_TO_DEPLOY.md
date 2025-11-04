# ✅ Webflow Portfolio App - Ready to Deploy!

**Status:** App created locally, ready to push to GitHub and connect to Webflow Cloud

---

## 🎯 What's Ready

I've created a complete Next.js app in `apps/webflow-portfolio` with:

✅ **72 Project Cards** - Fetches from your backend API
✅ **Theme Filtering** - Filter by Art, Indigenous, Storytelling, etc.
✅ **Status Filtering** - Active, Ideation, Transferred, etc.
✅ **Animated Cards** - Framer Motion animations
✅ **Responsive Design** - Works on mobile, tablet, desktop
✅ **Health Scores** - Beautiful Obsolescence metrics
✅ **Real-time Sync** - Updates from Notion via your backend

---

## 📁 What Was Created

```
apps/webflow-portfolio/
├── app/
│   ├── globals.css          # Tailwind styles
│   ├── layout.tsx            # Page layout
│   └── page.tsx              # Main portfolio page
├── components/
│   ├── ProjectCard.tsx       # Individual project card
│   └── ProjectGrid.tsx       # Grid with filtering
├── lib/
│   └── api.ts                # Backend API connection
├── constants/
│   └── themeColors.ts        # ACT theme colors
├── package.json              # Dependencies
├── next.config.ts            # Next.js config
├── tailwind.config.ts        # Tailwind config
├── tsconfig.json             # TypeScript config
├── .env.local                # Environment variables (local only)
└── .env.local.example        # Template for env vars
```

---

## 🚀 Step 1: Push to GitHub

```bash
cd "/Users/benknight/Code/ACT Placemat"

# Add the new webflow-portfolio directory
git add apps/webflow-portfolio

# Commit
git commit -m "Add Webflow Cloud project portfolio app"

# Push to your repo
git push origin unified-intelligence
```

**OR** if you're on a different branch:
```bash
git push origin main
# (or whatever your main branch is called)
```

---

## 🌐 Step 2: Create Webflow Cloud App

Go to: https://webflow.com/dashboard → **Apps** → **Create App**

### Fill Out The Form:

**Name:**
```
ACT Project Portfolio
```

**☑️ Check:** "Link a GitHub repository"

**GitHub repository:**
```
Select: ACT Placemat
(or whatever your repo name is - it should appear in the dropdown)
```

**Description (optional):**
```
Project portfolio for act.place - displays 72 projects with filtering
```

**Advanced settings → Directory path:**
```
apps/webflow-portfolio
```

**Click:** "Create App"

---

## ⚙️ Step 3: Configure Environment Variables in Webflow

After creating the app, Webflow will ask you to set environment variables:

### Add This Variable:

**Key:**
```
NEXT_PUBLIC_API_URL
```

**Value (Production):**
```
https://your-backend-url.railway.app
```

**OR if backend not deployed yet:**
```
http://localhost:4000
```
(You can update this later when backend is deployed)

---

## 🎨 Step 4: Initialize DevLink (Import ACT Brand)

Once Webflow Cloud app is created:

```bash
cd apps/webflow-portfolio

# Install Webflow CLI if not already installed
npm install -g @webflow/webflow-cli

# Initialize DevLink (imports your ACT brand from act.place)
webflow devlink init

# This will:
# - Connect to act.place
# - Import your colors, fonts, spacing
# - Create /devlink folder with your design system
```

---

## 🔧 Step 5: Deploy

### Method A: Auto-Deploy via Git (Recommended)

Every time you push to GitHub, Webflow Cloud automatically:
1. Detects the push
2. Builds the app
3. Deploys it
4. Makes it available in Webflow Designer

```bash
# Any future changes:
git add .
git commit -m "Update portfolio"
git push

# Webflow Cloud deploys automatically!
```

### Method B: Manual Deploy via CLI

```bash
cd apps/webflow-portfolio
webflow deploy
```

---

## 📱 Step 6: Add to act.place

1. Open **act.place** in Webflow Designer
2. Go to **Add Panel** (left sidebar)
3. Find **Apps** section
4. Drag **ACT Project Portfolio** onto your page
5. Position and resize as needed
6. **Publish** your site!

---

## 🧪 Testing Locally (Before Deploying)

Want to test it first?

```bash
cd apps/webflow-portfolio

# Make sure backend is running on port 4000
# Then start the portfolio app:
npm run dev

# Opens at: http://localhost:3001
```

You should see:
- Your 72 projects loading
- Theme filter buttons (Storytelling, Health and wellbeing, etc.)
- Status filter buttons (Active, Ideation, etc.)
- Project cards with animations

---

## 🎯 Exact GitHub Info for Webflow

When you fill out the Webflow form, use these EXACT values:

| Field | Value |
|-------|-------|
| **Name** | `ACT Project Portfolio` |
| **GitHub Repository** | `ACT Placemat` (select from dropdown) |
| **Directory Path** | `apps/webflow-portfolio` |
| **Description** | `Project portfolio for act.place - displays 72 projects with filtering` |

---

## ✅ Verification Checklist

Before connecting to Webflow Cloud:

- [ ] Backend is running and accessible
- [ ] `apps/webflow-portfolio` exists in your repo
- [ ] All files are committed to Git
- [ ] Pushed to GitHub (check on github.com)
- [ ] `.env.local` is in `.gitignore` (it is!)
- [ ] Backend API URL is correct

After connecting to Webflow Cloud:

- [ ] Webflow Cloud app created successfully
- [ ] Environment variable `NEXT_PUBLIC_API_URL` set
- [ ] First build completes (check Webflow Cloud dashboard)
- [ ] Component appears in Webflow Designer
- [ ] Can drag component onto act.place
- [ ] Projects load when viewing the page

---

## 🐛 Troubleshooting

### "Build failed" in Webflow Cloud

**Check:** Environment variable `NEXT_PUBLIC_API_URL` is set correctly in Webflow Cloud settings

### "No projects loading"

**Check:**
1. Backend API is accessible from the internet (not just localhost)
2. CORS is configured to allow Webflow Cloud domain
3. Backend is running and returning data

### "Component not appearing in Webflow Designer"

**Check:**
1. Build completed successfully in Webflow Cloud dashboard
2. App is linked to correct site (act.place)
3. Try refreshing Webflow Designer

---

## 🎉 What You Get

Once deployed, you'll have:

- ✅ **Native Webflow component** on act.place
- ✅ **72 projects** with beautiful cards
- ✅ **9 theme filters** (Art, Indigenous, Storytelling, etc.)
- ✅ **Status filtering** (Active, Ideation, Transferred, etc.)
- ✅ **Animated interactions** (hover effects, smooth transitions)
- ✅ **Responsive design** (works on all devices)
- ✅ **Auto-updates** from Notion (via your backend)
- ✅ **Your ACT brand** (via DevLink sync)

---

## 📞 Ready to Deploy?

**Next steps:**

1. ✅ **Push to GitHub** (commands above)
2. ✅ **Create Webflow Cloud app** (form details above)
3. ✅ **Set environment variable** (backend URL)
4. ✅ **Run DevLink** (import ACT brand)
5. ✅ **Add to act.place** (drag component in Designer)

**Questions?** Let me know and I'll help debug!

**Everything is ready - just need to push to GitHub and connect to Webflow!** 🚀
