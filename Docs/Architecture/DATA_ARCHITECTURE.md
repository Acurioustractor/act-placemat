# 🏗️ ACT Placemat Data Architecture

## Table of Contents
1. [Application Data Flow](#application-data-flow)
2. [Core Infrastructure Services](#core-infrastructure-services)
3. [Error Handling & Resilience](#error-handling--resilience)
4. [Monitoring & Observability](#monitoring--observability)
5. [Security Framework](#security-framework)
6. [Testing Framework](#testing-framework)
7. [API Reference](#api-reference)
8. [Deployment & Operations](#deployment--operations)

## **Application Data Flow**

### **📊 Dashboard Data (Notion-Powered)**
**Used for**: Internal dashboard analytics, network visualization, opportunity tracking

| Data Type | Source | API Endpoint | Frontend Service | Hook |
|-----------|--------|-------------|------------------|------|
| **Dashboard Overview** | Notion | `/api/dashboard/overview` | `dashboardService.getOverview()` | `useDashboardOverview()` |
| **Network Relationships** | Notion | `/api/dashboard/network/relationships` | `dashboardService.getNetworkData()` | `useNetworkRelationships()` |
| **Opportunities** | Notion | `/api/dashboard/ecosystem/opportunities` | `dashboardService.getOpportunities()` | `useOpportunityEcosystem()` |
| **Impact Chains** | Notion | `/api/dashboard/chains/impact` | `dashboardService.getImpactChains()` | `useImpactChains()` |
| **Search** | Notion | `/api/dashboard/search?q=term` | `dashboardService.search()` | `useDashboardSearch()` |

### **📖 Project Showcase Data (Supabase Stories)**
**Used for**: Public-facing project displays, user stories, community content

| Data Type | Source | API Endpoint | Frontend Service | Hook |
|-----------|--------|-------------|------------------|------|
| **Projects/Stories** | Supabase | `/api/stories` | `projectService.getProjects()` | `useProjects()` |
| **Themes** | Supabase | `/api/themes` | N/A | N/A |
| **Organizations** | Supabase | `/api/organizations` | N/A | N/A |
| **Storytellers** | Supabase | `/api/storytellers` | N/A | N/A |

---

## **🎯 Component Data Sources**

### **Dashboard Components (Use Notion Data):**
```typescript
// ✅ CORRECT - Uses Notion dashboard APIs
import { useDashboardOverview, useNetworkRelationships, useOpportunityEcosystem } from '../hooks/useDashboardData';

const DashboardPage = () => {
  const { data: overview } = useDashboardOverview();
  const { data: network } = useNetworkRelationships();
  const { data: opportunities } = useOpportunityEcosystem();
  
  return (
    <MetricsCards metrics={overview.metrics} />
    <NetworkGraph data={network} />
    <OpportunityEcosystem opportunities={opportunities} />
  );
};
```

### **Project Showcase Components (Use Supabase Stories):**
```typescript
// ✅ CORRECT - Uses Supabase stories for public projects
import { useProjects } from '../hooks';

const ProjectShowcase = () => {
  const { data: projects } = useProjects(); // This fetches from /api/stories
  
  return (
    <div>
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
};
```

---

## **🔧 Services Architecture**

### **Dashboard Service (`dashboardService.ts`)**
```typescript
// Handles Notion-powered dashboard data
class DashboardService {
  async getOverview(): Promise<DashboardOverview> {
    return apiService.get('/api/dashboard/overview');
  }
  
  async getNetworkData(): Promise<NetworkData> {
    return apiService.get('/api/dashboard/network/relationships');
  }
  
  async getOpportunities(): Promise<EcosystemOpportunity[]> {
    return apiService.get('/api/dashboard/ecosystem/opportunities');
  }
}
```

### **Project Service (`projectService.ts`)**
```typescript
// Handles Supabase stories as "projects" for public display
class ProjectService {
  async getProjects(): Promise<Project[]> {
    const response = await apiService.get('/api/stories?limit=50');
    
    // Convert stories to project format for UI
    return response.stories.map(story => ({
      id: story.id,
      name: story.title,
      description: story.summary,
      themes: story.themes,
      // ... other mappings
    }));
  }
}
```

---

## **🚀 Backend API Endpoints**

### **Dashboard Endpoints (Notion Integration)**
- `GET /api/dashboard/overview` - Dashboard metrics and overview
- `GET /api/dashboard/network/relationships` - Network visualization data
- `GET /api/dashboard/ecosystem/opportunities` - Opportunity ecosystem
- `GET /api/dashboard/chains/impact` - Project impact chains
- `GET /api/dashboard/search?q=term` - Search across dashboard data
- `GET /api/dashboard/health` - Dashboard and Notion health status
- `POST /api/dashboard/cache/clear` - Clear dashboard cache

### **Public Endpoints (Supabase Integration)**
- `GET /api/stories` - Community stories (displayed as projects)
- `GET /api/themes` - Story themes
- `GET /api/organizations` - Partner organizations
- `GET /api/storytellers` - Community storytellers
- `GET /api/homepage` - Homepage data aggregation

---

## **🎪 Page Routing**

### **Dashboard Pages** → Use Notion Dashboard APIs
- `/` - Main dashboard (uses `useDashboardOverview`)
- `/analytics` - Analytics dashboard (uses dashboard APIs)
- `/network` - Network visualization (uses `useNetworkRelationships`)
- `/opportunities` - Opportunities (uses `useOpportunityEcosystem`)

### **Public Pages** → Use Supabase Stories APIs
- `/projects` - Project showcase (uses `useProjects` → `/api/stories`)
- `/projects/:id` - Project detail (uses story data)
- `/showcase` - Public project showcase

---

## **✅ Data Flow Verification**

### **Dashboard Data Flow:**
1. **User visits dashboard** → Component calls `useDashboardOverview()`
2. **Hook calls** → `dashboardService.getOverview()`
3. **Service calls** → `apiService.get('/api/dashboard/overview')`
4. **Backend queries** → Notion API for projects, opportunities, people, artifacts
5. **Response flows back** → Dashboard displays Notion-powered analytics

### **Project Showcase Data Flow:**
1. **User visits projects page** → Component calls `useProjects()`
2. **Hook calls** → `projectService.getProjects()`
3. **Service calls** → `apiService.get('/api/stories')`
4. **Backend queries** → Supabase stories table
5. **Response flows back** → Projects page displays community stories as projects

---

## **🛠️ Implementation Status**

✅ **COMPLETED:**
- Dashboard service created with Notion API integration
- Project service updated to use Supabase stories
- Dashboard hooks updated to use correct endpoints
- Backend API endpoints working correctly
- Data architecture documented

🔄 **IN PROGRESS:**
- Updating remaining dashboard components to use new services
- Testing data flow end-to-end

---

**This architecture separates concerns properly:**
- **Dashboard = Internal analytics from Notion**
- **Projects = Public stories from Supabase**
- **Each uses appropriate data source for its purpose**

---

## **Core Infrastructure Services**

The ACT Placemat platform implements four critical infrastructure services that provide comprehensive observability, security, error handling, and testing capabilities.

### **🔍 OpenTelemetry Tracing Service**
**Location**: `/apps/backend/src/services/tracingService.js`

Provides distributed tracing across all operations with automatic instrumentation.

#### **Features:**
- **Automatic Instrumentation**: Express.js, HTTP, and database operations
- **Performance Monitoring**: Real-time latency and throughput metrics
- **Error Correlation**: Links errors to specific trace spans
- **Context Propagation**: Maintains trace context across service boundaries

#### **Configuration:**
```javascript
{
  serviceName: 'act-placemat-backend',
  environment: process.env.NODE_ENV,
  traceExporter: 'console', // Configurable for OTLP
  enableConsoleSpans: true,
  enableAutoInstrumentation: true,
  enableHttpInstrumentation: true,
  enableExpressInstrumentation: true
}
```

#### **Usage Examples:**
```javascript
// Automatic tracing for Express routes
app.get('/api/projects', async (req, res) => {
  // Automatically traced with span attributes
  const projects = await projectService.getProjects();
  res.json(projects);
});

// Manual span creation for business logic
async function complexBusinessOperation() {
  return await tracingService.startActiveSpan('business.complex_operation', {
    attributes: {
      'operation.type': 'business_logic',
      'operation.complexity': 'high'
    }
  }, async (span) => {
    // Business logic here
    const result = await performComplexCalculation();
    span.setAttributes({
      'operation.result_count': result.length,
      'operation.success': true
    });
    return result;
  });
}

// External service call tracing
const apiData = await traceExternalCall('notion', 'get_projects', async (span) => {
  span.setAttributes({
    'external.service': 'notion',
    'external.operation': 'query_database'
  });
  return await notionClient.databases.query({ database_id: 'abc123' });
});
```

### **🛡️ Security Guardrails Service**
**Location**: `/apps/backend/src/services/securityGuardrailsService.js`

Multi-layered security validation system protecting against common vulnerabilities.

#### **Security Layers:**
1. **Input Validation**: Comprehensive sanitization and validation
2. **SQL Injection Protection**: Parameterized queries and pattern detection
3. **XSS Prevention**: Content Security Policy and output encoding
4. **Rate Limiting**: Configurable per-endpoint rate limits
5. **Authentication**: Token validation and session management
6. **Authorization**: Role-based access control

#### **Alert Thresholds:**
```javascript
{
  sql_injection: { threshold: 1, severity: 'critical', action: 'block' },
  xss_attempt: { threshold: 1, severity: 'high', action: 'sanitize' },
  rate_limit_exceeded: { threshold: 10, severity: 'medium', action: 'throttle' },
  invalid_authentication: { threshold: 5, severity: 'high', action: 'alert' },
  data_exfiltration: { threshold: 1, severity: 'critical', action: 'block' }
}
```

#### **Usage Examples:**
```javascript
// Input validation middleware
app.use('/api', securityGuardrailsService.validateInput);

// SQL injection protection
const safeQuery = await securityGuardrailsService.validateSQLQuery(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// XSS protection for user content
const safeContent = await securityGuardrailsService.sanitizeInput(userInput, {
  allowHTML: false,
  stripScripts: true
});

// Rate limiting by user
app.use('/api/upload', securityGuardrailsService.rateLimitByUser({
  maxRequests: 10,
  windowMs: 60000 // 1 minute
}));
```

### **📹 Record/Replay Testing Service**
**Location**: `/apps/backend/src/services/recordReplayService.js`

Sophisticated testing framework capturing real interactions for regression testing.

#### **Capabilities:**
- **API Interaction Recording**: HTTP requests/responses with headers and timing
- **Database Transaction Capture**: SQL queries, results, and execution plans
- **External Service Mocking**: Deterministic replay of third-party API calls
- **Scenario Management**: Organize recordings by test scenarios
- **Regression Testing**: Automated validation against recorded behaviors

#### **Storage Structure:**
```
scenarios/
├── scenario-{id}/
│   ├── metadata.json          # Scenario information
│   ├── interactions/          # Recorded interactions
│   │   ├── api-{timestamp}.json
│   │   ├── database-{timestamp}.json
│   │   └── external-{timestamp}.json
│   └── assertions/            # Test assertions
│       └── expected-outcomes.json
```

#### **Usage Examples:**
```javascript
// Start recording a scenario
await recordReplayService.startRecording('user-registration-flow', {
  captureDatabase: true,
  captureExternal: true,
  includeHeaders: true
});

// Perform operations (automatically recorded)
const user = await userService.register(userData);
const project = await projectService.create(projectData);

// Stop recording
await recordReplayService.stopRecording();

// Replay scenario for testing
await recordReplayService.startReplay('user-registration-flow', {
  deterministicMode: true
});

// Run tests against replayed data
const testResult = await runRegressionTest();
await recordReplayService.stopReplay();
```

### **⚡ Error Taxonomy Service**
**Location**: `/apps/backend/src/services/errorTaxonomyService.js`

Comprehensive error classification and handling with intelligent retry logic.

#### **Error Categories:**
- **Network**: Connection failures, timeouts, DNS issues
- **Authentication**: Token expiry, invalid credentials
- **Authorization**: Permission denied, access violations
- **Rate Limiting**: Quota exceeded, throttling
- **Data Validation**: Schema errors, malformed input
- **System**: Internal server errors, dependency failures
- **Resource Exhaustion**: Memory limits, connection pools
- **Timeout**: Request timeouts, gateway timeouts
- **Dependency**: External service failures
- **Business Logic**: Application-specific errors
- **Configuration**: Setup and config errors
- **Concurrent Modification**: Race conditions, conflicts

#### **Retry Strategies:**
```javascript
const retryStrategies = {
  exponential_backoff: {
    baseDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true
  },
  linear_backoff: {
    baseDelay: 1000,
    increment: 1000,
    maxDelay: 10000
  },
  fibonacci_backoff: {
    baseDelay: 1000,
    sequence: [1, 1, 2, 3, 5, 8, 13],
    maxDelay: 20000
  },
  fixed_interval: {
    delay: 5000,
    maxRetries: 3
  },
  immediate: {
    delay: 0,
    maxRetries: 5
  },
  no_retry: {
    maxRetries: 0
  }
};
```

#### **Circuit Breaker Implementation:**
```javascript
// Circuit breaker states for each service
const circuitBreakers = {
  notion: { 
    state: 'closed', 
    failureCount: 0, 
    threshold: 5,
    recoveryTime: 30000 
  },
  supabase: { 
    state: 'closed', 
    failureCount: 0, 
    threshold: 3,
    recoveryTime: 15000 
  },
  xero: { 
    state: 'closed', 
    failureCount: 0, 
    threshold: 10,
    recoveryTime: 60000 
  }
};
```

#### **Usage Examples:**
```javascript
// Automatic error classification and retry
const result = await errorTaxonomyService.executeWithRetry(
  async () => {
    return await notionClient.databases.query({ database_id: 'abc123' });
  },
  {
    service: 'notion',
    policyName: 'api',
    context: { operation: 'query_database' },
    onRetry: (classification, attempt, delay) => {
      console.log(`Retrying ${classification.category} error, attempt ${attempt}, delay ${delay}ms`);
    },
    onFailure: (classification, attempts) => {
      console.error(`Failed after ${attempts} attempts: ${classification.category}`);
    }
  }
);

// Manual error classification
const error = new Error('Connection timeout');
error.code = 'ETIMEDOUT';
const classification = await errorTaxonomyService.classifyError(error, {
  service: 'database',
  operation: 'user_query'
});

// Using wrapper functions for common operations
import { wrapSupabaseQuery, wrapNotionOperation } from '../utils/errorTaxonomyWrappers.js';

// Database operation with automatic retry
const users = await wrapSupabaseQuery(
  supabaseClient.from('users').select('*'),
  'users',
  'select'
);

// Notion operation with circuit breaker
const projects = await wrapNotionOperation(
  () => notionClient.databases.query({ database_id: 'projects' }),
  'query_projects'
);
```

---

## **Error Handling & Resilience**

### **Circuit Breaker Pattern**

The system implements circuit breakers for all external services to prevent cascade failures:

```javascript
// Circuit breaker states
const states = {
  CLOSED: 'closed',     // Normal operation
  OPEN: 'open',         // Blocking requests
  HALF_OPEN: 'half_open' // Testing recovery
};

// Automatic state transitions
// CLOSED → OPEN: After threshold failures
// OPEN → HALF_OPEN: After recovery time
// HALF_OPEN → CLOSED: On successful request
// HALF_OPEN → OPEN: On failed request
```

### **Intelligent Retry Logic**

Error-specific retry strategies based on automatic classification:

```javascript
// Network errors: Exponential backoff with jitter
const networkRetry = {
  strategy: 'exponential_backoff',
  maxRetries: 5,
  baseDelay: 500,
  maxDelay: 10000,
  jitter: true
};

// Rate limit errors: Extended backoff
const rateLimitRetry = {
  strategy: 'exponential_backoff',
  maxRetries: 10,
  baseDelay: 5000,
  maxDelay: 60000,
  jitter: true
};

// Authentication errors: No retry
const authRetry = {
  strategy: 'no_retry',
  maxRetries: 0
};
```

### **Error Metrics & Monitoring**

Real-time error tracking and alerting:

```javascript
// Error metrics collection
const errorMetrics = {
  totalErrors: 0,
  errorsByCategory: {
    network: 45,
    authentication: 12,
    rate_limit: 8,
    system: 23
  },
  errorsBySeverity: {
    critical: 5,
    high: 32,
    medium: 41,
    low: 10
  },
  circuitBreakerStates: {
    notion: 'closed',
    supabase: 'closed',
    xero: 'half_open'
  }
};
```

---

## **Monitoring & Observability**

### **Distributed Tracing**

Complete request tracing across all system components:

#### **Trace Spans:**
- **HTTP Requests**: Method, URL, status code, duration, headers
- **Database Queries**: SQL, execution time, row count, connection pool
- **External API Calls**: Service name, endpoint, response time, payload size
- **Business Logic**: Custom spans for complex operations
- **Error Handling**: Error classification, retry attempts, circuit breaker state

#### **Metrics Collection:**
```javascript
const metrics = {
  requestRate: {
    total: 1250,        // req/sec
    byEndpoint: {
      '/api/projects': 450,
      '/api/dashboard': 320,
      '/api/stories': 280
    }
  },
  errorRate: {
    overall: 2.1,       // percentage
    byService: {
      notion: 1.8,
      supabase: 0.5,
      xero: 4.2
    }
  },
  latency: {
    p50: 45,           // milliseconds
    p90: 120,
    p95: 250,
    p99: 890
  },
  throughput: {
    total: 15420,      // operations/minute
    database: 8900,
    external: 6520
  }
};
```

#### **Example Trace:**
```javascript
// Automatic trace creation for request
span.user_registration {
  attributes: {
    'http.method': 'POST',
    'http.url': '/api/users/register',
    'http.status_code': 201,
    'user.email': 'user@example.com',
    'operation.duration': 245
  },
  children: [
    span.security_validation {
      attributes: {
        'security.validation_type': 'input',
        'security.passed': true,
        'security.duration': 12
      }
    },
    span.database_insert {
      attributes: {
        'db.statement': 'INSERT INTO users...',
        'db.operation': 'insert',
        'db.duration': 89,
        'db.rows_affected': 1
      }
    },
    span.external_notification {
      attributes: {
        'external.service': 'email',
        'external.operation': 'send_welcome',
        'external.duration': 144,
        'external.success': true
      }
    }
  ]
}
```

### **Health Monitoring**

Comprehensive health checks for all system components:

```javascript
// Health check endpoints and responses
GET /health/status          // Overall system health
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "healthy",
    "tracing": "healthy",
    "security": "healthy",
    "error_taxonomy": "healthy"
  },
  "metrics": {
    "uptime": 86400,
    "memory_usage": 68.5,
    "cpu_usage": 23.1
  }
}

GET /health/database        // Database connectivity
{
  "status": "healthy",
  "connection_pool": {
    "active": 5,
    "idle": 15,
    "max": 20
  },
  "query_performance": {
    "avg_response_time": 45,
    "slow_queries": 2
  }
}

GET /health/external        // External service health
{
  "status": "degraded",
  "services": {
    "notion": {
      "status": "healthy",
      "response_time": 234,
      "last_check": "2024-01-15T10:29:45Z"
    },
    "supabase": {
      "status": "healthy",
      "response_time": 89,
      "last_check": "2024-01-15T10:29:45Z"
    },
    "xero": {
      "status": "degraded",
      "response_time": 1200,
      "last_check": "2024-01-15T10:29:45Z",
      "circuit_breaker": "half_open"
    }
  }
}
```

---

## **Security Framework**

### **Multi-Layer Security Architecture**

#### **Layer 1: Input Validation**
```javascript
// Schema validation for all inputs
const userSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    age: { type: 'integer', minimum: 0, maximum: 150 }
  },
  required: ['email', 'name'],
  additionalProperties: false
};

// Automatic sanitization
const sanitizedInput = await securityGuardrailsService.sanitizeInput(userInput, {
  allowHTML: false,
  stripScripts: true,
  maxLength: 1000
});
```

#### **Layer 2: SQL Injection Protection**
```javascript
// Automatic SQL pattern detection
const suspiciousPatterns = [
  /union\s+select/i,
  /drop\s+table/i,
  /delete\s+from/i,
  /insert\s+into/i,
  /--\s*$/,
  /\/\*[\s\S]*?\*\//
];

// Safe parameterized queries
const result = await securityGuardrailsService.executeSafeQuery(
  'SELECT * FROM users WHERE email = $1 AND status = $2',
  [email, 'active']
);
```

#### **Layer 3: Authentication & Authorization**
```javascript
// JWT token validation
const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const decoded = await securityGuardrailsService.validateToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access control
const authorizeRole = (requiredRole) => (req, res, next) => {
  if (req.user.role !== requiredRole) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};
```

#### **Layer 4: Rate Limiting**
```javascript
// Per-IP rate limiting
const ipRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
};

// Per-user rate limiting
const userRateLimit = {
  windowMs: 60 * 1000,      // 1 minute
  max: 30,                  // limit each user to 30 requests per minute
  keyGenerator: (req) => req.user.id
};
```

### **Security Monitoring**

Real-time security event monitoring and alerting:

```javascript
// Security alert configuration
const securityAlerts = {
  sql_injection_attempt: {
    threshold: 1,
    action: 'block_ip',
    notification: 'immediate'
  },
  brute_force_login: {
    threshold: 5,
    action: 'rate_limit_user',
    notification: 'immediate'
  },
  suspicious_activity: {
    threshold: 3,
    action: 'require_mfa',
    notification: 'delayed'
  },
  data_access_anomaly: {
    threshold: 1,
    action: 'audit_log',
    notification: 'immediate'
  }
};
```

---

## **Testing Framework**

### **Record/Replay Testing Architecture**

#### **Recording Capabilities:**
```javascript
// API interaction recording
const apiInteraction = {
  id: 'api-1642234567890',
  type: 'api',
  timestamp: '2024-01-15T10:30:00Z',
  request: {
    method: 'POST',
    url: '/api/projects',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer [REDACTED]'
    },
    body: {
      name: 'Test Project',
      description: 'A test project'
    }
  },
  response: {
    status: 201,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      id: 'proj_123',
      name: 'Test Project',
      created_at: '2024-01-15T10:30:00Z'
    },
    duration: 245
  }
};

// Database interaction recording
const dbInteraction = {
  id: 'db-1642234567891',
  type: 'database',
  timestamp: '2024-01-15T10:30:00Z',
  query: {
    sql: 'INSERT INTO projects (name, description) VALUES ($1, $2) RETURNING *',
    parameters: ['Test Project', 'A test project'],
    execution_plan: {
      node_type: 'Insert',
      total_cost: 0.01
    }
  },
  result: {
    rows: [{
      id: 'proj_123',
      name: 'Test Project',
      description: 'A test project',
      created_at: '2024-01-15T10:30:00Z'
    }],
    row_count: 1,
    duration: 12
  }
};
```

#### **Replay Features:**
```javascript
// Deterministic replay configuration
const replayOptions = {
  deterministicMode: true,
  mockTime: '2024-01-15T10:30:00Z',
  mockRandomSeed: 12345,
  strictAssertion: true,
  allowPartialMatch: false
};

// Scenario-based testing
const testScenario = {
  id: 'user-registration-flow',
  name: 'Complete User Registration Flow',
  type: 'integration',
  interactions: [
    'api-1642234567890',  // POST /api/users/register
    'db-1642234567891',   // INSERT INTO users
    'ext-1642234567892'   // Email notification
  ],
  assertions: [
    {
      type: 'response_status',
      interaction: 'api-1642234567890',
      expected: 201
    },
    {
      type: 'database_row_count',
      interaction: 'db-1642234567891',
      expected: 1
    }
  ]
};
```

#### **Automated Regression Testing:**
```javascript
// Regression test runner
const regressionResults = await regressionTester.runAllRegressionTests({
  parallel: true,
  retryFailedTests: true,
  maxRetries: 3,
  generateReport: true
});

// Test results
{
  success: true,
  totalTests: 15,
  passed: 14,
  failed: 1,
  skipped: 0,
  duration: 45000,
  passRate: 93.3,
  reportPath: './test/reports/regression-report-2024-01-15.html'
}
```

---

## **API Reference**

### **Infrastructure Service APIs**

#### **OpenTelemetry Tracing APIs**
```
GET /api/tracing/status            - Tracing service status
GET /api/tracing/traces            - Recent trace data
GET /api/tracing/metrics           - Performance metrics
POST /api/tracing/config           - Update tracing configuration
```

#### **Security Guardrails APIs**
```
GET /api/security/status           - Security service status
GET /api/security/alerts           - Recent security alerts
POST /api/security/validate        - Validate input data
GET /api/security/metrics          - Security metrics
POST /api/security/report          - Report security incident
```

#### **Error Taxonomy APIs**
```
GET /api/error-taxonomy/status              - Service status and configuration
GET /api/error-taxonomy/statistics          - Error statistics and metrics
GET /api/error-taxonomy/circuit-breakers    - Circuit breaker states
POST /api/error-taxonomy/circuit-breakers/:service/reset  - Reset circuit breaker
POST /api/error-taxonomy/classify           - Manually classify an error
POST /api/error-taxonomy/test/retry         - Test retry mechanisms
POST /api/error-taxonomy/test/circuit-breaker  - Test circuit breaker
POST /api/error-taxonomy/test/comprehensive - Run all tests
GET /api/error-taxonomy/config              - Get service configuration
```

#### **Record/Replay Testing APIs**
```
GET /api/testing/status                     - Testing service status
POST /api/testing/scenarios                 - Create test scenario
GET /api/testing/scenarios                  - List all scenarios
GET /api/testing/scenarios/:id              - Get scenario details
DELETE /api/testing/scenarios/:id           - Delete scenario
POST /api/testing/scenarios/:id/replay     - Replay scenario
POST /api/testing/record/start              - Start recording
POST /api/testing/record/stop               - Stop recording
GET /api/testing/recordings                 - List recordings
POST /api/testing/regression/run            - Run regression tests
```

### **Health Check APIs**
```
GET /health/status                 - Overall system health
GET /health/database              - Database connectivity and performance
GET /health/external              - External service health
GET /health/services              - Individual service health
GET /health/circuit-breakers      - Circuit breaker states
GET /health/metrics               - System performance metrics
```

### **Authentication**

All infrastructure APIs require valid authentication:

```javascript
// Authentication header
Authorization: Bearer <jwt_token>

// Example authenticated request
curl -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
     https://api.actplacemat.org/api/error-taxonomy/status
```

---

## **Deployment & Operations**

### **Service Dependencies**

```mermaid
graph TD
    A[Express Server] --> B[Tracing Service]
    A --> C[Security Service]
    A --> D[Error Taxonomy Service]
    A --> E[Record/Replay Service]
    
    B --> F[OpenTelemetry SDK]
    C --> G[Input Validators]
    D --> H[Circuit Breakers]
    E --> I[File System Storage]
    
    A --> J[Supabase Database]
    A --> K[Notion API]
    A --> L[External Services]
```

### **Initialization Sequence**

```javascript
// Server startup sequence
async function initializeServices() {
  console.log('🔧 Initializing ACT Placemat Backend Services...');
  
  try {
    // 1. Initialize tracing first (for observability)
    await tracingService.initialize();
    console.log('✅ OpenTelemetry tracing service initialized');
    
    // 2. Initialize security (for protection)
    await securityGuardrailsService.initialize();
    console.log('✅ Security guardrails service initialized');
    
    // 3. Initialize record/replay (for testing)
    await recordReplayService.initialize();
    console.log('✅ Record/replay testing service initialized');
    
    // 4. Initialize error taxonomy (for resilience)
    await errorTaxonomyService.initialize();
    console.log('✅ Error taxonomy service initialized');
    
    console.log('🚀 All infrastructure services ready');
    return true;
    
  } catch (error) {
    console.error('❌ Service initialization failed:', error.message);
    process.exit(1);
  }
}
```

### **Environment Configuration**

```javascript
// Environment variables
const config = {
  // OpenTelemetry
  OTEL_SERVICE_NAME: 'act-placemat-backend',
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_ENDPOINT,
  
  // Security
  JWT_SECRET: process.env.JWT_SECRET,
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || 900000,
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX || 100,
  
  // Error Handling
  ERROR_TAXONOMY_ENABLED: process.env.ERROR_TAXONOMY_ENABLED !== 'false',
  CIRCUIT_BREAKER_THRESHOLD: process.env.CIRCUIT_BREAKER_THRESHOLD || 5,
  
  // Testing
  RECORD_REPLAY_ENABLED: process.env.RECORD_REPLAY_ENABLED !== 'false',
  TEST_SCENARIOS_PATH: process.env.TEST_SCENARIOS_PATH || './test/scenarios',
  
  // External Services
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  NOTION_API_KEY: process.env.NOTION_API_KEY
};
```

### **Monitoring & Alerting**

```javascript
// Production monitoring setup
const monitoringConfig = {
  healthChecks: {
    interval: 30000,        // 30 seconds
    timeout: 5000,          // 5 seconds
    retries: 3
  },
  alerts: {
    errorRate: {
      threshold: 5,         // 5% error rate
      window: '5m'
    },
    responseTime: {
      threshold: 1000,      // 1 second
      window: '10m'
    },
    circuitBreaker: {
      threshold: 1,         // Any circuit breaker open
      window: '1m'
    }
  },
  metrics: {
    retention: '7d',        // 7 days
    aggregation: '1m'       // 1 minute intervals
  }
};
```

This comprehensive data architecture provides the foundation for a resilient, observable, secure, and testable platform that supports the ACT Placemat community's collaborative social impact initiatives.