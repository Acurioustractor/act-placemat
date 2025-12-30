/**
 * Zod Validation Schemas for API v1
 *
 * Runtime validation schemas that match TypeScript types
 * from @act-placemat/shared-types
 */

import { z } from 'zod';

// =============================================
// Project Schemas
// =============================================

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed', 'paused']),
  priority: z.enum(['high', 'medium', 'low']),
  tags: z.array(z.string()),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const ProjectCreateSchema = ProjectSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const ProjectUpdateSchema = ProjectSchema.partial().omit({
  id: true,
  created_at: true,
});

// =============================================
// Contact Schemas
// =============================================

export const ContactSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email_address: z.string().email().optional(),
  current_company: z.string().optional(),
  current_position: z.string().optional(),
  relationship_score: z.number().min(0).max(100).optional(),
  strategic_value: z.enum(['high', 'medium', 'low', 'unknown']).optional(),
  data_source: z.string().optional(),
  engagement_frequency: z.string().optional(),
  last_interaction: z.string().optional(),
  person_id: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const ContactUpdateSchema = z.object({
  relationship_score: z.number().min(0).max(100).optional(),
  strategic_value: z.enum(['high', 'medium', 'low', 'unknown']).optional(),
  notes: z.string().optional(),
});

export const ContactsFilterSchema = z.object({
  strategic_value: z.string().optional(),
  data_source: z.string().optional(),
  company: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// =============================================
// Media Schemas
// =============================================

export const MediaItemSchema = z.object({
  id: z.string(),
  fileUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  fileType: z.enum(['photo', 'video', 'document']),
  title: z.string().optional(),
  description: z.string().optional(),
  altText: z.string().optional(),
  caption: z.string().optional(),
  isHero: z.boolean().optional(),
  displayOrder: z.number().optional(),
});

export const MediaSearchSchema = z.object({
  tags: z.array(z.string()).optional(),
  type: z.enum(['photo', 'video', 'document']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// =============================================
// Year in Review Schemas
// =============================================

export const TimelineEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  title: z.string(),
  description: z.string(),
  source: z.enum(['gmail', 'notion', 'linkedin', 'manual']),
  type: z.enum(['project', 'milestone', 'partnership', 'funding', 'launch', 'communication', 'social']),
  tags: z.array(z.string()),
  photos: z.array(z.string()).optional(),
  quote: z.object({
    text: z.string(),
    author: z.string(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const ReviewProjectSchema = z.object({
  id: z.string(),
  year: z.number(),
  timelineEntryId: z.string(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  season: z.string().optional(),
  heroImageUrl: z.string().url().optional(),
  heroVideoUrl: z.string().url().optional(),
  isFeatured: z.boolean(),
  featuredOrder: z.number().optional(),
  isPublished: z.boolean(),
  publishedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// =============================================
// Query Parameter Schemas
// =============================================

export const PaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const IDParamSchema = z.object({
  id: z.string(),
});

// =============================================
// Response Schemas
// =============================================

export const PaginatedResponseSchema = (itemSchema) => z.object({
  data: z.array(itemSchema),
  count: z.number(),
  limit: z.number(),
  offset: z.number(),
  hasMore: z.boolean(),
});
