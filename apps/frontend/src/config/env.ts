const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()

export const API_BASE_URL = rawBaseUrl && rawBaseUrl.length > 0
  ? rawBaseUrl.replace(/\/+$/, '')
  : 'http://localhost:4000'

const rawUseMocks = (import.meta.env.VITE_USE_MOCK_DATA as string | undefined)?.trim()?.toLowerCase()

export const USE_MOCK_DATA = rawUseMocks === 'true' || rawUseMocks === '1'

export function resolveApiUrl(endpoint: string) {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint
  }
  const normalised = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${API_BASE_URL}${normalised}`
}
