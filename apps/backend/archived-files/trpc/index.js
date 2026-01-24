/**
 * tRPC Backend Integration
 * Exports the main router and creates Express middleware
 */

export { appRouter } from './router.js';
export { createContext } from './trpc.js';

// Re-export tRPC server utilities for convenience
export { TRPCError } from '@trpc/server';