# ACT Connected Platform - Product Requirements Document

## Project Overview
Build the most relational community platform ever created, transforming ACT's 239 records and 142 connections into an interactive ecosystem that shows exactly how opportunities become community impact.

## Timeline: 7 Weeks
- **Phase 1**: Enhanced Dashboard (2 weeks) - Internal relationship visualization
- **Phase 2**: Public Website (3 weeks) - Community-facing opportunity ecosystem  
- **Phase 3**: Backend API Enhancement (1 week) - Relationship-first architecture
- **Phase 4**: Data Quality Enhancement (1 week) - Connection strengthening

## Phase 1: Enhanced Dashboard (Weeks 1-2)

### Week 1 Tasks
1. **Build RelationshipNetworkGraph Component**
   - Create interactive D3.js force-directed network visualization
   - Display all 142 connections between opportunities, projects, organizations, people, artifacts
   - Enable node clicking to explore relationships
   - Add filters for connection types (funding, collaboration, delivery, impact)
   - File location: `apps/frontend/src/components/dashboard/RelationshipNetworkGraph.tsx`

2. **Create OpportunityEcosystemView Component**
   - Build opportunities-as-central-hub visualization (29 records)
   - Show connected projects, partner organizations, community impact
   - Interactive exploration of opportunity relationships
   - File location: `apps/frontend/src/components/dashboard/OpportunityEcosystemView.tsx`

3. **Develop ProjectImpactChains Component**
   - Visualize Opportunity → Project → Artifact → Community Story flow
   - Track complete impact chains across all databases
   - Enable chain navigation and exploration
   - File location: `apps/frontend/src/components/dashboard/ProjectImpactChains.tsx`

### Week 2 Tasks
4. **Build PartnershipNetworkMap Component**
   - Create visualization of 46 organizations relationship web
   - Show partnership types, funding flows, collaboration patterns
   - Enable partner organization exploration
   - File location: `apps/frontend/src/components/dashboard/PartnershipNetworkMap.tsx`

5. **Create RelationshipDensityMetrics Dashboard**
   - Analyze connection strength across all relationships
   - Identify strongest links and missing connections
   - Show relationship health metrics
   - File location: `apps/frontend/src/components/analytics/RelationshipDensityMetrics.tsx`

6. **Develop OpportunitySuccessTracking Analytics**
   - Track which opportunities generate most projects/artifacts
   - Calculate opportunity ROI and success patterns
   - Show partnership value metrics
   - File location: `apps/frontend/src/components/analytics/OpportunitySuccessTracking.tsx`

## Phase 2: Public Website (Weeks 3-5)

### Week 3 Tasks
7. **Create OpportunityShowcasePages Template**
   - Build template for 29 opportunity showcase pages
   - Show connected projects, partner organizations, community impact
   - Add replication guides for communities
   - URL structure: `/opportunities/{opportunity-name}`

8. **Develop ProjectDeepDivePages Template**
   - Create template for 52 project showcase pages
   - Display opportunity source, artifacts created, community champions
   - Include replication kits and open-source guides
   - URL structure: `/projects/{project-name}`

9. **Build PartnershipNetworkPages Template**
   - Create template for 46 organization showcase pages
   - Show opportunities provided, projects supported, community impact
   - Display partnership success metrics and collaboration network
   - URL structure: `/partners/{organization-name}`

### Week 4 Tasks
10. **Create OpportunityEcosystemHomepage**
    - Build main landing page with opportunity-centric navigation
    - Feature interactive ecosystem map
    - Enable opportunity discovery and filtering
    - Show "How communities connect to opportunities" flow

11. **Develop RelationshipNavigation System**
    - Create cross-page relationship navigation components
    - Enable seamless movement between connected items
    - Build relationship breadcrumbs and connection trails
    - Implement "explore connections" functionality

12. **Build CommunityImpactPages Integration**
    - Connect Empathy Ledger stories to specific projects
    - Show community voices within relationship context
    - Enable story-to-project-to-opportunity navigation
    - Display authentic community impact evidence

