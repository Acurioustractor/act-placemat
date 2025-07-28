# 🌍 Empathy Ledger Platform: Multi-Tenant Storage Architecture

## 🎯 **Strategic Vision**

**The Empathy Ledger as a Platform** with ACT as Customer #1
- Scalable multi-tenant architecture from day one
- Each organization gets isolated, secure media management
- Platform-level features benefit all customers
- ACT pioneers the revolutionary approach, others follow

---

## 🏗️ **Multi-Tenant Storage Architecture Options**

### **Option A: Organization-Namespaced Shared Buckets (RECOMMENDED)**

```
📦 Platform Bucket Structure:
empathy-photos/
├── act/                    (ACT's photos)
│   ├── community/
│   ├── projects/
│   ├── impact/
│   └── galleries/
├── justice-hub/            (Organization #2)
│   ├── community/
│   ├── projects/
│   └── campaigns/
└── future-org/             (Organization #3)
    ├── community/
    └── projects/

empathy-videos/
├── act/                    (ACT's videos)
│   ├── stories/
│   ├── interviews/
│   └── project-updates/
├── justice-hub/
│   ├── testimonials/
│   └── campaigns/
└── future-org/
    ├── stories/
    └── training/

empathy-media/
├── act/                    (ACT's existing content + new)
│   ├── profile-images/     (migrate existing)
│   ├── story-images/       (migrate existing) 
│   ├── thumbnails/
│   └── documents/
├── justice-hub/
│   ├── profile-images/
│   ├── thumbnails/
│   └── reports/
└── future-org/
    ├── profile-images/
    └── thumbnails/
```

### **Benefits of This Approach:**
1. **🏢 Clear Organization Isolation** - Each org has their own namespace
2. **📊 Platform-Level Analytics** - Track usage across all orgs in shared buckets
3. **🔧 Easier Management** - 3 buckets vs 3×N buckets as platform grows
4. **💰 Cost Efficiency** - Shared infrastructure, better bulk pricing
5. **🚀 Platform Features** - Cross-org insights, benchmarking, best practices
6. **🔒 Secure Boundaries** - RLS policies enforce org-level access control

---

## 🗄️ **Database Architecture for Multi-Tenancy**

### **Enhanced Schema with Organization Isolation:**

```sql
-- Organizations table (platform-level)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,  -- 'act', 'justice-hub', etc.
    name TEXT NOT NULL,
    domain TEXT,
    subscription_tier TEXT DEFAULT 'starter',
    storage_quota_gb INTEGER DEFAULT 10,
    storage_used_gb NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media items with organization context
CREATE TABLE IF NOT EXISTS media_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('photo', 'video', 'document')),
    bucket_name TEXT NOT NULL, -- 'empathy-photos', 'empathy-videos', etc.
    file_path TEXT NOT NULL,   -- 'act/community/image123.jpg'
    
    -- All existing fields...
    title TEXT,
    description TEXT,
    ai_tags TEXT[],
    manual_tags TEXT[],
    consent_verified BOOLEAN DEFAULT FALSE,
    community_approved BOOLEAN DEFAULT FALSE,
    -- etc...
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced RLS policies
CREATE POLICY "Organizations can only see their own media" ON media_items
    FOR ALL USING (
        organization_id = (
            SELECT id FROM organizations 
            WHERE slug = current_setting('app.current_organization', true)
        )
    );
```

---

## 🔧 **API Architecture for Multi-Tenancy**

### **Organization-Aware Endpoints:**

```javascript
// Organization context middleware
const setOrganizationContext = async (req, res, next) => {
    const orgSlug = req.headers['x-organization'] || req.query.org || 'act';
    
    // Validate organization access
    const { data: org } = await supabase
        .from('organizations')
        .select('id, slug, name')
        .eq('slug', orgSlug)
        .single();
    
    if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
    }
    
    req.organization = org;
    next();
};

// Organization-aware storage paths
const getStoragePath = (orgSlug, mediaType, folder, fileName) => {
    const bucketMap = {
        'photo': 'empathy-photos',
        'video': 'empathy-videos', 
        'document': 'empathy-media'
    };
    
    return {
        bucket: bucketMap[mediaType] || 'empathy-media',
        path: `${orgSlug}/${folder}/${fileName}`,
        fullUrl: `${bucketMap[mediaType]}/${orgSlug}/${folder}/${fileName}`
    };
};

// Updated upload endpoint
app.post('/api/:org/media/upload', setOrganizationContext, upload.single('file'), async (req, res) => {
    const { organization } = req;
    const file = req.file;
    
    // Generate storage path for this organization
    const storagePath = getStoragePath(
        organization.slug,
        file.mimetype.startsWith('image/') ? 'photo' : 'video',
        'community', // or dynamic based on metadata
        `${uuidv4()}.${file.originalname.split('.').pop()}`
    );
    
    // Upload to organization-specific path
    const { data, error } = await supabase.storage
        .from(storagePath.bucket)
        .upload(storagePath.path, file.buffer);
    
    // Save with organization context
    const { data: mediaItem } = await supabase
        .from('media_items')
        .insert({
            organization_id: organization.id,
            bucket_name: storagePath.bucket,
            file_path: storagePath.path,
            file_url: data.publicUrl,
            // ... other fields
        });
    
    res.json({ success: true, media: mediaItem });
});
```

