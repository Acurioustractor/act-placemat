# ACT Placemat Intelligence API Consolidation Analysis

## Overview
Analysis of all intelligence/AI-related APIs in the ACT Placemat backend to identify duplication and plan consolidation into a unified `/api/v1/intelligence/` structure.

## Current Intelligence APIs

### 1. **intelligence.js** - 5-Source Intelligence System
**Mount Point:** `/api/intelligence`
**Core Purpose:** Unified query system across 5 data sources (Notion, Supabase, Xero, Gmail, LinkedIn)

**Endpoints:**
- `POST /query` - Process natural language queries through 5-source system
- `GET /status` - Get current status of all data sources and system health
- `GET /examples` - Get example queries for testing
- `GET /insights` - Share accumulated knowledge and insights
- `POST /learn` - Teach the system new insights from external sources
- `GET /proactive` - Get proactive alerts, opportunities, and automated actions
- `POST /proactive/check` - Manually trigger proactive checks
- `GET /bookkeeping` - Get automated bookkeeping summary
- `POST /prevent-mistake` - Check if an action might be a mistake
- `POST /demo` - Run a demo query to showcase system capabilities

**Key Features:**
- Multi-source correlation
- Proactive monitoring
- Mistake prevention
- Knowledge graph building
- External integrations (QuickBooks, Stripe, Grants.gov, Banking APIs)

### 2. **universalIntelligence.js** - Universal Intelligence Platform
**Mount Point:** `/api/universal-intelligence`
**Core Purpose:** World-class business intelligence with deep research capabilities

**Endpoints:**
- `POST /query` - Primary endpoint for world-class business intelligence
- `POST /research` - Deep research mode with comprehensive knowledge synthesis
- `GET /knowledge-sources` - Get available knowledge sources and their capabilities
- `GET /ai-models` - Get configured AI models and their capabilities
- `GET /health` - Check overall system health and dependencies
- `POST /quick-insight` - Get quick insights for specific business questions
- `GET /examples` - Get example queries showcasing capabilities

**Key Features:**
- Multi-LLM analysis (Claude-3.5, Perplexity, GPT-4)
- Deep research mode
- Configurable depth levels
- Priority source selection

### 3. **dashboardIntelligence.js** - AI-Powered Dashboard Insights
**Mount Point:** `/api/dashboard-intelligence`
**Core Purpose:** Advanced intelligent dashboard features with AI-powered recommendations and insights

**Endpoints:**
- `GET /recommendations` - AI-powered personalized recommendations for dashboard users
- `GET /insights/:type` - Get AI-generated insights for specific dashboard sections
- `POST /predict` - Generate predictive analytics for projects and opportunities
- `GET /trends` - Analyze trends across projects, opportunities, and partnerships
- `POST /natural-query` - Process natural language queries about dashboard data
- `GET /alerts` - Get intelligent alerts based on data patterns
- `POST /report` - Generate AI-powered reports

**Key Features:**
- Personalized recommendations
- Predictive analytics
- Natural language querying
- Trend analysis
- Alert generation

### 4. **platformIntelligence.js** - Platform-Level Intelligence
**Mount Point:** `/api/platform-intelligence`
**Core Purpose:** Professional business metrics and KPIs for ACT Platform

**Endpoints:**
- `GET /metrics` - Get comprehensive platform performance metrics
- `GET /business-kpis` - Get business-level KPIs and analytics
- `GET /ai-insights` - AI-powered business insights from metrics
- `POST /generate-report` - Generate professional business intelligence report
- `GET /benchmark` - Industry benchmarks and comparative analysis

**Key Features:**
- Real-time metrics from Empathy Ledger
- Professional KPI calculation
- Benchmarking capabilities
- Redis caching for performance

### 5. **realIntelligence.js** - Production Intelligence System
**Mount Point:** `/api/real-intelligence`
**Core Purpose:** Actually working intelligence system with real Gmail authentication

