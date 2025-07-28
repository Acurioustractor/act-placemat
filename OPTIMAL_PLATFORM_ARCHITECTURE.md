# 🚀 Optimal Empathy Ledger Platform Architecture

## 🎯 **Design Principles**
1. **Zero Manual Folder Management** - Organizations auto-created on first upload
2. **Database-Driven Isolation** - Security through RLS, not folder permissions  
3. **Single Efficient Bucket Structure** - Minimal buckets, maximum automation
4. **API-Managed Organization Context** - No manual setup for new customers
5. **Trial-Ready with ACT** - Start platform-correct from day one

---

## 🏗️ **Optimal Architecture: Database-Driven Multi-Tenancy**

### **Single Bucket Strategy with Organization Prefixes**

```bash
empathy-ledger-media/
├── {org-id}/photos/community/
├── {org-id}/photos/projects/  
├── {org-id}/videos/stories/
├── {org-id}/videos/interviews/
├── {org-id}/thumbnails/
├── {org-id}/documents/
└── {org-id}/profile-images/

# Examples:
# act-123/photos/community/image456.jpg
# justice-hub-456/videos/stories/video789.mp4
# future-org-789/photos/projects/image123.jpg
```

### **Benefits:**
- ✅ **Single bucket** to manage, not 3×N buckets
- ✅ **Auto-creation** - First upload creates org structure automatically
- ✅ **Database isolation** - RLS policies provide security boundaries
- ✅ **Infinite scale** - No manual setup for new organizations
- ✅ **Cost efficient** - Single bucket pricing, bulk operations

---

## 🗄️ **Database Schema: Organization-First Design**

```sql
-- Organizations table with auto-generated paths
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,           -- 'act', 'justice-hub'
    name TEXT NOT NULL,
    storage_prefix TEXT UNIQUE NOT NULL, -- Auto-generated: 'act-{short-uuid}'
    
    -- Platform management
    subscription_tier TEXT DEFAULT 'starter',
    storage_quota_gb INTEGER DEFAULT 10,
    storage_used_gb NUMERIC DEFAULT 0,
    
    -- Auto-management
    first_upload_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced media items with organization context
CREATE TABLE IF NOT EXISTS media_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Storage paths (auto-generated)
    bucket_name TEXT DEFAULT 'empathy-ledger-media',
    storage_path TEXT NOT NULL,     -- 'act-123/photos/community/image456.jpg'  
    file_url TEXT NOT NULL,         -- Full public URL
    
    -- Media metadata
    file_type TEXT NOT NULL CHECK (file_type IN ('photo', 'video', 'document')),
    file_size BIGINT,
    title TEXT,
    description TEXT,
    
    -- Organization-aware content categorization
    content_category TEXT DEFAULT 'community', -- community, projects, stories, impact
    content_subcategory TEXT,                   -- Dynamic based on org needs
    
    -- AI & Manual Tags (organization-scoped)
    ai_tags TEXT[],
    manual_tags TEXT[],
    ai_confidence NUMERIC DEFAULT 0,
    
    -- Rights & Attribution
    photographer TEXT,
    consent_verified BOOLEAN DEFAULT FALSE,
    community_approved BOOLEAN DEFAULT FALSE,
    attribution_required BOOLEAN DEFAULT TRUE,
    
    -- Auto-managed timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media collections (organization-scoped)
CREATE TABLE IF NOT EXISTS media_collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'gallery',
    
    -- Auto-curated collections
    auto_generated BOOLEAN DEFAULT FALSE,
    generation_criteria JSONB, -- For AI-curated collections
    
    featured BOOLEAN DEFAULT FALSE,
    public_visible BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced collection_media with auto-sorting
CREATE TABLE IF NOT EXISTS collection_media (
    collection_id UUID REFERENCES media_collections(id) ON DELETE CASCADE,
    media_id UUID REFERENCES media_items(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    caption TEXT,
    auto_added BOOLEAN DEFAULT FALSE, -- Added by AI curation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (collection_id, media_id)
);
```

