const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()

export const API_BASE_URL = rawBaseUrl && rawBaseUrl.length > 0
  ? rawBaseUrl.replace(/\/+$/, '')
  : 'http://localhost:4000'

// Empathy Ledger v2 API - runs on port 3000
const rawEmpathyLedgerUrl = (import.meta.env.VITE_EMPATHY_LEDGER_URL as string | undefined)?.trim()

export const EMPATHY_LEDGER_URL = rawEmpathyLedgerUrl && rawEmpathyLedgerUrl.length > 0
  ? rawEmpathyLedgerUrl.replace(/\/+$/, '')
  : 'http://localhost:3000'

// Command Center API - runs on port 3456
// Provides: relationship intelligence, agent proposals, tasks, LCAA stages
const rawCommandCenterUrl = (import.meta.env.VITE_COMMAND_CENTER_URL as string | undefined)?.trim()

export const COMMAND_CENTER_URL = rawCommandCenterUrl && rawCommandCenterUrl.length > 0
  ? rawCommandCenterUrl.replace(/\/+$/, '')
  : 'http://localhost:3456'

const rawUseMocks = (import.meta.env.VITE_USE_MOCK_DATA as string | undefined)?.trim()?.toLowerCase()

export const USE_MOCK_DATA = rawUseMocks === 'true' || rawUseMocks === '1'

export function resolveApiUrl(endpoint: string) {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint
  }
  const normalised = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${API_BASE_URL}${normalised}`
}

export function resolveEmpathyLedgerUrl(endpoint: string) {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint
  }
  const normalised = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${EMPATHY_LEDGER_URL}${normalised}`
}

export function resolveCommandCenterUrl(endpoint: string) {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint
  }
  const normalised = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${COMMAND_CENTER_URL}${normalised}`
}
