# 🎯 Goods. Strategic Enrichment Plan - Complete

**Date**: 2026-01-01
**Total Contacts**: 64
**Current Enrichment**: 21.9% (14/64 enriched with LinkedIn)
**Enrichment Running**: Background process enriching remaining 50 contacts

---

## 📊 Complete Network Breakdown

### Summary by Category

| Category | Contacts | Enriched | Avg Score | Strategic Priority |
|----------|----------|----------|-----------|-------------------|
| **Indigenous Partners** | 13 | 3 | 85 | ⭐⭐⭐⭐⭐ CRITICAL |
| **Funders** | 10 | 6 | 75 | ⭐⭐⭐⭐⭐ CRITICAL |
| **Academic Research** | 6 | 0 | 73 | ⭐⭐⭐⭐ HIGH |
| **Legal Experts** | 5 | 0 | 60 | ⭐⭐⭐⭐⭐ CRITICAL |
| **Health Sector** | 4 | 0 | 84 | ⭐⭐⭐⭐⭐ CRITICAL |
| **Product/Manufacturing** | 4 | 3 | 80 | ⭐⭐⭐⭐⭐ CRITICAL |
| **Media/Storytelling** | 4 | 0 | 66 | ⭐⭐⭐ MEDIUM |
| **Architects** | 2 | 0 | 60 | ⭐⭐ LOW |
| **Housing Advocacy** | 1 | 0 | 60 | ⭐⭐ LOW |
| **Community Support** | 1 | 0 | 80 | ⭐⭐⭐ MEDIUM |
| **Other Allies** | 14 | 2 | 63 | ⭐⭐⭐ MEDIUM |

**TOTAL**: 64 contacts across 11 categories

---

## 🏆 Top 10 Highest-Value Contacts

| Rank | Name | Company | Score | Category | Enriched |
|------|------|---------|-------|----------|----------|
| 1 | **Gabriel Waterford** | Wilya Janta | 95 | Indigenous | No |
| 2 | **Jimmy Frank** | Wilya Janta | 95 | Indigenous | No |
| 3 | **Andrea Elliott** | Wilya Janta | 95 | Indigenous | No |
| 4 | **Wilya Janta Accounts** | Wilya Janta | 95 | Indigenous | No |
| 5 | **Lucy McGarry** | Barkly Backbone | 95 | Indigenous | No |
| 6 | **Delaicee Power** | Julalikari Council | 90 | Customer | ✅ Yes |
| 7 | **CEO** | Julalikari Council | 85 | Customer | No |
| 8 | **Daniel Pittman** | Zinus AU | 85 | Supplier | ✅ Yes |
| 9 | **Sally Grimsley-Ballard** | Snow Foundation | 85 | Funder | ✅ Yes |
| 10 | **Kristy Bloomfield** | Oonchiumpa | 85 | Media | No |

**Key Insight**: Wilya Janta team dominates top 5 (all score 95) - **critical Indigenous partnership**

---

## 🎯 Strategic Enrichment Priorities

### Priority 1: WILYA JANTA TEAM (5 contacts @ 95 points)

**Who**: Gabriel Waterford, Jimmy Frank, Andrea Elliott, Accounts, Lucy McGarry

**Why CRITICAL**: Core Indigenous partner for Beautiful Obsolescence

**Current Status**: 0/5 enriched (URGENT!)

**Enrichment Needs**:
- Community leadership roles (Jimmy Frank appears to be chairman)
- Decision-making authority
- Cultural expertise
- Manufacturing involvement with Goods.
- Vision for community ownership

**Immediate Action**:
```bash
# Query Wilya Janta team
PGPASSWORD='vixwek-Hafsaz-0ganxa' psql "postgresql://postgres.tednluwflfhxyucgwigh:vixwek-Hafsaz-0ganxa@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" -c "
SELECT full_name, email_address, current_position, linkedin_url, bio
FROM linkedin_contacts
WHERE current_company = 'Wilya Janta'
ORDER BY full_name;"
```

**Outreach Strategy**: Deep engagement meeting to discuss community ownership transition

---

### Priority 2: HEALTH VALIDATION (4 contacts @ 84 avg)

**Who**: Nathan Evans, Leeanne Caton, Skye Thompson (Aboriginal Health NT) + Nina Lansbury (UQ)

**Why CRITICAL**: RHD prevention claims need health sector validation

