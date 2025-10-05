/**
 * Project-Contact Alignment System
 * Intelligently matches Notion projects with relevant LinkedIn contacts
 * for strategic networking recommendations
 */

import { createClient } from '@supabase/supabase-js'
import notionService from '../services/notionService.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PROJECT_CACHE_TTL_MS = 60 * 1000
let cachedProjects = null
let cachedProjectsFetchedAt = 0

const normaliseId = (id = '') => id.replace(/-/g, '').toLowerCase()

const toStringArray = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        return item.name || item.title || item.text || item.id || ''
      }
      return ''
    })
    .filter(Boolean)
    .map((entry) => String(entry).trim())
    .filter(Boolean)
}

const uniqueStrings = (values = []) => [...new Set(values)]

const collectStrings = (value) => uniqueStrings(toStringArray(value))

async function loadNotionProjects() {
  const now = Date.now()
  if (cachedProjects && now - cachedProjectsFetchedAt < PROJECT_CACHE_TTL_MS) {
    return cachedProjects
  }

  const projects = await notionService.getProjects(false)
  cachedProjects = projects || []
  cachedProjectsFetchedAt = now
  return cachedProjects
}

function selectProjectById(projects, projectId) {
  const target = normaliseId(projectId)
  return projects.find((project) => normaliseId(project.id) === target)
}

const formatProjectForResponse = (project) => {
  const themes = collectStrings(project.themes)
  const tags = collectStrings(project.tags)
  const relationshipPillars = collectStrings(project.relationshipPillars)
  const notionIdShort = project.notionIdShort || (project.id ? project.id.replace(/-/g, '') : null)
  const leadName = project.lead || project.projectLead?.name || null

  return {
    id: project.id,
    name: project.name,
    status: project.status,
    area: project.area || null,
    aiSummary: project.aiSummary || project.description || '',
    description: project.description || project.aiSummary || '',
    themes,
    tags,
    relationshipPillars,
    coreValues: project.coreValues || null,
    nextMilestoneDate: project.nextMilestoneDate || null,
    funding: project.funding || null,
    actualIncoming: project.actualIncoming ?? null,
    potentialIncoming: project.potentialIncoming ?? null,
    projectLead: project.projectLead || (leadName ? { name: leadName } : null),
    lead: leadName,
    notionUrl: project.notionUrl || null,
    notionId: project.notionId || project.id || null,
    notionIdShort,
    notionCreatedAt: project.notionCreatedAt || project.createdAt || null,
    notionLastEditedAt: project.notionLastEditedAt || project.updatedAt || null,
  }
}

const projectOrgCandidates = (project) => {
  const candidates = []
  if (project.area) candidates.push(project.area)
  if (project.coreValues) candidates.push(project.coreValues)
  collectStrings(project.themes).forEach((value) => candidates.push(value))
  collectStrings(project.tags).forEach((value) => candidates.push(value))
  collectStrings(project.relationshipPillars).forEach((value) => candidates.push(value))
  if (project.lead) candidates.push(project.lead)
  if (project.projectLead?.name) candidates.push(project.projectLead.name)
  return uniqueStrings(candidates.filter(Boolean))
}

export default function setupProjectContactAlignment(app) {

  // Get project-contact alignment recommendations
  app.get('/api/project-contact-alignment/:projectId', async (req, res) => {
    try {
      const { projectId } = req.params
      const { limit = 20 } = req.query

      console.log(`🎯 Finding contact alignment for project: ${projectId}`)

      const projects = await loadNotionProjects()
      const project = selectProjectById(projects, projectId)

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        })
      }

      // Create intelligent matching criteria based on project
      const alignmentQuery = await buildAlignmentQuery(project, limit)
      console.log(`📊 Running alignment query for "${project.name}"`)

      const { data: alignedContacts, error } = await supabase
        .from('linkedin_contacts')
        .select(`
          id, full_name, current_position, current_company,
          relationship_score, strategic_value, alignment_tags,
          linkedin_url, connected_on, interaction_count
        `)
        .or(alignmentQuery)
        .gte('relationship_score', 0.6) // Focus on stronger relationships
        .order('relationship_score', { ascending: false })
        .limit(parseInt(limit))

      if (error) {
        throw error
      }

      // Score and rank contacts by alignment with project
      const rankedContacts = alignedContacts.map(contact => ({
        ...contact,
        alignment_score: calculateAlignmentScore(contact, project),
        alignment_reasons: getAlignmentReasons(contact, project)
      })).sort((a, b) => b.alignment_score - a.alignment_score)

      res.json({
        success: true,
        project: formatProjectForResponse(project),
        aligned_contacts: rankedContacts,
        total: rankedContacts.length,
        alignment_strategy: getAlignmentStrategy(project)
      })

    } catch (error) {
      console.error('❌ Project-contact alignment error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to generate project-contact alignment',
        details: error.message
      })
    }
  })

  // Get all projects with top contact recommendations
  app.get('/api/project-contact-alignment', async (req, res) => {
    try {
      const { limit = 5 } = req.query

      console.log('🎯 Generating project-contact alignment overview')

      const allProjects = await loadNotionProjects()
      const activeProjects = allProjects
        .filter(p => typeof p.status === 'string' && p.status.toLowerCase().includes('active'))
        .slice(0, 10)

      // Generate recommendations for each project
      const projectRecommendations = await Promise.all(
        activeProjects.map(async (project) => {
          try {
            const alignmentQuery = await buildAlignmentQuery(project, parseInt(limit))

            const { data: contacts } = await supabase
              .from('linkedin_contacts')
              .select(`
                id, full_name, current_position, current_company,
                relationship_score, strategic_value, alignment_tags,
                linkedin_url
              `)
              .or(alignmentQuery)
              .gte('relationship_score', 0.65)
              .order('relationship_score', { ascending: false })
              .limit(parseInt(limit))

            const rankedContacts = (contacts || []).map(contact => ({
              ...contact,
              alignment_score: calculateAlignmentScore(contact, project),
              alignment_reasons: getAlignmentReasons(contact, project)
            })).sort((a, b) => b.alignment_score - a.alignment_score)

            return {
              project: formatProjectForResponse(project),
              recommended_contacts: rankedContacts,
              alignment_strategy: getAlignmentStrategy(project)
            }
          } catch (error) {
            console.error(`Error processing project ${project.name}:`, error)
            return {
              project: formatProjectForResponse(project),
              recommended_contacts: [],
              alignment_strategy: { focus: 'general', keywords: [] }
            }
          }
        })
      )

      res.json({
        success: true,
        project_alignments: projectRecommendations.filter(pr => pr.recommended_contacts.length > 0),
        total_projects: projectRecommendations.length
      })

    } catch (error) {
      console.error('❌ Project alignment overview error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to generate project alignment overview',
        details: error.message
      })
    }
  })

}

