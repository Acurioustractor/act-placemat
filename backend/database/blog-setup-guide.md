# 🔧 Blog System Setup Guide

## **Step 1: Supabase Connection Setup**

### **1.1 Environment Variables**
Add these to your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database Connection (if using direct connection)
DATABASE_URL=postgresql://user:password@host:port/database
```

### **1.2 Get Your Supabase Credentials**
1. Go to your Supabase project dashboard
2. Navigate to **Settings > API**
3. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

## **Step 2: Simplified Blog Schema (Phase 1)**

Let's start with a simpler approach that doesn't require the existing `stories` table:

```sql
-- Simple Blog Posts Table (standalone for now)
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Core content
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT, -- Simple text content for now
    featured_image_url TEXT,
    
    -- Metadata
    blog_category TEXT DEFAULT 'empathy-ledger',
    tags TEXT[] DEFAULT '{}',
    
    -- Publishing
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,
    featured BOOLEAN DEFAULT false,
    
    -- Attribution
    author_name TEXT NOT NULL DEFAULT 'A Curious Tractor',
    author_role TEXT DEFAULT 'Empathy Ledger Team',
    
    -- Engagement
    view_count INTEGER DEFAULT 0,
    reading_time_minutes INTEGER DEFAULT 5,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Basic indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(featured, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);

-- Enable Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Published blog posts are viewable by everyone" ON blog_posts
    FOR SELECT USING (status = 'published');

CREATE POLICY "Authenticated users can manage blog posts" ON blog_posts
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert your first blog post
INSERT INTO blog_posts (
    title,
    slug,
    excerpt,
    content,
    blog_category,
    tags,
    status,
    published_at,
    featured,
    reading_time_minutes
) VALUES (
    'The Revolution is Community-Led: How A Curious Tractor is Powering Grassroots Change',
    'revolution-community-led-act-powering-change',
    'We''ve discovered something profound in our work with grassroots communities and organisations: the ability to help them transform their knowledge, stories, and programs into living ecosystems.',
    '# The Revolution is Community-Led: How A Curious Tractor is Powering Grassroots Change

*An Empathy Ledger Story by A Curious Tractor*

## The PTO Amplified: From Strategy to Living Ecosystems

We''ve discovered something profound in our work with grassroots communities and organisations: the ability to help them think about their inputs—knowledge, stories, and programs—and transform them into living ecosystems where everyone engaged becomes an active participant in growth.

Through careful listening and authentic relationship-building, we''ve developed patterns that honour people''s stories by giving them database entries that they truly own. This isn''t just data collection—it''s recognition that **their story belongs to them**, they have complete agency over it, yet it syncs to a greater whole that amplifies their voice and impact.

## The Architecture of Empathy: How We Built Our System

### Strategy Backend: The Foundation
We''ve constructed a comprehensive system for A Curious Tractor where we maintain a strategy backend storing all projects and processes. This connects seamlessly to our operations and supports:
- **Community understanding** through authentic relationship tracking
- **Revenue generation** that prioritises community benefit
- **Project work** guided by community wisdom
- **Notion integration** that keeps everything synchronised

### Supabase Stories Database: Community Voice Central
Our Supabase database serves as the heartbeat of community storytelling. Every story from every project we work with flows through here, ensuring we set them up properly using the **Empathy Ledger methodology**—technology that embodies our values of care, respect, and authentic representation.

## The Meta-Circularity Revolution

Here''s what makes this truly revolutionary: **we can replicate this entire system for our partners**. Each community organisation can have their own website dashboard that they update, supported by our content expertise and ongoing relationship.

**This is about aligning communities with tools that support them** to have the resources and practices needed to compete with systems and large organisations that have worked out the logic of growth and maintaining power over resources and relationships.

## The Future We''re Building Together

**The revolution is community-led.** Our role is to provide the tools, technology, and authentic relationships that amplify what communities are already doing brilliantly.

Through the Empathy Ledger, we''re not just changing how stories are told—we''re **changing who gets to tell them, who benefits from them, and how they create lasting transformation**.

**This is how the future becomes community-controlled: one authentic relationship, one empowered story, one supported leader at a time.**

*🚜 A Curious Tractor: Engineering the Community-Led Future*',
    'empathy-ledger',
    '{"community-led", "empathy-ledger", "grassroots", "transformation"}',
    'published',
    NOW(),
    true,
    8
);
```

## **Step 3: Quick Setup Commands**

### **3.1 Using Supabase Dashboard**
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Copy and paste the simplified schema above
4. Click **Run**

### **3.2 Using Command Line (if you have psql)**
```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Then paste the SQL schema
```

## **Step 4: Test the Setup**

### **4.1 Check the Table**
```sql
SELECT title, slug, status, created_at FROM blog_posts;
```

### **4.2 Test the RLS Policy**
```sql
-- This should return your published post
SELECT * FROM blog_posts WHERE status = 'published';
```

## **Step 5: Frontend Integration**

### **5.1 Install Supabase Client**
```bash
cd /Users/benknight/Code/ACT\ Placemat/frontend-new
npm install @supabase/supabase-js
```

### **5.2 Create Supabase Client**
Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### **5.3 Add Environment Variables**
Create `.env.local` in your frontend:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## **Step 6: Simple Blog Service**

Create `src/services/blogService.ts`:

```typescript
import { supabase } from '../lib/supabase'

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  featured_image_url?: string
  blog_category: string
  tags: string[]
  status: string
  published_at: string
  featured: boolean
  author_name: string
  author_role: string
  view_count: number
  reading_time_minutes: number
}

export const blogService = {
  async getPosts(limit = 10, category?: string) {
    let query = supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit)

    if (category && category !== 'all') {
      query = query.eq('blog_category', category)
    }

    const { data, error } = await query
    
    if (error) throw error
    return data as BlogPost[]
  },

  async getPost(slug: string) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error) throw error
    return data as BlogPost
  },

  async incrementViewCount(id: string) {
    const { error } = await supabase.rpc('increment_view_count', { post_id: id })
    if (error) console.error('Error incrementing view count:', error)
  }
}
```

## **Step 7: Add View Count Function**

Run this SQL in Supabase:

```sql
CREATE OR REPLACE FUNCTION increment_view_count(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE blog_posts 
  SET view_count = view_count + 1 
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## **Step 8: Test Everything**

1. **Run the SQL schema** in Supabase
2. **Install frontend dependencies**
3. **Add environment variables**
4. **Test blog service** in your React components

## **🎉 You're Ready!**

Your blog system is now set up with:
- ✅ **Simple database schema** that works immediately
- ✅ **Your first blog post** already inserted
- ✅ **Frontend integration** ready to go
- ✅ **Australian spelling** throughout
- ✅ **Empathy Ledger branding** embedded

## **Next Steps:**
1. Get the basic system working first
2. Add the rich content blocks later (Phase 2)
3. Integrate with your existing Stories architecture
4. Add media upload functionality

**The revolution starts with simple, working technology! 🚜💚**