# Actual Supabase Table Schemas - Empathy Ledger Database

**Database URL:** https://tednluwflfhxyucgwigh.supabase.co
**Last Updated:** 2025-08-14
**Verified by:** Comprehensive table scan

## Overview

This document contains the ACTUAL table schemas as they exist in the Supabase database, verified by querying the live database. Use this as the source of truth for Universal Knowledge Hub and other API integrations.

---

## Table Summary

| Table | Records | Status | Primary Use |
|-------|---------|---------|-------------|
| `stories` | 340 | ✅ Active | Community stories and content |
| `storytellers` | 221 | ✅ Active | Community members with AI analysis |
| `quotes` | ~2000+ | ✅ Active | AI-extracted wisdom quotes |
| `locations` | 21 | ✅ Active | Geographic references |
| `organizations` | 20 | ✅ Active | Partner organizations |
| `projects` | 11 | ✅ Active | Community projects |
| `themes` | 0 | 📝 Empty | Content categorization |
| `impact_stories` | 0 | 📝 Empty | Impact narratives |

---

## 1. stories Table (340 records)

**Primary content table for community stories**

```sql
CREATE TABLE stories (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,                    -- Main story content (markdown)
  summary TEXT,                   -- AI-generated summary (nullable)
  storyteller_id TEXT,            -- FK to storytellers table
  privacy_level TEXT,             -- 'private', 'public', etc.
  themes TEXT[],                  -- Array of theme strings
  media_url TEXT,                 -- Descript or video URL
  transcription TEXT,             -- Full transcript
  video_embed_code TEXT,          -- HTML embed code
  airtable_record_id TEXT,        -- Legacy Airtable ID
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  story_image_url TEXT,           -- Supabase storage URL
  story_image_file TEXT,          -- File reference
  author TEXT,                    -- Story author
  story_category TEXT,            -- 'fellowship_journey', etc.
  fellowship_phase TEXT,          -- 'active_fellowship', etc.
  is_featured BOOLEAN,            -- Featured flag
  is_public BOOLEAN,              -- Public visibility
  fellow_id TEXT                  -- Fellowship reference
);
```

**Key Fields for APIs:**
- `privacy_level != 'private'` for public stories
- `is_public = true` for public visibility
- `themes` contains array of theme strings
- `content` contains the main story text (not `impact_description`)

---

## 2. storytellers Table (221 records)

**Community members with extensive AI analysis (79 fields)**

```sql
CREATE TABLE storytellers (
  id TEXT PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  profile_image_url TEXT,         -- Supabase storage URL
  bio TEXT,                       -- Storyteller biography
  organization_id TEXT,
  project_id TEXT,
  location_id TEXT,
  consent_given BOOLEAN,          -- ✅ CORRECT: Not 'consent_level'
  consent_date TIMESTAMP,
  privacy_preferences JSONB,
  
  -- Contact and identity
  role TEXT,
  phone_number TEXT,
  cultural_background TEXT,
  preferred_pronouns TEXT,
  user_id TEXT,
  airtable_record_id TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  profile_image_file TEXT,
  transcript TEXT,                -- Full interview transcript
  media_url TEXT,
  media_type TEXT,                -- 'interview', etc.
  
  -- AI-Analyzed Fields (79 total)
  vision_expressions TEXT[],      -- Array of vision statements
  mission_statements TEXT[],      -- Mission expressions
  personal_goals TEXT[],          -- Personal aspirations
  aspirations TEXT[],             -- Future aspirations
  skills_discovered JSONB,        -- Discovered skills
  expertise_areas TEXT[],         -- Areas of expertise
  knowledge_shared TEXT[],        -- Knowledge they share
  capabilities_mentioned JSONB,   -- Mentioned capabilities
  community_roles TEXT[],         -- Community roles
  leadership_expressions TEXT[],  -- Leadership statements
  influence_areas TEXT[],         -- Areas of influence
  impact_stories TEXT[],          -- Impact narratives
  achievements_mentioned TEXT[],  -- Achievements
  outcomes_described TEXT[],      -- Described outcomes
  transformation_stories TEXT[],  -- Transformation narratives
  key_insights TEXT[],            -- Key insights
  life_lessons TEXT[],            -- Life lessons
  advice_given TEXT[],            -- Advice offered
  philosophical_expressions TEXT[], -- Philosophy
  support_offered JSONB,          -- Support they offer
  resources_available TEXT[],     -- Available resources
  networks_accessible TEXT[],     -- Network connections
  assistance_types JSONB,         -- Types of assistance
  support_needed JSONB,           -- Support they need
  challenges_faced TEXT[],        -- Challenges
  learning_interests TEXT[],      -- Learning interests
  growth_areas TEXT[],            -- Growth areas
  organizations_mentioned JSONB,  -- Mentioned organizations
  affiliations_expressed TEXT[],  -- Affiliations
  partnerships_described TEXT[],  -- Partnerships
  institutional_connections TEXT[], -- Institutional links
  geographic_connections TEXT[],  -- Geographic connections
  cultural_communities TEXT[],    -- Cultural communities
  language_communities TEXT[],    -- Language communities
  generational_connections TEXT[], -- Generational links
  
  -- Consent and sharing preferences
  story_visibility_level TEXT,    -- 'community', 'public', etc.
  quote_sharing_consent BOOLEAN,  -- Can share quotes
  impact_story_promotion BOOLEAN, -- Can promote impact stories
  wisdom_sharing_level TEXT,      -- Wisdom sharing level
  open_to_mentoring BOOLEAN,      -- Available for mentoring
  available_for_collaboration BOOLEAN, -- Available for collaboration
  seeking_organizational_connections BOOLEAN, -- Seeking connections
  interested_in_peer_support BOOLEAN, -- Interested in peer support
  narrative_ownership_level TEXT, -- Ownership preferences
  attribution_preferences JSONB, -- Attribution settings
  story_use_permissions JSONB,   -- Story usage permissions
  platform_benefit_sharing JSONB, -- Benefit sharing preferences
  generated_themes TEXT[]        -- AI-generated themes
);
```

