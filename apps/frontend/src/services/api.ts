import { resolveApiUrl } from '../config/env'

export interface DirectionFinanceSummary {
  status: string
  cashPosition: {
    receivable: number
    payable: number
    netPosition: number
  } | null
  runwayMonths: number | null
  overdueReceivables: number
  recommendations: string[]
  healthScore: number
  lastUpdated?: string | null
  fallback?: boolean
  error?: string
}

export interface DirectionProjectSummary {
  healthScore: number
  totalProjects: number
  focusProjects: Array<{
    id: string
    name: string
    healthScore?: number
    topRecommendation?: string
  }>
  needsByCategory: Record<string, number>
  highNeedProjects: Array<{
    id: string
    name: string
    fundingScore?: number
    engagementScore?: number
    regions?: Array<{ indigenousName?: string; displayName?: string }>
    tags?: string[]
  }>
}

export interface DirectionRelationshipSummary {
  status: string
  tierStats: Array<{
    tier: string
    total_contacts: number
    synced_to_notion?: number
    government_contacts?: number
  }>
  recentContacts: Array<{
    id: string
    name: string
    email: string
    domain?: string
    lastInteraction?: string
    totalEmails?: number
    interactionFrequency?: string
    isVip?: boolean
    daysSinceInteraction?: number | null
    freshness?: {
      label: string
      emoji: string
    }
  }>
  recommendations: string[]
  healthScore: number
}

export interface OpportunityHighlight {
  id: string
  name: string
  amount?: number
  deadline?: string | null
  stage?: string
  tags?: string[]
  probability?: number
  description?: string
  matchScore?: number
  fundingGapClosed?: number | null
  matchingProject?: {
    id: string
    name: string
    fundingScore?: number
    sharedTags?: string[]
  }
}

export interface DirectionWorkflowPlan {
  opportunity?: OpportunityHighlight & { description?: string }
  project?: {
    id: string
    name: string
    funding?: {
      score?: number
      status?: string
      recommendation?: string
    }
    overallScore?: number
  } | null
  recommendedContact?: {
    personId: string
    name: string
    email?: string
    currentRole?: string
    currentCompany?: string
    engagementPriority?: string
    compositeScore?: number
    planScore?: number
  } | null
  readinessScore?: number
  nextSteps?: Array<{
    type: string
    label: string
    detail?: string
    recommendedChannel?: string
    automationEndpoints?: string[]
  }>
  automationActions?: Array<{
    id: string
    endpoint: string
    description: string
    requiresConfirmation?: boolean
  }>
  aiAgentPrompt?: string
  projectJustification?: string | null
  contactJustification?: string | null
}

export interface DirectionScorecardData {
  directionScore: number
  updatedAt: string
  finance: DirectionFinanceSummary
  projects: DirectionProjectSummary
  relationships: DirectionRelationshipSummary
  opportunities: {
    highlights: OpportunityHighlight[]
  }
  workflow?: DirectionWorkflowPlan
}

export interface GmailCommunicationEntry {
  id: string
  gmail_id?: string | null
  thread_id?: string | null
  subject?: string | null
  snippet?: string | null
  from_email?: string | null
  from_name?: string | null
  to_emails?: string[] | null
  cc_emails?: string[] | null
  bcc_emails?: string[] | null
  sent_date?: string | null
  received_date?: string | null
  projects_mentioned?: string[] | null
  ai_summary?: string | null
  importance?: string | null
  follow_up_required?: boolean | null
  labels?: string[] | null
}

export interface CalendarAttendee {
  email?: string | null
  name?: string | null
  displayName?: string | null
  responseStatus?: string | null
}

export interface CalendarMeetingCommunication {
  id: string
  google_event_id?: string | null
  title?: string | null
  description?: string | null
  location?: string | null
  meeting_link?: string | null
  start_time?: string | null
  end_time?: string | null
  duration_minutes?: number | null
  attendees?: CalendarAttendee[] | null
  mentioned_projects?: string[] | null
  ai_summary?: string | null
  event_type?: string | null
  status?: string | null
}

