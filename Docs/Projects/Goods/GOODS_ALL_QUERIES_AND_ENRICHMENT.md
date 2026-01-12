# 🎯 Goods. - Complete Query & Enrichment Guide

**Date**: 2026-01-01
**Total Contacts**: 64 active Goods. relationships
**Enrichment Status**: Running (50 contacts being enriched)

---

## ✅ COMPLETED QUERY: Health Contacts

```sql
SELECT full_name, email_address, current_company
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id
  AND pcm.project_name ILIKE '%Goods%'
)
AND 'health' = ANY(lc.alignment_tags);
```

**Results** (4 contacts):
- Nathan Evans (Aboriginal Health NT)
- Leeanne Caton (Aboriginal Health NT)
- Skye Thompson (Aboriginal Health NT)
- Nina Lansbury (University of Queensland)

**Strategic Use**: RHD prevention validation, health impact measurement

---

## 📊 ALL OTHER STRATEGIC QUERIES TO RUN

### 1. ⚖️ Legal Experts (Community Ownership Structure)

```sql
SELECT full_name, email_address, current_company, linkedin_url, bio
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
)
AND 'legal' = ANY(lc.alignment_tags)
ORDER BY current_company, full_name;
```

**Expected**: 5 contacts (Peggy Dwyer, Hugo Moodie, Dusan Stevic, Sofia Jaquiery, Jonathon Hunyor)

**Enrichment Focus**:
- Social enterprise law experience
- Indigenous governance expertise
- Community ownership case studies
- Pro bono work history

**Use Case**: Design legal structure for community ownership of Goods. manufacturing and IP

---

### 2. 🎓 Academic Researchers (Evaluation & Publications)

```sql
SELECT full_name, email_address, current_company, linkedin_url, bio
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
)
AND ('research' = ANY(lc.alignment_tags) OR 'academic' = ANY(lc.alignment_tags))
ORDER BY current_company, full_name;
```

**Expected**: 7 contacts (Paul Memmott, Nina Lansbury, Kris Vine, Veronica Matthews, Samantha Rich, Genevieve Murray, Anthony Wright - CSIRO)

**Enrichment Focus**:
- Publications on Indigenous housing/health
- Current research projects
- Grant funding expertise
- NT community research experience

**Use Case**: Academic evaluation, research publications, evidence-based advocacy

---

### 3. 💰 Funders (Financial Sustainability)

```sql
SELECT full_name, email_address, current_company, linkedin_url, bio
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
)
AND ('funding' = ANY(lc.alignment_tags) OR 'philanthropy' = ANY(lc.alignment_tags))
ORDER BY current_company, full_name;
```

**Expected**: 10 contacts (Snow Foundation x2, Ian Potter, Dusseldorp, Bryan Foundation x2, etc.)

**Enrichment Focus**:
- Indigenous funding priorities
- NT funding history
- Typical grant amounts
- Multi-year funding capacity

**Use Case**: Multi-year sustainability funding, expansion funding, community ownership transition

---

### 4. 🌏 Indigenous Partners (Core Relationships)

```sql
SELECT
  full_name,
  email_address,
  current_company,
  linkedin_url,
  alignment_tags,
  bio
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
)
AND 'indigenous' = ANY(lc.alignment_tags)
ORDER BY
  CASE current_company
    WHEN 'Wilya Janta' THEN 1
    WHEN 'Palm Island Community Company (PICC)' THEN 2
    WHEN 'Julalikari Council' THEN 3
    ELSE 4
  END,
  full_name;
```

**Expected**: 18 contacts across:
- Wilya Janta (6)
- PICC (3)
- Julalikari (1)
- Aboriginal Health NT (3)
- Others (5)

**Enrichment Focus**:
- Community leadership roles
- Cultural expertise
- Decision-making authority
- Success stories/testimonials

**Use Case**: Core manufacturing partnerships, community expansion, Indigenous governance, co-design

---

### 5. 📰 Media & Storytelling (Public Narrative)

