# tRPC Integration Guide

## Overview

ACT Placemat uses tRPC (TypeScript Remote Procedure Call) to provide end-to-end type safety between the frontend and backend. This guide covers how to work with tRPC in our platform.

## Why tRPC?

- **Type Safety**: Shared types between client and server
- **Auto-completion**: Full IntelliSense support
- **Runtime Validation**: Input/output validation with Zod
- **React Query Integration**: Optimal caching and state management
- **Developer Experience**: Reduced boilerplate and better debugging

## Architecture

```
Frontend (React)     ←→     Backend (Node.js)
├── tRPC Client      ←→     ├── tRPC Router
├── React Query      ←→     ├── Procedures
├── Type-safe hooks  ←→     ├── Zod Validation
└── Components       ←→     └── Database Layer
```

## Backend Setup

### Router Structure

```typescript
// apps/backend/src/trpc/router.ts
import { router } from './trpc';
import { contactsRouter } from './routers/contacts';
import { projectsRouter } from './routers/projects';
import { intelligenceRouter } from './routers/intelligence';

export const appRouter = router({
  // Health check
  health: publicProcedure.query(async () => {
    return {
      status: 'healthy',
      services: await checkServices(),
      version: process.env.npm_package_version,
      uptime: process.uptime()
    };
  }),

  // Feature routers
  contacts: contactsRouter,
  projects: projectsRouter,
  intelligence: intelligenceRouter,
});

export type AppRouter = typeof appRouter;
```

### Creating Procedures

#### Query Procedures (Read Operations)

```typescript
// apps/backend/src/trpc/routers/contacts.ts
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { ContactFilterSchema } from '@act-placemat/schemas';

export const contactsRouter = router({
  // List contacts with filtering
  list: publicProcedure
    .input(ContactFilterSchema)
    .query(async ({ input, ctx }) => {
      const { supabase } = ctx;
      
      let query = supabase
        .from('linkedin_contacts')
        .select('*', { count: 'exact' });

      // Apply filters
      if (input.strategic_value) {
        query = query.eq('strategic_value', input.strategic_value);
      }
      
      if (input.search) {
        query = query.or(`first_name.ilike.%${input.search}%,last_name.ilike.%${input.search}%`);
      }

      // Apply pagination
      const from = input.offset;
      const to = input.offset + input.limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch contacts'
        });
      }

      return {
        data: data || [],
        count: count || 0,
        limit: input.limit,
        offset: input.offset,
        hasMore: (count || 0) > input.offset + input.limit
      };
    }),

  // Get single contact
  byId: publicProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      const { supabase } = ctx;
      
      const { data, error } = await supabase
        .from('linkedin_contacts')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contact not found'
        });
      }

      return data;
    }),

  // Get contact statistics
  stats: publicProcedure
    .query(async ({ ctx }) => {
      const { supabase } = ctx;
      
      // Get total count
      const { count: total } = await supabase
        .from('linkedin_contacts')
        .select('*', { count: 'exact', head: true });

      // Get counts by strategic value
      const { data: strategicData } = await supabase
        .from('linkedin_contacts')
        .select('strategic_value')
        .not('strategic_value', 'is', null);

      const by_strategic_value = strategicData?.reduce((acc, item) => {
        acc[item.strategic_value] = (acc[item.strategic_value] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Get average relationship score
      const { data: scoreData } = await supabase
        .from('linkedin_contacts')
        .select('relationship_score')
        .not('relationship_score', 'is', null);

      const average_score = scoreData?.length 
        ? scoreData.reduce((sum, item) => sum + item.relationship_score, 0) / scoreData.length
        : 0;

      return {
        total: total || 0,
        by_strategic_value,
        by_data_source: {}, // Calculate if needed
        average_score: Math.round(average_score * 100) / 100
      };
    })
});
```

#### Mutation Procedures (Write Operations)

```typescript
// Mutation example
export const contactsRouter = router({
  // ... other procedures

  update: publicProcedure
    .input(z.object({
      id: z.number().positive(),
      data: z.object({
        relationship_score: z.number().min(0).max(1).optional(),
        strategic_value: z.enum(['high', 'medium', 'low', 'unknown']).optional(),
        notes: z.string().optional(),
        alignment_tags: z.array(z.string()).optional()
      })
    }))
    .mutation(async ({ input, ctx }) => {
      const { supabase } = ctx;
      
      const { data, error } = await supabase
        .from('linkedin_contacts')
        .update({
          ...input.data,
          updated_at: new Date().toISOString()
        })
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update contact'
        });
      }

      return data;
    }),

  create: publicProcedure
    .input(CreateContactSchema)
    .mutation(async ({ input, ctx }) => {
      const { supabase } = ctx;
      
      const { data, error } = await supabase
        .from('linkedin_contacts')
        .insert({
          ...input,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create contact'
        });
      }

      return data;
    })
});
```