**Key API Fields:**
- `consent_given = true` for consenting storytellers (NOT `consent_level`)
- All AI-analyzed fields are arrays or JSONB objects
- Rich personality and expertise data available for matching

---

## 3. quotes Table (High Volume)

**AI-extracted wisdom quotes from stories and transcripts**

```sql
CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  story_id TEXT,                  -- Optional story reference
  transcript_id TEXT,             -- Transcript source
  storyteller_id TEXT,            -- Quote author
  quote_text TEXT,                -- The actual quote
  context_before TEXT,            -- Context before quote
  context_after TEXT,             -- Context after quote
  extracted_by_ai BOOLEAN,        -- AI extraction flag
  ai_confidence_score NUMERIC,   -- ✅ CORRECT: Not 'ai_confidence'
  themes JSONB,                   -- Quote themes
  emotional_tone TEXT,            -- Emotional classification
  significance_score NUMERIC,     -- Importance score
  attribution_approved BOOLEAN,   -- Attribution consent
  storyteller_approved BOOLEAN,   -- Storyteller approval
  usage_permissions JSONB,       -- Usage permissions
  usage_count NUMERIC,           -- Usage tracking
  last_used_at TIMESTAMP,        -- Last usage
  quote_type TEXT,               -- 'experience', 'wisdom', etc.
  visibility TEXT,               -- 'public', 'community', etc.
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Key API Fields:**
- `ai_confidence_score >= 0.7` for high-confidence quotes (NOT `ai_confidence`)
- `visibility = 'public'` for public quotes
- Rich context and metadata available

---

## 4. locations Table (21 records)

**Geographic reference data**

```sql
CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  name TEXT,                     -- Location name
  country TEXT,                  -- Country (Australia)
  state_province TEXT,           -- State/province
  city TEXT,                     -- City
  coordinates TEXT,              -- Geographic coordinates
  created_at TIMESTAMP
);
```

---

## 5. organizations Table (20 records)

**Partner organizations and community groups**

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT,                     -- Organization name
  description TEXT,              -- Organization description
  type TEXT,                     -- 'community', 'partner', etc.
  location TEXT,                 -- Location reference
  contact_email TEXT,            -- Contact information
  website_url TEXT,              -- Website
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 6. projects Table (11 records)

**Community projects and initiatives**

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT,                     -- Project name
  description TEXT,              -- Project description
  organization_id TEXT,          -- Parent organization
  location TEXT,                 -- Project location
  status TEXT,                   -- 'active', etc.
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## Common API Patterns

### ✅ Correct Queries

```javascript
// Get consenting storytellers
const { data } = await supabase
  .from('storytellers')
  .select('*')
  .eq('consent_given', true);  // ✅ Correct field name

// Get high-confidence quotes
const { data } = await supabase
  .from('quotes')
  .select('*')
  .gte('ai_confidence_score', 0.9);  // ✅ Correct field name

// Get public stories
const { data } = await supabase
  .from('stories')
  .select('id, title, summary, themes, content')  // ✅ Use 'content', not 'impact_description'
  .neq('privacy_level', 'private')
  .eq('is_public', true);
```

### ❌ Incorrect Queries (Fixed)

```javascript
// WRONG - These columns don't exist:
.eq('consent_level', 'approved')      // ❌ Use 'consent_given' instead
.gte('ai_confidence', 0.9)            // ❌ Use 'ai_confidence_score' instead
.select('impact_description')         // ❌ Use 'content' instead
```

---

## Cultural Safety and Consent

The database implements comprehensive consent tracking:

1. **Storyteller Level:** `consent_given` boolean flag
2. **Story Level:** `privacy_level` and `is_public` controls
3. **Quote Level:** `visibility` and `attribution_approved` controls
4. **Granular Permissions:** JSONB fields for detailed consent preferences

Always respect these consent mechanisms in API queries and ensure proper filtering for public-facing endpoints.

---

## Integration Guidelines

1. **Universal Knowledge Hub:** Use this schema reference for all Supabase queries
2. **Story Amplification:** Respect `privacy_level` and `consent_given` flags
3. **Quote Sharing:** Use `ai_confidence_score >= 0.7` and `visibility = 'public'`
4. **Community Safety:** Always filter by consent before displaying content
5. **Performance:** Use indexes on `consent_given`, `privacy_level`, `ai_confidence_score`

This document provides the definitive reference for the actual database structure and should be used for all future API development.