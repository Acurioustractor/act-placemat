import { resolveApiUrl, resolveCommandCenterUrl } from '../config/env'
import type { Project } from '../types/project'

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
  private async request<T>(endpoint: string, options: RequestInit & { useCommandCenter?: boolean } = {}): Promise<T> {
    try {
      const { method = 'GET', headers: customHeaders, body, useCommandCenter } = options

      console.log(`🔍 Fetching: ${endpoint}`)

      const headers = new Headers(customHeaders || {})
      if (!headers.has('Accept')) headers.set('Accept', 'application/json')
      if (!headers.has('Content-Type') && method !== 'GET' && method !== 'HEAD') {
        headers.set('Content-Type', 'application/json')
      }

      // Use Command Center URL for calendar endpoints and other Command Center APIs
      const url = useCommandCenter ? resolveCommandCenterUrl(endpoint) : resolveApiUrl(endpoint)

      const response = await fetch(url, {
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
    const result = await this.request<{ success: boolean; count: number; projects: unknown[] }>(
      '/api/projects/notion'
    )

    // Return projects in the expected format for compatibility
    if (result && result.projects) {
      // Map backend fields to frontend expectations
      const mappedProjects: Project[] = (result.projects as unknown[]).map((raw: any, index: number) => {
        const p = raw ?? {}
        const data = p.data || {}

        // Use data fields if available, fallback to root level
        const name = data.name || p.name || p.title || 'Untitled Project'
        const id = String(
          p.id ??
            p.notion_id ??
            data.id ??
            p.project_id ??
            p.notionId ??
            p.notionIdShort ??
            p.notion_id_short ??
            data.notionId ??
            p.slug ??
            name ??
            index,
        )

        // Extract status - try data first, then root
        const status = data.status || p.status || 'Planning'
        const projectType = data.type || p.type || 'mixed'

        return {
          ...p,
          id,
          name,
          title: data.title || p.title || name,
          status,
          projectType: projectType as any,
          description: data.description || p.description || null,
          area: data.area || p.area || null,
          themes: data.themes || p.tags || [],
          budget: data.budget || p.budget || null,
          lead: data.lead || p.lead || null,
          funding: data.funding || p.funding || null,
          coverImage: data.coverImage || p.coverImage || null,
          startDate: data.startDate || p.startDate || null,
          updatedAt: data.updatedAt || p.updatedAt || null,
        } as Project
      })

      // Limit the results if needed
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
    return this.request(`/api/calendar/events?${params.toString()}`, { useCommandCenter: true })
  }

  // Get events from ALL calendars (aggregated across organizations)
  // Now pulls from Supabase calendar_events table via Command Center
  async getCalendarEventsAll(days: number = 30, limit: number = 100) {
    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() - 7) // Include past week
    const end = new Date(now)
    end.setDate(end.getDate() + days)

    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
      limit: String(limit)
    })
    return this.request(`/api/calendar/events?${params.toString()}`, { useCommandCenter: true })
  }

  // List all accessible calendars
  async getCalendarList() {
    return this.request('/api/calendar/calendars')
  }

  // Get calendar events for date range (new Supabase-backed API via Command Center)
  async getCalendarEvents(options: {
    start?: string
    end?: string
    project?: string
    calendarId?: string
    limit?: number
  } = {}) {
    const params = new URLSearchParams()
    if (options.start) params.set('start', options.start)
    if (options.end) params.set('end', options.end)
    if (options.project) params.set('project', options.project)
    if (options.calendarId) params.set('calendar_id', options.calendarId)
    if (options.limit) params.set('limit', String(options.limit))
    return this.request(`/api/calendar/events?${params.toString()}`, { useCommandCenter: true })
  }

  // Get today's events with free time blocks
  async getCalendarToday() {
    return this.request('/api/calendar/today', { useCommandCenter: true })
  }

  // Get calendar statistics
  async getCalendarStats(start?: string, end?: string) {
    const params = new URLSearchParams()
    if (start) params.set('start', start)
    if (end) params.set('end', end)
    return this.request(`/api/calendar/stats?${params.toString()}`, { useCommandCenter: true })
  }

  // Get monthly calendar report
  async getCalendarMonthlyReport(year: number, month: number) {
    return this.request(`/api/calendar/reports/monthly/${year}/${month}`, { useCommandCenter: true })
  }

  // Link project to calendar event
  async linkProjectToEvent(eventId: string, projectCode: string) {
    return this.request(`/api/calendar/events/${eventId}/link-project`, {
      method: 'POST',
      body: JSON.stringify({ project_code: projectCode }),
      useCommandCenter: true
    })
  }

  // Get calendar events for a project
  async getProjectCalendarEvents(projectCode: string, options: { upcoming?: boolean; limit?: number } = {}) {
    const params = new URLSearchParams()
    params.set('upcoming', String(options.upcoming !== false))
    if (options.limit) params.set('limit', String(options.limit))
    return this.request(`/api/projects/${encodeURIComponent(projectCode)}/calendar?${params.toString()}`, { useCommandCenter: true })
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

  // Live Notion projects from Command Center (synced to Supabase)
  async getNotionProjects(options: { status?: string; type?: string; limit?: number } = {}) {
    const params = new URLSearchParams()
    if (options.status) params.set('status', options.status)
    if (options.type) params.set('type', options.type)
    if (options.limit) params.set('limit', String(options.limit))
    const query = params.toString()
    const endpoint = query ? `/api/projects/notion?${query}` : '/api/projects/notion'
    return this.request<{
      success: boolean
      count: number
      last_synced: string
      projects: Array<{
        id: string
        notion_id: string
        name: string
        status: string | null
        type: string | null
        budget: number | null
        progress: number | null
        tags: string[]
        metadata: Record<string, unknown>
        data: Record<string, unknown>
        last_synced: string
        updated_at: string
      }>
    }>(endpoint, { useCommandCenter: true })
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
