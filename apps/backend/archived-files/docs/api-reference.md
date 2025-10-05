# ACT Farmhand AI - API Reference

## Table of Contents
1. [Authentication](#authentication)
2. [RESTful API Endpoints](#restful-api-endpoints)
3. [GraphQL API](#graphql-api)
4. [WebSocket Subscriptions](#websocket-subscriptions)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Cultural Safety](#cultural-safety)
8. [Examples](#examples)

## Authentication

### API Key Authentication
```http
X-API-Key: your_api_key_here
```

### Bearer Token Authentication  
```http
Authorization: Bearer your_jwt_token_here
```

### Public Endpoints
Most read-only endpoints work without authentication. Enhanced features require authentication.

## RESTful API Endpoints

### Farm Workflow System

#### Get Farm Status
```http
GET /api/farm-workflow/status
```

**Response:**
```json
{
  "success": true,
  "farm_status": {
    "skill_pods": {
      "dna-guardian": {
        "status": "idle",
        "progress": 85,
        "insights": 12
      }
    },
    "active_tasks": 5,
    "health_metrics": {
      "culturalSafety": 96.5,
      "systemPerformance": 94.2,
      "totalInsights": 147
    }
  },
  "timestamp": "2024-08-07T00:00:00Z"
}
```

#### Process Natural Language Query
```http
POST /api/farm-workflow/query
Content-Type: application/json

{
  "query": "What community stories should we prioritize for our next grant application?",
  "context": {}
}
```

**Response:**
```json
{
  "success": true,
  "farm_query": "What community stories should we prioritize for our next grant application?",
  "response": {
    "insight": "Based on analysis of recent community stories, prioritize narratives focusing on Indigenous climate action, traditional knowledge preservation, and youth engagement programs.",
    "confidence": 0.87
  },
  "workflowTasks": [],
  "culturalSafety": 96.5,
  "processingTime": 2847
}
```

#### Get Workflow Tasks
```http
GET /api/farm-workflow/tasks?status=pending&type=story_collection&priority=high
```

**Parameters:**
- `status`: `pending`, `in_progress`, `completed`, `deferred`, `cancelled`
- `type`: `story_collection`, `funding_opportunity`, `impact_analysis`, `system_improvement`
- `priority`: `low`, `medium`, `high`, `urgent`

**Response:**
```json
{
  "success": true,
  "tasks": [
    {
      "id": "task_123",
      "title": "Community Story Analysis",
      "description": "Analyze recent community stories for cultural themes",
      "type": "story_collection",
      "priority": "high",
      "status": "pending",
      "farmStage": "seeded",
      "progress": 0,
      "culturalSafety": 98.0,
      "skillPodsAssigned": ["story-weaver", "dna-guardian"],
      "insights": [],
      "farmMetaphor": "Seeds of wisdom planted in fertile soil",
      "estimatedYield": "Prioritized community narratives for grant applications",
      "createdAt": "2024-08-07T00:00:00Z",
      "updatedAt": "2024-08-07T00:00:00Z"
    }
  ],
  "total_count": 1,
  "timestamp": "2024-08-07T00:00:00Z"
}
```

#### Create Workflow Task
```http
POST /api/farm-workflow/tasks
Content-Type: application/json

{
  "title": "Grant Opportunity Analysis",
  "description": "Analyze alignment between Indigenous climate grant and our community values",
  "type": "funding_opportunity",
  "priority": "high",
  "skillPodsRequired": ["opportunity-scout", "dna-guardian", "compliance-sentry"],
  "culturalConsiderations": [
    "Ensure community consent for data sharing",
    "Validate Indigenous data sovereignty compliance"
  ],
  "expectedOutcomes": [
    "Detailed grant alignment assessment",
    "Cultural safety recommendations",
    "Application strategy with cultural protocols"
  ]
}
```

#### Get Skill Pod Status
```http
GET /api/farm-workflow/skill-pods
```

#### Get Specific Skill Pod
```http
GET /api/farm-workflow/skill-pods/dna-guardian
```

### System Integration

#### Get Integration Status
```http
GET /api/system-integration/status
```

**Response:**
```json
{
  "success": true,
  "integration_hub": {
    "status": "operational",
    "farm_workflow_connected": true,
    "services_registered": 3,
    "active_pipelines": 4,
    "connected_systems": 3
  },
  "services": [
    "empathy_ledger",
    "opportunity_ecosystem",
    "notion_knowledge"
  ],
  "pipelines": [
    {
      "name": "story_intelligence",
      "schedule": "daily",
      "processors": ["story_analyzer", "cultural_validator"]
    }
  ],
  "timestamp": "2024-08-07T00:00:00Z"
}
```

#### Run Data Pipeline
```http
POST /api/system-integration/pipelines/story_intelligence/run
Authorization: Bearer your_token
```

**Response:**
```json
{
  "success": true,
  "pipeline": "story_intelligence",
  "execution_result": {
    "storiesProcessed": 15,
    "insightsGenerated": 8,
    "culturalSafetyScore": 96.2
  },
  "executed_at": "2024-08-07T00:00:00Z",
  "message": "Pipeline story_intelligence executed successfully"
}
```

#### Trigger System Sync
```http
POST /api/system-integration/sync
Authorization: Bearer your_token
Content-Type: application/json

{
  "systems": ["stories", "opportunities"],
  "priority": "normal"
}
```

#### Get Integration Metrics
```http
GET /api/system-integration/metrics
```

#### Get Integration Analytics
```http
GET /api/system-integration/analytics?timeframe=7d
```

### Direct AI Agent Access

#### Query Farmhand Agent
```http
POST /api/farmhand/query
Content-Type: application/json

{
  "query": "Help me analyze the cultural impact of our storytelling program",
  "context": {
    "project_id": "storytelling_2024",
    "timeframe": "last_6_months"
  }
}
```

#### Weekly Intelligence Sprint
```http
GET /api/farmhand/weekly-sprint
```

#### Values Alignment Check
```http
POST /api/farmhand/alignment-check
Content-Type: application/json

{
  "content": "Our new community engagement strategy focuses on youth programs that integrate traditional knowledge with modern technology for climate action."
}
```

## GraphQL API

### Endpoint
```
POST /graphql
WebSocket: ws://localhost:5010/graphql
```

### Schema Overview
The GraphQL schema provides flexible querying across the entire ACT ecosystem with 100+ types, queries, mutations, and subscriptions.

### Sample Queries

#### Get Farm Status
```graphql
query GetFarmStatus {
  farmStatus {
    status
    culturalSafetyScore
    systemPerformanceScore
    totalInsights
    activeTasks
    skillPodsActive
    continuousProcessing
  }
}
```

#### Get Skill Pods
```graphql
query GetSkillPods {
  skillPods {
    id
    name
    farmElement
    status
    progress
    insights
    lastActivity
    performance {
      avgResponseTime
      successRate
      utilizationRate
    }
    culturalSafetyScore
  }
}
```

#### Intelligent Search
```graphql
query IntelligentSearch($query: String!) {
  intelligentSearch(query: $query) {
    results {
      title
      description
      relevanceScore
      culturalAlignment
    }
    insights {
      content
      confidence
      culturalSafety
    }
    culturalSafety
    suggestedActions {
      title
      description
      priority
    }
  }
}
```

#### Process Query
```graphql
mutation ProcessQuery($query: String!, $context: JSON) {
  processQuery(query: $query, context: $context) {
    success
    response {
      insight
      confidence
      farmMetaphor
      recommendations
    }
    workflowTasks {
      id
      title
      farmStage
      culturalSafety
    }
    culturalSafety
  }
}
```

#### Run Data Pipeline
```graphql
mutation RunDataPipeline($pipelineName: String!) {
  runDataPipeline(pipelineName: $pipelineName) {
    success
    pipeline
    executionTime
    result
    message
  }
}
```

### Complex Queries

#### Comprehensive Ecosystem Overview
```graphql
query ComprehensiveEcosystemOverview {
  farmStatus {
    status
    culturalSafetyScore
    totalInsights
    activeTasks
  }
  
  skillPods {
    name
    farmElement
    insights
    culturalSafetyScore
  }
  
  workflowTasks(limit: 10) {
    title
    farmStage
    progress
    culturalSafety
  }
  
  stories(limit: 5, culturalSafety: 90) {
    title
    themes
    culturalSafety
    impactMetrics {
      communityBenefit
      culturalSignificance
    }
  }
  
  systemIntegration {
    hubStatus
    farmWorkflowConnected
    activePipelines
    systemConnections {
      name
      status
      healthScore
    }
  }
}
```

#### Cultural Safety Audit
```graphql
query CulturalSafetyAudit {
  farmStatus {
    culturalSafetyScore
  }
  
  culturalSafetyMetrics {
    overallScore
    protocolValidations
    communityConsentChecks
    sacredKnowledgeProtections
    indigenousDataSovereignty
    communityFeedbackScore
  }
  
  stories(culturalSafety: 95) {
    title
    culturalSafety
    consent {
      hasConsent
      communityConsent
      consentType
    }
  }
  
  workflowTasks {
    title
    culturalSafety
    insights {
      culturalSafety
      content
    }
  }
}
```

## WebSocket Subscriptions

### Farm Activity Updates
```graphql
subscription FarmActivity {
  farmActivity {
    type
    message
    farmStage
    skillPod
    timestamp
  }
}
```

### Task Progress Updates
```graphql
subscription TaskProgress($taskId: ID) {
  taskProgressUpdated(taskId: $taskId) {
    taskId
    progress
    farmStage
    insights {
      content
      confidence
    }
    timestamp
  }
}
```

### Cultural Safety Alerts
```graphql
subscription CulturalSafetyAlerts {
  culturalSafetyAlert {
    level
    type
    message
    affectedSystems
    recommendedActions
    timestamp
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "validation_failed",
  "message": "Cultural safety score below threshold",
  "code": "CULTURAL_SAFETY_VIOLATION",
  "timestamp": "2024-08-07T00:00:00Z",
  "details": {
    "requiredScore": 90,
    "actualScore": 85,
    "recommendations": [
      "Review content for cultural sensitivity",
      "Ensure community consent is documented"
    ]
  }
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation errors, cultural safety violations)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### Cultural Safety Errors
```json
{
  "success": false,
  "error": "cultural_safety_violation",
  "message": "Content does not meet cultural safety requirements",
  "code": "CULTURAL_SAFETY_THRESHOLD",
  "culturalSafetyScore": 85,
  "requiredScore": 90,
  "violations": [
    "Community consent not verified",
    "Sacred knowledge protection protocol triggered"
  ]
}
```

## Rate Limiting

### Limits by Endpoint Type
- **General endpoints**: 100 requests per minute
- **AI processing endpoints**: 10 requests per minute  
- **System integration endpoints**: 50 requests per minute

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1628707200
```

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "error": "rate_limit_exceeded",
  "message": "Too many requests to AI processing endpoints",
  "retryAfter": 60
}
```

## Cultural Safety

### Automatic Scoring
All content is automatically scored for cultural safety:
- **95%+**: Excellent cultural alignment
- **90-94%**: Good alignment with minor considerations
- **Below 90%**: Requires cultural review

### Community Consent Validation
Every operation involving community data includes:
- Consent status verification
- Community-level approval check
- Withdrawal mechanism availability
- Cultural protocol compliance

### Indigenous Data Sovereignty
- All data handling respects Indigenous data rights
- Sacred knowledge protection protocols active
- Community ownership maintained
- Cultural protocols enforced

## Examples

### JavaScript/Node.js
```javascript
// REST API Example
const response = await fetch('/api/farm-workflow/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key_here'
  },
  body: JSON.stringify({
    query: 'What are the emerging themes in our recent community stories?',
    context: { timeframe: 'last_month' }
  })
});

const result = await response.json();
console.log('Cultural Safety Score:', result.culturalSafety);
console.log('Insight:', result.response.insight);

// GraphQL Example
const query = `
  query GetFarmStatus {
    farmStatus {
      culturalSafetyScore
      systemPerformanceScore
      totalInsights
    }
  }
`;

const graphqlResponse = await fetch('/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query })
});
```

### Python
```python
import requests

# REST API
response = requests.post('http://localhost:5010/api/farm-workflow/query', 
  headers={'Content-Type': 'application/json'},
  json={
    'query': 'Analyze community engagement patterns',
    'context': {'project_id': 'community_outreach_2024'}
  }
)

result = response.json()
print(f"Cultural Safety: {result['culturalSafety']}%")
print(f"Insight: {result['response']['insight']}")

# GraphQL
import json

query = """
query {
  farmStatus {
    status
    culturalSafetyScore
    totalInsights
  }
}
"""

response = requests.post('http://localhost:5010/graphql',
  headers={'Content-Type': 'application/json'},
  json={'query': query}
)

data = response.json()
```

### cURL
```bash
# Process natural language query
curl -X POST http://localhost:5010/api/farm-workflow/query \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "query": "What funding opportunities align with our Indigenous climate action work?",
    "context": {"focus_area": "climate_action"}
  }'

# Run system integration pipeline
curl -X POST http://localhost:5010/api/system-integration/pipelines/opportunity_discovery/run \
  -H "Authorization: Bearer your_jwt_token"

# GraphQL query
curl -X POST http://localhost:5010/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { farmStatus { status culturalSafetyScore totalInsights } }"
  }'
```

### WebSocket Subscription (JavaScript)
```javascript
import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const httpLink = new HttpLink({
  uri: 'http://localhost:5010/graphql'
});

const wsLink = new GraphQLWsLink(createClient({
  url: 'ws://localhost:5010/graphql',
}));

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache()
});

// Subscribe to farm activity
const subscription = client.subscribe({
  query: gql`
    subscription {
      farmActivity {
        type
        message
        timestamp
      }
    }
  `
});

subscription.subscribe({
  next: (data) => console.log(data),
  error: (error) => console.error(error)
});
```

---

**API Version**: 1.0.0  
**Last Updated**: August 2025  
**Base URL**: `http://localhost:5010` (development) | `https://api.act.place` (production)

For interactive API exploration, visit the GraphQL playground at `/graphql` in development mode.