**Current Status**: 0/4 enriched (URGENT!)

**Enrichment Needs**:
- Publications on Indigenous health / RHD
- Current health projects in NT communities
- Research partnerships
- Validation methodology

**Immediate Action**:
```bash
# Query health contacts
PGPASSWORD='vixwek-Hafsaz-0ganxa' psql "postgresql://postgres.tednluwflfhxyucgwigh:vixwek-Hafsaz-0ganxa@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" -c "
SELECT full_name, email_address, current_company, linkedin_url
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
)
AND 'health' = ANY(lc.alignment_tags);"
```

**Outreach Strategy**: Email Aboriginal Health NT team to propose health impact research partnership

---

### Priority 3: LEGAL STRUCTURE (5 contacts @ 60 avg)

**Who**: Peggy Dwyer, Hugo Moodie, Dusan Stevic, Sofia Jaquiery, Jonathon Hunyor

**Why CRITICAL**: Need legal framework for community ownership of manufacturing and IP

**Current Status**: 0/5 enriched (URGENT!)

**Enrichment Needs**:
- Social enterprise law experience
- Indigenous governance expertise
- Community ownership case studies
- Pro bono availability (especially PIAC - Jonathon Hunyor)

**Immediate Action**:
```bash
# Query legal contacts
PGPASSWORD='vixwek-Hafsaz-0ganxa' psql "postgresql://postgres.tednluwflfhxyucgwigh:vixwek-Hafsaz-0ganxa@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" -c "
SELECT full_name, email_address, current_company, linkedin_url
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
)
AND 'legal' = ANY(lc.alignment_tags)
ORDER BY current_company;"
```

**Outreach Strategy**: Contact Jonathon Hunyor (PIAC) for pro bono legal support on community ownership structure

---

### Priority 4: FUNDERS (10 contacts @ 75 avg)

**Who**: Snow Foundation (2), Ian Potter, Dusseldorp, Bryan Foundation (2), Bryan Family, The Funding Forum, Sub11, Our Shed (2)

**Why CRITICAL**: Multi-year sustainability funding needed

**Current Status**: 6/10 enriched (60% - GOOD!)

**Still Need Enrichment** (4 contacts):
- Georgina Byron (Snow Foundation)
- Teya Dusseldorp (Dusseldorp Forum)
- Alberto Furlan (Ian Potter Foundation)
- Katie Norman (The Funding Forum)

**Enrichment Needs**:
- Indigenous funding priorities
- NT funding history
- Typical grant amounts
- Multi-year funding capacity
- Application deadlines

**Immediate Action**:
```bash
# Query funders needing enrichment
PGPASSWORD='vixwek-Hafsaz-0ganxa' psql "postgresql://postgres.tednluwflfhxyucgwigh:vixwek-Hafsaz-0ganxa@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" -c "
SELECT full_name, email_address, current_company, linkedin_url
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
)
AND ('funding' = ANY(lc.alignment_tags) OR 'philanthropy' = ANY(lc.alignment_tags))
AND linkedin_url IS NULL
ORDER BY current_company;"
```

**Outreach Strategy**: Apply for multi-year funding from Snow Foundation, Ian Potter, and Dusseldorp

---

### Priority 5: PRODUCT/MANUFACTURING (4 contacts @ 80 avg)

**Who**: Sam Davies (Defy), Todd Sidery (Defy), Anthony Wright (CSIRO), Daniel Pittman (Zinus), Adrian (Carla)

**Why CRITICAL**: Core operational partners

**Current Status**: 3/4 enriched (75% - GOOD!)

**Still Need Enrichment**: 1 contact (likely Adrian from Carla Furnishers)

**Immediate Action**: Continue enrichment, maintain strong relationships with Defy and CSIRO

---

### Priority 6: ACADEMIC RESEARCH (6 contacts @ 73 avg)

**Who**: Paul Memmott (UQ), Nina Lansbury (UQ), Kris Vine (Sydney), Veronica Matthews (Sydney), Samantha Rich (UNSW), Genevieve Murray (Sydney), Anthony Wright (CSIRO)

**Why HIGH**: Academic validation strengthens funding applications

**Current Status**: 0/6 enriched (URGENT!)

**Enrichment Needs**:
- Research publications on Indigenous housing/health
- Current research projects
- Grant funding expertise
- Evaluation methodology

