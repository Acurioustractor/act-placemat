# ACT Placemat - Project Alignment & Technical Strategy

## 🎯 Current State Analysis

### What We Have (Scattered Pages)
1. **dashboard-clean.html** - Clean, focused Notion integration
2. **dashboard-home.html** - Uses shared-styles.css, more complex
3. **opportunities-modern.html** - Uses modern-styles.css, different design system
4. **analytics-modern.html** - Analytics focused, modern styling
5. **map-modern.html** - Geographic visualization
6. **docs-modern.html** - Documentation page

### Problems Identified
- **Inconsistent styling** - 3 different CSS systems (inline, shared-styles.css, modern-styles.css)
- **Scattered functionality** - No clear user journey between pages
- **Mixed purposes** - Some pages work, others are broken/incomplete
- **No unified navigation** - Each page feels disconnected
- **Different data sources** - Some use Notion, others reference missing Supabase connectors

## 🎯 Core Purpose Clarification

### What ACT Placemat Should Be
**A unified dashboard for managing ACT's community-led projects, funding opportunities, and relationships**

### Primary Users
1. **ACT Team Members** - Track projects, opportunities, relationships
2. **Community Partners** - View project progress and opportunities
3. **Funders/Stakeholders** - Understand impact and pipeline

### Core User Journeys
1. **Project Overview** → See all projects across 5 areas with status and impact
2. **Opportunities Pipeline** → Track funding opportunities from discovery to close
3. **Relationship Management** → Manage contacts at organizations and their connection to opportunities
4. **Impact Visualization** → Show community impact and success stories

## 🏗️ Proposed Application Architecture

### Option A: Enhanced Vanilla JS (Current Path)
**Pros:**
- Fast to implement
- No build process
- Direct Notion integration working
- Lightweight and performant

**Cons:**
- Limited scalability for complex interactions
- Manual state management
- Harder to maintain consistent UI components

### Option B: React-Based Application
**Pros:**
- Component reusability
- Better state management
- Scalable architecture
- Rich ecosystem (charts, UI libraries)
- Better developer experience

**Cons:**
- Requires build process
- More complex setup
- Longer initial development time

### Option C: Next.js Full-Stack Application
**Pros:**
- Server-side rendering
- API routes built-in
- Excellent performance
- Production-ready
- Great for SEO if needed

**Cons:**
- Most complex setup
- Overkill for current needs
- Longer development cycle

## 📋 Recommended Unified Page Structure

### 1. Main Dashboard (`/`)
**Purpose:** High-level overview of entire ACT ecosystem
**Content:**
- Key metrics (total projects, active opportunities, revenue pipeline)
- Recent activity feed
- Quick access to each area
- Status indicators for urgent items

### 2. Projects View (`/projects`)
**Purpose:** Detailed project management across 5 areas
**Content:**
- Filterable project grid (by area, status, funding)
- Project cards with status, revenue, milestones
- Drill-down to individual project details
- Connection to related opportunities

### 3. Opportunities Pipeline (`/opportunities`)
**Purpose:** Funding and partnership opportunity management
**Content:**
- Kanban-style pipeline (Discovery → Qualification → Proposal → Negotiation → Closed)
- Opportunity cards with amount, probability, next actions
- Connection to related projects and organizations
- Revenue forecasting

### 4. Organizations & People (`/network`)
**Purpose:** Relationship and contact management
**Content:**
- Organization cards with contact details, relationship status
- People associated with each organization
- Connection to opportunities and projects
- Contact history and next actions

### 5. Impact & Analytics (`/impact`)
**Purpose:** Visualize community impact and success metrics
**Content:**
- Revenue and funding charts
- Project success rates
- Community impact stories
- Geographic distribution of projects

## 🎨 Unified Design System

### Design Principles
1. **Community-Focused** - Warm, approachable colors reflecting ACT values
2. **Data-Dense but Readable** - Lots of information without overwhelming
3. **Action-Oriented** - Clear CTAs for next steps
4. **Accessible** - Works for all users, all devices

### Color Palette
```css
:root {
  /* Primary - Community Blue */
  --primary: #2563eb;
  --primary-light: #3b82f6;
  --primary-dark: #1d4ed8;
  
  /* Secondary - Earth Tones */
  --secondary: #059669;
  --accent: #d97706;
  --warning: #dc2626;
  
  /* Neutrals */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-500: #6b7280;
  --gray-900: #111827;
}
```

### Component System
- **Cards** - Consistent project/opportunity/organization cards
- **Navigation** - Unified top nav with breadcrumbs
- **Filters** - Standardized filtering components
- **Charts** - Consistent data visualization
- **Forms** - Unified form styling for data entry

## 🚀 Implementation Recommendation

### Phase 1: Consolidate & Clean (1-2 weeks)
1. **Choose React** for better scalability and component reuse
2. **Create unified design system** with consistent components
3. **Migrate working Notion integration** to React components
4. **Build core navigation** and page structure

### Phase 2: Core Features (2-3 weeks)
1. **Projects dashboard** with filtering and drill-down
2. **Opportunities pipeline** with drag-and-drop stages
3. **Basic organization/people management**
4. **Real-time data sync** with Notion

### Phase 3: Advanced Features (2-3 weeks)
1. **Impact analytics** and charts
2. **Advanced filtering** and search
3. **Relationship mapping** between entities
4. **Export and reporting** capabilities

## 🛠️ Technical Stack Recommendation

### Frontend: React + TypeScript
```json
{
  "react": "^18.2.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.3.0",
  "recharts": "^2.8.0",
  "react-router-dom": "^6.15.0",
  "react-query": "^3.39.0"
}
```

### Backend: Keep Current Express.js
- Already working well with Notion integration
- Add TypeScript for better maintainability
- Add proper error handling and logging

### Why This Stack?
1. **React** - Component reusability, better state management
2. **TypeScript** - Better code quality and developer experience
3. **Tailwind CSS** - Rapid UI development with consistent design
4. **Recharts** - Beautiful, responsive charts for analytics
5. **React Query** - Excellent data fetching and caching for Notion API

## 📋 Next Steps Decision

### Option 1: Quick Fix (2-3 days)
- Clean up existing vanilla JS pages
- Create consistent styling
- Fix broken functionality
- **Good for:** Immediate demo/testing needs

### Option 2: React Migration (2-3 weeks)
- Build proper React application
- Implement unified design system
- Create scalable architecture
- **Good for:** Long-term product development

## 🤔 Questions for Decision

1. **Timeline Priority:** Do you need something working this week, or can we invest 2-3 weeks for a proper solution?

2. **Team Capacity:** Will you have developers working on this regularly, or is this a one-time build?

3. **Feature Complexity:** Do you envision adding complex features like real-time collaboration, advanced analytics, or mobile apps?

4. **Maintenance:** Who will maintain and update this application over time?

## 💡 My Recommendation

**Go with React** for these reasons:
1. **Future-proof** - Easier to add features and maintain
2. **Component reuse** - Build once, use everywhere
3. **Better UX** - Smoother interactions and state management
4. **Developer experience** - Easier to work with and debug
5. **Ecosystem** - Rich library ecosystem for charts, forms, etc.

The initial investment of 2-3 weeks will pay off quickly as you add features and scale the application.

**Would you like me to create a spec for the React migration, or should we do a quick cleanup of the existing pages first?**