export type CommunicationEntryType = 'email' | 'meeting'

export interface CommunicationTimelineEntry {
  type: CommunicationEntryType
  id: string
  occurredAt: string | null
  title: string
  summary?: string | null
  importance?: string | null
  followUpRequired?: boolean | null
  meetingType?: string | null
  durationMinutes?: number | null
  participants: string[]
  projects: string[]
}

export interface ProjectCommunicationInfo {
  id: string
  name?: string | null
  status?: string | null
  stage?: string | null
  summary?: string | null
}

export interface CommunicationLogResponse {
  success: boolean
  emails: GmailCommunicationEntry[]
  meetings: CalendarMeetingCommunication[]
  timeline: CommunicationTimelineEntry[]
  projects: Record<string, ProjectCommunicationInfo>
  stats: {
    emailCount: number
    meetingCount: number
    windowStart?: string
  }
}

export class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const { method = 'GET', headers: customHeaders, body } = options

      console.log(`🔍 Fetching: ${endpoint}`)

      const headers = new Headers(customHeaders || {})
      if (!headers.has('Accept')) headers.set('Accept', 'application/json')
      if (!headers.has('Content-Type') && method !== 'GET' && method !== 'HEAD') {
        headers.set('Content-Type', 'application/json')
      }

      const response = await fetch(resolveApiUrl(endpoint), {
        method,
        headers,
        mode: 'cors',
        body,
      })

      console.log(`📡 Response for ${endpoint}:`, response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ API Error for ${endpoint}:`, response.status, response.statusText, errorText)
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`✅ Data received for ${endpoint}:`, data)
      return data
    } catch (error) {
      console.error(`💥 API request failed for ${endpoint}:`, error)
      throw error
    }
  }

  // Dashboard - Real community overview data
  async getDashboardOverview() {
    return this.request('/api/dashboard/real-community-overview')
  }

  // Real Projects - From Notion databases
  async getDashboardProjects(limit: number = 100) {
    const result = await this.request<{ success: boolean; count: number; projects: Record<string, unknown>[] }>(
      '/api/real/projects'
    )

    // Return projects in the expected format for compatibility
    if (result.success && result.projects) {
      // Map backend fields to frontend expectations (title -> name)
      const mappedProjects = result.projects.map(p => ({
        ...p,
        name: (p as any).name || p.title || 'Untitled Project',
        // Keep title as well for compatibility
        title: p.title || (p as any).name || 'Untitled Project'
      }))

      // Limit the results if needed (increased default to 100 to show all projects)
      const projects = mappedProjects.slice(0, limit)
      return { projects }
    }

    return { projects: [] }
  }

  async addProjectStoryteller(
    projectId: string,
    storyteller: {
      fullName: string
      bio?: string | null
      consentGranted?: boolean
      expertiseAreas?: string[] | string
      profileImageUrl?: string | null
      mediaType?: string | null
    }
  ) {
    return this.request(`/api/real/projects/${encodeURIComponent(projectId)}/storytellers`, {
      method: 'POST',
      body: JSON.stringify(storyteller),
    })
  }

  // Real Contacts - From Notion and LinkedIn
  async getDashboardContacts() {
    return this.request('/api/dashboard/real-contacts')
  }

  // Recent Activity
  async getRecentActivity() {
    return this.request('/api/dashboard/real-recent-activity')
  }

  // System Health - System health and status
  async getSystemHealth() {
    return this.request('/api/health')
  }

  // Financial Dashboard - Real Xero data
  async getFinancialDashboard() {
    return this.request('/api/business-dashboard')
  }

  // Performance metrics (legacy support for existing hooks)
  async getPerformanceMetrics() {
    return this.request('/api/dashboard/real-community-overview')
  }

  // AI recommendations (uses unified intelligence endpoint when available)
  async getAIRecommendations() {
    return this.request('/api/dashboard/real-recent-activity')
  }

  // Integration Status
  async getIntegrationStatus() {
    return this.request('/api/integrations/status')
  }

  async getDirectionScorecard(options: { fresh?: boolean } = {}): Promise<DirectionScorecardData> {
    const params = new URLSearchParams()
    if (options.fresh) params.set('fresh', 'true')
    const query = params.toString()
    const endpoint = query ? `/api/v2/direction/scorecard?${query}` : '/api/v2/direction/scorecard'
    const response = await this.request<{ success: boolean; scorecard: DirectionScorecardData }>(endpoint)
    return response.scorecard
  }

  async pursueOpportunity(opportunityId: string, payload: { projectId?: string } = {}): Promise<DirectionWorkflowPlan> {
    const response = await this.request<{ success: boolean; plan: DirectionWorkflowPlan }>(
      `/api/v2/opportunities/${encodeURIComponent(opportunityId)}/pursue`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )
    return response.plan
  }

  async triggerAutomationAction(endpoint: string, body: Record<string, unknown> = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  // LinkedIn Network
  async getLinkedInNetwork() {
    return this.request('/api/linkedin-network')
  }

  // CRM Metrics
  async getCRMMetrics() {
    return this.request('/api/crm/metrics')
  }

  // LinkedIn Contacts
  async getLinkedInContacts(limit: number = 10) {
    return this.request(`/api/crm/linkedin-contacts?limit=${limit}`)
  }

  // Project-Contact Alignment
  async getProjectContactAlignment(limit: number = 5) {
    return this.request(`/api/project-contact-alignment?limit=${limit}`)
  }

  async getCalendarHighlights(limit: number = 5, days: number = 14) {
    const params = new URLSearchParams({ limit: String(limit), days: String(days) })
    return this.request(`/api/calendar/events?${params.toString()}`)
  }

  async getGmailStatus() {
    return this.request('/api/gmail-sync/status')
  }

  async getGmailCommunityEmails(limit: number = 5) {
    const params = new URLSearchParams({ limit: String(limit) })
    return this.request(`/api/gmail-sync/community-emails?${params.toString()}`)
  }

  async getProjectAlignmentOverview(limit: number = 5) {
    const params = new URLSearchParams({ limit: String(limit) })
    return this.request(`/api/project-contact-alignment?${params.toString()}`)
  }

  async getContactCoach() {
    return this.request('/api/contact-coach')
  }

  async getSimpleContactDashboard() {
    return this.request('/api/simple-contact-dashboard')
  }

  async getIntelligenceDashboard() {
    return this.request('/api/intelligence/dashboard')
  }

  async getOutreachTasks(params: { status?: string; owner?: string; limit?: number } = {}) {
    const searchParams = new URLSearchParams()
    if (params.status && params.status !== 'all') searchParams.set('status', params.status)
    if (params.owner) searchParams.set('owner', params.owner)
    if (params.limit) searchParams.set('limit', String(params.limit))
    const query = searchParams.toString()
    const endpoint = query ? `/api/intelligence/outreach-tasks?${query}` : '/api/intelligence/outreach-tasks'
    const payload = await this.request(endpoint)
    const data = (payload as any)?.data
    return data ?? payload
  }

  async createOutreachTask(task: {
    contactId: string | number
    projectId: string
    projectName?: string
    contactName?: string
    priority?: string
    recommendedChannel?: string
    owner?: string
    scheduledAt?: string | null
    draftMessage?: string | null
    aiBrief?: unknown
  }) {
    const body = JSON.stringify(task)
    const payload = await this.request('/api/intelligence/outreach-tasks', {
      method: 'POST',
      body,
    })
    const data = (payload as any)?.data
    return data ?? payload
  }

  async updateOutreachTask(taskId: string, updates: Record<string, unknown>) {
    const body = JSON.stringify(updates)
    const payload = await this.request(`/api/intelligence/outreach-tasks/${taskId}`, {
      method: 'PATCH',
      body,
    })
    const data = (payload as any)?.data
    return data ?? payload
  }

  // Opportunities API
  async getOpportunities(params: { status?: string; minAmount?: number; maxAmount?: number } = {}) {
    const searchParams = new URLSearchParams()
    if (params.status) searchParams.set('status', params.status)
    if (params.minAmount) searchParams.set('minAmount', String(params.minAmount))
    if (params.maxAmount) searchParams.set('maxAmount', String(params.maxAmount))
    const query = searchParams.toString()
    const endpoint = query ? `/api/opportunities?${query}` : '/api/opportunities'
    return this.request(endpoint)
  }

  async discoverOpportunities(query: string, maxResults: number = 5) {
    return this.request('/api/opportunities/discover', {
      method: 'POST',
      body: JSON.stringify({ query, maxResults })
    })
  }

  async matchOpportunitiesToProject(projectId: string) {
    return this.request(`/api/opportunities/match/${projectId}`)
  }

  async getProjectSupport(limit: number = 20) {
    const params = new URLSearchParams({ limit: String(limit) })
    const payload = await this.request(`/api/intelligence/project-support?${params.toString()}`)
    const data = (payload as any)?.data
    return data ?? payload
  }

  async searchProjectSupport(params: { limit?: number; search?: string }) {
    const searchParams = new URLSearchParams()
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.search) searchParams.set('search', params.search)
    const query = searchParams.toString()
    const payload = await this.request(`/api/intelligence/project-support${query ? `?${query}` : ''}`)
    const data = (payload as any)?.data
    return data ?? payload
  }

  async getProjectIntelligence(projectId: string) {
    const payload = await this.request(`/api/intelligence/project-support/${projectId}/intelligence`)
    const data = (payload as any)?.data
    return data ?? payload
  }

  // AI Query System
  async queryIntelligence(query: string) {
    return fetch(resolveApiUrl('/api/ask'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    }).then(r => r.json())
  }

  // Business Intelligence
  async queryBusinessIntelligence(query: any) {
    return fetch(resolveApiUrl('/api/business-intelligence'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    }).then(r => r.json())
  }

  // Integration Monitoring - Real-time health status for all data sources
  async getAllIntegrationHealth() {
    return this.request('/api/v2/monitoring/integrations')
  }

  async getIntegrationHealth(source: string) {
    return this.request(`/api/v2/monitoring/integrations/${source}`)
  }

  async triggerIntegrationSync(source: string) {
    return this.request(`/api/v2/monitoring/integrations/${source}/sync`, {
      method: 'POST'
    })
  }

  async getMonitoringStatistics() {
    return this.request('/api/v2/monitoring/statistics')
  }

  async getMonitoringHealth() {
    return this.request('/api/v2/monitoring/health')
  }

  // Server-Sent Events for real-time monitoring
  createMonitoringStream(onMessage: (data: any) => void, onError?: (error: any) => void) {
    const eventSource = new EventSource(resolveApiUrl('/api/v2/monitoring/stream'))

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (error) {
        console.error('Error parsing SSE data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      if (onError) onError(error)
    }

    return eventSource // Return so caller can close connection
  }

  // Project Intelligence - Gmail, Calendar, Contacts
  async getProjectEmails(projectId: string, limit: number = 20) {
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/emails?limit=${limit}`)
  }

  async getProjectCalendar(projectId: string, limit: number = 20) {
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/calendar?limit=${limit}`)
  }

  async getProjectContacts(projectId: string) {
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/contacts`)
  }

  // Convenience method that matches the getProjects format
  async getProjects() {
    return this.getDashboardProjects()
  }

  async getProjectNeeds() {
    return this.request('/api/v2/projects/needs')
  }

  async getProjectCommunications(params: { projectId?: string; limit?: number; days?: number } = {}) {
    const searchParams = new URLSearchParams()
    if (params.projectId) searchParams.set('projectId', params.projectId)
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.days) searchParams.set('days', String(params.days))
    const query = searchParams.toString()
    const endpoint = query ? `/api/v2/projects/activity/communications?${query}` : '/api/v2/projects/activity/communications'
    return this.request<CommunicationLogResponse>(endpoint)
  }
}

export const api = new ApiService()