**Immediate Action**:
```bash
# Query academic contacts
PGPASSWORD='vixwek-Hafsaz-0ganxa' psql "postgresql://postgres.tednluwflfhxyucgwigh:vixwek-Hafsaz-0ganxa@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" -c "
SELECT full_name, email_address, current_company, linkedin_url
FROM linkedin_contacts lc
WHERE EXISTS (
  SELECT 1 FROM project_contact_matches pcm
  WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%'
)
AND ('research' = ANY(lc.alignment_tags) OR 'academic' = ANY(lc.alignment_tags))
ORDER BY current_company;"
```

**Outreach Strategy**: Reach out to Paul Memmott (UQ Indigenous housing expert) for research partnership

---

## 📋 Complete Enrichment Checklist

### CRITICAL PATH (Must enrich ASAP)

- [ ] **Wilya Janta Team** (5 contacts)
  - [ ] Gabriel Waterford
  - [ ] Jimmy Frank
  - [ ] Andrea Elliott
  - [ ] Wilya Janta Accounts
  - [ ] Lucy McGarry (Barkly Backbone, but Wilya Janta partner)

- [ ] **Health Validation** (4 contacts)
  - [ ] Nathan Evans (Aboriginal Health NT)
  - [ ] Leeanne Caton (Aboriginal Health NT)
  - [ ] Skye Thompson (Aboriginal Health NT)
  - [ ] Nina Lansbury (University of Queensland)

- [ ] **Legal Experts** (5 contacts)
  - [ ] Peggy Dwyer (Forbes Chambers)
  - [ ] Hugo Moodie (Victorian Bar)
  - [ ] Dusan Stevic (King & Wood Mallesons)
  - [ ] Sofia Jaquiery (King & Wood Mallesons)
  - [ ] Jonathon Hunyor (PIAC) - **Priority for pro bono**

- [ ] **Funders** (4 need enrichment)
  - [ ] Georgina Byron (Snow Foundation)
  - [ ] Teya Dusseldorp (Dusseldorp Forum)
  - [ ] Alberto Furlan (Ian Potter Foundation)
  - [ ] Katie Norman (The Funding Forum)

**Total Critical Path**: 18 contacts

---

### HIGH PRIORITY

- [ ] **Academic Researchers** (6 contacts)
  - [ ] Paul Memmott (UQ)
  - [ ] Nina Lansbury (UQ) - also in health
  - [ ] Kris Vine (Sydney)
  - [ ] Veronica Matthews (Sydney)
  - [ ] Samantha Rich (UNSW)
  - [ ] Genevieve Murray (Sydney)

- [ ] **Indigenous Expansion** (4 contacts)
  - [ ] Sharon Lovett (PICC - Palm Island)
  - [ ] Narelle Gleeson-Henaway (PICC)
  - [ ] Rachel Atkinson (PICC)
  - [ ] CEO (Julalikari Council)

**Total High Priority**: 10 contacts

---

### MEDIUM PRIORITY

- [ ] **Media/Storytelling** (4 contacts)
  - [ ] Kristy Bloomfield (Oonchiumpa)
  - [ ] Michelle Bates (Time & Place)
  - [ ] Alycia Gawthorne
  - [ ] Courtney Collins

- [ ] **Other Indigenous Partners** (4 contacts)
  - [ ] Col Johnston (Original Power)
  - [ ] Lauren Mellor (Original Power)
  - [ ] Lucy McGarry (lm@wilyajanta.org)
  - [ ] Other community partners

**Total Medium Priority**: 8 contacts

---

### LOW PRIORITY (Enrich as capacity allows)

- [ ] Architects (2): Cary Duffield, Phil Harris (Troppo)
- [ ] Housing (1): Simon Robinson, Steve Mintern (NT Shelter)
- [ ] Community (1): Our Shed contacts
- [ ] Other Allies (14)

**Total Low Priority**: 24 contacts

---

## 🚀 Recommended Actions by Timeline

### TODAY

1. **Check Enrichment Progress**
```bash
tail -f /tmp/goods-enrichment-output.txt
# OR
cat /tmp/claude/-Users-benknight-Code-ACT-Placemat/tasks/bd81319.output
```

