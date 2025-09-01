# ACT Placemat Developer Quick Start Guide

## Getting Started

Welcome to the ACT Placemat development environment! This guide will get you up and running quickly with our community platform for connecting people, projects, and opportunities across Australia.

## Prerequisites

### Required Software

- **Node.js** 18.x or later
- **npm** 8.x or later
- **Git** for version control
- **Docker** (optional, for local database)

### Recommended Tools

- **Visual Studio Code** with extensions:
  - TypeScript and JavaScript Language Features
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
- **Postman** or **Insomnia** for API testing

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/act-placemat.git
cd act-placemat
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install workspace dependencies
npm run install:all
```

### 3. Environment Setup

Copy environment templates and configure:

```bash
# Backend environment
cp apps/backend/.env.example apps/backend/.env

# Frontend environment  
cp apps/frontend/.env.example apps/frontend/.env
```

### 4. Configure Environment Variables

Edit the `.env` files with your configuration:

```bash
# apps/backend/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Optional services
NOTION_API_KEY=your-notion-key
AIRTABLE_API_KEY=your-airtable-key

# apps/frontend/.env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

### 5. Database Setup

#### Option A: Use Supabase Cloud

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and keys to `.env` files
3. Run migrations:

```bash
cd apps/backend
npm run db:migrate
npm run db:seed
```

#### Option B: Local Supabase

```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Start local Supabase
supabase start

# Apply migrations
supabase db reset
```

### 6. Start Development Servers

```bash
# Start all services
npm run dev

# Or start individually
npm run dev:backend   # Backend API (port 3001)
npm run dev:frontend  # Frontend app (port 3000)
```

## Project Structure

```
act-placemat/
├── apps/
│   ├── frontend/          # React frontend application
│   │   ├── src/
│   │   │   ├── components/   # Reusable UI components
│   │   │   ├── pages/        # Page components
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   ├── services/     # API services and tRPC hooks
│   │   │   ├── lib/          # Utility libraries
│   │   │   └── types/        # TypeScript type definitions
│   │   ├── public/           # Static assets
│   │   └── package.json
│   │
│   └── backend/           # Node.js backend API
│       ├── src/
│       │   ├── trpc/         # tRPC router and procedures
│       │   ├── services/     # Business logic services
│       │   ├── lib/          # Shared utilities
│       │   └── types/        # TypeScript types
│       ├── tests/            # Backend tests
│       └── package.json
│
├── packages/              # Shared packages
│   ├── types/            # Shared TypeScript types
│   ├── utils/            # Shared utilities
│   └── schemas/          # Zod validation schemas
│
├── tools/                # Development tools
│   ├── migrations/       # Database migration scripts
│   ├── seeds/           # Database seed data
│   └── testing/         # Test utilities
│
├── tests/               # Integration and E2E tests
│   ├── integration/     # API integration tests
│   └── e2e/            # End-to-end tests
│
└── Docs/               # Documentation
    ├── API/            # API documentation
    ├── Architecture/   # System architecture docs
    └── Guides/         # Development guides
```

## Development Workflow

### 1. Feature Development

```bash
# Create a feature branch
git checkout -b feature/contact-management

# Make your changes
# ... develop feature ...

# Run tests
npm run test

# Run linting
npm run lint

# Commit with conventional commits
git commit -m "feat(contacts): add contact filtering functionality"
```

### 2. Working with the API

#### Backend Development

```typescript
// apps/backend/src/trpc/routers/contacts.ts
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const contactsRouter = router({
  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      search: z.string().optional()
    }))
    .query(async ({ input, ctx }) => {
      // Your implementation here
      return {
        data: [],
        count: 0,
        hasMore: false
      };
    })
});
```

#### Frontend Development

```typescript
// apps/frontend/src/components/ContactsList.tsx
import { trpc } from '../lib/trpc';

export function ContactsList() {
  const { data: contacts, isLoading } = trpc.contacts.list.useQuery({
    limit: 25,
    search: ''
  });

  if (isLoading) return <div>Loading contacts...</div>;

  return (
    <div>
      {contacts?.data.map(contact => (
        <ContactCard key={contact.id} contact={contact} />
      ))}
    </div>
  );
}
```

### 3. Database Operations

#### Running Migrations

```bash
# Create new migration
npm run migration:create add_contact_tags

# Run pending migrations
npm run migration:run

# Rollback last migration
npm run migration:rollback
```

#### Seeding Data

```bash
# Run all seeds
npm run db:seed

# Run specific seed
npm run db:seed:contacts
```

### 4. Testing

#### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode
npm run test:unit:watch

# Run tests with coverage
npm run test:coverage
```

#### Integration Tests

```bash
# Run API integration tests
npm run test:integration

# Run specific test file
npm run test apps/backend/tests/contacts.test.js
```

#### End-to-End Tests

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode
npm run test:e2e:headed

# Run specific E2E test
npx playwright test tests/e2e/contacts.test.ts
```

## Common Development Tasks

### Adding a New API Endpoint

1. **Define the schema** in `packages/schemas/`:

```typescript
// packages/schemas/src/project.ts
export const CreateProjectSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed'])
});
```

2. **Create the tRPC procedure** in `apps/backend/src/trpc/routers/`:

```typescript
// apps/backend/src/trpc/routers/projects.ts
export const projectsRouter = router({
  create: publicProcedure
    .input(CreateProjectSchema)
    .mutation(async ({ input, ctx }) => {
      // Implementation
    })
});
```

3. **Add to main router**:

```typescript
// apps/backend/src/trpc/router.ts
export const appRouter = router({
  contacts: contactsRouter,
  projects: projectsRouter, // Add new router
});
```

4. **Create frontend hook**:

```typescript
// apps/frontend/src/services/projectsService.ts
export const useCreateProject = () => {
  return trpc.projects.create.useMutation({
    onSuccess: () => {
      // Invalidate and refetch projects list
      trpc.useContext().projects.list.invalidate();
    }
  });
};
```

### Adding a New React Component

1. **Create component file**:

```typescript
// apps/frontend/src/components/ProjectCard.tsx
interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
}

export function ProjectCard({ project, onEdit }: ProjectCardProps) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold">{project.title}</h3>
      <p className="text-gray-600">{project.description}</p>
      {onEdit && (
        <button onClick={() => onEdit(project)}>
          Edit Project
        </button>
      )}
    </div>
  );
}
```

2. **Add to component index**:

```typescript
// apps/frontend/src/components/index.ts
export { ProjectCard } from './ProjectCard';
```

3. **Write tests**:

```typescript
// apps/frontend/src/components/__tests__/ProjectCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ProjectCard } from '../ProjectCard';

describe('ProjectCard', () => {
  it('renders project information', () => {
    const project = {
      id: 1,
      title: 'Test Project',
      description: 'Test description'
    };

    render(<ProjectCard project={project} />);
    
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });
});
```

### Database Schema Changes

1. **Create migration**:

```bash
npm run migration:create add_project_tags_table
```

2. **Edit migration file**:

```sql
-- tools/migrations/20240115_add_project_tags_table.sql
CREATE TABLE project_tags (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_project_tags_project_id ON project_tags(project_id);
CREATE INDEX idx_project_tags_tag ON project_tags(tag);
```

3. **Run migration**:

```bash
npm run migration:run
```

4. **Update TypeScript types**:

```typescript
// packages/types/src/project.ts
export interface ProjectTag {
  id: number;
  project_id: number;
  tag: string;
  created_at: string;
}
```

## Debugging

### Backend Debugging

```bash
# Enable debug logging
DEBUG=trpc:* npm run dev:backend

# Run with Node.js debugger
npm run dev:backend:debug
```

### Frontend Debugging

```bash
# Enable React Query DevTools (already enabled in development)
# Open browser dev tools and look for React Query tab

# Enable verbose tRPC logging
VITE_DEBUG_TRPC=true npm run dev:frontend
```

### Database Debugging

```sql
-- Enable query logging in Supabase
-- Go to Settings > Database > Extensions
-- Enable "pg_stat_statements"

-- View slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

## Code Style and Standards

### TypeScript Configuration

- Strict mode enabled
- Path mapping configured for clean imports
- Shared types in `packages/types`

### Code Formatting

```bash
# Format all code
npm run format

# Check formatting
npm run format:check

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Commit Message Format

We use conventional commits:

```bash
# Format: type(scope): description
feat(contacts): add contact filtering functionality
fix(api): resolve authentication token expiry issue
docs(readme): update installation instructions
test(contacts): add unit tests for contact service
```

### Australian English Standards

- Use Australian English spelling (colour, centre, organisation)
- Use Australian date formats (DD/MM/YYYY)
- Include Australian timezone handling
- Follow Australian accessibility standards

## Performance Considerations

### Frontend Performance

- React Query for efficient data caching
- Lazy loading for route-based code splitting
- Service worker for offline functionality
- Optimistic updates for better UX

### Backend Performance

- Database connection pooling
- Query optimization with proper indexes
- Response caching where appropriate
- Rate limiting to prevent abuse

### Monitoring

```typescript
// Example performance monitoring
import { logger } from '../lib/logger';

export const performanceMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration
    });
  });
  
  next();
};
```

## Deployment

### Local Deployment

```bash
# Build all applications
npm run build

# Start production servers
npm run start
```

### Environment-Specific Builds

```bash
# Development build
npm run build:dev

# Staging build  
npm run build:staging

# Production build
npm run build:prod
```

## Getting Help

### Documentation

- **API Documentation**: [/Docs/API/](../../API/)
- **Architecture Docs**: [/Docs/Architecture/](../../Architecture/)
- **Troubleshooting**: [/Docs/Guides/Troubleshooting/](../Troubleshooting/)

### Community

- **GitHub Discussions**: For questions and ideas
- **GitHub Issues**: For bug reports and feature requests
- **Development Chat**: Internal team communication

### Code Examples

Check the `/examples/` directory for:

- API usage examples
- Component implementation examples
- Testing examples
- Integration examples

## Next Steps

1. **Explore the codebase**: Start with `apps/frontend/src/App.tsx` and `apps/backend/src/trpc/router.ts`
2. **Run the tests**: Get familiar with our testing patterns
3. **Make a small change**: Try adding a simple feature or fixing a minor issue
4. **Read the architecture docs**: Understand the system design decisions
5. **Join the community**: Engage with other developers

Happy coding! 🇦🇺