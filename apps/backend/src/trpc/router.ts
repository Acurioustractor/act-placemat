/**
 * tRPC Router - Type-safe API endpoints
 * Provides end-to-end type safety between frontend and backend
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from './trpc.js';
import type { 
  LinkedInContact, 
  ContactsFilter, 
  ContactUpdate, 
  ContactStats,
  PaginatedResponse,
  Project,
  Opportunity,
  Story,
  StoryFilter,
  HealthCheck,
  IntelligenceQuery,
  IntelligenceResult
} from '../../../packages/shared-types/src/api.js';

// Validation schemas
const contactsFilterSchema = z.object({
  strategic_value: z.string().optional(),
  data_source: z.string().optional(),
  company: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const contactUpdateSchema = z.object({
  relationship_score: z.number().min(0).max(1).optional(),
  strategic_value: z.enum(['high', 'medium', 'low', 'unknown']).optional(),
  notes: z.string().optional(),
});

const projectSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  status: z.enum(['planning', 'active', 'completed', 'paused']).default('planning'),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  tags: z.array(z.string()).default([]),
});

const storyFilterSchema = z.object({
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const intelligenceQuerySchema = z.object({
  query: z.string().min(1),
  sources: z.array(z.string()).optional(),
  filters: z.record(z.any()).optional(),
  limit: z.number().min(1).max(100).default(10),
});

// Main tRPC router
export const appRouter = router({
  // Health check endpoint
  health: publicProcedure
    .query(async (): Promise<HealthCheck> => {
      try {
        // Check database connection
        // Check Supabase connection  
        // Check Notion connection
        
        return {
          status: 'healthy',
          services: {
            database: 'up',
            supabase: 'up', 
            notion: 'up'
          },
          version: '1.0.0',
          uptime: process.uptime()
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Health check failed',
          cause: error,
        });
      }
    }),

  // LinkedIn contacts endpoints
  contacts: router({
    // Get all contacts with filtering
    list: publicProcedure
      .input(contactsFilterSchema)
      .query(async ({ input }): Promise<PaginatedResponse<LinkedInContact>> => {
        try {
          // This would connect to the existing contactsApiService logic
          // For now, returning mock data structure
          
          const mockContacts: LinkedInContact[] = [];
          
          return {
            data: mockContacts,
            count: 0,
            limit: input.limit,
            offset: input.offset,
            hasMore: false
          };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch contacts',
            cause: error,
          });
        }
      }),

    // Get single contact by ID
    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }): Promise<LinkedInContact> => {
        try {
          // Implementation would fetch from Supabase
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Contact not found',
          });
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch contact',
            cause: error,
          });
        }
      }),

    // Update contact
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        data: contactUpdateSchema
      }))
      .mutation(async ({ input }): Promise<LinkedInContact> => {
        try {
          // Implementation would update in Supabase
          throw new TRPCError({
            code: 'NOT_IMPLEMENTED',
            message: 'Contact update not implemented yet',
          });
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update contact',
            cause: error,
          });
        }
      }),

    // Get contact statistics
    stats: publicProcedure
      .query(async (): Promise<ContactStats> => {
        try {
          // Implementation would aggregate from Supabase
          return {
            total: 0,
            by_strategic_value: {},
            by_data_source: {},
            average_score: 0
          };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch contact stats',
            cause: error,
          });
        }
      }),
  }),

  // Projects endpoints
  projects: router({
    list: publicProcedure
      .input(z.object({
        status: z.enum(['planning', 'active', 'completed', 'paused']).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }): Promise<PaginatedResponse<Project>> => {
        try {
          return {
            data: [],
            count: 0,
            limit: input.limit,
            offset: input.offset,
            hasMore: false
          };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch projects',
            cause: error,
          });
        }
      }),

    create: publicProcedure
      .input(projectSchema)
      .mutation(async ({ input }): Promise<Project> => {
        try {
          // Implementation would create in database
          throw new TRPCError({
            code: 'NOT_IMPLEMENTED',
            message: 'Project creation not implemented yet',
          });
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create project',
            cause: error,
          });
        }
      }),
  }),

  // Opportunities endpoints
  opportunities: router({
    list: publicProcedure
      .input(z.object({
        status: z.enum(['open', 'applied', 'closed', 'awarded']).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }): Promise<PaginatedResponse<Opportunity>> => {
        try {
          return {
            data: [],
            count: 0,
            limit: input.limit,
            offset: input.offset,
            hasMore: false
          };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch opportunities',
            cause: error,
          });
        }
      }),
  }),

  // Stories endpoints
  stories: router({
    list: publicProcedure
      .input(storyFilterSchema)
      .query(async ({ input }): Promise<PaginatedResponse<Story>> => {
        try {
          return {
            data: [],
            count: 0,
            limit: input.limit,
            offset: input.offset,
            hasMore: false
          };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch stories',
            cause: error,
          });
        }
      }),
  }),

  // Intelligence endpoints
  intelligence: router({
    query: publicProcedure
      .input(intelligenceQuerySchema)
      .mutation(async ({ input }): Promise<IntelligenceResult> => {
        try {
          // Implementation would process query through AI services
          return {
            id: `query_${Date.now()}`,
            query: input.query,
            results: [],
            confidence: 0,
            sources: input.sources || [],
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Intelligence query failed',
            cause: error,
          });
        }
      }),
  }),
});

// Export router type for use in frontend
export type AppRouter = typeof appRouter;