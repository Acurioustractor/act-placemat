# ACT Dual Database Architecture

## Overview

The ACT platform uses **two Supabase databases** for historical and operational reasons. This document explains the split, how to work with both, and how to avoid common pitfalls.

```
┌─────────────────────────────────────────────────────────────┐
│ DATABASE 1: ACT Intelligence Platform                       │
│ Project ID: tednluwflfhxyucgwigh                            │
│                                                             │
│ Tables:                                                     │
│   - person_identity_map (14,804 contacts - MASTER)          │
│   - linkedin_contacts (normalized LinkedIn)                 │
│   - linkedin_imports (raw LinkedIn exports)                 │
│   - project_contact_matches (contact-project links)         │
│   - exa_enrichment_queue (enrichment pipeline)              │
│   - contact_intelligence (AI-generated insights)            │
│                                                             │
│ Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY          │
├─────────────────────────────────────────────────────────────┤
│ DATABASE 2: ACT Knowledge Hub                               │
│ Project ID: bhwyqqbovcjoefezgfnq                            │
│                                                             │
│ Tables:                                                     │
│   - contact_communications (8,289 email records)            │
│   - ghl_contacts_master (GHL CRM sync)                      │
│   - knowledge_chunks (RAG embeddings)                       │
│                                                             │
│ Env vars: KNOWLEDGE_HUB_SUPABASE_URL, KNOWLEDGE_HUB_SUPABASE_KEY │
└─────────────────────────────────────────────────────────────┘
```

## Why Two Databases?

### Historical Context

1. **Intelligence Platform** (2024) - Built for contact management, LinkedIn imports, and project matching. Houses the core contact data model.

2. **Knowledge Hub** (2025) - Built separately for GoHighLevel CRM sync and email history tracking. Receives webhooks from GHL.

### Why Not Merge?

- **Risk**: Migration could break production integrations
- **Cost**: Both databases are on Supabase free tier
- **Separation**: Different data concerns (contacts vs. communications)
- **Webhooks**: Knowledge Hub receives GHL webhooks directly

## Cross-Database Linking

The databases are linked via **email address**:

```
person_identity_map.email ↔ contact_communications.ghl_contact_id
```

Note: `contact_communications.ghl_contact_id` stores the email address, not a GHL ID (legacy naming).

### Example: Get Contact with Communications

```javascript
import { supabase, supabaseKnowledgeHub } from '../lib/database.js';

// 1. Get contact from Intelligence Platform
const { data: person } = await supabase
  .from('person_identity_map')
  .select('*')
  .eq('person_id', personId)
  .single();

// 2. Get communications from Knowledge Hub
if (person.email) {
  const { data: comms } = await supabaseKnowledgeHub
    .from('contact_communications')
    .select('*')
    .eq('ghl_contact_id', person.email)
    .order('occurred_at', { ascending: false });
}
```

## Configuration

### Required Environment Variables

```bash
# Database 1: Intelligence Platform
SUPABASE_URL=https://tednluwflfhxyucgwigh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Database 2: Knowledge Hub
KNOWLEDGE_HUB_SUPABASE_URL=https://bhwyqqbovcjoefezgfnq.supabase.co
KNOWLEDGE_HUB_SUPABASE_KEY=eyJ...
```

### Fail-Fast Validation

The `database.js` module validates all env vars on startup and exits immediately if any are missing:

```
❌ Missing required database environment variables:
   - KNOWLEDGE_HUB_SUPABASE_KEY

Check apps/backend/.env or environment configuration.
```

## Using the Database Clients

### In Backend Code (ESM)

```javascript
import {
  supabase,           // Intelligence Platform (contacts)
  supabaseKnowledgeHub,  // Knowledge Hub (communications)
  getClientForTable,  // Helper to get correct client
  TABLE_DATABASE_MAP  // Table → database mapping
} from '../lib/database.js';

// Use named exports for clarity
const { data } = await supabase.from('person_identity_map').select('*');
const { data } = await supabaseKnowledgeHub.from('contact_communications').select('*');

// Or use helper
const client = getClientForTable('person_identity_map');  // Returns supabase
const client = getClientForTable('contact_communications'); // Returns supabaseKnowledgeHub
```

### In Scripts (CommonJS)

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/backend/.env' });

// Validate env vars
const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = requiredEnv.filter(key => !process.env[key]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

// Create clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Only create Knowledge Hub client if needed
const knowledgeHub = createClient(
  process.env.KNOWLEDGE_HUB_SUPABASE_URL,
  process.env.KNOWLEDGE_HUB_SUPABASE_KEY
);
```

## Table Reference

### Intelligence Platform Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `person_identity_map` | Master contact list | `person_id`, `email`, `full_name` |
| `linkedin_contacts` | Normalized LinkedIn data | `contact_id`, `linkedin_url` |
| `linkedin_imports` | Raw LinkedIn exports | `id`, `first_name`, `last_name` |
| `project_contact_matches` | Contact-project links | `person_id`, `project_notion_id` |
| `exa_enrichment_queue` | Enrichment pipeline | `person_id`, `status` |
| `contact_intelligence` | AI insights | `person_id`, `insights` |

### Knowledge Hub Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `contact_communications` | Email history | `ghl_contact_id` (email), `occurred_at` |
| `ghl_contacts_master` | GHL CRM mirror | `ghl_id`, `email` |
| `knowledge_chunks` | RAG embeddings | `id`, `content`, `embedding` |

## Common Pitfalls

### 1. Using Wrong Database

```javascript
// WRONG - person_identity_map is in Intelligence Platform, not Knowledge Hub
const { data } = await supabaseKnowledgeHub.from('person_identity_map').select('*');

// CORRECT
const { data } = await supabase.from('person_identity_map').select('*');
```

### 2. Missing Env Vars in Scripts

Always validate env vars at the top of standalone scripts:

```javascript
const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
// Add KNOWLEDGE_HUB_* if script needs both databases
```

### 3. Assuming Single Database

When writing new features, always check if you need both databases:

- Contact data → Intelligence Platform
- Email history → Knowledge Hub
- GHL data → Knowledge Hub

## API Endpoints

The contacts API joins data from both databases transparently:

```
GET /api/v1/contacts/all                      # Intelligence Platform
GET /api/v1/contacts/all/:personId            # Both (contact + communications)
GET /api/v1/contacts/all/:personId/communications  # Knowledge Hub via email lookup
```

## Future Considerations

### Potential Merge

If both databases were merged:

1. **Pros**: Simpler architecture, real JOINs, single connection
2. **Cons**: Migration risk, webhook reconfiguration, backup complexity
3. **Effort**: Medium (would need to migrate tables and update all clients)

### Recommendation

Keep the split for now. The current architecture works, and the application-level joins are efficient for the data volumes we have.

## Related Files

- `apps/backend/core/src/lib/database.js` - Client configuration
- `apps/backend/.env.example` - Environment template
- `apps/backend/core/src/api/v1/contacts.js` - API using both databases
- `scripts/*.cjs` - Standalone scripts needing database access
