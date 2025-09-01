# ACT Placemat API Documentation

## Overview

The ACT Placemat platform provides a comprehensive suite of APIs for managing community connections, projects, and opportunities across Australia. Built with tRPC for type safety and React Query for optimal data management.

## Quick Start

```typescript
import { trpc } from './lib/trpc';

// Get contacts with filtering
const { data: contacts } = trpc.contacts.list.useQuery({
  strategic_value: 'high',
  limit: 25
});

// Get contact statistics
const { data: stats } = trpc.contacts.stats.useQuery();
```

## Architecture

- **Backend**: Node.js with Express and tRPC
- **Database**: Supabase (PostgreSQL)
- **Frontend**: React with React Query
- **Validation**: Zod schemas
- **Testing**: Vitest, Jest, and Playwright

## API Endpoints

### Health Check

```typescript
// GET /api/trpc/health
const health = await trpc.health.query();
```

**Response:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "services": {
    "database": "up|down",
    "supabase": "up|down", 
    "notion": "up|down"
  },
  "version": "1.0.0",
  "uptime": 12345
}
```

### Contacts API

#### List Contacts

```typescript
const contacts = await trpc.contacts.list.query({
  strategic_value?: 'high' | 'medium' | 'low' | 'unknown',
  data_source?: 'ben' | 'nic',
  company?: string,
  search?: string,
  limit?: number, // Max 100
  offset?: number
});
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "email_address": "john@example.com",
      "linkedin_url": "https://linkedin.com/in/johndoe",
      "current_company": "Tech Corp",
      "current_position": "CEO",
      "connection_source": "ben",
      "relationship_score": 0.85,
      "strategic_value": "high",
      "alignment_tags": ["tech", "sustainability"],
      "created_at": "2024-01-15T09:30:00Z",
      "updated_at": "2024-01-15T09:30:00Z"
    }
  ],
  "count": 1,
  "limit": 50,
  "offset": 0,
  "hasMore": false
}
```

#### Get Contact by ID

```typescript
const contact = await trpc.contacts.byId.query({ id: 1 });
```

#### Update Contact

```typescript
const updatedContact = await trpc.contacts.update.mutate({
  id: 1,
  data: {
    relationship_score: 0.9,
    strategic_value: 'high',
    notes: 'Great potential for collaboration'
  }
});
```

#### Contact Statistics

```typescript
const stats = await trpc.contacts.stats.query();
```

**Response:**
```json
{
  "total": 15020,
  "by_strategic_value": {
    "high": 1502,
    "medium": 7510,
    "low": 4506,
    "unknown": 1502
  },
  "by_data_source": {
    "ben": 4492,
    "nic": 10528
  },
  "average_score": 0.67
}
```

### Projects API

#### List Projects

```typescript
const projects = await trpc.projects.list.query({
  status?: 'planning' | 'active' | 'completed' | 'paused',
  category?: string,
  limit?: number,
  offset?: number
});
```

#### Create Project

```typescript
const project = await trpc.projects.create.mutate({
  title: 'Community Garden Initiative',
  description: 'Creating sustainable community gardens across ACT',
  status: 'planning',
  priority: 'high',
  tags: ['sustainability', 'community'],
  expected_start: '2024-03-01',
  expected_end: '2024-12-31'
});
```

### Intelligence API

#### Query Intelligence

```typescript
const result = await trpc.intelligence.query.query({
  query: 'sustainable farming initiatives in Australia',
  sources?: ['notion', 'linkedin', 'airtable'],
  filters?: object,
  limit?: number // Max 100
});
```

**Response:**
```json
{
  "id": "intel_123",
  "query": "sustainable farming initiatives in Australia",
  "results": [
    {
      "title": "ACT Sustainable Farming Network",
      "content": "Community-led initiative...",
      "source": "notion",
      "confidence": 0.95,
      "url": "https://notion.so/page"
    }
  ],
  "confidence": 0.87,
  "sources": ["notion", "linkedin"],
  "timestamp": "2024-01-15T09:30:00Z"
}
```

## React Hooks

### Frontend Integration

```typescript
import { useContacts, useContact, useContactStats } from './services/tRPCContactsService';

function ContactsPage() {
  // List contacts with filters
  const { data: contacts, isLoading, error } = useContacts({
    strategic_value: 'high',
    limit: 25
  });

  // Get specific contact
  const { data: contact } = useContact(123);

  // Get statistics
  const { data: stats } = useContactStats();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {contacts?.data.map(contact => (
        <ContactCard key={contact.id} contact={contact} />
      ))}
    </div>
  );
}
```

### Mutations with Optimistic Updates

```typescript
import { useUpdateContact } from './services/tRPCContactsService';

function ContactEditor({ contactId }) {
  const { mutate: updateContact, isLoading } = useUpdateContact();

  const handleUpdate = (data) => {
    updateContact({
      id: contactId,
      data: {
        relationship_score: data.score,
        strategic_value: data.value
      }
    });
  };

  return (
    <form onSubmit={handleUpdate}>
      {/* Form fields */}
    </form>
  );
}
```

## Offline Support

The platform includes comprehensive offline support with service workers:

```typescript
import { useOfflineApi } from './hooks/useOfflineApi';