```sql
SELECT full_name, email_address, current_company, linkedin_url, bio
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
)
AND ('media' = ANY(lc.alignment_tags) OR 'storytelling' = ANY(lc.alignment_tags))
ORDER BY full_name;
```

**Expected**: 4 contacts (Kristy Bloomfield, Michelle Bates, Alycia Gawthorne, Courtney Collins)

**Enrichment Focus**:
- Indigenous storytelling portfolio
- Social impact communication
- Media contacts
- NT media experience

**Use Case**: Brand storytelling, fundraising narratives, media coverage, Beautiful Obsolescence narrative

---

### 6. 🏭 Product & Manufacturing (Operations)

```sql
SELECT full_name, email_address, current_company, linkedin_url, bio
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
)
AND ('product' = ANY(lc.alignment_tags)
     OR 'manufacturing' = ANY(lc.alignment_tags)
     OR 'recycling' = ANY(lc.alignment_tags))
ORDER BY current_company, full_name;
```

**Expected**: 5 contacts (Sam Davies, Todd Sidery, Anthony Wright, Daniel Pittman, Adrian)

**Enrichment Focus**:
- Product design portfolio
- Manufacturing expertise
- Recycling technology
- Remote operations experience

**Use Case**: Product design, manufacturing optimization, recycling/circular economy, quality control

---

### 7. 👥 Customers (Revenue & Expansion)

```sql
SELECT full_name, email_address, current_company, linkedin_url, bio
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
)
AND (current_company ILIKE '%julalikari%'
     OR current_company ILIKE '%picc%'
     OR current_company ILIKE '%council%')
ORDER BY current_company, full_name;
```

**Expected**: 4 contacts
- Julalikari Council (1): Delaicee Power
- PICC (3): Sharon, Narelle, Rachel

**Enrichment Focus**:
- Procurement authority
- Community needs assessment
- Feedback on products
- Expansion opportunities

**Use Case**: Customer retention, product improvement, testimonials, expansion planning

---

### 8. 🏗️ Strategic Allies (Ecosystem Support)

```sql
-- Architects
SELECT full_name, email_address, current_company, linkedin_url
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
)
AND current_company ILIKE '%troppo%';

-- Housing Advocacy
SELECT full_name, email_address, current_company, linkedin_url
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
)
AND current_company ILIKE '%shelter%';

-- Energy/Climate
SELECT full_name, email_address, current_company, linkedin_url
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
)
AND current_company ILIKE '%original power%';

-- Community Support
SELECT full_name, email_address, current_company, linkedin_url
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
)
AND current_company ILIKE '%our shed%';
```

**Expected**: 9 contacts (Troppo x2, NT Shelter x2, Original Power x2, Our Shed x3)

**Use Case**: Design consultation, housing advocacy, energy solutions, community support

---

## 🎯 MASTER QUERY: All Contacts Categorized

```sql
WITH goods_contacts AS (
  SELECT
    lc.*,
    pcm.alignment_score,
    CASE
      WHEN 'health' = ANY(lc.alignment_tags) THEN 'Health'
      WHEN 'legal' = ANY(lc.alignment_tags) THEN 'Legal'
      WHEN 'research' = ANY(lc.alignment_tags) OR 'academic' = ANY(lc.alignment_tags) THEN 'Academic'
      WHEN 'funding' = ANY(lc.alignment_tags) OR 'philanthropy' = ANY(lc.alignment_tags) THEN 'Funders'
      WHEN 'media' = ANY(lc.alignment_tags) OR 'storytelling' = ANY(lc.alignment_tags) THEN 'Media'
      WHEN 'product' = ANY(lc.alignment_tags) OR 'manufacturing' = ANY(lc.alignment_tags) OR 'recycling' = ANY(lc.alignment_tags) THEN 'Product/Mfg'
      WHEN 'indigenous' = ANY(lc.alignment_tags) THEN 'Indigenous'
      WHEN lc.current_company ILIKE '%troppo%' THEN 'Architects'
      WHEN lc.current_company ILIKE '%shelter%' THEN 'Housing'
      WHEN lc.current_company ILIKE '%original power%' THEN 'Energy'
      WHEN lc.current_company ILIKE '%our shed%' THEN 'Community'
      ELSE 'Other'
    END as category
  FROM linkedin_contacts lc
  JOIN project_contact_matches pcm ON lc.id = pcm.contact_id
  WHERE pcm.project_name ILIKE '%Goods%'
)
SELECT
  category,
  COUNT(*) as total_contacts,
  COUNT(linkedin_url) FILTER (WHERE linkedin_url IS NOT NULL) as enriched,
  ROUND(AVG(alignment_score)) as avg_score,
  STRING_AGG(DISTINCT full_name, ', ' ORDER BY full_name) as names
FROM goods_contacts
GROUP BY category
ORDER BY
  CASE category
    WHEN 'Health' THEN 1
    WHEN 'Legal' THEN 2
    WHEN 'Academic' THEN 3
    WHEN 'Funders' THEN 4
    WHEN 'Indigenous' THEN 5
    WHEN 'Product/Mfg' THEN 6
    WHEN 'Media' THEN 7
    WHEN 'Architects' THEN 8
    WHEN 'Housing' THEN 9
    WHEN 'Energy' THEN 10
    WHEN 'Community' THEN 11
    ELSE 12
  END;
```

