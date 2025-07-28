# Design Document - ACT Placemat React Application

## Overview

The ACT Placemat React application will be a modern, single-page application (SPA) that provides a unified interface for managing projects, opportunities, organizations, people, and artifacts. The application will feature a component-based architecture with real-time data synchronization from Notion databases.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (SPA)                     │
├─────────────────────────────────────────────────────────────┤
│  Components  │  Pages  │  Hooks  │  Utils  │  Services     │
├─────────────────────────────────────────────────────────────┤
│                    Express.js Backend                       │
├─────────────────────────────────────────────────────────────┤
│                    Notion API Integration                    │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- React Router for navigation
- React Query for data fetching and caching
- Tailwind CSS for styling
- Recharts for data visualization
- React Hook Form for form handling
- Framer Motion for animations

**Backend:**
- Express.js (existing)
- Node.js with TypeScript
- Notion API integration (existing)

**Development Tools:**
- Vite for build tooling
- ESLint and Prettier for code quality
- Jest and React Testing Library for testing

### Folder Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Basic UI components (Button, Card, etc.)
│   ├── forms/           # Form components
│   ├── charts/          # Chart components
│   └── layout/          # Layout components (Header, Sidebar, etc.)
├── pages/               # Page components
│   ├── Dashboard/
│   ├── Projects/
│   ├── Opportunities/
│   ├── Network/
│   └── Analytics/
├── hooks/               # Custom React hooks
├── services/            # API services and data fetching
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── constants/           # Application constants
└── styles/              # Global styles and Tailwind config
```

## Components and Interfaces

### Core Components

#### 1. Layout Components

**AppLayout**
```typescript
interface AppLayoutProps {
  children: React.ReactNode;
}

// Features:
// - Top navigation bar
// - Sidebar navigation
// - Main content area
// - Footer
```

**Navigation**
```typescript
interface NavigationProps {
  currentPath: string;
  userRole?: string;
}

// Features:
// - Logo and branding
// - Main navigation links
// - User profile dropdown
// - Notifications indicator
```

#### 2. Data Display Components

**ProjectCard**
```typescript
interface ProjectCardProps {
  project: Project;
  onClick?: (project: Project) => void;
  showDetails?: boolean;
}

// Features:
// - Project title and description
// - Status badge
// - Revenue information
// - Progress indicators
// - Related opportunities count
```

**OpportunityCard**
```typescript
interface OpportunityCardProps {
  opportunity: Opportunity;
  onStageChange?: (id: string, stage: string) => void;
  showActions?: boolean;
}

// Features:
// - Opportunity title and organization
// - Stage indicator
// - Amount and probability
// - Next action and deadline
// - Related projects
```

**OrganizationCard**
```typescript
interface OrganizationCardProps {
  organization: Organization;
  showContacts?: boolean;
  showOpportunities?: boolean;
}

// Features:
// - Organization name and logo
// - Relationship status
// - Key contacts
// - Active opportunities
// - Contact information
```

#### 3. Interactive Components

**FilterPanel**
```typescript
interface FilterPanelProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (filters: Record<string, any>) => void;
}

// Features:
// - Dynamic filter generation
// - Multi-select options
// - Date range pickers
// - Search functionality
```

**DataTable**
```typescript
interface DataTableProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
}

// Features:
// - Sortable columns
// - Inline filtering
// - Pagination
// - Row selection
// - Export functionality
```

#### 4. Chart Components

**RevenueChart**
```typescript
interface RevenueChartProps {
  data: RevenueData[];
  timeRange: 'month' | 'quarter' | 'year';
  showProjections?: boolean;
}

// Features:
// - Actual vs projected revenue
// - Time series visualization
// - Interactive tooltips
// - Zoom and pan functionality
```

**PipelineChart**
```typescript
interface PipelineChartProps {
  opportunities: Opportunity[];
  groupBy: 'stage' | 'organization' | 'amount';
}

// Features:
// - Funnel visualization
// - Stage conversion rates
// - Interactive drill-down
// - Weighted value display
```

## Data Models

### Core Data Types

```typescript
interface Project {
  id: string;
  name: string;
  area: ProjectArea;
  status: ProjectStatus;
  description: string;
  aiSummary?: string;
  lead: string;
  teamMembers: string[];
  coreValues: string;
  themes: string[];
  tags: string[];
  place: ProjectPlace;
  location: string;
  state: string;
  revenueActual: number;
  revenuePotential: number;
  actualIncoming: number;
  potentialIncoming: number;
  nextMilestone?: Date;
  startDate?: Date;
  endDate?: Date;
  relatedOpportunities: string[];
  partnerOrganizations: string[];
  artifacts: string[];
  websiteLinks: string;
  lastModified: Date;
}

interface Opportunity {
  id: string;
  name: string;
  organization: string;
  stage: OpportunityStage;
  amount: number;
  probability: number;
  weightedValue: number;
  type: OpportunityType;
  description: string;
  relatedProjects: string[];
  primaryContact: string;
  decisionMakers: string[];
  nextAction: string;
  nextActionDate?: Date;
  deadline?: Date;
  applicationDate?: Date;
  expectedDecisionDate?: Date;
  artifacts: string[];
  requirements: string;
  competition: string;
  budgetBreakdown: string;
  successCriteria: string;
  riskAssessment: string;
  notes: string;
  lastModified: Date;
}

interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  sector: string[];
  size: OrganizationSize;
  location: string;
  website: string;
  description: string;
  relationshipStatus: RelationshipStatus;
  partnershipType: string[];
  keyContacts: string[];
  activeOpportunities: string[];
  relatedProjects: string[];
  sharedArtifacts: string[];
  annualBudget?: number;
  fundingCapacity: FundingCapacity;
  decisionTimeline: DecisionTimeline;
  valuesAlignment: AlignmentLevel;
  strategicPriority: PriorityLevel;
  lastContactDate?: Date;
  nextContactDate?: Date;
  notes: string;
  lastModified: Date;
}

interface Person {
  id: string;
  fullName: string;
  roleTitle: string;
  organization: string;
  email: string;
  phone: string;
  linkedin: string;
  location: string;
  relationshipType: RelationshipType;
  influenceLevel: InfluenceLevel;
  communicationPreference: CommunicationPreference;
  relatedOpportunities: string[];
  relatedProjects: string[];
  sharedArtifacts: string[];
  interests: string[];
  expertise: string[];
  lastContactDate?: Date;
  nextContactDate?: Date;
  contactFrequency: ContactFrequency;
  relationshipStrength: RelationshipStrength;
  notes: string;
  birthday?: Date;
  personalInterests: string;
  lastModified: Date;
}

interface Artifact {
  id: string;
  name: string;
  type: ArtifactType;
  format: ArtifactFormat;
  status: ArtifactStatus;
  relatedOpportunities: string[];
  relatedProjects: string[];
  relatedOrganizations: string[];
  relatedPeople: string[];
  fileUrl?: string;
  description: string;
  audience: string[];
  purpose: ArtifactPurpose;
  version: number;
  createdBy: string;
  approvedBy?: string;
  reviewDate?: Date;
  accessLevel: AccessLevel;
  tags: string[];
  usageNotes: string;
  lastModified: Date;
}
```

### Enums and Constants

```typescript
enum ProjectArea {
  STORY_SOVEREIGNTY = 'Story & Sovereignty',
  ECONOMIC_FREEDOM = 'Economic Freedom',
  COMMUNITY_ENGAGEMENT = 'Community Engagement',
  OPERATIONS_INFRASTRUCTURE = 'Operations & Infrastructure',
  RESEARCH_DEVELOPMENT = 'Research & Development'
}

enum OpportunityStage {
  DISCOVERY = 'Discovery 🔍',
  QUALIFICATION = 'Qualification 📋',
  PROPOSAL = 'Proposal 📄',
  NEGOTIATION = 'Negotiation 🤝',
  CLOSED_WON = 'Closed Won ✅',
  CLOSED_LOST = 'Closed Lost ❌'
}

// Additional enums for other types...
```

## Error Handling

### Error Boundary Strategy

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

// Global error boundary for unhandled errors
// Page-level error boundaries for graceful degradation
// Component-level error handling for specific failures
```

### API Error Handling

```typescript
interface APIError {
  status: number;
  message: string;
  details?: any;
  timestamp: Date;
}

// Centralized error handling service
// Retry logic for transient failures
// User-friendly error messages
// Error reporting and logging
```

## Testing Strategy

### Unit Testing
- Component testing with React Testing Library
- Hook testing with React Hooks Testing Library
- Utility function testing with Jest
- Service layer testing with mocked APIs

### Integration Testing
- API integration testing
- End-to-end user flows
- Cross-browser compatibility testing
- Performance testing

### Test Coverage Goals
- 80%+ code coverage for critical paths
- 100% coverage for utility functions
- Integration tests for all API endpoints
- E2E tests for core user journeys

## Performance Considerations

### Optimization Strategies

**Code Splitting**
```typescript
// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const Opportunities = lazy(() => import('./pages/Opportunities'));
```

**Data Fetching**
```typescript
// React Query for caching and background updates
const { data: projects, isLoading } = useQuery(
  ['projects', filters],
  () => fetchProjects(filters),
  {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  }
);
```

**Virtual Scrolling**
- Implement virtual scrolling for large data sets
- Pagination for table views
- Infinite scrolling for feeds

### Bundle Size Optimization
- Tree shaking for unused code
- Dynamic imports for large libraries
- Image optimization and lazy loading
- Gzip compression

## Security Considerations

### Client-Side Security
- No sensitive data in client-side code
- Secure API communication
- Input validation and sanitization
- XSS prevention

### API Security
- Authentication and authorization
- Rate limiting
- CORS configuration
- Error message sanitization

## Deployment Strategy

### Build Process
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "jest",
    "lint": "eslint src --ext ts,tsx",
    "type-check": "tsc --noEmit"
  }
}
```

### Environment Configuration
- Development, staging, and production environments
- Environment-specific API endpoints
- Feature flags for gradual rollouts

This design provides a solid foundation for building a professional, scalable React application that meets all the requirements while maintaining excellent user experience and developer productivity.