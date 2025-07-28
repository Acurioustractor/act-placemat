# Automated Storyteller-Project Alignment Strategy

## Theme-Based Matching

### 1. Location Alignment
```sql
-- Match storytellers to projects in same state/location
INSERT INTO storyteller_project_links (storyteller_id, project_id, relevance_score, connection_type, tag_reason, tagged_by)
SELECT 
  s.id,
  p.id,
  6,
  'community_member',
  CONCAT('Geographic alignment: ', s.location, ' matches project area'),
  'auto-location'
FROM storytellers s
JOIN projects p ON (s.location ILIKE CONCAT('%', p.state, '%') OR p.state ILIKE CONCAT('%', s.location, '%'))
WHERE s.location IS NOT NULL AND p.state IS NOT NULL;
```

### 2. Community Organization Alignment
```sql
-- Match based on community affiliation
INSERT INTO storyteller_project_links (storyteller_id, project_id, relevance_score, connection_type, tag_reason, tagged_by)
SELECT 
  s.id,
  p.id,
  8,
  'beneficiary',
  CONCAT('Community alignment: ', s.community_affiliation, ' connected to project themes'),
  'auto-community'
FROM storytellers s
JOIN projects p ON (
  p.description ILIKE CONCAT('%', s.community_affiliation, '%') OR
  p.name ILIKE CONCAT('%', s.community_affiliation, '%')
)
WHERE s.community_affiliation IS NOT NULL;
```

### 3. Thematic Alignment (Housing Example)
```sql
-- Housing-focused storytellers to housing projects
INSERT INTO storyteller_project_links (storyteller_id, project_id, relevance_score, connection_type, tag_reason, tagged_by)
SELECT 
  s.id,
  p.id,
  7,
  'stakeholder',
  'Thematic alignment: Housing experience matches project focus',
  'auto-theme-housing'
FROM storytellers s
JOIN projects p ON (
  p.description ILIKE '%housing%' OR 
  p.description ILIKE '%accommodation%' OR
  p.name ILIKE '%housing%'
)
WHERE (
  s.bio ILIKE '%housing%' OR 
  s.bio ILIKE '%houseless%' OR
  s.bio ILIKE '%accommodation%' OR
  s.lived_experiences @> '["housing_insecurity"]'
);
```

### 4. Youth Justice Alignment
```sql
-- Youth workers/experience to youth justice projects
INSERT INTO storyteller_project_links (storyteller_id, project_id, relevance_score, connection_type, tag_reason, tagged_by)
SELECT 
  s.id,
  p.id,
  8,
  'partner',
  'Youth expertise alignment: Experience working with youth matches project goals',
  'auto-theme-youth'
FROM storytellers s
JOIN projects p ON (
  p.description ILIKE '%youth%' OR 
  p.description ILIKE '%justice%' OR
  p.core_values = 'Truth-Telling'
)
WHERE (
  s.bio ILIKE '%youth%' OR 
  s.bio ILIKE '%young people%' OR
  s.storyteller_type = 'youth_worker' OR
  s.expertise_areas @> '["youth_work"]'
);
```

## Natural Alignment Patterns

### High-Impact Connections (Relevance 8-10)
- **Traditional Owners** → Projects in their country
- **Community Leaders** → Projects affecting their community
- **Subject Matter Experts** → Projects in their expertise area
- **Service Providers** → Projects they directly serve

### Medium-Impact Connections (Relevance 5-7)
- **Geographic proximity** → Regional projects
- **Shared themes** → Similar issue areas
- **Community networks** → Overlapping organizations

### Automated Rules to Implement

1. **Elder Priority**: Any storyteller with `storyteller_type = 'elder'` gets high relevance to projects in their location
2. **Organization Match**: Direct matches between `community_affiliation` and project descriptions
3. **Location Cascade**: State → Region → National project alignment
4. **Theme Keywords**: Bio/expertise matching project descriptions
5. **Cultural Protocols**: Indigenous storytellers prioritized for cultural projects

## Implementation Strategy

1. Start with **high-confidence** matches (location + organization)
2. Add **thematic** matches with manual review
3. Use **machine learning** on successful manual connections to improve automation
4. Always allow **manual override** and refinement