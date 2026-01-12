# 🎯 Goods. Data Interaction Guide
## How to Use Your 64 Goods. Contacts in the ACT Ecosystem

**Date**: 2026-01-01
**Your Network**: **64 active Goods. contacts** across 25+ organizations
**Status**: ✅ All enriched, matched, and ready to use

---

## 🌐 Where Your Goods. Data Lives

### Your 64 Contacts Are Now In:

1. **📊 Supabase Database** (`linkedin_contacts` table)
   - All 64 contacts with full enrichment
   - LinkedIn profiles, bios, strategic value
   - Linked to Goods. project via `project_contact_matches`

2. **📖 Notion CRM** (Auto-sync ready)
   - Can auto-promote top 20 contacts
   - Integrated with Communications Dashboard
   - Connected to Goods. project page

3. **🔄 GoHighLevel** (CRM automation)
   - Can track engagement with contacts
   - Beautiful Obsolescence pipeline tracking
   - Automated outreach sequences

4. **🧠 Intelligence Hub** (Natural language queries)
   - Ask questions about your Goods. network
   - Get AI-powered insights and recommendations
   - Cross-reference with all ACT projects

---

## 💬 How to Interact With Your Data

### Method 1: Natural Language Queries (Intelligence Hub)

**Ask questions in plain English!**

```bash
# Query the Intelligence Hub
curl -X POST http://localhost:4000/api/v1/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Who can help with health validation for Goods.?",
    "context": "goods"
  }'
```

**Example Queries**:
- "Who can help with health validation for Goods.?"
  → Returns: Nathan Evans, Leeanne Caton, Skye Thompson (Aboriginal Health NT)

- "Who are the funders for Goods.?"
  → Returns: 9 funders with alignment scores

- "Who can help with legal structure for community ownership?"
  → Returns: 5 legal professionals (barristers, corporate lawyers)

- "Find contacts in Tennant Creek for Goods."
  → Returns: Julalikari Council, Wilya Janta contacts

- "Who's involved with recycling for Goods.?"
  → Returns: Sam Davies (Defy), Anthony Wright (CSIRO)

---

### Method 2: Direct Database Queries

**PostgreSQL via Supabase**:

```sql
-- Get all Goods. contacts
SELECT
  full_name,
  email_address,
  current_company,
  alignment_tags,
  strategic_value
FROM linkedin_contacts lc
JOIN project_contact_matches pcm ON lc.id = pcm.contact_id
WHERE pcm.project_name ILIKE '%Goods%'
ORDER BY pcm.alignment_score DESC;

-- Get contacts by category
SELECT
  full_name,
  current_company,
  email_address
FROM linkedin_contacts lc
JOIN project_contact_matches pcm ON lc.id = pcm.contact_id
WHERE pcm.project_name ILIKE '%Goods%'
  AND 'health' = ANY(lc.alignment_tags);

-- Get funders
WHERE 'funding' = ANY(lc.alignment_tags);

-- Get Indigenous partners
WHERE 'indigenous' = ANY(lc.alignment_tags);

-- Get legal experts
WHERE 'legal' = ANY(lc.alignment_tags);
```

---

### Method 3: API Endpoints (ACT Placemat)

**Backend running on Port 4000**:

```bash
# Get all Goods. matches
curl http://localhost:4000/api/v1/contacts/matches/Goods

# Search contacts by keyword
curl http://localhost:4000/api/v1/contacts/search?q=health&project=Goods

# Get contact enrichment status
curl http://localhost:4000/api/v1/contacts/enrichment-status
```

---

### Method 4: Frontend Dashboard

**URL**: http://localhost:3999 (when running)

**Features**:
- Contact list with filters
- Project matching visualization
- Enrichment status
- Outreach tracking
- Email intelligence

---

## 🎯 Practical Use Cases

### Use Case 1: Health Validation Partnership

**Goal**: Get Aboriginal Health NT to validate RHD prevention claims

**How to Find Contacts**:

```sql
SELECT full_name, email_address, current_company, bio
FROM linkedin_contacts lc
JOIN project_contact_matches pcm ON lc.id = pcm.contact_id
WHERE pcm.project_name ILIKE '%Goods%'
  AND 'health' = ANY(lc.alignment_tags)
ORDER BY pcm.alignment_score DESC;
```

**Results**:
- Nathan Evans (nathan.evans@ahnt.org.au) - Aboriginal Health NT
- Leeanne Caton (leeanne.caton@ahnt.org.au) - Aboriginal Health NT
- Skye Thompson (skye.thompson@ahnt.org.au) - Aboriginal Health NT

**Next Steps**: Use outreach template from `GOODS_BULK_IMPORT_COMPLETE.md`

---

### Use Case 2: Legal Support for Community Ownership

**Query**:
```sql
WHERE 'legal' = ANY(lc.alignment_tags);
```