2. **Run All Strategic Queries**
```bash
cd "/Users/benknight/Code/ACT Placemat"

# Health
PGPASSWORD='vixwek-Hafsaz-0ganxa' psql "postgresql://postgres.tednluwflfhxyucgwigh:vixwek-Hafsaz-0ganxa@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" -c "SELECT full_name, email_address, current_company FROM linkedin_contacts lc WHERE EXISTS (SELECT 1 FROM project_contact_matches pcm WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%') AND 'health' = ANY(lc.alignment_tags);"

# Legal
PGPASSWORD='vixwek-Hafsaz-0ganxa' psql "postgresql://postgres.tednluwflfhxyucgwigh:vixwek-Hafsaz-0ganxa@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" -c "SELECT full_name, email_address, current_company FROM linkedin_contacts lc WHERE EXISTS (SELECT 1 FROM project_contact_matches pcm WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%') AND 'legal' = ANY(lc.alignment_tags);"

# Funders
PGPASSWORD='vixwek-Hafsaz-0ganxa' psql "postgresql://postgres.tednluwflfhxyucgwigh:vixwek-Hafsaz-0ganxa@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" -c "SELECT full_name, email_address, current_company FROM linkedin_contacts lc WHERE EXISTS (SELECT 1 FROM project_contact_matches pcm WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%') AND ('funding' = ANY(lc.alignment_tags) OR 'philanthropy' = ANY(lc.alignment_tags));"

# Wilya Janta
PGPASSWORD='vixwek-Hafsaz-0ganxa' psql "postgresql://postgres.tednluwflfhxyucgwigh:vixwek-Hafsaz-0ganxa@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" -c "SELECT full_name, email_address, current_position FROM linkedin_contacts WHERE current_company = 'Wilya Janta';"
```

3. **Export Critical Contacts to CSV**
```bash
# Export health contacts
PGPASSWORD='vixwek-Hafsaz-0ganxa' psql "postgresql://postgres.tednluwflfhxyucgwigh:vixwek-Hafsaz-0ganxa@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" -c "COPY (SELECT full_name, email_address, current_company FROM linkedin_contacts lc WHERE EXISTS (SELECT 1 FROM project_contact_matches pcm WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%') AND 'health' = ANY(lc.alignment_tags)) TO STDOUT WITH CSV HEADER" > goods-health-contacts.csv
```

---

### THIS WEEK

1. **Health Validation Outreach**
   - Email Aboriginal Health NT team (Nathan, Leeanne, Skye)
   - Propose health impact research partnership
   - Offer to share community feedback data

2. **Legal Structure Consultation**
   - Contact Jonathon Hunyor (PIAC) for pro bono community ownership legal support
   - Schedule consultation on legal structure

3. **Funder Applications**
   - Prepare multi-year funding applications for:
     - Snow Foundation (existing relationship - Sally)
     - Ian Potter Foundation (new - Alberto)
     - Dusseldorp Forum (new - Teya)

4. **Wilya Janta Deep Dive**
   - Schedule meeting with Simon Quilty, Gabriel, Jimmy, Andrea
   - Discuss Beautiful Obsolescence transition plan
   - Map community ownership pathway

---

### NEXT WEEK

1. **Academic Research Partnership**
   - Reach out to Paul Memmott (UQ) - Indigenous housing expert
   - Propose evaluation partnership
   - Discuss publication opportunities

2. **Community Expansion Planning**
   - Engage PICC team (Palm Island)
   - Plan Tennant Creek expansion with Julalikari

3. **Media & Storytelling**
   - Engage Kristy Bloomfield (Oonchiumpa) for Indigenous-led storytelling
   - Develop Beautiful Obsolescence narrative

---

## 📊 Success Metrics

### Enrichment Targets

| Timeframe | Target | Current | Gap |
|-----------|--------|---------|-----|
| **Today** | 25% enriched | 22% | 3% |
| **This Week** | 50% enriched | 22% | 28% |
| **Next Week** | 75% enriched | 22% | 53% |
| **End of Month** | 100% enriched | 22% | 78% |

### Engagement Targets

| Timeframe | Target | Actions |
|-----------|--------|---------|
| **This Week** | 5 outreach emails sent | Health (3), Legal (1), Wilya Janta (1) |
| **Next Week** | 10 meetings scheduled | Follow-ups from outreach |
| **End of Month** | 3 partnerships formalized | Health, Legal, Academic |

---

## 🎯 Quick Reference: All Queries

### Export All Contacts by Category

