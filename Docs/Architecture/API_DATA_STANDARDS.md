# API Data Standards & Architecture
**Clean Build Foundation for Next Phase**

## 🚨 CRITICAL ISSUES DISCOVERED

### Property Mapping Inconsistencies
- **Backend API Returns**: `relatedActions`, `relatedOpportunities`, `relatedOrganisations`
- **Frontend Expected**: `related_actions`, `related_opportunities`, `related_organisations`
- **Result**: Data shows as zeros/null despite API having correct values

### Service Layer Problems
- `projectService.getAllProjects()` fails silently, causing JavaScript errors
- Direct API calls work: `fetch('/api/dashboard/projects')`
- Transformation layer is broken

## ✅ WORKING API ENDPOINTS

### Dashboard Projects
```
GET /api/dashboard/projects
Response: Array of project objects with full relationship data

Example Goods Project:
{
  "name": "Goods.",
  "title": "Goods.",
  "description": "Community-led initiative...",
  "status": "Active 🔥",
  "relatedActions": [array of 25 action IDs],
  "relatedOpportunities": [array of 5 opportunity IDs],
  "relatedOrganisations": [array of 2 org IDs],
  "relatedResources": [array of 2 resource IDs],
  "relatedArtifacts": [array of 1 artifact ID],
  "relatedConversations": [],
  "relatedPlaces": [array of 1 place ID],
  "relatedFields": [array of 1 field ID],
  "coreValues": null,
  "actualIncoming": 0,
  "potentialIncoming": 0
}
```

## 🛠️ STANDARDIZED API PATTERN

### 1. Direct API Calls (WORKING)
```typescript
const response = await fetch('/api/dashboard/projects');
const projects = await response.json();
const goodsProject = projects.find(p => p.name === 'Goods.');
```

### 2. Connection Counts
```typescript
const connectionCounts = {
  actions: goodsProject.relatedActions?.length || 0,
  opportunities: goodsProject.relatedOpportunities?.length || 0,
  organizations: goodsProject.relatedOrganisations?.length || 0,
  resources: goodsProject.relatedResources?.length || 0,
  artifacts: goodsProject.relatedArtifacts?.length || 0,
  conversations: goodsProject.relatedConversations?.length || 0,
  places: goodsProject.relatedPlaces?.length || 0,
  fields: goodsProject.relatedFields?.length || 0
};
```

## 🏗️ NEXT PHASE ARCHITECTURE

### 1. Consistent Property Names
- **DECISION**: Use API response property names directly (`relatedActions`)
- **NO MORE**: Transformation to `related_actions` format
- **UPDATE**: All frontend components to expect API format

### 2. Service Layer Replacement
```typescript
// REMOVE: Broken projectService.getAllProjects()
// REPLACE: Direct API utilities

class ApiClient {
  async getProjects(): Promise<Project[]> {
    const response = await fetch('/api/dashboard/projects');
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }
  
  async getProject(name: string): Promise<Project | null> {
    const projects = await this.getProjects();
    return projects.find(p => p.name === name || p.title === name) || null;
  }
}
```

### 3. TypeScript Interfaces
```typescript
interface Project {
  id: string;
  name: string;
  title: string;
  description: string;
  status: string;
  relatedActions: string[];
  relatedOpportunities: string[];
  relatedOrganisations: string[];
  relatedResources: string[];
  relatedArtifacts: string[];
  relatedConversations: string[];
  relatedPlaces: string[];
  relatedFields: string[];
  coreValues: string | null;
  actualIncoming: number;
  potentialIncoming: number;
}
```

## 🧹 CLEANUP REQUIRED

### Remove These Files
- `/src/pages/TestPage.tsx` (temporary debugging)
- `/src/pages/SimpleGoodsTest.tsx` (temporary debugging)
- All debug logging in `EnhancedGoodsDemoPage.tsx`

### Fix These Components
- `EnhancedGoodsCard.tsx` - Remove fallback values, use real data
- `projectService.ts` - Replace with direct API calls
- All components expecting `related_actions` format

### Update These Routes
- Remove `/test` and `/simple-goods` routes
- Clean up App.tsx imports

## 🎯 IMPLEMENTATION PLAN

1. **Create new ApiClient service** (clean, simple)
2. **Update all TypeScript interfaces** (match API exactly)
3. **Replace projectService calls** (use ApiClient)
4. **Remove all debug/temporary code**
5. **Test all connection counts display correctly**
6. **Document final API patterns**

## 🚀 SUCCESS METRICS

- ✅ Connection counts show real values (25, 5, 2, 2, 1)
- ✅ No more JavaScript errors
- ✅ Clean, consistent API patterns
- ✅ Proper TypeScript types
- ✅ Production-ready code

**This document establishes the foundation for clean, maintainable API integration going forward.**