// Build intelligent alignment query based on project characteristics
async function buildAlignmentQuery(project, limit) {
  const queries = []

  // Match by organization / focus keywords (area, core values, etc.)
  for (const candidate of projectOrgCandidates(project)) {
    queries.push(`current_company.ilike.%${candidate}%`)
  }

  // Match by project keywords in position titles
  const projectKeywords = extractProjectKeywords(project)
  projectKeywords.forEach(keyword => {
    queries.push(`current_position.ilike.%${keyword}%`)
  })

  // Match by relevant alignment tags based on project type
  const relevantTags = getRelevantTags(project)
  relevantTags.forEach(tag => {
    queries.push(`alignment_tags.cs.{${tag}}`)
  })

  // If no specific matches, fall back to high-value contacts
  if (queries.length === 0) {
    queries.push(`strategic_value.eq.high`)
  }

  return queries.join(',')
}

// Extract relevant keywords from project name and description
function extractProjectKeywords(project) {
  const keywords = []
  const text = [
    project.name,
    project.description,
    project.aiSummary,
    project.area,
    collectStrings(project.themes).join(' '),
    collectStrings(project.tags).join(' '),
    collectStrings(project.relationshipPillars).join(' ')
  ].filter(Boolean).join(' ').toLowerCase()

  // Domain-specific keyword mapping
  const keywordMappings = {
    'youth': ['youth', 'young people', 'adolescent', 'teen'],
    'justice': ['justice', 'legal', 'law', 'court', 'criminal'],
    'mental health': ['mental health', 'wellbeing', 'psychology', 'counsell'],
    'indigenous': ['indigenous', 'aboriginal', 'torres strait', 'first nations'],
    'community': ['community', 'social', 'outreach', 'support'],
    'education': ['education', 'school', 'university', 'training'],
    'health': ['health', 'medical', 'clinical', 'therapy'],
    'development': ['development', 'program', 'project', 'initiative'],
    'service': ['service', 'program', 'support', 'assistance'],
    'ranger': ['ranger', 'environmental', 'conservation', 'land management']
  }

  Object.entries(keywordMappings).forEach(([domain, domainKeywords]) => {
    if (domainKeywords.some(keyword => text.includes(keyword))) {
      keywords.push(domain)
      keywords.push(...domainKeywords)
    }
  })

  // Extract organization type keywords
  const orgCandidates = projectOrgCandidates(project).map(value => value.toLowerCase())
  if (orgCandidates.length > 0) {
    if (orgCandidates.some(org => org.includes('university') || org.includes('college'))) {
      keywords.push('academic', 'research', 'education')
    }
    if (orgCandidates.some(org => org.includes('department') || org.includes('government'))) {
      keywords.push('government', 'policy', 'public sector')
    }
    if (orgCandidates.some(org => org.includes('foundation') || org.includes('fund'))) {
      keywords.push('funding', 'grants', 'philanthropy')
    }
  }

  return [...new Set(keywords)] // Remove duplicates
}