### Context Setup

```typescript
// apps/backend/src/trpc/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { createClient } from '@supabase/supabase-js';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';

// Create context for each request
export const createContext = async (opts: CreateExpressContextOptions) => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  return {
    req: opts.req,
    res: opts.res,
    supabase,
    // Add authentication context here when implemented
    user: null,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure (for future authentication)
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
```

### Express Integration

```typescript
// apps/backend/src/server.ts
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './trpc/router';
import { createContext } from './trpc/trpc';

const app = express();

app.use(cors());
app.use(express.json());

// Mount tRPC router
app.use('/api/trpc', 
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: ({ path, error }) => {
      console.error(`tRPC Error on ${path}:`, error);
    },
  })
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Frontend Setup

### Client Configuration

```typescript
// apps/frontend/src/lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../backend/src/trpc/router';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${import.meta.env.VITE_API_URL}/api/trpc`,
      
      // Optional: Add headers
      headers() {
        return {
          // Add authentication headers here
        };
      },
      
      // Optional: Handle errors
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include', // Include cookies for session auth
        });
      },
    }),
  ],
  
  // Optional: Transform data
  transformer: undefined, // Use default transformer
});
```

### Provider Setup

```typescript
// apps/frontend/src/App.tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { trpc, trpcClient } from './lib/trpc';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 15 * 60 * 1000, // 15 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error: any) => {
        // Don't retry on client errors
        if (error?.data?.code === 'BAD_REQUEST') return false;
        return failureCount < 3;
      },
    },
  },
});

function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="App">
          {/* Your app content */}
          <Routes />
        </div>
        
        {/* Development tools */}
        {import.meta.env.DEV && <ReactQueryDevtools />}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

## Frontend Usage

### Query Hooks

```typescript
// apps/frontend/src/components/ContactsList.tsx
import React from 'react';
import { trpc } from '../lib/trpc';

interface ContactsListProps {
  strategicValue?: string;
  searchTerm?: string;
}

export function ContactsList({ strategicValue, searchTerm }: ContactsListProps) {
  // Query with automatic refetching and caching
  const { 
    data: contacts, 
    isLoading, 
    error,
    refetch,
    fetchNextPage,
    hasNextPage
  } = trpc.contacts.list.useQuery({
    strategic_value: strategicValue,
    search: searchTerm,
    limit: 25,
    offset: 0
  });

  // Get contact statistics
  const { data: stats } = trpc.contacts.stats.useQuery();

  if (isLoading) {
    return <div className="animate-spin">Loading contacts...</div>;
  }

  if (error) {
    return (
      <div className="text-red-600">
        Error loading contacts: {error.message}
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      {/* Statistics */}
      {stats && (
        <div className="mb-4 p-4 bg-gray-50 rounded">
          <h3>Contact Statistics</h3>
          <p>Total: {stats.total}</p>
          <p>Average Score: {(stats.average_score * 100).toFixed(1)}%</p>
        </div>
      )}

      {/* Contacts List */}
      <div className="space-y-4">
        {contacts?.data.map(contact => (
          <ContactCard key={contact.id} contact={contact} />
        ))}
      </div>

      {/* Load More */}
      {contacts?.hasMore && (
        <button 
          onClick={() => fetchNextPage()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Load More
        </button>
      )}
    </div>
  );
}
```

### Mutation Hooks