---

## 🔧 **Auto-Managing API Architecture**

### **Organization Auto-Discovery & Creation**

```javascript
// Middleware: Auto-resolve organization from request
const resolveOrganization = async (req, res, next) => {
    // Try multiple methods to identify organization
    const orgIdentifier = 
        req.params.org ||                    // /api/act/media/upload
        req.headers['x-organization'] ||     // Header-based
        req.query.org ||                     // Query parameter
        'act';                               // Default for trial
    
    // Get or create organization
    let { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', orgIdentifier)
        .single();
    
    // Auto-create organization on first API call
    if (!org) {
        const { data: newOrg } = await supabase
            .from('organizations')
            .insert({
                slug: orgIdentifier,
                name: orgIdentifier.charAt(0).toUpperCase() + orgIdentifier.slice(1),
                storage_prefix: `${orgIdentifier}-${generateShortId()}`
            })
            .select()
            .single();
        org = newOrg;
    }
    
    req.organization = org;
    next();
};

// Auto-generating storage paths
const generateStoragePath = (org, file, category = 'community') => {
    const fileId = uuidv4();
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${fileId}.${fileExt}`;
    
    // Determine media type and subfolder
    const mediaType = file.mimetype.startsWith('image/') ? 'photos' : 
                     file.mimetype.startsWith('video/') ? 'videos' : 'documents';
    
    return {
        bucket: 'empathy-ledger-media',
        path: `${org.storage_prefix}/${mediaType}/${category}/${fileName}`,
        publicUrl: `empathy-ledger-media/${org.storage_prefix}/${mediaType}/${category}/${fileName}`
    };
};

// Smart upload endpoint with auto-organization
app.post('/api/:org/media/upload', resolveOrganization, upload.single('file'), async (req, res) => {
    const { organization } = req;
    const file = req.file;
    const category = req.body.category || 'community';
    
    // Auto-generate storage path
    const storagePath = generateStoragePath(organization, file, category);
    
    // Upload (auto-creates folder structure)
    const { data: uploadData, error } = await supabase.storage
        .from(storagePath.bucket)
        .upload(storagePath.path, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600'
        });
    
    if (error) throw error;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from(storagePath.bucket)
        .getPublicUrl(storagePath.path);
    
    // Auto-save to database with organization context
    const { data: mediaItem } = await supabase
        .from('media_items')
        .insert({
            organization_id: organization.id,
            storage_path: storagePath.path,
            file_url: publicUrl,
            file_type: file.mimetype.startsWith('image/') ? 'photo' : 
                      file.mimetype.startsWith('video/') ? 'video' : 'document',
            content_category: category,
            title: req.body.title || file.originalname,
            description: req.body.description,
            manual_tags: req.body.tags ? req.body.tags.split(',') : [],
            file_size: file.size
        })
        .select()
        .single();
    
    // Update organization last activity
    await supabase
        .from('organizations')
        .update({ 
            last_activity_at: new Date().toISOString(),
            first_upload_at: organization.first_upload_at || new Date().toISOString()
        })
        .eq('id', organization.id);
    
    res.json({ success: true, media: mediaItem });
});
```

---

## 🔒 **Bulletproof Security with RLS**

```sql
-- Organization context for all requests
CREATE OR REPLACE FUNCTION get_current_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_organization_id', true)::UUID,
        (SELECT id FROM organizations WHERE slug = 'act' LIMIT 1) -- Default for trial
    );
END;
$$ LANGUAGE plpgsql;

-- RLS policies for complete isolation
CREATE POLICY "Organizations see only their own media" ON media_items
    FOR ALL USING (organization_id = get_current_organization_id());

CREATE POLICY "Organizations see only their own collections" ON media_collections
    FOR ALL USING (organization_id = get_current_organization_id());

