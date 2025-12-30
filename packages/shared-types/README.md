# @act-placemat/shared-types

Shared TypeScript types for ACT Placemat monorepo.

## Structure

```
src/
├── index.ts              # Main export (all types)
├── api.ts                # Placemat-specific API types
└── year-in-review.ts     # Year in Review types (synced from ACT Website)
```

## Type Ownership

### Placemat-Owned Types (`api.ts`)
- Contact types
- Project types
- Opportunity types
- Intelligence types
- Backend-specific types

These types are defined and maintained in this repository.

### Consumer-Driven Types (`year-in-review.ts`)

**SOURCE OF TRUTH:** ACT Main Website - `/src/types/shared/year-in-review.ts`

**DO NOT MODIFY** these types directly in this file. They are copied from ACT Main Website.

**Why?** The consumer (ACT Website) defines the contract. We implement what they expect.

## Usage

```typescript
// Import all types
import { Project, TimelineEntry, ReviewProject } from '@act-placemat/shared-types';

// Or import from specific modules
import { Project } from '@act-placemat/shared-types/api';
import { TimelineEntry } from '@act-placemat/shared-types/year-in-review';
```

## Syncing Types

When ACT Main Website updates year-in-review types:

```bash
npm run sync-types
```

This copies the latest types from ACT Main Website to this package.

## Best Practices

✅ **DO:**
- Use these types in both frontend and backend
- Add new Placemat-specific types to `api.ts`
- Run sync-types when ACT Website updates shared types
- Add runtime validation at API boundaries

❌ **DON'T:**
- Modify year-in-review.ts directly
- Create duplicate type definitions
- Use `any` types - always define proper interfaces
- Skip runtime validation (TypeScript is compile-time only)

## Versioning

This package uses semantic versioning:
- **Major**: Breaking changes to Placemat types
- **Minor**: New Placemat types added
- **Patch**: Bug fixes, synced types from ACT Website

Note: Year in Review types are versioned by ACT Main Website, not this package.