```typescript
// apps/frontend/src/components/ContactEditor.tsx
import React, { useState } from 'react';
import { trpc } from '../lib/trpc';

interface ContactEditorProps {
  contactId: number;
  onClose: () => void;
}

export function ContactEditor({ contactId, onClose }: ContactEditorProps) {
  const [formData, setFormData] = useState({
    relationship_score: 0,
    strategic_value: 'unknown' as const,
    notes: ''
  });

  // Get tRPC utils for cache management
  const utils = trpc.useContext();

  // Update mutation with optimistic updates
  const updateContact = trpc.contacts.update.useMutation({
    // Optimistic update
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await utils.contacts.byId.cancel({ id: contactId });
      
      // Snapshot previous value
      const previousContact = utils.contacts.byId.getData({ id: contactId });
      
      // Optimistically update
      utils.contacts.byId.setData({ id: contactId }, (old) => 
        old ? { ...old, ...newData.data } : undefined
      );
      
      // Return context with snapshot
      return { previousContact };
    },
    
    // On error, rollback
    onError: (err, newData, context) => {
      utils.contacts.byId.setData(
        { id: contactId }, 
        context?.previousContact
      );
    },
    
    // Always refetch after success or error
    onSettled: () => {
      utils.contacts.byId.invalidate({ id: contactId });
      utils.contacts.list.invalidate();
      utils.contacts.stats.invalidate();
    },
    
    onSuccess: () => {
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateContact.mutate({
      id: contactId,
      data: formData
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">
          Relationship Score
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={formData.relationship_score}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            relationship_score: parseFloat(e.target.value)
          }))}
          className="w-full"
        />
        <span>{(formData.relationship_score * 100).toFixed(0)}%</span>
      </div>

      <div>
        <label className="block text-sm font-medium">
          Strategic Value
        </label>
        <select
          value={formData.strategic_value}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            strategic_value: e.target.value as any
          }))}
          className="w-full border rounded px-3 py-2"
        >
          <option value="unknown">Unknown</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            notes: e.target.value
          }))}
          className="w-full border rounded px-3 py-2"
          rows={3}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={updateContact.isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {updateContact.isLoading ? 'Saving...' : 'Save'}
        </button>
        
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border rounded"
        >
          Cancel
        </button>
      </div>

      {updateContact.error && (
        <div className="text-red-600 text-sm">
          Error: {updateContact.error.message}
        </div>
      )}
    </form>
  );
}
```

### Custom Hooks with tRPC

```typescript
// apps/frontend/src/services/tRPCContactsService.ts
import { trpc } from '../lib/trpc';

// Custom hook for contacts with enhanced features
export const useContacts = (filters: ContactFilters = {}) => {
  return trpc.contacts.list.useQuery(
    {
      limit: 50,
      offset: 0,
      ...filters
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 15 * 60 * 1000, // 15 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      keepPreviousData: true, // For smooth pagination
    }
  );
};

// Custom hook for infinite scrolling
export const useInfiniteContacts = (filters: ContactFilters = {}) => {
  return trpc.contacts.list.useInfiniteQuery(
    {
      limit: 25,
      ...filters
    },
    {
      getNextPageParam: (lastPage) => {
        if (lastPage.hasMore) {
          return lastPage.offset + lastPage.limit;
        }
        return undefined;
      },
      staleTime: 2 * 60 * 1000,
    }
  );
};

// Custom hook for contact details
export const useContact = (id: number) => {
  return trpc.contacts.byId.useQuery(
    { id },
    {
      enabled: id > 0,
      staleTime: 10 * 60 * 1000, // 10 minutes for individual contacts
      cacheTime: 30 * 60 * 1000,
    }
  );
};

// Custom hook for contact statistics
export const useContactStats = () => {
  return trpc.contacts.stats.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000,
  });
};

// Custom mutation hook with enhanced error handling
export const useUpdateContact = () => {
  const utils = trpc.useContext();
  
  return trpc.contacts.update.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing queries
      await utils.contacts.byId.cancel({ id: variables.id });
      await utils.contacts.list.cancel();
      
      // Get previous data
      const previousContact = utils.contacts.byId.getData({ id: variables.id });
      const previousList = utils.contacts.list.getInfiniteData();
      
      // Optimistically update contact details
      utils.contacts.byId.setData({ id: variables.id }, (old) => 
        old ? { ...old, ...variables.data } : undefined
      );
      
      // Optimistically update in lists
      utils.contacts.list.setInfiniteData({}, (old) => {
        if (!old) return old;
        
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            data: page.data.map(contact => 
              contact.id === variables.id 
                ? { ...contact, ...variables.data }
                : contact
            )
          }))
        };
      });
      
      return { previousContact, previousList };
    },
    
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousContact) {
        utils.contacts.byId.setData(
          { id: variables.id }, 
          context.previousContact
        );
      }
      
      if (context?.previousList) {
        utils.contacts.list.setInfiniteData({}, context.previousList);
      }
    },
    
    onSuccess: (data, variables) => {
      // Update cache with server response
      utils.contacts.byId.setData({ id: variables.id }, data);
    },
    
    onSettled: (data, error, variables) => {
      // Invalidate to ensure fresh data
      utils.contacts.byId.invalidate({ id: variables.id });
      utils.contacts.list.invalidate();
      utils.contacts.stats.invalidate();
    }
  });
};

// Utility functions for contact data
export const getContactDisplayName = (contact: Contact): string => {
  if (contact.full_name) return contact.full_name;
  return `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown';
};