-- Storage bucket policy (organization prefix isolation)
CREATE POLICY "Organization storage isolation" ON storage.objects
    FOR ALL USING (
        bucket_id = 'empathy-ledger-media' 
        AND (storage.foldername(name))[1] = (
            SELECT storage_prefix FROM organizations 
            WHERE id = get_current_organization_id()
        )
    );
```

---

## 🚀 **ACT Trial Implementation**

### **Step 1: Create ACT Organization**
```sql
-- Insert ACT as first organization
INSERT INTO organizations (slug, name, storage_prefix) VALUES 
('act', 'A Curious Tractor', 'act-' || substr(gen_random_uuid()::text, 1, 8));
```

### **Step 2: Migrate ACT's Existing Content (Optional)**
```javascript
// Migration script to move ACT's existing 185+ images
const migrateACTContent = async () => {
    const actOrg = await getOrganization('act');
    
    // Map existing content to new structure
    const migrations = [
        { 
            from: 'media/profile-images/',
            to: `${actOrg.storage_prefix}/profile-images/`,
            category: 'profiles'
        },
        {
            from: 'media/story-images/', 
            to: `${actOrg.storage_prefix}/photos/stories/`,
            category: 'stories'
        }
    ];
    
    // Copy files and update database records
    for (const migration of migrations) {
        await copyAndUpdateFiles(migration);
    }
};
```

### **Step 3: Test Organization Auto-Creation**
```bash
# Upload as ACT (existing org)
curl -X POST http://localhost:3001/api/act/media/upload \
  -F "file=@test-image.jpg" \
  -F "category=community"

# Upload as new org (auto-creates)
curl -X POST http://localhost:3001/api/justice-hub/media/upload \
  -F "file=@test-image.jpg" \
  -F "category=campaigns"
```

---

## 📊 **Platform Features This Enables**

### **Zero-Management Scaling:**
- ✅ New organization? First API call creates everything
- ✅ No manual folder setup, ever
- ✅ No bucket creation for new customers
- ✅ Automatic security isolation

### **Advanced Platform Features:**
- 📈 **Cross-org analytics** - "Video uploads increase donations by 40%"
- 🎯 **Smart suggestions** - "Organizations like yours use these tags"
- 🤖 **Auto-curation** - "Featured community photos" collection auto-generated
- 💡 **Best practices** - Template categories from successful orgs

### **Enterprise Ready:**
- 🔒 **Complete isolation** - Database + storage + API level
- 📊 **Usage tracking** - Per-org storage, bandwidth, API calls
- 💰 **Billing ready** - Track usage for subscription tiers
- 🛡️ **Audit trails** - All actions logged with organization context

---

## 🎯 **Trial Success Metrics with ACT**

### **Week 1: Foundation**
- [ ] ACT organization auto-created
- [ ] Upload photos to `act-{id}/photos/community/`
- [ ] Upload videos to `act-{id}/videos/stories/`
- [ ] Auto-generated thumbnails in `act-{id}/thumbnails/`

### **Week 2: Multi-Tenant Test**
- [ ] Create second test organization via API
- [ ] Verify complete data isolation
- [ ] Test cross-org analytics queries
- [ ] Validate security boundaries

### **Week 3: Platform Features**
- [ ] Auto-curated collections working
- [ ] Usage tracking per organization
- [ ] API performance with organization context
- [ ] Migration path for existing content

---

## 💡 **The Revolutionary Outcome**

**Single Architecture Decision** → **Platform-Scale Impact**

- 🏗️ **ACT gets** world-class multi-tenant architecture from day one
- 🚀 **Platform gets** enterprise-ready foundation for infinite scale  
- 💰 **Business gets** subscription-ready platform, not consulting project
- 🌍 **Sector gets** replicable model for authentic impact storytelling

**This isn't just media management - it's platform architecture that scales to change how the entire sector shows impact.**

Ready to trial this with ACT and get it right from the start? 🚜✨