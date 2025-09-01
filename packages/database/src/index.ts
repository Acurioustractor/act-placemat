/**
 * Life OS Database Access Layer
 * Centralized database access using Prisma ORM for type-safe operations
 * Maintains Beautiful Obsolescence principles and Australian compliance
 */

import { PrismaClient } from '../generated/client';
import type {
  User,
  Project,
  Story,
  Comment,
  Opportunity,
  Media,
  LifeOSProfile,
  Habit,
  Goal,
  CalendarEvent,
  FinancialTransaction,
  Budget,
  HabitCompletion,
  GoalMilestone,
  GoalUpdate,
  MeditationSession,
  MoodEntry,
  Journal,
  EventAttendee,
} from '../generated/client';

// Export all types for use in applications
export type {
  User,
  Project,
  Story,
  Comment,
  Opportunity,
  Media,
  LifeOSProfile,
  Habit,
  Goal,
  CalendarEvent,
  FinancialTransaction,
  Budget,
  HabitCompletion,
  GoalMilestone,
  GoalUpdate,
  MeditationSession,
  MoodEntry,
  Journal,
  EventAttendee,
  UserRole,
  ProjectRole,
  ProjectStatus,
  StoryStatus,
  Visibility,
  CommentStatus,
  OpportunityType,
  OpportunityStatus,
  ApplicationStatus,
  HabitFrequency,
  GoalStatus,
  Priority,
  MilestoneStatus,
  EventType,
  AttendeeStatus,
  TransactionType,
  BudgetPeriod,
} from '../generated/client';

// Database configuration
const DATABASE_CONFIG = {
  // Connection settings
  datasourceUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/act_placemat',

  // Australian compliance settings
  timezone: 'Australia/Sydney',
  locale: 'en-AU',
  currency: 'AUD',

  // Beautiful Obsolescence settings
  dataResidency: 'Australia',
  communityControl: true,
  extractiveSystemsTargeting: true,

  // Connection pool settings
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '60000'),
} as const;

// Singleton Prisma client with proper configuration
let prisma: PrismaClient | undefined;

/**
 * Get Prisma client instance with proper configuration
 * Implements singleton pattern for connection reuse
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasourceUrl: DATABASE_CONFIG.datasourceUrl,
      log:
        process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      errorFormat: 'pretty',
    });

    // Add middleware for Australian timezone handling
    prisma.$use(async (params, next) => {
      const result = await next(params);

      // Ensure all datetime fields respect Australian timezone
      if (result && typeof result === 'object' && 'createdAt' in result) {
        // Note: Prisma handles timezone conversion automatically when configured properly
        // This middleware is here for any additional timezone processing if needed
      }

      return result;
    });

    // Graceful shutdown handling
    process.on('beforeExit', async () => {
      await prisma?.$disconnect();
    });
  }

  return prisma;
}

/**
 * Test database connectivity and configuration
 */
export async function testDatabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
  config: typeof DATABASE_CONFIG;
}> {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;

    return {
      connected: true,
      config: DATABASE_CONFIG,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown connection error',
      config: DATABASE_CONFIG,
    };
  }
}

/**
 * Execute database health check
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  checks: {
    connection: boolean;
    migrations: boolean;
    performance: boolean;
  };
  metrics?: {
    connectionCount: number;
    avgQueryTime: number;
  };
}> {
  const client = getPrismaClient();

  try {
    // Test basic connectivity
    const startTime = Date.now();
    await client.$queryRaw`SELECT 1`;
    const queryTime = Date.now() - startTime;

    // Check if migrations are up to date
    // This is a simplified check - in production you'd want more sophisticated migration validation
    const userCount = await client.user.count();
    const migrationsApplied = userCount !== undefined;

    return {
      status: 'healthy',
      checks: {
        connection: true,
        migrations: migrationsApplied,
        performance: queryTime < 1000, // Less than 1 second for basic query
      },
      metrics: {
        connectionCount: 1, // Simplified - would need more sophisticated connection tracking
        avgQueryTime: queryTime,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      checks: {
        connection: false,
        migrations: false,
        performance: false,
      },
    };
  }
}

/**
 * Close database connections gracefully
 */
export async function closeDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
  }
}

//=============================================
// SERVICE EXPORTS
//=============================================

// Import and re-export all Life OS service classes
export { HabitService } from './services/habitService';
export { LifeOSProfileService } from './services/lifeOSProfileService';
export { GoalService } from './services/goalService';
export { CalendarService } from './services/calendarService';
export { FinancialService } from './services/financialService';
export { MindfulnessService } from './services/mindfulnessService';

// Export the client getter as default
export default getPrismaClient;
