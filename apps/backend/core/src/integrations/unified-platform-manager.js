import { Client as NotionClient } from '@notionhq/client'
import databaseManager from '../config/database.js'

const NOTION_TOKEN_KEYS = ['NOTION_TOKEN', 'NOTION_INTEGRATION_TOKEN', 'NOTION_API_TOKEN', 'NOTION_SECRET']

let cachedNotionClient = null

const getNotionToken = () => {
  for (const key of NOTION_TOKEN_KEYS) {
    if (process.env[key]) {
      return process.env[key]
    }
  }
  return null
}

const getNotionClient = () => {
  const token = getNotionToken()
  if (!token) {
    return null
  }

  if (!cachedNotionClient) {
    cachedNotionClient = new NotionClient({ auth: token })
  }

  return cachedNotionClient
}

async function getSupabaseStatus() {
  try {
    const client = databaseManager.getPrimaryClient()
    const { error } = await client.from('projects').select('id', { head: true, count: 'exact' })

    if (error) {
      throw error
    }

    return {
      healthy: true,
      configured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      lastChecked: new Date().toISOString()
    }
  } catch (error) {
    return {
      healthy: false,
      configured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      message: error?.message || 'Supabase query failed'
    }
  }
}

async function getNotionStatus() {
  const client = getNotionClient()

  if (!client) {
    return {
      healthy: false,
      configured: false,
      message: 'Notion token not configured'
    }
  }

  try {
    await client.search({ page_size: 1 })
    const hasPartnerDb = Boolean(process.env.NOTION_PARTNERS_DATABASE_ID)

    return {
      healthy: true,
      configured: true,
      partnersConfigured: hasPartnerDb,
      lastChecked: new Date().toISOString()
    }
  } catch (error) {
    return {
      healthy: false,
      configured: true,
      message: error?.message || 'Failed to reach Notion'
    }
  }
}

async function getGmailStatus() {
  const hasCredentials = Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET)

  if (!hasCredentials) {
    return {
      healthy: false,
      configured: false,
      message: 'Gmail OAuth client not configured'
    }
  }

  const port = process.env.PORT || 4000

  try {
    const response = await fetch(`http://localhost:${port}/api/gmail-sync/status`)

    if (!response.ok) {
      throw new Error(`Status ${response.status}`)
    }

    const data = await response.json()
    const healthy = Boolean(data.authenticated && data.initialized)

    return {
      healthy,
      configured: data.configured,
      authenticated: data.authenticated,
      initialized: data.initialized,
      hasTokens: data.hasTokens,
      lastChecked: new Date().toISOString()
    }
  } catch (error) {
    return {
      healthy: false,
      configured: true,
      message: error?.message || 'Failed to query Gmail status'
    }
  }
}

function buildPlatformSummary(services) {
  const entries = Object.values(services)
  const totalServices = entries.length
  const healthyCount = entries.filter((service) => service?.healthy).length

  let overall = 'offline'
  if (totalServices === healthyCount && totalServices > 0) {
    overall = 'healthy'
  } else if (healthyCount > 0) {
    overall = 'degraded'
  }

  return {
    overall,
    metrics: {
      healthyCount,
      totalServices
    },
    services,
    timestamp: new Date().toISOString()
  }
}

export async function initializePlatformIntegrations() {
  return { initialized: true, timestamp: new Date().toISOString() }
}

export async function syncEntityAcrossPlatforms(entityType, entityData, operation = 'update') {
  return {
    entityType,
    operation,
    synced: false,
    message: 'Cross-platform sync disabled in community build',
    entityData
  }
}

export async function getPlatformStatus() {
  const services = {
    supabase: await getSupabaseStatus(),
    notion: await getNotionStatus(),
    gmail: await getGmailStatus()
  }

  return buildPlatformSummary(services)
}

export async function performPlatformHealthCheck() {
  const summary = await getPlatformStatus()

  return {
    status: summary.overall,
    integrations: summary,
    timestamp: summary.timestamp
  }
}