---

## 📈 EXPORT QUERIES

### Export All Contacts to CSV

```sql
COPY (
  SELECT
    lc.full_name,
    lc.email_address,
    lc.current_company,
    lc.current_position,
    lc.linkedin_url,
    ARRAY_TO_STRING(lc.alignment_tags, '; ') as tags,
    pcm.alignment_score,
    pcm.match_reason
  FROM linkedin_contacts lc
  JOIN project_contact_matches pcm ON lc.id = pcm.contact_id
  WHERE pcm.project_name ILIKE '%Goods%'
  ORDER BY pcm.alignment_score DESC
) TO '/tmp/goods-all-contacts.csv' WITH CSV HEADER;
```

### Export by Category

```sql
-- Health Contacts
COPY (
  SELECT full_name, email_address, current_company, linkedin_url
  FROM linkedin_contacts lc
  WHERE EXISTS (
    SELECT 1 FROM project_contact_matches pcm
    WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
  )
  AND 'health' = ANY(lc.alignment_tags)
) TO '/tmp/goods-health-contacts.csv' WITH CSV HEADER;

-- Legal Contacts
COPY (
  SELECT full_name, email_address, current_company, linkedin_url
  FROM linkedin_contacts lc
  WHERE EXISTS (
    SELECT 1 FROM project_contact_matches pcm
    WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
  )
  AND 'legal' = ANY(lc.alignment_tags)
) TO '/tmp/goods-legal-contacts.csv' WITH CSV HEADER;

-- Funders
COPY (
  SELECT full_name, email_address, current_company, linkedin_url
  FROM linkedin_contacts lc
  WHERE EXISTS (
    SELECT 1 FROM project_contact_matches pcm
    WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
  )
  AND ('funding' = ANY(lc.alignment_tags) OR 'philanthropy' = ANY(lc.alignment_tags))
) TO '/tmp/goods-funders.csv' WITH CSV HEADER;
```

---

## 🔍 ENRICHMENT PROGRESS TRACKING

### Check Current Enrichment Status

```sql
SELECT
  COUNT(*) as total_contacts,
  COUNT(linkedin_url) FILTER (WHERE linkedin_url IS NOT NULL) as enriched,
  COUNT(linkedin_url) FILTER (WHERE linkedin_url IS NULL) as need_enrichment,
  ROUND(100.0 * COUNT(linkedin_url) FILTER (WHERE linkedin_url IS NOT NULL) / COUNT(*), 1) as pct_enriched
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id
  AND pcm.project_name ILIKE '%Goods%'
);
```

### Contacts Still Needing Enrichment

```sql
SELECT
  full_name,
  email_address,
  current_company,
  alignment_tags
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id
  AND pcm.project_name ILIKE '%Goods%'
)
AND linkedin_url IS NULL
ORDER BY
  CASE
    WHEN 'health' = ANY(alignment_tags) THEN 1
    WHEN 'legal' = ANY(alignment_tags) THEN 2
    WHEN 'funding' = ANY(alignment_tags) OR 'philanthropy' = ANY(alignment_tags) THEN 3
    ELSE 4
  END,
  full_name;
```