**Endpoints:**
- `GET /status` - Get intelligence status and authentication state
- `GET /auth` - Start Gmail authentication flow
- `POST /auth/callback` - Handle OAuth callback
- `GET /contacts` - Get intelligent contact analysis
- `GET /projects` - Get discovered projects from email analysis
- `GET /opportunities` - Get funding opportunities from emails
- `GET /network-map` - Get network visualization data
- `POST /deep-search` - Perform comprehensive email search with AI analysis
- `GET /actionable-insights` - Get priority action items
- `POST /send-insight` - Send insights via email
- `POST /refresh` - Force data refresh

**Key Features:**
- Persistent Gmail authentication
- Real email analysis
- Contact intelligence
- Network mapping
- Actionable insights generation

### 6. **relationshipIntelligence.js** - Network Analysis
**Mount Point:** `/api/relationship-intelligence`
**Core Purpose:** Advanced network analysis and AI-powered recommendations

**Endpoints:**
- `POST /build-network` - Build relationship map from Gmail intelligence data
- `POST /recommend-contacts` - Get contact recommendations for a specific project
- `GET /network-analysis` - Get comprehensive network analysis
- `POST /identify-influencers` - Identify key influencers in network
- `GET /collaboration-opportunities` - Find collaboration opportunities

**Key Features:**
- Network graph building
- AI-powered contact recommendations
- Influencer identification
- Collaboration discovery

### 7. **aiDecisionSupport.js** - Decision Support System
**Mount Point:** `/api/ai-decision-support`
**Core Purpose:** Natural language query capabilities for Gmail intelligence and contacts

**Endpoints:**
- `POST /query` - Natural language queries about contacts/projects
- `GET /recommendations/:type` - Contextual recommendations (partnerships, funding, collaborators)
- `POST /analyze-decision` - Strategic decision analysis
- `GET /contacts/search` - AI-powered contact search

**Key Features:**
- Natural language processing
- Type-specific recommendations
- Decision analysis
- Smart contact search

### 8. **actFarmhandAgent.js** - Main AI Agent
**Mount Point:** `/api/farmhand`
**Core Purpose:** Natural language interface to ACT's intelligence ecosystem

**Endpoints:**
- `POST /query` - Natural language queries to AI agent
- `GET /weekly-sprint` - Weekly intelligence report
- `GET /health` - AI agent health check
- `POST /skill-pod/:podName` - Test specific skill pod
- `POST /alignment-check` - Check content against ACT values
- `POST /generate-tasks` - Generate Taskmaster cards from description
- `GET /recommendations` - Smart recommendations (funding, partnerships, etc)
- `POST /test-assumption` - Test strategic assumptions

**Key Features:**
- 8 specialized skill pods (DNA Guardian, Knowledge Librarian, etc)
- ACT values alignment checking
- Taskmaster integration
- Weekly sprint automation

### 9. **contentCreation.js** - Content Generation
**Mount Point:** `/api/content-creation`
**Core Purpose:** Multi-format content generation, curation, and management

**Endpoints:**
- `GET /status` - Get Content Creation Agent status
- `POST /generate` - Generate content (blog, social, newsletter, email, grant)
- `POST /check-brand-voice` - Check content against ACT brand voice
- `GET /templates/:format` - Get content templates
- `POST /curate` - Curate and optimize existing content
- `POST /schedule` - Schedule content publication
- `GET /analytics` - Get content performance analytics

**Key Features:**
- Multi-format content generation
- Brand voice compliance
- Content scheduling
- Performance analytics

### 10. **researchAnalyst.js** - Research Automation
**Mount Point:** `/api/research-analyst`
**Core Purpose:** Market research, competitive analysis, and trend identification

**Endpoints:**
- `GET /status` - Service status
- `POST /market-research` - Conduct market research
- `POST /competitive-analysis` - Perform competitive analysis
- `POST /trend-analysis` - Identify market trends
- `GET /research-history` - Get research history
- `GET /insights/:id` - Get specific research insights

**Key Features:**
- Market research automation
- Competitive intelligence
- Trend analysis
- Research history tracking

