# ACT Public Dashboard - Quick Setup Guide

## 🚀 **Get Started in 15 Minutes**

This guide gets you up and running with the revolutionary ACT community dashboard quickly and safely.

---

## **Step 1: Clone & Explore** (2 minutes)

```bash
# You already have this, but for reference:
cd "/Users/benknight/Code/ACT Placemat"

# Explore the new structure
ls -la
# You'll see:
# - backend/          # API server
# - frontend-new/     # React app  
# - shared/           # Shared types
# - client/           # Original client (can archive later)
```

---

## **Step 2: Database Setup** (5 minutes)

### **Create Supabase Project**
1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project" 
3. Name: "ACT Public Dashboard"
4. Choose region closest to you
5. Create strong database password
6. Wait for project creation (~2 minutes)

### **Get Your Keys**
1. Go to Settings → API
2. Copy your **Project URL** 
3. Copy your **anon/public key**
4. Copy your **service_role key** (⚠️ Keep this secret!)

### **Run Database Migrations**
```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your Supabase credentials:
# SUPABASE_URL=your_project_url
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Run migrations (creates all tables safely)
npm run db:migrate

# Check migration status
npm run db:migrate -- --status
```

---

## **Step 3: Test the Incredible Homepage** (3 minutes)

```bash
cd frontend-new

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add:
# VITE_API_BASE_URL=http://localhost:3001

# Start the incredible homepage beta
npm run dev
```

**🎉 Open http://localhost:3000 and see the magic!**

The homepage should show:
- ✨ Beautiful animated hero section
- 📊 Animated impact metrics  
- 📚 Featured story showcase
- 🎨 ACT brand personality throughout

---

## **Step 4: Start Backend API** (2 minutes)

```bash
# In a new terminal
cd backend

# Start the API server
npm run dev

# Should see:
# ✅ Database connected
# ✅ Server running on http://localhost:3001
# ✅ CORS configured for frontend
```

---

## **Step 5: Test Full Integration** (3 minutes)

### **Test Database Connection**
```bash
# Check if homepage loads real data
curl http://localhost:3001/api/homepage
# Should return JSON with stories, metrics, projects
```

### **Test Community Forms**
1. On homepage, scroll to bottom
2. Try newsletter signup form
3. Try contact form
4. Check Supabase dashboard → Table Editor
5. See new records in `newsletter_subscribers` and `community_inquiries`

---

## **🎯 You're Ready!**

At this point you have:
- ✅ **Separated Architecture** - Backend and frontend working independently
- ✅ **Safe Database** - Migrations applied cleanly with tracking
- ✅ **Incredible Homepage** - Beautiful, animated, brand-aligned
- ✅ **Full Integration** - Forms saving to database, real-time updates

---

## **Next Steps for Collaboration**

### **Immediate (This Week)**
1. **Content Planning Session**
   - Gather 3-5 real ACT stories
   - Plan impact metrics to showcase
   - Identify key partners to feature

2. **Brand Alignment Review**
   - Test homepage with ACT team
   - Adjust colors, fonts, messaging
   - Ensure "curious, grassroots, innovative" feel

3. **Story Collection Workshop**
   - Set up consent and attribution process
   - Create story submission workflow
   - Plan community voice highlighting

### **Soon (Next 2 Weeks)**
1. **Admin Interface** - Easy way to add stories and update metrics
2. **Real Content** - Replace mock data with actual ACT stories
3. **Partner Showcase** - Add real partner profiles and relationships
4. **Mobile Optimization** - Perfect experience on all devices

---

## **Troubleshooting**

### **Database Issues**
```bash
# Reset database (⚠️ deletes all data)
npm run db:reset

# Check migration status
npm run db:migrate -- --status

# Apply specific migration
node database/migrate.js
```

### **Frontend Issues**
```bash
# Clear cache and restart
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### **Backend Issues**
```bash
# Check environment variables
cat .env

# Test database connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('Database connected!');
"
```

---

## **Development Workflow**

### **Daily Development**
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend-new && npm run dev

# Terminal 3: Database migrations (when needed)
cd backend && npm run db:migrate
```

### **Adding New Features**
1. Plan feature with community impact in mind
2. Create database migration if needed
3. Build backend API endpoint
4. Create frontend component
5. Test end-to-end functionality
6. Review with stakeholders

### **Safe Deployment**
1. Test all changes locally
2. Run full test suite
3. Deploy to staging environment
4. Community review and feedback
5. Production deployment with monitoring

---

## **🌱 Revolutionary Platform Ready**

You now have the foundation for the world's first truly community-centered public dashboard. Every feature we build from here will prioritize:

- **Community Voice** over institutional control
- **Relationship Building** over data extraction  
- **Transparent Impact** over vanity metrics
- **Collaborative Growth** over competitive advantage

**Let's cultivate change together!** 🚜✨