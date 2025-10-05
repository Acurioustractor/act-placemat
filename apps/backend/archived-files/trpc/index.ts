/**
 * tRPC Backend Integration
 * Exports the main router and creates Express middleware
 */

export { appRouter, type AppRouter } from './router.js';
export { createContext, type Context } from './trpc.js';

// Re-export tRPC server utilities for convenience
export { TRPCError } from '@trpc/server';
export type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';