### 11. **complianceOfficer.js** - Compliance Monitoring
**Mount Point:** `/api/compliance-officer`
**Core Purpose:** Regulatory compliance monitoring, policy adherence, and violation detection

**Endpoints:**
- `GET /status` - Service status
- `POST /check` - Perform compliance check
- `POST /bulk-check` - Bulk compliance checking
- `GET /report` - Generate compliance report
- `GET /violations` - Get violation history
- `POST /monitor-updates` - Check regulatory updates
- `GET /frameworks` - List compliance frameworks

**Key Features:**
- Multi-framework compliance checking
- Violation tracking
- Regulatory update monitoring
- Automated compliance reporting

### 12. **intelligenceHub.js** - Multi-Agent Orchestration
**Mount Point:** `/api/intelligence-hub`
**Core Purpose:** Connects Express.js backend with LangGraph Intelligence Hub for advanced AI orchestration

**Endpoints:**
- `POST /tasks` - Submit task to Intelligence Hub for orchestration
- `GET /tasks/:id` - Get task status and results
- `GET /agents` - List available AI agents
- `POST /run-workflow` - Execute multi-agent workflow
- `GET /transparency-log` - Get community transparency log

**Key Features:**
- LangGraph integration
- Multi-agent workflow orchestration
- Democratic priority system
- Community transparency

### 13. **dataLakeIntelligence.js** - Data Lake Analysis
**Mount Point:** Not mounted in server.js (appears to be unused)
**Core Purpose:** Exposes unified data lake intelligence to frontend applications

**Endpoints:**
- `GET /intelligence` - Get comprehensive data intelligence across all systems
- `GET /sources` - Get data sources health status
- `GET /linkedin` - Get LinkedIn CRM intelligence specifically
- `GET /business-intelligence` - Get cross-system business intelligence insights

### 14. **intelligenceFeatureSuggestions.js** - Feature Suggestions
**Mount Point:** `/api/intelligence` (shares mount point with intelligence.js)
**Core Purpose:** Provides real feature suggestions based on intelligence analysis

**Endpoints:**
- `GET /suggested-features` - Get AI-generated feature suggestions based on intelligence data
- `GET /suggested-features/vote` - Get voting interface for feature suggestions
- `POST /suggested-features/feedback` - Submit feedback on AI-generated features

### 15. **decisionIntelligence.js** - Real-time Decision Support
**Mount Point:** `/api/decision-intelligence`
**Core Purpose:** Real-time business decision support with continuous learning

**Endpoints:**
- `GET /business-state` - Returns current business metrics
- `GET /decisions` - Returns all decisions with optional filtering
- `GET /recommendations` - Get AI-generated recommendations
- `POST /analyze` - Process new decision through AI
- `POST /decisions/:id/outcome` - Record decision outcomes
- `POST /decisions/:id/scenario-analysis` - Run scenario analysis
- `POST /deep-research` - Comprehensive AI research (Anthropic + OpenAI + Perplexity)
- `GET /ai-health` - Check AI services status

**Key Features:**
- Decision tracking with outcomes
- Scenario analysis
- Multi-AI deep research
- Continuous learning from outcomes

### 16. **mlPipeline.js** - ML Infrastructure
**Mount Point:** `/api/ml-pipeline`
**Core Purpose:** Provides endpoints for data processing pipelines, embedding generation, and similarity search

**Endpoints:**
- `POST /process` - Create and execute a data processing pipeline
- `POST /embeddings/generate` - Generate embeddings for texts
- `POST /similarity/search` - Find similar content using embeddings
- `GET /pipelines` - List available ML pipelines
- `POST /train` - Train custom ML models
- `GET /models` - Get available ML models

**Key Features:**
- Embedding generation and caching
- Similarity search
- Pipeline orchestration
- Model training capabilities

## Duplication Analysis

### 1. Query Processing Duplication
Multiple APIs implement similar "query" endpoints:
- `intelligence.js`: POST /query - 5-source natural language queries
- `universalIntelligence.js`: POST /query - World-class business intelligence queries
- `dashboardIntelligence.js`: POST /natural-query - Dashboard-specific queries
- `aiDecisionSupport.js`: POST /query - Contact/project queries
- `actFarmhandAgent.js`: POST /query - General AI agent queries