export const getContactCompanyInfo = (contact: Contact): string => {
  const parts = [];
  if (contact.current_position) parts.push(contact.current_position);
  if (contact.current_company) parts.push(`at ${contact.current_company}`);
  return parts.join(' ');
};

export const getStrategicValueColor = (value: string): string => {
  switch (value) {
    case 'high': return 'text-red-600 bg-red-50';
    case 'medium': return 'text-yellow-600 bg-yellow-50';
    case 'low': return 'text-green-600 bg-green-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

export const formatRelationshipScore = (score: number): string => {
  return `${Math.round(score * 100)}%`;
};
```

## Error Handling

### Backend Error Handling

```typescript
// apps/backend/src/trpc/routers/contacts.ts
import { TRPCError } from '@trpc/server';

export const contactsRouter = router({
  byId: publicProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('linkedin_contacts')
          .select('*')
          .eq('id', input.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Contact not found'
            });
          }
          
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database error occurred'
          });
        }

        return data;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        // Log unexpected errors
        console.error('Unexpected error in contacts.byId:', error);
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        });
      }
    })
});
```

### Frontend Error Handling

```typescript
// apps/frontend/src/components/ContactDetails.tsx
import React from 'react';
import { trpc } from '../lib/trpc';

export function ContactDetails({ contactId }: { contactId: number }) {
  const { data: contact, error, isLoading, refetch } = trpc.contacts.byId.useQuery(
    { id: contactId },
    {
      retry: (failureCount, error) => {
        // Don't retry on NOT_FOUND errors
        if (error.data?.code === 'NOT_FOUND') return false;
        
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
    }
  );

  if (isLoading) {
    return <ContactDetailsSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-medium">
          {error.data?.code === 'NOT_FOUND' 
            ? 'Contact Not Found' 
            : 'Error Loading Contact'
          }
        </h3>
        <p className="text-red-600 text-sm mt-1">{error.message}</p>
        
        {error.data?.code !== 'NOT_FOUND' && (
          <button 
            onClick={() => refetch()}
            className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-semibold">
        {getContactDisplayName(contact)}
      </h2>
      <p className="text-gray-600">
        {getContactCompanyInfo(contact)}
      </p>
      {/* Rest of contact details */}
    </div>
  );
}
```

## Testing

### Backend Testing

```typescript
// apps/backend/tests/trpc/contacts.test.ts
import { createCaller } from '../../src/trpc/router';
import { createTestContext } from '../helpers/test-context';

describe('Contacts tRPC Router', () => {
  let caller: ReturnType<typeof createCaller>;
  let ctx: Awaited<ReturnType<typeof createTestContext>>;

  beforeEach(async () => {
    ctx = await createTestContext();
    caller = createCaller(ctx);
  });

  describe('contacts.list', () => {
    it('should return paginated contacts', async () => {
      const result = await caller.contacts.list({
        limit: 10,
        offset: 0
      });

      expect(result).toMatchObject({
        data: expect.any(Array),
        count: expect.any(Number),
        limit: 10,
        offset: 0,
        hasMore: expect.any(Boolean)
      });
    });

    it('should filter by strategic value', async () => {
      const result = await caller.contacts.list({
        strategic_value: 'high',
        limit: 10
      });

      result.data.forEach(contact => {
        expect(contact.strategic_value).toBe('high');
      });
    });

    it('should validate input parameters', async () => {
      await expect(caller.contacts.list({
        limit: 101 // Exceeds maximum
      })).rejects.toThrow();
    });
  });

  describe('contacts.byId', () => {
    it('should return contact when found', async () => {
      // Assume contact with ID 1 exists
      const result = await caller.contacts.byId({ id: 1 });
      
      expect(result).toMatchObject({
        id: 1,
        first_name: expect.any(String),
        last_name: expect.any(String)
      });
    });

    it('should throw NOT_FOUND for non-existent contact', async () => {
      await expect(caller.contacts.byId({ id: 999999 }))
        .rejects.toThrow('Contact not found');
    });
  });
});
```

### Frontend Testing

```typescript
// apps/frontend/src/components/__tests__/ContactsList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { createTRPCMsw } from 'msw-trpc';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient } from '../../lib/trpc';
import { ContactsList } from '../ContactsList';
import type { AppRouter } from '../../../../backend/src/trpc/router';

// Mock tRPC server
const trpcMsw = createTRPCMsw<AppRouter>();
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
};

describe('ContactsList', () => {
  it('should render contacts when loaded', async () => {
    server.use(
      trpcMsw.contacts.list.query((_req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.data({
            data: [
              {
                id: 1,
                first_name: 'John',
                last_name: 'Doe',
                current_company: 'Test Corp',
                strategic_value: 'high'
              }
            ],
            count: 1,
            limit: 25,
            offset: 0,
            hasMore: false
          })
        );
      })
    );

    render(<ContactsList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Test Corp')).toBeInTheDocument();
    });
  });

  it('should handle error states', async () => {
    server.use(
      trpcMsw.contacts.list.query((_req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.error({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed'
          })
        );
      })
    );

    render(<ContactsList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Error loading contacts/)).toBeInTheDocument();
      expect(screen.getByText(/Database connection failed/)).toBeInTheDocument();
    });
  });
});
```

## Performance Optimization

### Query Optimization

```typescript
// Prefetch data for better UX
export function useContactsPrefetch() {
  const utils = trpc.useContext();
  
  const prefetchContacts = useCallback((filters: ContactFilters) => {
    utils.contacts.list.prefetch(filters, {
      staleTime: 2 * 60 * 1000
    });
  }, [utils]);

  const prefetchContact = useCallback((id: number) => {
    utils.contacts.byId.prefetch({ id }, {
      staleTime: 10 * 60 * 1000
    });
  }, [utils]);

  return { prefetchContacts, prefetchContact };
}

