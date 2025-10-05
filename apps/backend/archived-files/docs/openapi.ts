import { OpenAPIRegistry, OpenAPIGenerator } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
// Import zod schemas from tRPC router
import {
  contactsFilterSchema,
  contactUpdateSchema,
  projectSchema,
  storyFilterSchema,
  intelligenceQuerySchema,
} from '../trpc/router.ts'

export function generateOpenAPIDocument(baseUrl: string) {
  const registry = new OpenAPIRegistry()

  // Register schemas
  registry.register('ContactsFilter', contactsFilterSchema)
  registry.register('ContactUpdate', contactUpdateSchema)
  registry.register('ProjectCreate', projectSchema)
  registry.register('StoryFilter', storyFilterSchema)
  registry.register('IntelligenceQuery', intelligenceQuerySchema)

  // Minimal path docs for common endpoints
  registry.registerPath({
    method: 'get',
    path: '/health',
    summary: 'Platform health',
    responses: {
      200: { description: 'OK' },
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/api/v1/platform/status',
    summary: 'Platform status',
    responses: { 200: { description: 'OK' } },
  })

  // Example: doc tRPC contacts.list as GET with query mapped to ContactsFilter
  registry.registerPath({
    method: 'get',
    path: '/api/trpc/contacts.list',
    summary: 'List contacts (tRPC)',
    request: {
      query: contactsFilterSchema,
    },
    responses: { 200: { description: 'OK' } },
  })

  const generator = new OpenAPIGenerator(registry.definitions, '3.0.3')
  const doc = generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'ACT Platform API',
      version: '1.0.0',
      description: 'OpenAPI generated from Zod schemas',
    },
    servers: [{ url: baseUrl }],
  })

  return doc
}

