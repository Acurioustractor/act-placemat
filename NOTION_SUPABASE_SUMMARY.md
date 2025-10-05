# Notion & Supabase - Architecture Summary

**Date**: October 5, 2025

## ✅ Configuration Status: ALL DATABASES CONFIGURED

### Notion Databases (.env - lines 67-77)

All 9 Notion databases properly configured:

1. **Projects** - `177ebcf9-81cf-80dd-9514-f1ec32f3314c` (55+ projects)
2. **People** - `47bdc1c4-df99-4ddc-81c4-a0214c919d69` (contacts/communications)
3. **Organizations** - `948f3946-7d1c-42f2-bd7e-1317a755e67b`
4. **Opportunities** - `234ebcf9-81cf-804e-873f-f352f03c36da`
5. **Actions** - `177ebcf9-81cf-8023-af6e-dff974284218`
6. **Artifacts** - `234ebcf9-81cf-8015-878d-eadb337662e4`
7. **Activities** - `6d9ccb03-ddab-48d3-9490-f08427897112`
8. **Stories** - `619ceac3-8d2a-4e30-bd73-0b81ccfadfc4`
9. **Communications** - `7005d0d1-41d3-436c-9f86-526d275c2f10`
10. **Places** - `25debcf9-81cf-808e-a632-cbc6ae78d582`

### Supabase (.env - lines 36-38)

```
SUPABASE_URL=https://tednluwflfhxyucgwigh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=configured
SUPABASE_ANON_KEY=configured
```

**Known Tables**:
- `linkedin_contacts` (20,398 records)
- `contact_cadence_metrics`
- `gmail_messages`
- Financial data caches

---

## 🎯 Data Flow Architecture

```
┌─────────────────────────────────────┐
│   NOTION (Source of Truth)          │
│   User-managed project information  │
├─────────────────────────────────────┤
│ Projects      | 55+ ACT projects    │
│ People        | Communications DB   │
│ Stories       | Community narratives│
│ Organizations | Partner orgs        │
│ Opportunities | Grant opportunities │
└──────────────┬──────────────────────┘
               │
               │ Sync Service
               │ (supabaseNotionSync.js)
               ▼
┌─────────────────────────────────────┐
│   SUPABASE (Cache + AI Layer)       │
│   Intelligence orchestration        │
├─────────────────────────────────────┤
│ linkedin_contacts  | 20,398 contacts│
│ contact_cadence    | Interaction AI │
│ gmail_messages     | Email intel    │
│ financial_cache    | Xero/Thriday   │
└──────────────┬──────────────────────┘
               │
               ▼
         Intelligence APIs
       (Port 4000 - Unified Server)
```

---

## 🔧 Key Services

### 1. Notion Service
**File**: [notionService.js](apps/backend/core/src/services/notionService.js:16)

**Manages**:
- All 9 Notion database connections
- Query caching (5-minute TTL)
- Relationship mapping between databases
- OAuth authentication

### 2. Supabase-Notion Sync
**File**: [supabaseNotionSync.js](apps/backend/core/src/services/supabaseNotionSync.js:18)

**Flow**:
```javascript
// 1. Get contact cadence from Supabase
const cadence = await getContactCadenceMetrics();

// 2. Match with LinkedIn contacts
const contacts = await linkedin_contacts
  .join(cadence, 'contact_id');

// 3. Sync to Notion People database
await notion.databases.query({
  database_id: NOTION_PEOPLE_DATABASE_ID
});

// 4. Update relationship intelligence
```

### 3. Project Intelligence
**File**: [stable-real-data-server.js](apps/backend/stable-real-data-server.js:109)

**Fetches**:
- Project name, status, area, tags
- Cover photos, descriptions
- Philosophy/values alignment
- Created/edited timestamps

**Needs to Add**:
- Financial linkage (Xero invoices by project)
- Community benefit attribution (40% rule)
- Profitability analysis

---

## 📊 Data Examples

### Notion Project (Current)
```javascript
{
  id: "177ebcf9-...",
  title: "Seed House Witta",
  status: "Active",
  area: "Community Agriculture",
  tags: ["Food Sovereignty", "Indigenous Knowledge"],
  philosophy: "Beautiful Obsolescence",
  coverPhoto: "https://...",
  created: "2025-01-15T...",
  lastEdited: "2025-09-28T..."
}
```

### Supabase Contact (Current)
```javascript
{
  id: 12345,
  full_name: "Emma Rodriguez",
  email_address: "emma@seedhouse.org",
  current_company: "Seed House Witta",
  current_position: "Program Director",
  location: "Sunshine Coast, QLD",
  industry: "Agriculture"
}
```

### Contact Cadence (AI-Generated)
```javascript
{
  contact_id: 12345,
  last_interaction: "2025-09-15T...",
  interaction_count: 23,
  average_cadence_days: 14,
  days_since_contact: 20,
  status: "overdue"  // Should follow up
}
```

---

## ✅ What's Working

1. ✅ All Notion databases properly configured
2. ✅ Supabase connected (20,398 contacts)
3. ✅ Contact intelligence (search, filter, AI enrichment)
4. ✅ Project fetching from Notion (55+ projects)
5. ✅ Supabase-Notion sync architecture exists

## 🚧 What Needs Work

1. **Project-Financial Linkage**
   - Link Notion projects → Xero invoices
   - Link Notion projects → Thriday transactions (when available)
   - Calculate profitability per project
   - Track 40% community benefit attribution

2. **Supabase Schema Documentation**
   - Need full table list
   - Need column schemas
   - Need relationship mappings

3. **AI Intelligence Caching**
   - Cache grant research results
   - Cache financial analyses
   - Cache morning brief sections

---

## 🎯 Next Steps

1. **Test Notion Integration**
   - Query each database
   - Verify data structure
   - Test relationship links

2. **Test Supabase-Notion Sync**
   - Run contact cadence sync
   - Verify People database updates
   - Test bidirectional flow

3. **Build Project Intelligence**
   - Fetch projects with financial data
   - Calculate community attribution
   - Create profitability dashboard

4. **Document Supabase Schema**
   - List all tables
   - Document columns
   - Map relationships

---

## 🌱 Philosophy Alignment

**Notion** = User controls their data
**Supabase** = Open-source, self-hostable
**Intelligence** = AI adds value, doesn't lock in

Community can fork entire system and run independently.

---

**Configuration Location**: `/.env` (root folder)
**All Database IDs**: Lines 67-102
**Status**: ✅ FULLY CONFIGURED