// Usage in components
export function ContactCard({ contact }: { contact: Contact }) {
  const { prefetchContact } = useContactsPrefetch();
  
  return (
    <div 
      onMouseEnter={() => prefetchContact(contact.id)}
      className="p-4 border rounded hover:shadow-lg transition-shadow"
    >
      <Link to={`/contacts/${contact.id}`}>
        {getContactDisplayName(contact)}
      </Link>
    </div>
  );
}
```

### Batch Queries

```typescript
// Multiple queries in parallel
export function ContactDashboard() {
  const [
    { data: contacts },
    { data: stats },
    { data: recentProjects }
  ] = trpc.useQueries((t) => [
    t.contacts.list({ limit: 10 }),
    t.contacts.stats(),
    t.projects.recent({ limit: 5 })
  ]);

  return (
    <div>
      <StatsWidget stats={stats} />
      <ContactsList contacts={contacts} />
      <RecentProjects projects={recentProjects} />
    </div>
  );
}
```

## Best Practices

### 1. Input Validation

Always use Zod schemas for input validation:

```typescript
// Define reusable schemas
export const PaginationSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0)
});

export const ContactFilterSchema = z.object({
  strategic_value: z.enum(['high', 'medium', 'low', 'unknown']).optional(),
  search: z.string().optional()
}).merge(PaginationSchema);
```

### 2. Error Handling

Provide meaningful error messages and codes:

```typescript
if (!contact) {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: `Contact with ID ${input.id} not found`
  });
}
```

### 3. Cache Management

Use appropriate cache strategies:

```typescript
// Short cache for frequently changing data
const { data } = trpc.notifications.list.useQuery(undefined, {
  staleTime: 30 * 1000, // 30 seconds
  refetchInterval: 60 * 1000 // Refetch every minute
});

// Long cache for stable data
const { data } = trpc.contacts.byId.useQuery({ id }, {
  staleTime: 10 * 60 * 1000, // 10 minutes
  cacheTime: 60 * 60 * 1000   // 1 hour
});
```

### 4. Optimistic Updates

Implement optimistic updates for better UX:

```typescript
const mutation = trpc.contacts.update.useMutation({
  onMutate: async (variables) => {
    // Cancel queries and get snapshot
    await utils.contacts.byId.cancel({ id: variables.id });
    const previous = utils.contacts.byId.getData({ id: variables.id });
    
    // Optimistic update
    utils.contacts.byId.setData({ id: variables.id }, (old) => 
      old ? { ...old, ...variables.data } : undefined
    );
    
    return { previous };
  },
  
  onError: (_err, _variables, context) => {
    // Rollback on error
    if (context?.previous) {
      utils.contacts.byId.setData({ id: variables.id }, context.previous);
    }
  }
});
```

### 5. Type Safety

Leverage TypeScript for better developer experience:

```typescript
// Use AppRouter type for type safety
import type { AppRouter } from '../../../backend/src/trpc/router';

// Infer types from tRPC procedures
type Contact = Awaited<ReturnType<AppRouter['contacts']['byId']>>;
type ContactList = Awaited<ReturnType<AppRouter['contacts']['list']>>;
```

This comprehensive guide covers the essential aspects of working with tRPC in the ACT Placemat platform. The type-safe API layer provides excellent developer experience while maintaining runtime safety and performance.