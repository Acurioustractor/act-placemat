# ACT Intelligence Evolution Plan
## Building Self-Improving Project Intelligence That Surfaces Real Needs

**Created**: 2025-10-24
**Status**: Active Development Plan
**Philosophy**: Beautiful Obsolescence through Intelligent Learning Loops

---

## Current State Analysis

### What We Have (October 2025)
✅ **65 Real Projects** from Notion fetched and displaying
✅ **Backend Deployed** on Railway (https://act-backend-production.up.railway.app)
✅ **Frontend Deployed** on Vercel (https://act-placemat.vercel.app)
✅ **Data Sources Connected**:
- Notion (10 databases: Projects, People, Organizations, Opportunities, Stories, Events, Tasks, Notes, Media, Tags)
- Supabase (20,398 LinkedIn contacts, cadence metrics, Gmail, Xero)
- Gmail intelligence
- Xero financial data
- Calendar data

### What's Missing (The Intelligence Gap)

**Projects show WHAT exists, not WHAT'S NEEDED:**

Looking at sample data:
```json
{
  "name": "10x10 Community Capital Leadership Retreat",
  "status": "",  // ❌ Empty status
  "actualIncoming": 0,  // ❌ No revenue data
  "themes": [],  // ❌ No themes tagged
  "relatedOpportunities": [],  // ❌ No opportunities linked
  "relatedOrganisations": [],  // ❌ No partners linked
  "relatedPlaces": [],  // ❌ No location data
  "nextMilestoneDate": null  // ❌ No milestone tracking
}
```

**We have projects but we don't know:**
- What they NEED (funding, supporters, partnerships, skills)
- Who can HELP them (from 20,398 contacts)
- What OPPORTUNITIES match them (grants, funding, collaborations)
- How they CONNECT to each other (shared themes, locations, people)
- If they're HEALTHY or STRUGGLING (cadence, milestones, community ownership %)

---

## Vision: Intelligent Project Ecosystem

### The Goal
Transform from **static project list** to **living intelligence system** that:

1. **Surfaces Real Needs** automatically
2. **Links Across Ecosystem** intelligently
3. **Learns and Improves** continuously
4. **Builds Community Ownership** measurably

### Core Intelligence Loops

```
┌─────────────────────────────────────────────────────────┐
│                  INTELLIGENCE CYCLE                     │
└─────────────────────────────────────────────────────────┘

1. DETECT NEEDS
   Projects → Analysis → Need Identification
   ├─ Funding gaps (potential vs actual revenue)
   ├─ Missing partnerships (no related orgs)
   ├─ Stalled milestones (overdue nextMilestoneDate)
   ├─ Weak cadence (no recent touchpoints)
   └─ Low ownership % (far from Beautiful Obsolescence)

2. MATCH RESOURCES
   Needs → Cross-Reference → Recommendations
   ├─ Match funding opportunities from database
   ├─ Find supporters from 20K LinkedIn contacts
   ├─ Connect to related projects (theme overlap)
   ├─ Surface relevant organizations
   └─ Identify skill gaps vs. available people

3. GENERATE INSIGHTS
   Data → AI Analysis → Actionable Intelligence
   ├─ "BG Fit needs $15K for next milestone - 3 matching grants found"
   ├─ "JusticeHub has 47 contacts but no touchpoints in 90 days - cadence risk"
   ├─ "Witta projects: 5 active, 2 need Indigenous governance protocols"
   ├─ "Youth Justice cluster: $162K revenue, ready for Beautiful Obsolescence transition"
   └─ "Storytelling theme: 26 projects, only 8 have community ownership %"

4. TRACK IMPACT
   Actions → Outcomes → Learning
   ├─ Did recommended supporter connect?
   ├─ Did funding opportunity convert?
   ├─ Did milestone complete on time?
   ├─ Did community ownership % increase?
   └─ Feed results back to improve matching

5. EVOLVE
   Learnings → Model Updates → Better Intelligence
   ├─ Which supporter matches led to funding?
   ├─ Which themes predict success?
   ├─ What cadence patterns indicate health?
   ├─ When do projects reach Beautiful Obsolescence?
   └─ Improve algorithms based on outcomes
```

---

## Phase 1: Surface Important Needs (Weeks 1-2)

### 1.1 Project Health Scoring

**Backend API**: `GET /api/v2/projects/:id/health`

```typescript
interface ProjectHealth {
  overallScore: number  // 0-100
  dimensions: {
    funding: {
      score: number  // 0-100
      gap: number  // potentialIncoming - actualIncoming
      status: 'healthy' | 'gap' | 'critical'
      recommendations: string[]
    }
    people: {
      score: number  // Based on cadence, relationships
      activeSupporters: number
      touchpointsLast90Days: number
      atRiskRelationships: string[]
      recommendations: string[]
    }
    momentum: {
      score: number  // Based on milestones, updates
      overdueMilestones: number
      daysSinceLastUpdate: number
      status: 'active' | 'stalled' | 'inactive'
      recommendations: string[]
    }
    ownership: {
      score: number  // Community ownership %
      current: number  // % community owned
      target: number  // Goal %
      readinessForTransition: boolean
      recommendations: string[]
    }
    data: {
      score: number  // Data completeness
      missing: string[]  // ['themes', 'milestones', 'opportunities']
      recommendations: string[]
    }
  }
  urgentNeeds: {
    type: 'funding' | 'people' | 'milestone' | 'governance' | 'data'
    priority: 'critical' | 'high' | 'medium' | 'low'
    description: string
    suggestedActions: string[]
  }[]
  aiBrief: string  // AI-generated summary
}
```

**Implementation**:
```javascript
// apps/backend/core/src/api/projectHealth.js
export async function getProjectHealth(projectId) {
  const project = await getProjectFromNotion(projectId)
  const touchpoints = await getTouchpointsForProject(projectId)
  const contacts = await getSupportersForProject(projectId)
  const opportunities = await getOpportunitiesForProject(projectId)

  // Calculate funding health
  const fundingGap = (project.potentialIncoming || 0) - (project.actualIncoming || 0)
  const fundingScore = fundingGap === 0 ? 100 : Math.max(0, 100 - (fundingGap / 10000) * 10)

  // Calculate people health (cadence)
  const recentTouchpoints = touchpoints.filter(t =>
    isWithinDays(t.occurredAt, 90)
  ).length
  const peopleScore = Math.min(100, (recentTouchpoints / 10) * 100)

  // Calculate momentum (milestones)
  const daysSinceUpdate = daysSince(project.updatedAt)
  const momentumScore = Math.max(0, 100 - (daysSinceUpdate / 30) * 50)

  // Calculate ownership (Beautiful Obsolescence)
  const ownershipPct = project.communityOwnershipPct || 0
  const ownershipScore = ownershipPct

  // Calculate data completeness
  const requiredFields = ['themes', 'status', 'projectLead', 'nextMilestoneDate', 'relatedPlaces']
  const filledFields = requiredFields.filter(f => project[f] && project[f] !== '')
  const dataScore = (filledFields.length / requiredFields.length) * 100

  // Overall score (weighted average)
  const overallScore = (
    fundingScore * 0.25 +
    peopleScore * 0.25 +
    momentumScore * 0.20 +
    ownershipScore * 0.20 +
    dataScore * 0.10
  )

  // Generate urgent needs
  const urgentNeeds = []

  if (fundingGap > 20000) {
    urgentNeeds.push({
      type: 'funding',
      priority: 'critical',
      description: `Funding gap of $${fundingGap.toLocaleString()}`,
      suggestedActions: [
        'Review matching grant opportunities',
        'Connect with potential funders from network',
        'Update potentialIncoming with new opportunities'
      ]
    })
  }

  if (recentTouchpoints < 3) {
    urgentNeeds.push({
      type: 'people',
      priority: 'high',
      description: 'Low engagement - only ${recentTouchpoints} touchpoints in 90 days',
      suggestedActions: [
        'Schedule check-in with project lead',
        'Reach out to dormant supporters',
        'Organize community event or update'
      ]
    })
  }

  // ... more need detection

  return {
    overallScore,
    dimensions: { funding, people, momentum, ownership, data },
    urgentNeeds,
    aiBrief: await generateAIBrief(project, urgentNeeds)
  }
}
```

### 1.2 Need Detection Dashboard

**Frontend**: Enhanced Project Intelligence Page

Add to [ProjectIntelligencePage.tsx](apps/frontend/src/components/ProjectIntelligencePage.tsx):

```tsx
interface ProjectNeed {
  type: 'funding' | 'people' | 'milestone' | 'governance' | 'data'
  priority: 'critical' | 'high' | 'medium' | 'low'
  project: string
  description: string
  suggestedActions: string[]
  matchingResources?: {
    grants?: Grant[]
    supporters?: Contact[]
    projects?: Project[]
  }
}

// New component: Needs Dashboard
function ProjectNeedsDashboard() {
  const [needs, setNeeds] = useState<ProjectNeed[]>([])

  useEffect(() => {
    // Fetch all projects and calculate needs
    api.get('/api/v2/projects/needs').then(setNeeds)
  }, [])

  const criticalNeeds = needs.filter(n => n.priority === 'critical')
  const highNeeds = needs.filter(n => n.priority === 'high')

  return (
    <div>
      <SectionHeader
        title="Critical Needs"
        count={criticalNeeds.length}
        intent="danger"
      />

      {criticalNeeds.map(need => (
        <NeedCard
          need={need}
          onAction={(action) => handleNeedAction(need, action)}
        />
      ))}

      {/* High priority, medium priority sections... */}
    </div>
  )
}

function NeedCard({ need, onAction }) {
  return (
    <Card className="border-l-4 border-red-500">
      <div className="flex justify-between">
        <div>
          <h3>{need.project}</h3>
          <p className="text-sm text-gray-600">{need.description}</p>
        </div>
        <Badge intent={need.priority === 'critical' ? 'danger' : 'warning'}>
          {need.priority}
        </Badge>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold">Suggested Actions:</h4>
        <ul className="mt-2 space-y-2">
          {need.suggestedActions.map(action => (
            <li className="flex items-start">
              <button
                onClick={() => onAction(action)}
                className="text-sm text-blue-600 hover:underline"
              >
                {action}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {need.matchingResources && (
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-semibold">Matching Resources Found:</h4>
          {need.matchingResources.grants?.map(grant => (
            <GrantCard grant={grant} />
          ))}
          {need.matchingResources.supporters?.map(supporter => (
            <SupporterCard supporter={supporter} />
          ))}
        </div>
      )}
    </Card>
  )
}
```

---

## Phase 2: Link Across Ecosystem (Weeks 3-4)

### 2.1 Cross-Entity Intelligence

**The Relationship Graph**:

```
PROJECTS connect to:
├─ PEOPLE (via projectLead, relatedOrganisations contacts)
├─ OPPORTUNITIES (via relatedOpportunities)
├─ STORIES (via shared themes, locations)
├─ PLACES (via relatedPlaces)
├─ OTHER PROJECTS (via themes, people overlap)
└─ TOUCHPOINTS (via supporter interactions)

PEOPLE connect to:
├─ PROJECTS (as leads, supporters, or org members)
├─ TOUCHPOINTS (Gmail, Calendar, LinkedIn interactions)
├─ OPPORTUNITIES (as recommenders or beneficiaries)
└─ OTHER PEOPLE (via shared projects, orgs)

OPPORTUNITIES connect to:
├─ PROJECTS (via matching themes, locations, needs)
├─ PEOPLE (via networks, organizations)
└─ OTHER OPPORTUNITIES (via similar criteria)
```

**Backend API**: `GET /api/v2/ecosystem/connections/:entityType/:entityId`

```javascript
// apps/backend/core/src/api/ecosystemConnections.js
export async function getEcosystemConnections(entityType, entityId) {
  // entityType: 'project' | 'person' | 'opportunity' | 'organization'

  switch (entityType) {
    case 'project':
      return {
        entity: await getProject(entityId),
        connections: {
          people: await getPeopleForProject(entityId),
          opportunities: await getOpportunitiesForProject(entityId),
          relatedProjects: await getRelatedProjects(entityId),  // ← NEW
          stories: await getStoriesForProject(entityId),
          touchpoints: await getTouchpointsForProject(entityId),
          places: await getPlacesForProject(entityId)
        },
        insights: {
          networkStrength: calculateNetworkStrength(),
          thematicClusters: findThematicClusters(),
          sharedResources: findSharedResources(),
          collaborationOpportunities: suggestCollaborations()
        }
      }
  }
}

// Find projects related by theme overlap, location, people
async function getRelatedProjects(projectId) {
  const project = await getProject(projectId)
  const allProjects = await getAllProjects()

  return allProjects
    .filter(p => p.id !== projectId)
    .map(p => ({
      ...p,
      relationshipScore: calculateRelationshipScore(project, p),
      sharedThemes: intersection(project.themes, p.themes),
      sharedPeople: intersection(project.relatedOrganisations, p.relatedOrganisations),
      sharedPlaces: intersection(project.relatedPlaces, p.relatedPlaces),
      collaborationPotential: assessCollaborationPotential(project, p)
    }))
    .filter(p => p.relationshipScore > 0.3)  // Only show strong connections
    .sort((a, b) => b.relationshipScore - a.relationshipScore)
    .slice(0, 10)  // Top 10 related projects
}

function calculateRelationshipScore(project1, project2) {
  let score = 0

  // Theme overlap (40% weight)
  const sharedThemes = intersection(project1.themes, project2.themes)
  score += (sharedThemes.length / Math.max(project1.themes.length, 1)) * 0.4

  // People overlap (30% weight)
  const sharedPeople = intersection(
    project1.relatedOrganisations,
    project2.relatedOrganisations
  )
  score += (sharedPeople.length / Math.max(project1.relatedOrganisations.length, 1)) * 0.3

  // Location overlap (20% weight)
  const sharedPlaces = intersection(project1.relatedPlaces, project2.relatedPlaces)
  score += sharedPlaces.length > 0 ? 0.2 : 0

  // Opportunity overlap (10% weight)
  const sharedOpportunities = intersection(
    project1.relatedOpportunities,
    project2.relatedOpportunities
  )
  score += (sharedOpportunities.length / Math.max(project1.relatedOpportunities.length, 1)) * 0.1

  return score
}
```

### 2.2 Ecosystem Visualization

**Frontend**: Network Graph Component

```tsx
// apps/frontend/src/components/EcosystemGraph.tsx
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface Node {
  id: string
  type: 'project' | 'person' | 'opportunity' | 'place'
  name: string
  data: any
}

interface Link {
  source: string
  target: string
  type: 'theme' | 'people' | 'place' | 'opportunity'
  strength: number
}

function EcosystemGraph({ centerEntityId, centerEntityType }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    // Fetch ecosystem connections
    api.get(`/api/v2/ecosystem/connections/${centerEntityType}/${centerEntityId}`)
      .then(data => {
        renderGraph(data)
      })
  }, [centerEntityId])

  function renderGraph(data) {
    // D3 force-directed graph
    const nodes: Node[] = [
      { id: data.entity.id, type: centerEntityType, name: data.entity.name, data: data.entity },
      ...data.connections.people.map(p => ({ id: p.id, type: 'person', name: p.name, data: p })),
      ...data.connections.relatedProjects.map(p => ({ id: p.id, type: 'project', name: p.name, data: p })),
      ...data.connections.opportunities.map(o => ({ id: o.id, type: 'opportunity', name: o.name, data: o })),
    ]

    const links: Link[] = [
      ...data.connections.people.map(p => ({
        source: data.entity.id,
        target: p.id,
        type: 'people',
        strength: 1
      })),
      ...data.connections.relatedProjects.map(p => ({
        source: data.entity.id,
        target: p.id,
        type: 'theme',
        strength: p.relationshipScore
      })),
      // ... more links
    ]

    // D3 force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).strength(d => d.strength))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))

    // Render nodes and links...
  }

  return <svg ref={svgRef} width="100%" height="600px" />
}
```

---

## Phase 3: Learning Loops (Weeks 5-6)

### 3.1 Feedback Capture

**Track Every Action:**

```typescript
interface ActionEvent {
  id: string
  timestamp: string
  actor: 'user' | 'ai' | 'system'
  actionType: 'recommendation_accepted' | 'supporter_connected' | 'opportunity_applied' | 'milestone_completed' | 'project_updated'
  context: {
    projectId?: string
    personId?: string
    opportunityId?: string
    recommendationType?: string
    previousState?: any
    newState?: any
  }
  outcome?: 'success' | 'failure' | 'pending'
  outcomeData?: any
}

// Backend: Log all actions
await logAction({
  actionType: 'recommendation_accepted',
  context: {
    projectId: 'bg-fit',
    recommendationType: 'funding_opportunity',
    opportunityId: 'indigenous-business-direct'
  }
})

// Later: Track outcome
await updateActionOutcome(actionId, {
  outcome: 'success',
  outcomeData: {
    fundingAwarded: 50000,
    dateAwarded: '2025-11-15'
  }
})
```

### 3.2 Pattern Recognition

**AI-Powered Insight Generation:**

```javascript
// apps/backend/core/src/services/intelligenceLearning.js
export async function learnFromOutcomes() {
  const successfulConnections = await db.query(`
    SELECT * FROM action_events
    WHERE actionType = 'supporter_connected'
    AND outcome = 'success'
  `)

  // Analyze patterns
  const patterns = {
    bestSupporterMatchCriteria: analyzeSupporterMatches(successfulConnections),
    bestOpportunityMatchCriteria: analyzeOpportunityMatches(),
    healthyProjectIndicators: analyzeProjectHealth(),
    obsolescenceReadinessPatterns: analyzeObsolescenceReadiness()
  }

  // Update matching algorithms
  await updateMatchingWeights(patterns.bestSupporterMatchCriteria)

  // Generate insights
  const insights = await generateAIInsights(patterns)

  return {
    patterns,
    insights,
    recommendations: [
      "Projects with 10+ touchpoints in 90 days are 3x more likely to reach milestones",
      "Youth Justice projects convert funding 40% faster when connected to BG Fit network",
      "Story sovereignty projects reach Beautiful Obsolescence in avg 18 months vs 24 months for others"
    ]
  }
}
```

### 3.3 Continuous Improvement

**Weekly Learning Cycle:**

```javascript
// Run every Sunday at midnight
cron.schedule('0 0 * * 0', async () => {
  console.log('🧠 Running weekly intelligence learning cycle...')

  // 1. Analyze past week's actions and outcomes
  const weeklyOutcomes = await getActionsFromLastWeek()
  const successRate = calculateSuccessRate(weeklyOutcomes)

  // 2. Update matching algorithms
  if (successRate < 0.7) {
    await recalibrateMatchingWeights()
  }

  // 3. Generate new insights
  const insights = await learnFromOutcomes()

  // 4. Update project health scores
  const projects = await getAllProjects()
  for (const project of projects) {
    await updateProjectHealth(project.id)
  }

  // 5. Generate weekly intelligence brief
  const brief = await generateWeeklyBrief({
    insights,
    projectHealthChanges: calculateHealthChanges(),
    newOpportunities: detectNewOpportunities(),
    atRiskProjects: identifyAtRiskProjects()
  })

  // 6. Send to team
  await sendIntelligenceBrief(brief)

  console.log('✅ Weekly learning cycle complete')
})
```

---

## Phase 4: Beautiful Obsolescence Tracking (Weeks 7-8)

### 4.1 Community Ownership Scorecard

**New Notion Field**: `Community Ownership %` (0-100%)

**Backend API**: `GET /api/v2/projects/:id/obsolescence`

```typescript
interface ObsolescenceScore {
  currentOwnership: number  // 0-100%
  targetOwnership: number   // Goal (usually 100%)
  readiness: 'not_ready' | 'preparing' | 'ready' | 'transitioned'
  timeline: {
    startDate: string
    expectedTransitionDate: string
    actualTransitionDate?: string
    daysUntilTransition: number
  }
  criteria: {
    financialIndependence: {
      score: number  // 0-100
      status: boolean
      details: string
    }
    governanceStructure: {
      score: number
      status: boolean
      details: string
    }
    skillTransfer: {
      score: number
      status: boolean
      details: string
    }
    communityCapacity: {
      score: number
      status: boolean
      details: string
    }
    dataOwnership: {
      score: number
      status: boolean
      details: string
    }
  }
  recommendations: string[]
  aiBrief: string
}
```

**Implementation**:
```javascript
async function calculateObsolescenceReadiness(projectId) {
  const project = await getProject(projectId)
  const health = await getProjectHealth(projectId)

  // Financial independence (can they pay their own way?)
  const financialScore = (project.actualIncoming > 0 && project.actualIncoming >= project.budget) ? 100 :
    (project.actualIncoming / project.budget) * 100

  // Governance (do they have decision-making structures?)
  const hasGovernance = project.relatedOrganisations.length > 0 && project.projectLead !== null
  const governanceScore = hasGovernance ? 100 : 50

  // Skill transfer (has ACT taught them everything?)
  const skillTransferScore = project.communityOwnershipPct || 0

  // Community capacity (can they run it themselves?)
  const activeSupporters = await getActiveSupporters(projectId)
  const capacityScore = Math.min(100, (activeSupporters.length / 5) * 100)  // Need 5+ active people

  // Data ownership (do they control their own data?)
  const dataOwnershipScore = project.supabaseProjectId ? 100 : 0  // Have their own database?

  const overallReadiness = (
    financialScore * 0.30 +
    governanceScore * 0.25 +
    skillTransferScore * 0.20 +
    capacityScore * 0.15 +
    dataOwnershipScore * 0.10
  )

  const readinessStatus =
    overallReadiness >= 80 ? 'ready' :
    overallReadiness >= 60 ? 'preparing' :
    'not_ready'

  return {
    currentOwnership: project.communityOwnershipPct || 0,
    targetOwnership: 100,
    readiness: readinessStatus,
    criteria: {
      financialIndependence: { score: financialScore, status: financialScore >= 80, details: '...' },
      governanceStructure: { score: governanceScore, status: governanceScore >= 80, details: '...' },
      skillTransfer: { score: skillTransferScore, status: skillTransferScore >= 80, details: '...' },
      communityCapacity: { score: capacityScore, status: capacityScore >= 80, details: '...' },
      dataOwnership: { score: dataOwnershipScore, status: dataOwnershipScore >= 80, details: '...' }
    },
    recommendations: generateObsolescenceRecommendations(...)
  }
}
```

### 4.2 Obsolescence Dashboard

**Frontend**: Beautiful Obsolescence Progress Tracker

```tsx
function ObsolescenceDashboard() {
  const [projects, setProjects] = useState([])

  useEffect(() => {
    api.get('/api/v2/projects/obsolescence-status').then(setProjects)
  }, [])

  const ready = projects.filter(p => p.obsolescence.readiness === 'ready')
  const preparing = projects.filter(p => p.obsolescence.readiness === 'preparing')
  const notReady = projects.filter(p => p.obsolescence.readiness === 'not_ready')

  return (
    <div>
      <SectionHeader title="Beautiful Obsolescence Progress" />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Ready for Transition"
          value={ready.length}
          total={projects.length}
          intent="success"
        />
        <StatCard
          label="Preparing"
          value={preparing.length}
          total={projects.length}
          intent="warning"
        />
        <StatCard
          label="Not Ready"
          value={notReady.length}
          total={projects.length}
          intent="neutral"
        />
      </div>

      <div className="space-y-4">
        {ready.map(project => (
          <ObsolescenceCard project={project} status="ready" />
        ))}
      </div>
    </div>
  )
}

function ObsolescenceCard({ project, status }) {
  return (
    <Card className={status === 'ready' ? 'border-green-500' : ''}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{project.name}</h3>
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
            <span>Community Ownership: {project.obsolescence.currentOwnership}%</span>
            <span>•</span>
            <span>{project.obsolescence.timeline.daysUntilTransition} days to transition</span>
          </div>
        </div>
        <Badge intent={status === 'ready' ? 'success' : 'warning'}>
          {status}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        <CriterionBadge
          label="Financial"
          score={project.obsolescence.criteria.financialIndependence.score}
          met={project.obsolescence.criteria.financialIndependence.status}
        />
        <CriterionBadge
          label="Governance"
          score={project.obsolescence.criteria.governanceStructure.score}
          met={project.obsolescence.criteria.governanceStructure.status}
        />
        {/* ... more criteria */}
      </div>

      {status === 'ready' && (
        <button className="mt-4 btn-primary">
          Begin Transition Process
        </button>
      )}
    </Card>
  )
}
```

---

## Implementation Roadmap

### Week 1-2: Foundation
- [ ] Add `communityOwnershipPct` field to Notion Projects database
- [ ] Build project health scoring API endpoint
- [ ] Create needs detection algorithm
- [ ] Build needs dashboard frontend
- [ ] Deploy and test with real data

### Week 3-4: Connections
- [ ] Build ecosystem connections API
- [ ] Implement related projects algorithm
- [ ] Create collaboration opportunity detection
- [ ] Build ecosystem graph visualization
- [ ] Deploy and test cross-linking

### Week 5-6: Learning
- [ ] Create action event logging system
- [ ] Build pattern recognition algorithms
- [ ] Implement weekly learning cycle
- [ ] Create intelligence brief generation
- [ ] Deploy and test feedback loops

### Week 7-8: Obsolescence
- [ ] Build obsolescence scoring API
- [ ] Create readiness criteria tracking
- [ ] Build obsolescence dashboard
- [ ] Implement transition workflow
- [ ] Deploy and celebrate first transitions! 🎉

---

## Success Metrics

### Quantitative
- **Project Health**: 80%+ projects with health score >70
- **Data Completeness**: 90%+ projects with all required fields filled
- **Need Detection**: 100% of funding gaps identified and matched to opportunities
- **Ecosystem Connections**: Average 5+ meaningful connections per project
- **Beautiful Obsolescence**: 20%+ of projects at "ready" or "preparing" status

### Qualitative
- Projects feel **supported, not surveilled**
- Community members say **"The system knows what we need before we ask"**
- ACT team says **"We can see the path to obsolescence for each project"**
- The platform **learns and improves** every week
- Intelligence is **actionable, not just informational**

---

## Philosophy: Intelligence in Service of Obsolescence

**The Goal**: Build intelligence that makes ACT unnecessary.

Every algorithm should ask:
1. Does this help communities own their projects?
2. Does this reduce dependency on ACT?
3. Does this build capacity, not dependence?
4. Does this measure progress toward obsolescence?
5. Does this learn from community wisdom?

**Anti-Patterns to Avoid**:
- ❌ Intelligence that increases ACT control
- ❌ Metrics that measure ACT success, not community sovereignty
- ❌ Recommendations that create dependency
- ❌ Learning loops that optimize for ACT revenue
- ❌ Data that communities don't own

**Patterns to Embrace**:
- ✅ Intelligence that surfaces community needs
- ✅ Metrics that track community ownership %
- ✅ Recommendations that build capacity
- ✅ Learning loops that optimize for Beautiful Obsolescence
- ✅ Data sovereignty and community control

---

**Next Steps**: Review this plan, approve Phase 1, and let's build the first project health scoring system! 🚀