```bash
cd "/Users/benknight/Code/ACT Placemat"

# Health
PGPASSWORD='vixwek-Hafsaz-0ganxa' psql "postgresql://postgres.tednluwflfhxyucgwigh:vixwek-Hafsaz-0ganxa@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" -c "COPY (SELECT full_name, email_address, current_company, linkedin_url FROM linkedin_contacts lc WHERE EXISTS (SELECT 1 FROM project_contact_matches pcm WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%') AND 'health' = ANY(lc.alignment_tags)) TO STDOUT WITH CSV HEADER" > goods-health.csv

# Legal
PGPASSWORD='vixwek-Hafsaz-0ganxa' psql "postgresql://postgres.tednluwflfhxyucgwigh:vixwek-Hafsaz-0ganxa@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" -c "COPY (SELECT full_name, email_address, current_company, linkedin_url FROM linkedin_contacts lc WHERE EXISTS (SELECT 1 FROM project_contact_matches pcm WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%') AND 'legal' = ANY(lc.alignment_tags)) TO STDOUT WITH CSV HEADER" > goods-legal.csv

# Funders
PGPASSWORD='vixwek-Hafsaz-0ganxa' psql "postgresql://postgres.tednluwflfhxyucgwigh:vixwek-Hafsaz-0ganxa@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" -c "COPY (SELECT full_name, email_address, current_company, linkedin_url FROM linkedin_contacts lc WHERE EXISTS (SELECT 1 FROM project_contact_matches pcm WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%') AND ('funding' = ANY(lc.alignment_tags) OR 'philanthropy' = ANY(lc.alignment_tags))) TO STDOUT WITH CSV HEADER" > goods-funders.csv

# Indigenous Partners
PGPASSWORD='vixwek-Hafsaz-0ganxa' psql "postgresql://postgres.tednluwflfhxyucgwigh:vixwek-Hafsaz-0ganxa@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" -c "COPY (SELECT full_name, email_address, current_company, linkedin_url FROM linkedin_contacts lc WHERE EXISTS (SELECT 1 FROM project_contact_matches pcm WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%') AND 'indigenous' = ANY(lc.alignment_tags)) TO STDOUT WITH CSV HEADER" > goods-indigenous.csv

# Academic
PGPASSWORD='vixwek-Hafsaz-0ganxa' psql "postgresql://postgres.tednluwflfhxyucgwigh:vixwek-Hafsaz-0ganxa@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" -c "COPY (SELECT full_name, email_address, current_company, linkedin_url FROM linkedin_contacts lc WHERE EXISTS (SELECT 1 FROM project_contact_matches pcm WHERE pcm.contact_id = lc.id AND pcm.project_name ILIKE '%Goods%') AND ('research' = ANY(lc.alignment_tags) OR 'academic' = ANY(lc.alignment_tags))) TO STDOUT WITH CSV HEADER" > goods-academic.csv

# ALL contacts
PGPASSWORD='vixwek-Hafsaz-0ganxa' psql "postgresql://postgres.tednluwflfhxyucgwigh:vixwek-Hafsaz-0ganxa@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres" -c "COPY (SELECT lc.full_name, lc.email_address, lc.current_company, lc.linkedin_url, pcm.alignment_score FROM linkedin_contacts lc JOIN project_contact_matches pcm ON lc.id = pcm.contact_id WHERE pcm.project_name ILIKE '%Goods%' ORDER BY pcm.alignment_score DESC) TO STDOUT WITH CSV HEADER" > goods-all-contacts.csv
```

---

## 🎉 Summary

**You now have**:
- ✅ **64 Goods. contacts** across 11 strategic categories
- ✅ **22% enriched** (14/64) with LinkedIn profiles
- ✅ **Background enrichment running** for remaining 50 contacts
- ✅ **Complete query guide** for every category
- ✅ **Export scripts** for CSV generation
- ✅ **Prioritized outreach plan** (18 critical path contacts)
- ✅ **Timeline** for engagement (this week, next week, end of month)

**Next Steps**:
1. Check enrichment progress
2. Run all strategic queries
3. Export critical contacts
4. Begin outreach to health, legal, and Wilya Janta

**Your Goods. network is production-ready for Beautiful Obsolescence!** 🚀

---

**File**: `GOODS_STRATEGIC_ENRICHMENT_PLAN.md`
**Created**: 2026-01-01
**Status**: Complete strategic plan for enriching and engaging all 64 Goods. contacts