function OfflineAwareComponent() {
  const { 
    isOnline, 
    queueAction, 
    syncStatus 
  } = useOfflineApi();

  const handleAction = (data) => {
    if (isOnline) {
      // Direct API call
      trpc.contacts.update.mutate(data);
    } else {
      // Queue for later sync
      queueAction('contacts.update', data);
    }
  };

  return (
    <div>
      {!isOnline && <OfflineBanner />}
      {syncStatus.syncing && <SyncIndicator />}
      {/* Component content */}
    </div>
  );
}
```

## Error Handling

### tRPC Error Types

```typescript
import { TRPCError } from '@trpc/server';

// Common error codes:
// - BAD_REQUEST: Invalid input parameters
// - NOT_FOUND: Resource not found
// - INTERNAL_SERVER_ERROR: Server error
// - UNAUTHORIZED: Authentication required
// - FORBIDDEN: Insufficient permissions

// Frontend error handling
const { data, error } = useContacts();

if (error) {
  switch (error.data?.code) {
    case 'BAD_REQUEST':
      // Handle validation errors
      break;
    case 'NOT_FOUND':
      // Handle missing resources
      break;
    default:
      // Handle other errors
      break;
  }
}
```

### Retry Logic

```typescript
import { useQuery } from '@tanstack/react-query';

const { data } = useQuery({
  queryKey: ['contacts'],
  queryFn: () => trpc.contacts.list.query(),
  retry: (failureCount, error) => {
    // Don't retry on client errors
    if (error.data?.code === 'BAD_REQUEST') return false;
    
    // Retry up to 3 times for server errors
    return failureCount < 3;
  },
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
});
```

## Validation Schemas

### Zod Schemas

```typescript
import { z } from 'zod';

export const ContactFilterSchema = z.object({
  strategic_value: z.enum(['high', 'medium', 'low', 'unknown']).optional(),
  data_source: z.enum(['ben', 'nic']).optional(),
  company: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0)
});

export const ContactUpdateSchema = z.object({
  id: z.number().positive(),
  data: z.object({
    relationship_score: z.number().min(0).max(1).optional(),
    strategic_value: z.enum(['high', 'medium', 'low', 'unknown']).optional(),
    notes: z.string().optional(),
    alignment_tags: z.array(z.string()).optional()
  })
});
```

## Rate Limiting

API endpoints are rate limited to ensure fair usage:

- **Standard endpoints**: 100 requests per minute
- **Intelligence queries**: 20 requests per minute
- **File uploads**: 10 requests per minute

Headers included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Authentication

### API Keys (Future)

```typescript
// Set API key for requests
const trpc = createTRPCClient({
  url: '/api/trpc',
  headers: {
    'Authorization': 'Bearer your-api-key'
  }
});
```

### Session Management

```typescript
// Current implementation uses session-based auth
// JWT tokens planned for future releases
```

## Testing

### API Testing

```typescript
import { createCaller } from '../src/trpc/router';

describe('Contacts API', () => {
  it('should return filtered contacts', async () => {
    const caller = createCaller(mockContext);
    
    const result = await caller.contacts.list({
      strategic_value: 'high',
      limit: 10
    });

    expect(result.data).toHaveLength(10);
    expect(result.count).toBeGreaterThan(0);
  });
});
```

### Frontend Testing

```typescript
import { renderHook } from '@testing-library/react';
import { useContacts } from './tRPCContactsService';

describe('useContacts Hook', () => {
  it('should fetch contacts with filters', async () => {
    const { result } = renderHook(() => 
      useContacts({ strategic_value: 'high' })
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });
});
```

## Performance

### Caching Strategy

```typescript
// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 15 * 60 * 1000, // 15 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true
    }
  }
});

// Custom cache times for different data types
export const CACHE_TIMES = {
  contacts: {
    staleTime: 2 * 60 * 1000,
    cacheTime: 15 * 60 * 1000
  },
  contactDetail: {
    staleTime: 10 * 60 * 1000,
    cacheTime: 30 * 60 * 1000
  },
  stats: {
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000
  }
};
```

### Database Optimization

- Indexes on frequently queried fields
- Connection pooling with Supabase
- Query optimization for large datasets
- Pagination for all list endpoints

## Deployment

### Environment Variables

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Optional
NOTION_API_KEY=your-notion-key
AIRTABLE_API_KEY=your-airtable-key
REDIS_URL=redis://localhost:6379
```

### Docker Configuration

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Monitoring

### Health Checks

The `/api/trpc/health` endpoint provides comprehensive health status:

- Database connectivity
- External service availability
- Memory usage
- Response times

### Logging

```typescript
import { logger } from './lib/logger';

// Structured logging with Australian timezone
logger.info('Contact created', {
  contactId: 123,
  source: 'api',
  timestamp: new Date().toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney'
  })
});
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines and API contribution standards.

## Support

- **Documentation**: [/Docs/API/](../API/)
- **Examples**: [/examples/](../../examples/)
- **Issues**: [GitHub Issues](https://github.com/act-placemat/issues)
- **Discussions**: [GitHub Discussions](https://github.com/act-placemat/discussions)