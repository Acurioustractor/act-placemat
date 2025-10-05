// Zod validation schemas for ACT Placemat
import { z } from 'zod';

// User schemas
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
});

export const updateUserSchema = createUserSchema.partial();

// Project schemas  
export const projectSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  status: z.enum(['active', 'completed', 'archived']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  status: z.enum(['active', 'completed', 'archived']).default('active'),
});

export const updateProjectSchema = createProjectSchema.partial();

// Story schemas
export const storySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  content: z.string(),
  authorId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createStorySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string(),
  authorId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
});

export const updateStorySchema = createStorySchema.partial();

// Community schemas
export const communityMemberSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['member', 'moderator', 'admin']),
  location: z.string().optional(),
  interests: z.array(z.string()),
  skills: z.array(z.string()),
  joinedAt: z.date(),
});

export const createCommunityMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['member', 'moderator', 'admin']).default('member'),
  location: z.string().optional(),
  interests: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
});

// API Response schemas
export const apiResponseSchema = <T extends z.ZodType>(dataSchema?: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema ? dataSchema.optional() : z.any().optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  });

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const paginatedResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: z.array(dataSchema),
    pagination: paginationSchema,
    error: z.string().optional(),
    message: z.string().optional(),
  });

// Worker task schemas
export const taskSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  payload: z.record(z.any()),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  retryCount: z.number().int().nonnegative().default(0),
  maxRetries: z.number().int().nonnegative().default(3),
  createdAt: z.date(),
  scheduledAt: z.date().optional(),
});

export const createTaskSchema = z.object({
  type: z.string(),
  payload: z.record(z.any()),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  maxRetries: z.number().int().nonnegative().default(3),
  scheduledAt: z.date().optional(),
});

// Environment configuration schemas
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32),
  API_KEY: z.string().optional(),
});

// Export type helpers
export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type Project = z.infer<typeof projectSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;

export type Story = z.infer<typeof storySchema>;
export type CreateStory = z.infer<typeof createStorySchema>;
export type UpdateStory = z.infer<typeof updateStorySchema>;

export type CommunityMember = z.infer<typeof communityMemberSchema>;
export type CreateCommunityMember = z.infer<typeof createCommunityMemberSchema>;

export type Task = z.infer<typeof taskSchema>;
export type CreateTask = z.infer<typeof createTaskSchema>;

export type Pagination = z.infer<typeof paginationSchema>;
export type EnvConfig = z.infer<typeof envSchema>;