**Overlap:** All process natural language queries but with different focuses and data sources.

### 2. Recommendation Generation Duplication
- `intelligence.js`: Actions in query responses
- `dashboardIntelligence.js`: GET /recommendations
- `aiDecisionSupport.js`: GET /recommendations/:type
- `actFarmhandAgent.js`: GET /recommendations
- `decisionIntelligence.js`: GET /recommendations

**Overlap:** Multiple recommendation systems with unclear differentiation.

### 3. Health/Status Checking Duplication
- `intelligence.js`: GET /status
- `universalIntelligence.js`: GET /health
- `realIntelligence.js`: GET /status
- `actFarmhandAgent.js`: GET /health
- `decisionIntelligence.js`: GET /ai-health
- `contentCreation.js`: GET /status
- `researchAnalyst.js`: GET /status
- `complianceOfficer.js`: GET /status

**Overlap:** Each service implements its own health check without standardization.

### 4. Research Capabilities Duplication
- `universalIntelligence.js`: POST /research - Deep research mode
- `researchAnalyst.js`: POST /market-research - Market research
- `decisionIntelligence.js`: POST /deep-research - Multi-AI research

**Overlap:** Three different research implementations with similar goals.

### 5. Insight Generation Duplication
- `intelligence.js`: GET /insights
- `dashboardIntelligence.js`: GET /insights/:type
- `realIntelligence.js`: GET /actionable-insights
- `researchAnalyst.js`: GET /insights/:id

**Overlap:** Multiple insight endpoints with different structures.

## Unique Features to Preserve

### intelligence.js (5-Source System)
- **Unique:** Proactive monitoring, mistake prevention, automated bookkeeping, external learning
- **Preserve:** Proactive intelligence features, mistake prevention, knowledge graph building

### universalIntelligence.js
- **Unique:** Multi-LLM orchestration, configurable depth levels, priority source selection
- **Preserve:** Deep research capabilities, multi-model consensus

### realIntelligence.js
- **Unique:** Gmail OAuth flow, persistent authentication, real email analysis
- **Preserve:** Authentication flow, email-specific intelligence

### actFarmhandAgent.js
- **Unique:** 8 specialized skill pods, ACT values alignment, Taskmaster integration
- **Preserve:** Skill pod architecture, values checking, weekly sprints

### contentCreation.js
- **Unique:** Multi-format content generation, brand voice checking, scheduling
- **Preserve:** All content-specific features

### researchAnalyst.js
- **Unique:** Market research, competitive analysis, trend identification
- **Preserve:** Specialized research capabilities

### complianceOfficer.js
- **Unique:** Multi-framework compliance, violation tracking, regulatory monitoring
- **Preserve:** All compliance-specific features

### decisionIntelligence.js
- **Unique:** Decision tracking with outcomes, scenario analysis, continuous learning
- **Preserve:** Decision lifecycle management

### mlPipeline.js
- **Unique:** Embedding generation, similarity search, pipeline orchestration
- **Preserve:** All ML infrastructure capabilities

## Proposed Consolidated Structure: `/api/v1/intelligence/`

### Core Intelligence Endpoints
```
POST /api/v1/intelligence/query
  - Unified natural language query interface
  - Parameters:
    - query: string
    - mode: 'quick' | 'standard' | 'deep' | 'research'
    - sources: array of source names to include
    - context: additional context object
    - skill_pod: specific skill pod to use (optional)
  - Combines functionality from all query endpoints

GET /api/v1/intelligence/status
  - Unified system status endpoint
  - Returns health of all subsystems
  - Standardized format across all services
```

