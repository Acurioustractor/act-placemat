/**
 * tRPC Server Configuration
 * Sets up the tRPC instance with context, middleware, and procedures
 */

import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

// Create context for each request
export const createContext = async ({ req, res }) => {
  // Add request-specific context here
  // Could include user authentication, database connections, etc.

  return {
    req,
    res,
    // Add user authentication if available
    user: null, // TODO: Extract from JWT token
    // Add database connections
    // db: database connection
  };
};

// Initialize tRPC
const t = initTRPC.context().create({
  transformer: superjson,
  errorFormatter(opts) {
    const { shape, error } = opts;
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.code === 'BAD_REQUEST' && error.cause ? error.cause : null,
      },
    };
  },
});

// Export reusable router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// Authentication middleware (for future use)
export const protectedProcedure = t.procedure.use(async (opts) => {
  const { ctx } = opts;

  // Check if user is authenticated
  if (!ctx.user) {
    throw new Error('Unauthorized');
  }

  return opts.next({
    ctx: {
      ...ctx,
      user: ctx.user, // Type-safe user context
    },
  });
});

// Admin middleware (for future use)
export const adminProcedure = protectedProcedure.use(async (opts) => {
  const { ctx } = opts;

  // Check if user has admin role
  // TODO: Implement role checking

  return opts.next({
    ctx,
  });
});

// Rate limiting middleware (for future use)
export const rateLimitedProcedure = publicProcedure.use(async (opts) => {
  // TODO: Implement rate limiting logic
  // Could use Redis to track request counts per IP/user

  return opts.next();
});

// Logging middleware
export const loggedProcedure = publicProcedure.use(async (opts) => {
  const start = Date.now();
  const result = await opts.next();
  const end = Date.now();

  console.log(`🔧 tRPC: ${opts.path} took ${end - start}ms`);

  return result;
});