# 🚀 Complete SQL Setup Guide for ACT Revolutionary Media System

## Overview
This guide consolidates ALL SQL files you need to run in Supabase to activate your revolutionary media management system alongside your existing Empathy Ledger data.

## 📁 **Current SQL Files Status**

### ✅ **Required Files (Ready to Apply)**

1. **`apply-media-schema.sql`** - **🎯 START HERE** 
   - Location: `/backend/database/apply-media-schema.sql`
   - **This is the COMPLETE media system in one file**
   - Contains: Tables, indexes, RLS, sample data, helper views
   - Ready to copy-paste into Supabase SQL Editor

### 📋 **Migration Files (Optional - For Reference)**
These contain the same content but broken into smaller pieces:

2. **`2024-01-15-1000-initial-schema.sql`**
   - Core ACT dashboard tables (stories, projects, metrics, partners)
   - Community engagement tables (newsletter, inquiries, volunteers)

3. **`2024-01-15-1030-row-level-security.sql`**
   - RLS policies for all tables
   - Public read access for published content
   - Service role access for backend API

4. **`2024-01-16-1000-media-management-system.sql`**
   - Media management tables (same as in apply-media-schema.sql)
   - Helper functions and advanced features

## 🎯 **Recommended Setup Process**

### **Option A: Quick Setup (Recommended)**
```sql
-- Just run this ONE file in Supabase SQL Editor:
-- Copy contents of: apply-media-schema.sql
-- This includes everything you need for media management
```

### **Option B: Full ACT Dashboard Setup**
If you want the complete ACT dashboard (beyond just media):

1. Run `2024-01-15-1000-initial-schema.sql`
2. Run `2024-01-15-1030-row-level-security.sql` 
3. Run `apply-media-schema.sql`

## 🗄️ **What Each Setup Gives You**

### **Quick Setup (apply-media-schema.sql only):**
✅ Complete media management system
✅ Photo/video upload and organization  
✅ AI-ready tagging system
✅ Gallery collections
✅ Sample data with beautiful test content
✅ Row-level security for media
✅ Performance indexes
✅ Helper functions

### **Full Setup (all migration files):**
✅ Everything from Quick Setup PLUS:
✅ Complete ACT dashboard tables
✅ Stories and project management
✅ Community engagement forms
✅ Newsletter and volunteer systems
✅ Metrics tracking
✅ Partner management

## 📋 **Pre-Flight Checklist**

Before running SQL:

- [ ] **Backup existing data** (if you have important Empathy Ledger data)
- [ ] **Supabase project ready** with your existing Empathy Ledger database
- [ ] **Service role key** available for backend API access
- [ ] **Storage bucket** will be created after SQL (follow setup-storage.md)

## 🛠️ **Step-by-Step Application**

### **Step 1: Apply Database Schema**

1. **Go to your Supabase dashboard**
2. **Navigate to SQL Editor**
3. **Copy contents of `apply-media-schema.sql`**
4. **Paste into SQL Editor**
5. **Click "RUN"**

### **Step 2: Verify Installation**

Check that these tables were created:
```sql
-- Run this to verify:
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN (
    'media_items', 
    'media_collections', 
    'collection_media',
    'media_usage',
    'media_processing_jobs'
);
```

### **Step 3: Test Sample Data**

```sql
-- Verify sample data was inserted:
SELECT title, file_type, photographer 
FROM media_items 
WHERE community_approved = true;

-- Check collections:
SELECT name, type, featured 
FROM media_collections 
WHERE public_visible = true;
```

### **Step 4: Setup Storage Bucket**

Follow instructions in `/backend/setup-storage.md`:
- Create 'media' bucket (public)
- Set up folder structure
- Configure bucket policies

## 🚨 **Important Notes**

### **Database Safety**
- All SQL uses `IF NOT EXISTS` - safe to run multiple times
- Won't overwrite existing Empathy Ledger tables
- Only adds new media management tables

### **Sample Data**
- Uses real Unsplash URLs for testing
- Includes realistic community content
- All marked as consent_verified and community_approved

### **Row Level Security**
- Public can only see approved + verified content
- Service role (your backend) has full access
- Anonymous users can't modify anything

## 🎯 **Expected Results After Setup**

### **Database Structure:**
```
Your Empathy Ledger (existing):
├── stories (52 records)
├── storytellers (217 records)  
├── themes (25 records)
└── organizations (20 records)

NEW Media Management System:
├── media_items (3 sample photos)
├── media_collections (3 sample galleries)
├── collection_media (relationships)
├── media_usage (tracking)
└── media_processing_jobs (AI queue)
```

### **Frontend Ready For:**
- ✅ MediaUpload component (drag-drop uploads)
- ✅ MediaGallery component (responsive galleries)  
- ✅ MediaDashboard page (full management)
- ✅ API endpoints (/api/media/*)

### **Backend Ready For:**
- ✅ File uploads with Sharp.js processing
- ✅ AI tagging integration
- ✅ Gallery management
- ✅ Search and discovery

## 🔧 **Testing the Setup**

### **Test 1: API Endpoints**
```bash
# After running backend:
curl http://localhost:3001/api/media/items
curl http://localhost:3001/api/media/collections
```

### **Test 2: Frontend Components**
```typescript
// In your React app:
import MediaGallery from './components/MediaGallery';

// Should display the 3 sample media items
<MediaGallery showFilters={true} />
```

### **Test 3: Upload Flow**
- Use MediaUpload component
- Upload a test image
- Verify it appears in MediaGallery
- Check database for new media_items record

## 📞 **Support & Troubleshooting**

### **Common Issues:**

1. **"Extension uuid-ossp doesn't exist"**
   - Run: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
   - Usually auto-installed in Supabase

2. **"Permission denied"** 
   - Ensure you're using your service role key in backend
   - Check RLS policies are applied correctly

3. **"Sample data not visible"**
   - Verify community_approved = true in media_items
   - Check public_visible = true in media_collections

### **Success Indicators:**
- ✅ No SQL errors in Supabase console
- ✅ 5 new tables created
- ✅ 3 sample media items visible in API
- ✅ 3 sample collections created
- ✅ MediaGallery component displays content

## 🚀 **Ready to Rock!**

Once you've applied `apply-media-schema.sql`:

1. **Install backend dependencies** (`npm install multer sharp uuid`)
2. **Create storage bucket** (follow setup-storage.md)
3. **Start your servers** and test the upload flow
4. **Upload your first community photos** and watch the magic happen!

Your revolutionary media management system will be ready to showcase the incredible work your community is doing! 🎉