### Specialized Intelligence Services
```
# Decision Intelligence
GET  /api/v1/intelligence/decisions
POST /api/v1/intelligence/decisions/analyze
POST /api/v1/intelligence/decisions/:id/outcome
POST /api/v1/intelligence/decisions/:id/scenario

# Research Services
POST /api/v1/intelligence/research
  - Parameters:
    - type: 'market' | 'competitive' | 'trend' | 'general'
    - domain: specific domain to research
    - depth: 'quick' | 'standard' | 'deep'

# Content Services
POST /api/v1/intelligence/content/generate
POST /api/v1/intelligence/content/check-voice
POST /api/v1/intelligence/content/schedule

# Compliance Services
POST /api/v1/intelligence/compliance/check
GET  /api/v1/intelligence/compliance/violations
POST /api/v1/intelligence/compliance/monitor

# Proactive Intelligence
GET  /api/v1/intelligence/proactive/alerts
GET  /api/v1/intelligence/proactive/opportunities
POST /api/v1/intelligence/proactive/check
POST /api/v1/intelligence/proactive/prevent-mistake

# ML Services
POST /api/v1/intelligence/ml/embeddings
POST /api/v1/intelligence/ml/similarity
POST /api/v1/intelligence/ml/pipeline

# Recommendations & Insights
GET  /api/v1/intelligence/recommendations
  - Parameters:
    - type: 'general' | 'projects' | 'opportunities' | 'partnerships' | 'funding'
    - context: specific context for recommendations
GET  /api/v1/intelligence/insights
  - Parameters:
    - category: 'dashboard' | 'business' | 'network' | 'financial'
    - timeframe: period for insights

# Authentication (for Gmail/OAuth services)
GET  /api/v1/intelligence/auth/gmail
POST /api/v1/intelligence/auth/gmail/callback
```

### Implementation Strategy

1. **Create Unified Intelligence Router** (`/api/v1/intelligence/index.js`)
   - Import all existing services
   - Create unified query dispatcher
   - Standardize response formats

2. **Service Integration Pattern**
   ```javascript
   class UnifiedIntelligenceService {
     constructor() {
       this.services = {
         fiveSource: new FiveSourceIntelligence(),
         universal: new UniversalIntelligence(),
         farmhand: new ACTFarmhandAgent(),
         decision: new DecisionIntelligence(),
         research: new ResearchAnalyst(),
         compliance: new ComplianceOfficer(),
         content: new ContentCreation(),
         ml: new MLPipeline()
       };
     }
     
     async query(params) {
       // Route to appropriate service based on mode/context
       // Combine results when multiple services needed
     }
   }
   ```

3. **Backward Compatibility**
   - Keep existing endpoints operational during transition
   - Add deprecation warnings to responses
   - Provide migration guide for frontend

4. **Benefits of Consolidation**
   - Single entry point for all intelligence queries
   - Consistent authentication and error handling
   - Unified caching strategy
   - Simplified frontend integration
   - Better resource utilization
   - Clearer API documentation

## Migration Path

### Phase 1: Create Unified Service (Week 1)
- Implement `/api/v1/intelligence/` router
- Create unified query dispatcher
- Standardize response formats

### Phase 2: Integration Testing (Week 2)
- Test all service integrations
- Ensure no functionality lost
- Performance benchmarking

### Phase 3: Frontend Migration (Week 3-4)
- Update frontend to use new endpoints
- Add fallback to old endpoints
- Monitor usage patterns

### Phase 4: Deprecation (Week 5-6)
- Add deprecation warnings
- Document migration guide
- Support transition period

### Phase 5: Cleanup (Week 7-8)
- Remove deprecated endpoints
- Archive old code
- Update all documentation

## Conclusion

The current intelligence API landscape shows significant duplication across 16+ different files, with multiple implementations of similar functionality. Consolidating into a unified `/api/v1/intelligence/` structure will:

1. Reduce code duplication by ~60%
2. Improve maintainability
3. Standardize authentication and error handling
4. Create a clearer API surface for frontend developers
5. Enable better cross-service intelligence sharing
6. Simplify monitoring and debugging

The proposed structure preserves all unique functionality while providing a clean, organized interface for the ACT Placemat's intelligence capabilities.