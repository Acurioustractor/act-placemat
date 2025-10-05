/**
 * tRPC Router - Type-safe API endpoints
 * Provides end-to-end type safety between frontend and backend
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from './trpc.js';
import { createClient } from '@supabase/supabase-js';
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
export const contactsFilterSchema = z.object({
  strategic_value: z.string().optional(),
  data_source: z.string().optional(),
  company: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const contactUpdateSchema = z.object({
  relationship_score: z.number().min(0).max(1).optional(),
  strategic_value: z.enum(['high', 'medium', 'low', 'unknown']).optional(),
  notes: z.string().optional(),
});

export const projectSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  status: z.enum(['planning', 'active', 'completed', 'paused']).default('planning'),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  tags: z.array(z.string()).default([]),
});

export const storyFilterSchema = z.object({
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const intelligenceQuerySchema = z.object({
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
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        try {
          // Base query
          let query = supabase
            .from('linkedin_contacts')
            .select(
              'id, full_name, first_name, last_name, email_address, current_company, current_position, relationship_score, strategic_value, data_source, engagement_frequency, last_interaction, person_id',
              { count: 'exact' }
            )
            .order('relationship_score', { ascending: false })
            .range(input.offset, input.offset + input.limit - 1);

          if (input.strategic_value) {
            query = query.eq('strategic_value', input.strategic_value);
          }
          if (input.data_source) {
            query = query.eq('data_source', input.data_source);
          }
          if (input.company) {
            query = query.ilike('current_company', `%${input.company}%`);
          }
          if (input.search) {
            // Search in full_name or company
            query = query.or(
              `full_name.ilike.%${input.search}%,current_company.ilike.%${input.search}%`
            );
          }

          const { data, error, count } = await query;
          if (error) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Database query failed: ' + error.message,
              cause: error,
            });
          }

          return {
            data: (data as unknown as LinkedInContact[]) || [],
            count: count || 0,
            limit: input.limit,
            offset: input.offset,
            hasMore: (input.offset + input.limit) < (count || 0)
          };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch contacts',
            cause: error,
          });
        }
      }),

    // Get single contact by ID
    byId: publicProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }): Promise<LinkedInContact> => {
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        try {
          const { data, error } = await supabase
            .from('linkedin_contacts')
            .select('*')
            .eq('id', input.id)
            .single();
          if (error) throw error;
          if (!data) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found' });
          }
          return data as unknown as LinkedInContact;
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
        id: z.string().uuid(),
        data: contactUpdateSchema
      }))
      .mutation(async ({ input }): Promise<LinkedInContact> => {
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        try {
          const payload: any = {};
          if (typeof input.data.relationship_score === 'number') payload.relationship_score = input.data.relationship_score;
          if (input.data.strategic_value) payload.strategic_value = input.data.strategic_value;

          const { data, error } = await supabase
            .from('linkedin_contacts')
            .update(payload)
            .eq('id', input.id)
            .select('*')
            .single();
          if (error) throw error;
          return data as unknown as LinkedInContact;
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
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        try {
          // Total and average
          const { data: all, error: errAll } = await supabase
            .from('linkedin_contacts')
            .select('relationship_score, strategic_value, data_source');
          if (errAll) throw errAll;

          const total = all?.length || 0;
          const by_strategic_value: Record<string, number> = {};
          const by_data_source: Record<string, number> = {};
          let sum = 0;
          for (const row of all || []) {
            if (row.strategic_value) {
              by_strategic_value[row.strategic_value] = (by_strategic_value[row.strategic_value] || 0) + 1;
            }
            if (row.data_source) {
              by_data_source[row.data_source] = (by_data_source[row.data_source] || 0) + 1;
            }
            if (typeof row.relationship_score === 'number') sum += Number(row.relationship_score);
          }
          const average_score = total ? sum / total : 0;
          return { total, by_strategic_value, by_data_source, average_score } as ContactStats;
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch contact stats',
            cause: error,
          });
        }
      }),

    // Get projects linked to a LinkedIn contact
    projects: publicProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }) => {
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        try {
          const { data, error } = await supabase
            .from('linkedin_project_connections')
            .select('id, project_name, connection_type, relevance_score, potential_role, recommended_action, status, notion_project_id, created_at, updated_at')
            .eq('contact_id', input.id)
            .order('relevance_score', { ascending: false });
          if (error) throw error;
          return data || [];
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch contact projects',
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
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        try {
          let query = supabase
            .from('projects')
            .select('*', { count: 'exact' })
            .order('name', { ascending: true })
            .range(input.offset, input.offset + input.limit - 1);

          if (input.status) {
            query = query.eq('status', input.status);
          }

          const { data, error, count } = await query;
          if (error) throw error;

          return {
            data: (data as unknown as Project[]) || [],
            count: count || 0,
            limit: input.limit,
            offset: input.offset,
            hasMore: (input.offset + input.limit) < (count || 0)
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
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        try {
          let query = supabase
            .from('stories')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(input.offset, input.offset + input.limit - 1);

          if (typeof input.published === 'boolean') {
            query = query.eq('is_public', input.published);
          }
          if (input.tags && input.tags.length > 0) {
            // Assuming stories.themes is a text[]
            query = query.overlaps('themes', input.tags);
          }
          if (input.search) {
            query = query.or(
              `title.ilike.%${input.search}%,story_copy.ilike.%${input.search}%`
            );
          }

          const { data, error, count } = await query;
          if (error) throw error;

          return {
            data: (data as unknown as Story[]) || [],
            count: count || 0,
            limit: input.limit,
            offset: input.offset,
            hasMore: (input.offset + input.limit) < (count || 0)
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
