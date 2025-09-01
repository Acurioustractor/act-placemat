# Development Rules: How to Never Fuck Up Like This Again

## ⚠️ Critical Rules from Hard-Learned Lessons

This document was created after a catastrophic development failure where I:
1. Used fake demo data instead of connecting to real Notion data
2. Built components with Tailwind CSS when ACT uses a custom CSS system
3. Didn't test if the system actually worked
4. Ignored existing architecture patterns

**NEVER REPEAT THESE MISTAKES.**

---

## Rule 1: ALWAYS Use Real Data

### ❌ NEVER DO THIS:
```javascript
const DEMO_PROJECTS = [
  {
    id: 'fake-project',
    title: 'Fake Demo Project',
    // ... fake data
  }
];
```

### ✅ ALWAYS DO THIS:
```javascript
// Connect to real APIs
const projects = await projectService.getAllProjects();

// Or use existing services
const data = await unifiedDataLakeService.getActPlatformData();
```

### Requirements:
- **ALWAYS** connect to existing data sources
- **NEVER** create demo/mock data for user-facing features
- **ALWAYS** use the unified data lake service or existing APIs
- **ALWAYS** check if data services already exist before creating new ones

---

## Rule 2: ALWAYS Use Existing CSS System

### ❌ NEVER DO THIS:
```jsx
<div className="bg-white rounded-2xl shadow-lg border-2 p-6">
  <h2 className="text-2xl font-bold text-gray-900">Title</h2>
</div>
```

### ✅ ALWAYS DO THIS:
```jsx
<div className="card">
  <h2 className="heading-3">Title</h2>
</div>
```

### Requirements:
- **ALWAYS** read `/apps/frontend/src/styles/system.css` FIRST
- **ALWAYS** use existing CSS classes: `card`, `heading-3`, `text-body`, `btn`, `split`, `inline`
- **NEVER** add Tailwind or other external CSS frameworks
- **ALWAYS** use CSS custom properties: `var(--space-4)`, `var(--sage)`, `var(--champagne)`

---

## Rule 3: ALWAYS Test Before Declaring Success

### Requirements:
- **ALWAYS** start both frontend and backend servers
- **ALWAYS** visit the actual URL in browser or test with curl
- **ALWAYS** check browser console for errors
- **ALWAYS** verify API endpoints return real data
- **NEVER** assume code works without testing

### Testing Checklist:
```bash
# 1. Start backend
cd apps/backend && npm start

# 2. Start frontend  
cd apps/frontend && npm run dev

# 3. Test API endpoints
curl http://localhost:4000/api/dashboard/network/relationships

# 4. Test frontend page
curl http://localhost:5175/showcase

# 5. Open in browser and check console
```

---

## Rule 4: ALWAYS Follow Existing Architecture

### Requirements:
- **ALWAYS** check existing components in `/apps/frontend/src/components/`
- **ALWAYS** use existing services in `/apps/frontend/src/services/`
- **ALWAYS** follow existing TypeScript interfaces
- **ALWAYS** integrate with existing Layout component
- **NEVER** create isolated systems that don't fit the architecture

### Architecture Checklist:
1. ✅ Does it use the existing Layout component?
2. ✅ Does it use existing CSS system?
3. ✅ Does it connect to real backend APIs?
4. ✅ Does it follow existing TypeScript patterns?
5. ✅ Does it work with existing routing in App.tsx?

---

## Rule 5: ALWAYS Read Documentation First

### Before Starting ANY Component:
1. **Read** `CLAUDE.md` for project-specific rules
2. **Read** existing component code in the same directory
3. **Read** `system.css` to understand the CSS system
4. **Read** backend API documentation or code
5. **Check** what services already exist

### Documentation Sources:
- `/CLAUDE.md` - Project instructions
- `/apps/frontend/src/styles/system.css` - CSS system
- `/apps/backend/src/services/` - Backend services
- `/apps/backend/src/api/` - API endpoints
- Existing component files for patterns

---

## Rule 6: NEVER Skip the Basics

### Every Component Must:
- Use real data from backend APIs
- Use existing CSS classes and design tokens
- Be tested in the browser
- Follow TypeScript interfaces
- Integrate with existing architecture
- Handle loading and error states properly

### Red Flags That Mean STOP:
- Creating mock/demo data
- Using Tailwind or external CSS classes
- Not testing the component
- Creating isolated systems
- Ignoring existing services
- Making up new patterns

---

## Rule 7: Recovery Process When Things Go Wrong

### When You Realize You Fucked Up:
1. **STOP** immediately
2. **ASSESS** what went wrong systematically
3. **READ** existing code to understand proper patterns
4. **REBUILD** using correct architecture and real data
5. **TEST** every step before continuing
6. **DOCUMENT** what you learned

### Example Recovery:
```markdown
## What Went Wrong:
- Used fake data instead of real Notion data
- Used Tailwind instead of existing CSS system

## How to Fix:
1. Create proper service to fetch real data
2. Rewrite components using existing CSS classes
3. Test integration with real backend
4. Update documentation
```

---

## Final Checklist: Before Submitting ANY Code

- [ ] Uses real data from existing APIs
- [ ] Uses existing CSS classes only
- [ ] Tested in browser with backend running
- [ ] Follows existing TypeScript interfaces
- [ ] Integrates with existing Layout/routing
- [ ] Handles loading/error states
- [ ] No Tailwind or external CSS
- [ ] No mock/demo data
- [ ] Documented any new patterns

**If ANY checkbox is unchecked, DO NOT SUBMIT.**

---

*This document exists because I fucked up badly. Learn from my mistakes. Follow these rules religiously.*