# Webflow Cloud + GitHub Setup for ACT Project Portfolio

## 🎯 What You Need to Do

Fill out the Webflow Cloud creation form like this:

### Form Fields:

**Name:**
```
ACT Project Portfolio
```

**✅ Check:** "Link a GitHub repository"

**GitHub repository:**
```
benknight/ACT-Placemat
(or whatever your repo is named)
```

**Description:**
```
Project portfolio dashboard for act.place - shows 72 projects from Notion with filtering by theme, status, and Beautiful Obsolescence metrics.
```

**Advanced settings → Directory path:**
```
apps/webflow-portfolio
```

**Why this directory path?**
- Your repo already has `apps/frontend` and `apps/backend`
- This adds `apps/webflow-portfolio` to your monorepo
- Keeps everything organized in one place!

---

## 📁 What I'm Creating For You

I'll set up this structure in your repo:

```
ACT Placemat/
├── apps/
│   ├── backend/           # Your existing backend
│   ├── frontend/          # Your existing frontend
│   └── webflow-portfolio/ # NEW - Webflow Cloud app
│       ├── app/
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       │   ├── ProjectCard.tsx
│       │   ├── ProjectGrid.tsx
│       │   └── FilterBar.tsx
│       ├── lib/
│       │   └── api.ts
│       ├── package.json
│       └── next.config.js
```

---

## 🚀 Steps After Creating the App

### 1. Webflow Creates the App
- Click "Create App" in Webflow
- Webflow connects to your GitHub repo
- Looks in `apps/webflow-portfolio` directory

### 2. I'll Add The Files
Once you click "Create App", I'll immediately:
- Create `package.json`
- Add Next.js setup files
- Create the project portfolio components
- Set up API connection to your backend

### 3. You Init DevLink
```bash
cd apps/webflow-portfolio
npx @webflow/webflow-cli devlink init
```
This imports your ACT brand from act.place!

### 4. Commit and Push
```bash
git add apps/webflow-portfolio
git commit -m "Add Webflow Cloud project portfolio"
git push origin main
```

### 5. Webflow Auto-Deploys
- Detects the push
- Builds the app
- Makes it available in Webflow Designer

### 6. Add to act.place
In Webflow Designer:
- Drag "ACT Project Portfolio" component onto your page
- Publish!

---

## ✅ Ready to Create?

**Fill out the form with:**
- Name: `ACT Project Portfolio`
- ✅ Link GitHub repository
- Repo: `[your-username]/ACT-Placemat`
- Directory: `apps/webflow-portfolio`

**Then tell me when you've clicked "Create App" and I'll add all the files!** 🚀