### Week 5 Tasks
13. **Create Interactive NetworkVisualization Component**
    - Build shared relationship visualization for all pages
    - Enable filtering by connection types
    - Add node highlighting and connection strength indicators
    - Make clickable for navigation between related items

14. **Develop ImpactChainVisualization Component**
    - Show complete Opportunity → Project → Artifact → Story chains
    - Make each step clickable for deeper exploration
    - Enable chain filtering and comparison
    - Display success metrics for each chain link

15. **Build CommunityValidation System**
    - Create feedback collection for community members
    - Enable validation of project-story connections
    - Build simple review system for accuracy checking
    - Implement community ownership recognition

## Phase 3: Backend API Enhancement (Week 6)

### Week 6 Tasks
16. **Develop RelationshipService API**
    - Build core relationship mapping service
    - Create endpoints for ecosystem queries
    - Enable cross-database relationship lookups
    - File location: `apps/backend/src/services/relationshipService.js`

17. **Create EcosystemQueries API Endpoints**
    - Build `/api/{type}/{id}/ecosystem` endpoints
    - Return full relationship context for any item
    - Enable connected item discovery
    - Support filtering by relationship types

18. **Implement CrossDatabaseSearch API**
    - Build relationship-based search functionality
    - Return items with their connection context
    - Enable discovery of related opportunities, projects, partners
    - Support complex relationship queries

19. **Develop NetworkAnalysisAPI Service**
    - Create connection strength analysis endpoints
    - Build relationship density calculations
    - Enable identification of missing connections
    - Support network health metrics

## Phase 4: Data Quality Enhancement (Week 7)

### Week 7 Tasks
20. **Enhance People-Project Connections**
    - Add Community Champions field to projects database
    - Connect Empathy Ledger storytellers to specific projects
    - Link project leaders and team members data
    - Strengthen the currently weak People ←→ Projects relationships (only 2 connections)

21. **Improve Organization-Project Relationships**
    - Clarify partnership types (funding, implementation, support)
    - Add partnership value and duration metadata
    - Enhance collaboration tracking between organizations and projects
    - Strengthen Organization ←→ Projects connections (currently only 2)

22. **Build StoryProjectLinking System**
    - Connect each Empathy Ledger story to originating project
    - Add story-to-opportunity relationship tracking
    - Create endpoints for story-based project discovery
    - Enable community voice integration across platform

23. **Create LaunchPreparation Tasks**
    - Final quality review of all relationship connections
    - Community stakeholder validation of platform accuracy
    - Performance optimization and testing
    - Deployment preparation and launch checklist

24. **Implement FinalEcosystemReview**
    - Comprehensive review with all stakeholders
    - Validation that platform serves real community needs
    - Final adjustments based on community feedback
    - Launch readiness assessment

## Success Metrics
- **Connection Density**: Average relationships per item increases
- **Community Validation**: 95%+ accuracy in project-story connections
- **Partner Satisfaction**: Organizations confirm accurate impact representation
- **Discovery Success**: Communities can find relevant opportunities through relationships
- **Network Growth**: Each new connection strengthens entire ecosystem

## Technical Requirements
- React 19 + TypeScript frontend
- D3.js for network visualizations
- Express.js backend with enhanced relationship services
- Notion API for data synchronization
- Supabase integration for Empathy Ledger stories
- Responsive design for mobile/desktop access

## Community Validation Checkpoints
- **Week 2**: ACT team validates dashboard partnership tracking
- **Week 4**: 3 community members test opportunity discovery flow
- **Week 5**: Story contributors validate project connections
- **Week 6**: 2 partner organizations verify showcase accuracy
- **Week 7**: Full stakeholder ecosystem review

## Expected Outcome
A living ecosystem map that shows exactly how communities connect to opportunities, transform them into projects, create artifacts, and generate authentic impact stories - all through visible, navigable relationships. This becomes infrastructure for community sovereignty made transparent through connections.