---

## 🚀 **Migration Strategy for ACT's Existing Content**

### **Phase 1: Extend Current Setup (Immediate)**
```bash
# Keep ACT's existing buckets temporarily
photos/          (ACT's current bucket)
videos/          (ACT's current bucket)  
media/           (ACT's current bucket with 185+ images)

# Start using new platform structure for NEW uploads
empathy-photos/act/community/
empathy-videos/act/stories/
empathy-media/act/thumbnails/
```

### **Phase 2: Gradual Migration (Future)**
```bash
# Migrate existing content to platform structure
empathy-photos/act/           (move from photos/)
empathy-videos/act/           (move from videos/)
empathy-media/act/            (move from media/, preserving all URLs)
├── profile-images/           (185+ existing images)
├── story-images/             (85+ existing images)
└── thumbnails/               (new)
```

---

## 🔒 **Security & Access Control**

### **Row-Level Security by Organization:**
```sql
-- Set organization context for requests
SET app.current_organization = 'act';

-- All queries automatically filtered by organization
SELECT * FROM media_items;  -- Only returns ACT's media

-- API sets this context based on authentication/headers
```

### **Storage Bucket Policies:**
```sql
-- Organization-aware bucket access
CREATE POLICY "Organization media access" ON storage.objects
FOR ALL USING (
    bucket_id IN ('empathy-photos', 'empathy-videos', 'empathy-media')
    AND (storage.foldername(name))[1] = current_setting('app.current_organization', true)
);
```

---

## 📊 **Platform-Level Features This Enables**

### **For Empathy Ledger Platform:**
1. **📈 Cross-Organization Analytics** - "Photography increases story engagement by 300%"
2. **🎯 Benchmarking** - "Your story completion rate vs platform average"
3. **💡 Best Practices** - "Organizations using video see 2x more donations"
4. **🔄 Content Templates** - Proven media templates across orgs
5. **🤖 Shared AI Models** - Better tagging from cross-org training data

### **For Each Organization:**
1. **🏢 Complete Isolation** - Never see other orgs' content
2. **📊 Organization Analytics** - Your media performance and usage
3. **🎨 Brand Consistency** - Organization-specific media guidelines
4. **👥 Team Management** - Org-level user permissions
5. **💰 Usage Tracking** - Storage and bandwidth per organization

---

## 🛠️ **Implementation Roadmap**

### **Phase 1: Platform Foundation (Week 1-2)**
1. ✅ Create organization-namespaced bucket structure
2. ✅ Update database schema with organization_id
3. ✅ Implement organization-aware API endpoints
4. ✅ Set up RLS policies for multi-tenancy

### **Phase 2: ACT Migration (Week 3)**
1. 🔄 Migrate ACT to platform structure
2. 🧪 Test multi-tenant functionality
3. 📊 Implement organization analytics
4. 🔒 Validate security isolation

### **Phase 3: Platform Ready (Week 4)**
1. 📚 Platform documentation for new customers
2. 🎛️ Admin dashboard for platform management
3. 💰 Usage tracking and billing preparation
4. 🚀 Customer onboarding workflow

---

## 💡 **Strategic Advantages**

### **For ACT (Customer #1):**
- **🥇 First-Mover Advantage** - Shape the platform to your needs
- **📈 Platform Growth Benefits** - Better features as platform scales
- **💰 Potential Revenue Share** - As platform pioneer
- **🌟 Thought Leadership** - Leading the revolutionary approach

### **For Empathy Ledger Platform:**
- **🏗️ Scalable Architecture** - Ready for 1000+ organizations
- **💼 Enterprise Ready** - Multi-tenant from day one
- **📊 Rich Data** - Cross-organization insights and patterns
- **🚀 Market Opportunity** - Platform approach vs single-customer solutions

---

## 🎯 **Next Steps for Strategic Decision**

**Questions to Consider:**
1. **Timeline** - Start with platform approach now, or migrate later?
2. **Naming** - "empathy-*" buckets vs "act-*" approach?
3. **Migration** - Big bang or gradual transition?
4. **Features** - Which platform features matter most to ACT?

**Recommendation:**
**Start with platform architecture now** - ACT gets the benefits of scalable design, and you're ready for customer #2 from day one.

This positions ACT as the **pioneering customer** of a revolutionary platform, not just a single-customer solution! 🚜✨