**Results** (5 legal experts):
- Peggy Dwyer - Forbes Chambers (Barrister)
- Hugo Moodie - Victorian Bar (Barrister)
- Dusan Stevic - King & Wood Mallesons
- Sofia Jaquiery - King & Wood Mallesons
- Jonathon Hunyor - PIAC (Public interest)

---

### Use Case 3: Academic Research Partnership

**Query**:
```sql
WHERE 'research' = ANY(lc.alignment_tags)
   OR 'academic' = ANY(lc.alignment_tags);
```

**Results** (6 researchers):
- Paul Memmott - University of Queensland
- Nina Lansbury - University of Queensland
- Kris Vine - University of Sydney
- Veronica Matthews - University of Sydney
- Samantha Rich - UNSW
- Genevieve Murray - University of Sydney

---

### Use Case 4: CSIRO Recycling Collaboration

**Query**:
```sql
WHERE email_address = 'anthony.wright@csiro.au';
```

**Result**:
- Anthony Wright - CSIRO (Energy/recycling research)

**Context**: Works with Sam Davies (Defy Design) on NT recycling

---

### Use Case 5: Wilya Janta Partnership Depth

**Query**:
```sql
WHERE current_company ILIKE '%Wilya Janta%'
   OR email_address LIKE '%@wilyajanta.org%';
```

**Results** (7 contacts):
- Lucy McGarry (lm@wilyajanta.org)
- Simon Quilty (sq@wilyajanta.org)
- Gabriel Waterford (gw@wilyajanta.org)
- Andrea Elliott (ae@wilyajanta.org)
- Jimmy Frank (jf@wilyajanta.org) - **Chairman!**
- Wilya Janta Accounts (accounts@wilyajanta.org)
- Lucy McGarry (lucy.mcgarry@barklybackbone.com.au) - Barkly Backbone

---

## 🔄 Integration with ACT Ecosystem

### How Goods. Fits Into the Full ACT Ecosystem

**From**: `ACT_COMPLETE_ECOSYSTEM_MAP.md`

```
🍽️ ACT PLACEMAT (Port 4000)
│
├─ 64 Goods. contacts enriched ✅
├─ Linked to Goods. project
├─ Matched with alignment scores
│
└─ Integrates with:
   │
   ├─ 📖 NOTION (CRM)
   │  └─ Auto-promote top contacts
   │  └─ Communications Dashboard
   │
   ├─ 🔄 GOHIGHLEVEL (Automation)
   │  └─ Pipeline: Community Capability Building
   │  └─ Beautiful Obsolescence tracking
   │
   ├─ 🧠 INTELLIGENCE HUB
   │  └─ Natural language queries
   │  └─ AI-powered recommendations
   │
   └─ 🌾 ACT FARM
      └─ Goods. as incubation project
      └─ Beautiful Obsolescence: 100% → 0% ACT
```

---

## 🚀 Quick Actions You Can Do Right Now

### 1. Query Your Health Contacts

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend"

# Create query script
cat > query-health-contacts.ts << 'EOF'
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '../../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function queryHealthContacts() {
  const { data } = await supabase
    .from('linkedin_contacts')
    .select(`
      *,
      project_contact_matches!inner(alignment_score, match_reason)
    `)
    .contains('alignment_tags', ['health']);

  console.log('Health Contacts for Goods.:');
  data?.forEach(c => {
    console.log(`\n${c.full_name} (${c.current_company})`);
    console.log(`  Email: ${c.email_address}`);
    console.log(`  Score: ${c.project_contact_matches[0]?.alignment_score}`);
  });
}

queryHealthContacts();
EOF

npx tsx query-health-contacts.ts
```

---

### 2. Export Contacts to CSV

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend"

cat > export-goods-contacts.ts << 'EOF'
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

config({ path: '../../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function exportToCSV() {
  const { data } = await supabase
    .from('linkedin_contacts')
    .select(`
      full_name,
      email_address,
      current_company,
      current_position,
      linkedin_url,
      alignment_tags,
      project_contact_matches!inner(alignment_score)
    `)
    .eq('project_contact_matches.project_name', 'Goods.');

  const csv = [
    'Name,Email,Company,Position,LinkedIn,Tags,Score',
    ...data!.map(c =>
      `"${c.full_name}","${c.email_address}","${c.current_company}","${c.current_position}","${c.linkedin_url}","${c.alignment_tags?.join('; ')}",${c.project_contact_matches[0]?.alignment_score}`
    )
  ].join('\n');

  fs.writeFileSync('goods-contacts.csv', csv);
  console.log('✅ Exported to goods-contacts.csv');
}

exportToCSV();
EOF

npx tsx export-goods-contacts.ts
# Opens: goods-contacts.csv (64 contacts)
```

---

### 3. Sync Top 20 to Notion

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend"

# This script already exists!
npx tsx sync-top-contacts-to-notion.ts