---

## 🚀 PRIORITY ENRICHMENT AREAS

### 1. **Health Validation** (4 contacts) - CRITICAL

**Why**: Need health sector endorsement for RHD prevention claims

**Enrichment Needs**:
- Publications on Indigenous health
- RHD research background
- Community health program experience
- NT health sector connections

**Action**: Run health contacts query, research each person's background, prepare outreach

---

### 2. **Legal Structure** (5 contacts) - CRITICAL

**Why**: Need legal framework for community ownership

**Enrichment Needs**:
- Social enterprise law experience
- Indigenous governance expertise
- Community ownership models
- Pro bono availability

**Action**: Identify pro bono lawyers (Jonathon Hunyor - PIAC likely candidate)

---

### 3. **Core Funders** (10 contacts) - CRITICAL

**Why**: Financial sustainability requires multi-year funding

**Enrichment Needs**:
- Funding priorities and amounts
- Application processes
- Decision-makers
- Success stories from their portfolios

**Action**: Research each foundation's Indigenous funding history

---

### 4. **Wilya Janta Team** (6 contacts) - CRITICAL

**Why**: Core Indigenous partner for Beautiful Obsolescence

**Enrichment Needs**:
- Community leadership roles
- Decision-making authority
- Cultural expertise
- Manufacturing involvement

**Action**: Deep engagement planning for community ownership transition

---

### 5. **Academic Researchers** (7 contacts) - HIGH

**Why**: Academic validation strengthens funding applications

**Enrichment Needs**:
- Research publications
- Current projects
- Grant funding expertise
- Evaluation methodology

**Action**: Identify research partnership opportunities

---

## 📊 INTERACTION METHODS

### Method 1: Direct SQL (PostgreSQL)

```bash
cd "/Users/benknight/Code/ACT Placemat"

PGPASSWORD='vixwek-Hafsaz-0ganxa' psql \
  "postgresql://postgres.tednluwflfhxyucgwigh:vixwek-Hafsaz-0ganxa@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" \
  -c "SELECT full_name, email_address, current_company FROM linkedin_contacts lc WHERE EXISTS (SELECT 1 FROM project_contact_matches pcm WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%') AND 'health' = ANY(lc.alignment_tags);"
```

### Method 2: Natural Language (Intelligence Hub)

```bash
curl -X POST http://localhost:4000/api/v1/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Who can help with health validation for Goods.?", "context": "goods"}'
```

### Method 3: TypeScript/Node.js Scripts

```typescript
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '../../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getHealthContacts() {
  const { data, error } = await supabase
    .from('linkedin_contacts')
    .select('full_name, email_address, current_company, linkedin_url, bio')
    .contains('alignment_tags', ['health'])
    .in('id', (
      await supabase
        .from('project_contact_matches')
        .select('contact_id')
        .ilike('project_name', '%Goods%')
    ).data.map(m => m.contact_id));

  console.log(data);
}

getHealthContacts();
```

---

## 🎯 NEXT STEPS

### Today
1. ✅ Run health contacts query (DONE)
2. ⏭️ Run legal contacts query
3. ⏭️ Run funders query
4. ⏭️ Run Indigenous partners query
5. ⏭️ Check enrichment progress

### This Week
1. ⏭️ Complete all category queries
2. ⏭️ Export priority contacts to CSV
3. ⏭️ Research each contact's background
4. ⏭️ Prepare outreach strategy

### Next Week
1. ⏭️ Begin outreach to health validation contacts
2. ⏭️ Engage pro bono legal support
3. ⏭️ Apply for multi-year funding
4. ⏭️ Deep dive with Wilya Janta on Beautiful Obsolescence

---

**File**: `GOODS_ALL_QUERIES_AND_ENRICHMENT.md`
**Created**: 2026-01-01
**Status**: Complete guide to querying and enriching all 64 Goods. contacts
