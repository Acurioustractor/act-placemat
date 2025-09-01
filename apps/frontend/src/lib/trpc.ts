/**
 * tRPC Client Setup for Clean Frontend v2
 * Type-safe API integration with existing backend
 */

import { createTRPCReact } from '@trpc/react-query'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import superjson from 'superjson'

// Type-only import from backend router
export type AppRouter = any // Will be properly typed from backend

// React Query client
export const trpc = createTRPCReact<AppRouter>()

// Vanilla client for use outside React
export const trpcClient = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: getApiUrl(),
      headers() {
        return {
          'Content-Type': 'application/json',
        }
      },
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        })
      },
    }),
  ],
})

function getApiUrl(): string {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:4000/api/trpc'
  }
  
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/trpc`
  }
  
  return process.env.VITE_API_URL 
    ? `${process.env.VITE_API_URL}/api/trpc`
    : 'http://localhost:4000/api/trpc'
}

// Type helpers (will be properly typed from backend)
export type RouterInputs = any
export type RouterOutputs = any