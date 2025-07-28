# Database Analysis Scripts

This folder contains analysis scripts used to understand the existing Empathy Ledger database structure.

## Scripts

### `inspect-supabase-schema.js`
- **Purpose**: Discovers all tables in the Supabase database
- **Usage**: `node inspect-supabase-schema.js`
- **Output**: Lists all tables with record counts and basic structure

### `detailed-schema-analysis.js`  
- **Purpose**: Provides detailed analysis of key tables and relationships
- **Usage**: `node detailed-schema-analysis.js`
- **Output**: Deep dive into stories, projects, quotes, and themes tables

## Key Findings

From the analysis, we discovered:
- **52 stories** with rich multimedia content
- **332 AI-extracted quotes** with confidence scoring
- **25 structured themes** with categorization
- **20 organizations** in network
- **Advanced AI pipeline** already operational
- **Professional consent workflows** ready for enhancement

These findings informed the decision to build on the existing Empathy Ledger foundation rather than create a new system.

## Running Analysis

Ensure your `.env` file has the correct Supabase credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

Then run either script from the project root:
```bash
cd "/Users/benknight/Code/ACT Placemat"
node Docs/Analysis/inspect-supabase-schema.js
node Docs/Analysis/detailed-schema-analysis.js
```