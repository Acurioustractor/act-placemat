// Enhanced Project Types for ACT Placemat
// Supporting Beautiful Obsolescence, Community Labor, and Storytelling Scale

export type ProjectType =
  | 'infrastructure-building'
  | 'storytelling'
  | 'regenerative-enterprise'
  | 'skills-employment'
  | 'mixed'

export type RocketBoosterStage =
  | 'launch'      // ACT-intensive (0-6 months)
  | 'orbit'       // ACT-supported (6-18 months)
  | 'cruising'    // ACT-adjacent (18-36 months)
  | 'landed'      // Community-owned (36+ months)
  | 'obsolete'    // ACT unnecessary (thriving independently!)

export interface CommunityLaborMetrics {
  // Participant tracking
  youngPeople: {
    count: number
    hoursContributed: number
  }
  communityMembers: {
    count: number
    hoursContributed: number
  }
  livedExperience: {
    count: number
    hoursContributed: number
    description?: string  // e.g., "formerly incarcerated", "housing insecure"
  }
  unskilledLabor: {
    count: number
    hoursContributed: number
  }
  skilledLabor: {
    count: number
    hoursContributed: number
  }

  // Skills development
  skillsTransferred: Array<{
    skill: string
    peopleTrained: number
    certificationsEarned?: number
  }>

  // Economic impact
  contractorEquivalentCost: number  // What it would cost to hire contractors
  actualCost: number                // Actual materials + paid labor cost
  communityValueCreated: number     // Difference + employability value
  employabilityOutcomes?: string    // e.g., "47 people now employable in construction"

  // Infrastructure built
  physicalAssets?: Array<{
    type: string  // "rooms", "square meters", "facilities"
    quantity: number
    unit: string
  }>
}

export interface StorytellingMetrics {
  // Current state
  activeStorytellers: number
  storiesCaptured: number

  // Potential
  potentialStorytellers: number
  storyOpportunities: number

  // Gap analysis
  trainingGap: number  // potentialStorytellers - activeStorytellers
  captureRate: number  // storiesCaptured / storyOpportunities

  // Impact
  averageStoryReach: number
  totalCurrentReach: number
  potentialReach: number

  // Pipeline
  storytellersInTraining?: number
  storiesInProduction?: number
}

export interface GrantDependencyMetrics {
  // Current funding mix
  grantFunding: number
  marketRevenue: number
  totalRevenue: number
  grantDependencyPercentage: number  // grantFunding / totalRevenue

  // Historical trend
  historicalData?: Array<{
    year: number
    grantPercentage: number
    marketPercentage: number
  }>

  // Future targets
  targetGrantIndependenceDate?: string
  targetGrantPercentage?: number  // Goal for grant dependency (e.g., 30%)

  // Social impact per dollar
  socialImpactPerGrantDollar?: number
  socialImpactPerMarketDollar?: number
}

export interface AutonomyMetrics {
  financialIndependence: number  // 0-100% (recurring revenue / expenses)
  decisionAutonomy: 'act-led' | 'co-designed' | 'community-led' | 'autonomous'
  skillSelfSufficiency: number  // Number of critical skills in community (out of 10)
  knowledgeSovereignty: 'act-owns' | 'shared' | 'community-owns' | 'community-controls'
  relationshipDensity: number  // Number of connections outside ACT
  teachingCapacity: number  // Number of people/projects being taught
}

export interface EcosystemRole {
  type: 'hub' | 'bridge' | 'specialist' | 'incubator' | 'support' | 'teacher'
  description?: string
}

export interface TeachingCapacity {
  projectsTaught: string[]  // Project IDs
  peopleTaught: string[]  // Person names or IDs
  residenciesHosted: number
  knowledgeShared: string[]  // e.g., "Construction basics", "Storytelling protocols"
  becomingTeacher: boolean
}

export interface ValueFlows {
  monetary: {
    incoming: number
    outgoing: number
    net: number
  }
  nonMonetary: Array<{
    type: string  // 'timeExchanged' | 'landAccess' | 'skillsShared' | 'storyRights' | 'foodProvided'
    given: number
    received: number
    unit: string
  }>
  totalValueEstimate: number
  giftEconomyBalance: number  // 0.8-1.2 is healthy (giving ≈ receiving)
}

export interface Storyteller {
  id: string | number
  project_id?: string | number | null
  full_name: string
  bio?: string | null
  expertise_areas?: string[] | null
  profile_image_url?: string | null
  media_type?: string | null
  created_at?: string | null
  consent_given?: boolean
}

export interface Place {
  indigenousName: string
  westernName?: string | null
  displayName: string
  map?: string  // "lat,lng"
  state?: string
}

// Enhanced Project interface
export interface Project {
  // Core identity
  id: string
  name: string
  title?: string
  description?: string
  aiSummary?: string
  status?: string
  coverImage?: string | null
  organization?: string
  area?: string

  // PROJECT TYPE CLASSIFICATION
  projectType?: ProjectType

  // BEAUTIFUL OBSOLESCENCE
  rocketBoosterStage?: RocketBoosterStage
  handoverTimeline?: string
  handoverBlockers?: string[]
  autonomyMetrics?: AutonomyMetrics
  autonomyScore?: number  // 0-100 overall readiness

  // INFRASTRUCTURE BUILDING PROJECTS
  communityLaborMetrics?: CommunityLaborMetrics

  // STORYTELLING PROJECTS
  storytellingMetrics?: StorytellingMetrics
  storytellers?: Storyteller[]
  storytellerCount?: number

  // GRANT DEPENDENCY → MARKET ECONOMICS
  grantDependencyMetrics?: GrantDependencyMetrics

  // VALUE FLOWS (Gift Economy)
  valueFlows?: ValueFlows

  // ECOSYSTEM ROLE
  ecosystemRole?: EcosystemRole
  collaboratingProjects?: string[]
  projectsTaught?: string[]
  dependentProjects?: string[]
  secondOrderEffects?: string

  // TEACHING CAPACITY
  teachingCapacity?: TeachingCapacity
  regenerativeRipples?: string[]

  // Location & Place
  location?: string
  relatedPlaces?: Place[]

  // Relationships
  relatedOrganisations?: string[]
  relatedPeople?: string[]
  relatedOpportunities?: string[]
  relatedConversations?: string[]
  relatedActions?: string[]
  relatedResources?: string[]
  relatedArtifacts?: string[]
  partnerCount?: number | null
  supporters?: number | null

  // Classification
  themes?: string[]
  tags?: string[]
  coreValues?: string[]
  relationshipPillars?: string[]

  // Financial (legacy - use valueFlows instead)
  actualIncoming?: number | null
  potentialIncoming?: number | null
  revenueActual?: number | null
  revenuePotential?: number | null
  budget?: number | null
  funding?: string | null

  // Timeline
  nextMilestoneDate?: string
  startDate?: string | null
  endDate?: string | null
  updatedAt?: string
  lastUpdated?: string
  last_updated?: string

  // Project lead
  projectLead?: {
    id?: string
    name?: string
    avatarUrl?: string
    type?: string
  } | null
  lead?: string

  // Notion integration
  notionUrl?: string | null
  notionId?: string | null
  notionIdShort?: string | null
  notionCreatedAt?: string | null
  notionLastEditedAt?: string | null

  // Supabase integration
  supabaseProjectId?: string | null
  supabaseProject?: Record<string, unknown> | null
  source?: string
}