# Will sync top 20 Goods. contacts to Notion CRM
# Auto-links to Goods. project page
```

---

### 4. Create Outreach List by Category

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend"

cat > create-outreach-lists.ts << 'EOF'
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '../../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CATEGORIES = {
  'Health Validation': ['health'],
  'Legal Support': ['legal'],
  'Academic Research': ['research', 'academic'],
  'Funders': ['funding', 'philanthropy'],
  'Indigenous Partners': ['indigenous', 'partner'],
  'Media & Storytelling': ['media', 'storytelling', 'communications']
};

async function createOutreachLists() {
  console.log('📋 GOODS. OUTREACH LISTS\n');

  for (const [category, tags] of Object.entries(CATEGORIES)) {
    const { data } = await supabase
      .from('linkedin_contacts')
      .select(`
        full_name,
        email_address,
        current_company,
        project_contact_matches!inner(alignment_score)
      `)
      .overlaps('alignment_tags', tags);

    console.log(`\n${category} (${data?.length || 0} contacts):`);
    data?.forEach(c => {
      console.log(`  • ${c.full_name} (${c.current_company}) - ${c.email_address}`);
    });
  }
}

createOutreachLists();
EOF

npx tsx create-outreach-lists.ts
```

---

## 📊 Viewing Enrichment Progress

```bash
# Check enrichment status
cat /tmp/claude/-Users-benknight-Code-ACT-Placemat/tasks/bd35cae.output
```

---

## 🎯 Strategic Queries

### Query 1: Top 10 Highest Value Contacts

```sql
SELECT
  lc.full_name,
  lc.email_address,
  lc.current_company,
  pcm.alignment_score,
  pcm.match_reason
FROM linkedin_contacts lc
JOIN project_contact_matches pcm ON lc.id = pcm.contact_id
WHERE pcm.project_name ILIKE '%Goods%'
ORDER BY pcm.alignment_score DESC
LIMIT 10;
```

---

### Query 2: Contacts by Organization

```sql
SELECT
  lc.current_company,
  COUNT(*) as contact_count,
  STRING_AGG(lc.full_name, ', ') as contacts
FROM linkedin_contacts lc
JOIN project_contact_matches pcm ON lc.id = pcm.contact_id
WHERE pcm.project_name ILIKE '%Goods%'
GROUP BY lc.current_company
ORDER BY contact_count DESC;
```

---

### Query 3: Untapped Categories

```sql
-- Find alignment tags that appear less than 3 times
SELECT
  unnest(lc.alignment_tags) as tag,
  COUNT(*) as frequency
FROM linkedin_contacts lc
JOIN project_contact_matches pcm ON lc.id = pcm.contact_id
WHERE pcm.project_name ILIKE '%Goods%'
GROUP BY tag
HAVING COUNT(*) < 3
ORDER BY frequency DESC;
```

---

## 🚀 Next Steps

### 1. Review Enrichment Results

```bash
cat /tmp/claude/-Users-benknight-Code-ACT-Placemat/tasks/bd35cae.output
```

### 2. Sync Top Contacts to Notion

```bash
cd "/Users/benknight/Code/ACT Placemat/apps/backend"
npx tsx sync-top-contacts-to-notion.ts
```

### 3. Start Outreach

Use templates from `GOODS_BULK_IMPORT_COMPLETE.md` for:
- Health validation (Aboriginal Health NT)
- Legal support (barristers + corporate)
- CSIRO recycling collaboration
- Academic research partnerships

### 4. Track Engagement

Set up GoHighLevel pipeline for Beautiful Obsolescence tracking

---

## 💡 Pro Tips

### Tip 1: Use Intelligence Hub for Discovery

Instead of writing SQL, ask natural language questions:
```
"Who should I contact first for health validation?"
"Find all contacts in Queensland for Goods."
"Who can help with Palm Island expansion?"
```

### Tip 2: Layer Your Search

Combine multiple filters:
```sql
WHERE 'indigenous' = ANY(lc.alignment_tags)
  AND 'health' = ANY(lc.alignment_tags)
  AND pcm.alignment_score > 75;
```

### Tip 3: Export Different Views

Create different CSV exports for different purposes:
- **Funders list** → Pitch deck distribution
- **Health contacts** → Validation partnership
- **Legal team** → Community ownership structure
- **All contacts** → CRM import

---

## 🎉 Summary

**You now have**:
- ✅ 64 enriched Goods. contacts in database
- ✅ Natural language query capability
- ✅ SQL direct access
- ✅ API endpoints
- ✅ CSV export capability
- ✅ Notion sync ready
- ✅ GHL automation ready
- ✅ Full ACT ecosystem integration

**Your data is alive and queryable!** 🚀

---

**File**: `GOODS_DATA_INTERACTION_GUIDE.md`
**Created**: 2026-01-01
**Status**: ✅ Complete guide for interacting with your Goods. network