// Get relevant alignment tags for project
function getRelevantTags(project) {
  const tags = []
  const text = [
    project.name,
    project.description,
    project.aiSummary,
    project.area,
    collectStrings(project.themes).join(' '),
    collectStrings(project.tags).join(' '),
    collectStrings(project.relationshipPillars).join(' ')
  ].filter(Boolean).join(' ').toLowerCase()

  // Tag mapping based on project characteristics
  if (text.includes('youth') || text.includes('young')) {
    tags.push('community_services', 'social_impact')
  }
  if (text.includes('justice') || text.includes('legal')) {
    tags.push('government', 'leadership')
  }
  if (text.includes('mental health') || text.includes('wellbeing')) {
    tags.push('community_services', 'social_impact')
  }
  if (text.includes('indigenous') || text.includes('aboriginal')) {
    tags.push('social_impact', 'community_services')
  }
  if (text.includes('department') || text.includes('government')) {
    tags.push('government', 'leadership')
  }
  if (text.includes('university') || text.includes('research')) {
    tags.push('leadership')
  }
  if (text.includes('foundation') || text.includes('fund')) {
    tags.push('funding', 'leadership')
  }
  if (text.includes('ceo') || text.includes('director') || text.includes('chief')) {
    tags.push('leadership')
  }

  // Always include high-value strategic tags
  tags.push('leadership', 'social_impact')

  return [...new Set(tags)]
}

// Calculate alignment score between contact and project
function calculateAlignmentScore(contact, project) {
  let score = contact.relationship_score * 100 // Base score from relationship strength

  // Boost for organization / focus match
  const candidates = projectOrgCandidates(project)
  if (contact.current_company && candidates.length > 0) {
    const companyLower = contact.current_company.toLowerCase()
    const hasMatch = candidates.some(candidate => companyLower.includes(candidate.toLowerCase()))
    if (hasMatch) {
      score += 30
    }
  }

  // Boost for position relevance
  const projectKeywords = extractProjectKeywords(project)
  const positionText = (contact.current_position || '').toLowerCase()
  const keywordMatches = projectKeywords.filter(keyword =>
    positionText.includes(keyword.toLowerCase())
  ).length
  score += keywordMatches * 10

  // Boost for alignment tag matches
  const relevantTags = getRelevantTags(project)
  const contactTags = Array.isArray(contact.alignment_tags) ? contact.alignment_tags : []
  const tagMatches = relevantTags.filter(tag =>
    contactTags.includes(tag)
  ).length
  score += tagMatches * 15

  // Boost for strategic value
  if (contact.strategic_value === 'high') {
    score += 20
  } else if (contact.strategic_value === 'medium') {
    score += 10
  }

  return Math.min(score, 200) // Cap at 200
}

// Get alignment reasons for display
function getAlignmentReasons(contact, project) {
  const reasons = []

  // Organization alignment
  if (contact.current_company) {
    const candidates = projectOrgCandidates(project)
    const companyLower = contact.current_company.toLowerCase()
    const matchedCandidate = candidates.find(candidate => companyLower.includes(candidate.toLowerCase()))
    if (matchedCandidate) {
      reasons.push(`Works at ${contact.current_company} (aligned with ${matchedCandidate})`)
    }
  }

  // Position relevance
  const projectKeywords = extractProjectKeywords(project)
  const positionText = (contact.current_position || '').toLowerCase()
  const keywordMatches = projectKeywords.filter(keyword =>
    positionText.includes(keyword.toLowerCase())
  )
  if (keywordMatches.length > 0) {
    reasons.push(`Position involves: ${keywordMatches.slice(0, 3).join(', ')}`)
  }

  // Tag alignment
  const relevantTags = getRelevantTags(project)
  const contactTags = Array.isArray(contact.alignment_tags) ? contact.alignment_tags : []
  const tagMatches = relevantTags.filter(tag => contactTags.includes(tag))
  if (tagMatches.length > 0) {
    reasons.push(`Aligned with: ${tagMatches.join(', ').replace('_', ' ')}`)
  }

  // Strategic value
  if (contact.strategic_value === 'high') {
    reasons.push('High strategic value contact')
  }

  // Relationship strength
  if (contact.relationship_score >= 0.8) {
    reasons.push('Strong existing relationship')
  }

  return reasons.slice(0, 3) // Limit to top 3 reasons
}

// Get alignment strategy description
function getAlignmentStrategy(project) {
  const keywords = extractProjectKeywords(project)
  const tags = getRelevantTags(project)

  let focus = 'general networking'

  if (keywords.includes('youth') || keywords.includes('justice')) {
    focus = 'youth justice sector'
  } else if (keywords.includes('mental health')) {
    focus = 'mental health services'
  } else if (keywords.includes('indigenous')) {
    focus = 'indigenous community services'
  } else if (keywords.includes('education')) {
    focus = 'education sector'
  } else {
    const candidates = projectOrgCandidates(project).map(candidate => candidate.toLowerCase())
    if (candidates.some(candidate => candidate.includes('department') || candidate.includes('government'))) {
      focus = 'government partnerships'
    } else if (candidates.some(candidate => candidate.includes('university') || candidate.includes('research'))) {
      focus = 'academic partnerships'
    }
  }

  return {
    focus,
    keywords: keywords.slice(0, 5),
    target_tags: tags,
    project_type: projectOrgCandidates(project).length > 0 ? 'organizational' : 'community-based'
  }
}
