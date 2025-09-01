# Data Management: Current State vs Future State

## Executive Summary

The ACT Placemat ecosystem currently manages data across multiple disparate sources with inconsistent access patterns, leading to API overuse, data sync issues, and poor performance. The new AI Workhouse architecture will centralize all data access through a unified layer with intelligent caching, real-time sync, and type-safe APIs.

## Current Data Sources & Management

### 1. Notion API
**Current State:**
- Direct API calls from frontend (`fetch('http://localhost:4000/api/notion/...')`)
- No caching (every page load = new API calls)
- Rate limiting issues (429 errors)
- Manual sync required
- OAuth integration but inconsistent auth
- 8 different databases accessed separately

**Issues:**
- API rate limits hit frequently
- 5-10 second load times for dashboards
- Data freshness inconsistent
- No offline support

### 2. Supabase (Empathy Ledger)
**Current State:**
- Direct database queries without caching
- No connection pooling
- RLS policies not fully implemented
- Real-time subscriptions not utilized
- Separate auth from main app

**Issues:**
- Database connection exhaustion
- No optimistic updates
- Slow aggregation queries
- Security concerns with direct access

### 3. External APIs
**Current State:**
- Gmail API: Direct calls, no batching
- LinkedIn scraping: Manual browser automation
- Xero: OAuth but no token refresh
- Metabase: Embedded without proper auth
- AI services: No request deduplication

**Issues:**
- Token expiration breaks integrations
- No circuit breaker for failing services
- Duplicate AI requests cost $$$
- No fallback mechanisms

### 4. Local Files & Static Data
**Current State:**
- JSON files in multiple locations
- No version control for data
- Manual updates required
- Inconsistent schemas

## Future State with AI Workhouse Architecture

### Unified Data Access Layer

```typescript
// Single entry point for ALL data access
const dataLayer = new DataAccessLayer({
  cache: new CacheService({
    redis: upstashRedis,
    ttl: {
      hot: 60,      // 1 minute for frequently accessed
      warm: 300,    // 5 minutes for regular data
      cold: 3600    // 1 hour for rarely changing
    }
  }),
  rateLimiter: new RateLimiter({
    notion: { rpm: 300, burst: 50 },
    supabase: { rpm: 1000, burst: 100 },
    ai: { rpm: 60, burst: 10 }
  })
});
```

### 1. Notion API - Enhanced Access

**Future State:**
```typescript
// Before: Direct, uncached API call
const projects = await fetch('/api/notion/projects');

// After: Unified access with automatic caching
const projects = await dataLayer.fetch(
  'notion.projects',
  () => notionService.getProjects(),
  ProjectsSchema,
  { 
    cache: 'warm',
    dedupe: true,
    fallback: cachedData 
  }
);
```

**Benefits:**
- 100ms response time (from cache)
- Automatic rate limiting
- Request deduplication
- Fallback to stale data if API fails
- Real-time updates via webhooks

### 2. Supabase - Optimized Access

**Future State:**
```typescript
// Real-time subscriptions with optimistic updates
const { data, subscribe } = useSupabaseQuery(
  'transactions',
  {
    select: '*',
    filter: { date: { gte: startDate } },
    realtime: true,
    optimistic: true
  }
);

// Automatic sync with conflict resolution
subscribe((changes) => {
  queryClient.setQueryData(['transactions'], 
    reconcileChanges(changes)
  );
});
```

**Benefits:**
- Connection pooling (max 10 connections)
- Optimistic UI updates
- Real-time sync across all clients
- Automatic conflict resolution
- RLS security enforced

### 3. External APIs - Resilient Access

**Future State:**
```typescript
// Circuit breaker pattern for failing services
const gmailData = await dataLayer.fetchExternal(
  'gmail.threads',
  async () => {
    const client = await gmailAuth.getClient();
    return gmail.users.threads.list({ 
      userId: 'me',
      maxResults: 50 
    });
  },
  {
    circuitBreaker: {
      threshold: 5,
      timeout: 60000,
      fallback: offlineData
    },
    retry: {
      attempts: 3,
      backoff: 'exponential'
    }
  }
);
```

**Benefits:**
- Automatic token refresh
- Circuit breaker prevents cascade failures
- Exponential backoff retry
- Batch requests where possible
- Cost optimization for AI calls

### 4. Unified Caching Strategy

**Cache Layers:**
1. **Memory Cache** (10ms): Hot data in-process
2. **Redis Cache** (50ms): Shared across instances
3. **Service Worker** (100ms): Offline support
4. **IndexedDB** (200ms): Large dataset storage

```typescript
// Intelligent cache invalidation
cacheService.invalidate({
  pattern: 'notion.projects.*',
  strategy: 'lazy', // Don't delete, mark stale
  broadcast: true    // Notify all clients
});
```

## Performance Improvements

| Metric | Current | Future | Improvement |
|--------|---------|--------|-------------|
| Dashboard Load | 5-10s | <500ms | 95% faster |
| API Calls/Load | 15-20 | 2-3 | 85% reduction |
| Cache Hit Rate | 0% | 85% | ∞ improvement |
| Offline Support | None | Full | 100% availability |
| Data Freshness | 5-30 min | <1 min | 5-30x fresher |
| Error Recovery | Manual | Automatic | 100% resilient |

## Security Enhancements

### Current Security Issues:
- API keys in frontend code
- No request signing
- Direct database access
- Unencrypted local storage
- No audit trail

### Future Security Features:
```typescript
// Request signing and encryption
const secureRequest = await apiClient.request({
  method: 'POST',
  url: '/api/sensitive',
  data: encryptedPayload,
  headers: {
    'X-Signature': await signRequest(payload),
    'X-Timestamp': Date.now(),
    'X-Nonce': crypto.randomUUID()
  }
});

// Row Level Security in Supabase
CREATE POLICY "Users see own org data"
  ON transactions FOR SELECT
  USING (organization_id = auth.jwt()->>'org_id');
```

## Data Sync Architecture

### Current: Manual, Error-Prone
```javascript
// Current approach - manual sync
setInterval(async () => {
  try {
    const data = await fetch('/api/sync');
    updateLocalData(data);
  } catch (err) {
    console.error('Sync failed');
  }
}, 60000);
```

### Future: Intelligent, Automatic
```typescript
// WebSocket real-time sync
const syncManager = new SyncManager({
  strategy: 'incremental',
  conflictResolution: 'last-write-wins',
  compression: true
});

syncManager.on('changes', async (delta) => {
  // Apply incremental updates
  await dataLayer.applyDelta(delta);
  
  // Broadcast to other tabs
  broadcastChannel.postMessage({
    type: 'data-sync',
    changes: delta
  });
});
```

## Implementation Roadmap

### Phase 1: Foundation (Completed ✅)
- [x] Unified data access layer
- [x] Cache service with Redis
- [x] Request deduplication
- [x] API client with interceptors

### Phase 2: Database (Completed ✅)
- [x] Supabase schema with RLS
- [x] React Query integration
- [x] Real-time subscriptions setup
- [x] Connection pooling

### Phase 3: Resilience (Completed ✅)
- [x] Error boundaries
- [x] Circuit breaker pattern
- [x] Performance monitoring
- [x] Web Vitals tracking

### Phase 4: Advanced (Pending)
- [ ] Service workers for offline
- [ ] tRPC for type-safe APIs
- [ ] Data migration scripts
- [ ] Comprehensive testing

## Migration Path

### Step 1: Gradual Migration
```typescript
// Wrap existing endpoints
const legacyAdapter = new LegacyAdapter({
  endpoints: {
    '/api/notion/projects': 'notion.projects',
    '/api/empathy-ledger/stats': 'supabase.stats'
  }
});
```

### Step 2: Update Components
```typescript
// Before
const ProjectsList = () => {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/projects').then(res => res.json()).then(setData);
  }, []);
};

// After
const ProjectsList = () => {
  const { data } = useQuery({
    queryKey: ['projects'],
    queryFn: () => dataLayer.getProjects()
  });
};
```

### Step 3: Enable Real-time
```typescript
// Add real-time subscriptions
useRealtimeSync('projects', {
  onChange: (changes) => {
    queryClient.invalidateQueries(['projects']);
  }
});
```

## Cost Optimization

### Current Costs:
- Notion API: ~$500/month (overuse)
- AI Services: ~$1000/month (duplicate requests)
- Database: ~$200/month (inefficient queries)

### Projected Savings:
- 80% reduction in API calls
- 60% reduction in AI requests
- 50% reduction in database load
- **Total: ~$850/month savings**

## Developer Experience

### Current DX Issues:
- No TypeScript types for data
- Inconsistent error handling
- Manual testing required
- No API documentation

### Future DX Features:
```typescript
// Full type safety with Zod schemas
const project = await dataLayer.get<Project>('project', id);
//                                    ^--- Auto-typed

// Automatic API documentation
swagger.generateDocs(dataLayer.endpoints);

// Built-in debugging
dataLayer.debug = true; // Logs all operations

// Performance profiling
const metrics = dataLayer.getMetrics();
console.log(metrics.slowestQueries);
```

## Monitoring & Observability

### New Monitoring Stack:
```typescript
// Automatic performance tracking
monitor.track('api.latency', {
  endpoint: '/api/projects',
  duration: 125,
  cache: 'hit',
  user: userId
});

// Real-time alerts
if (errorRate > 0.01) {
  alert.send({
    severity: 'high',
    message: 'Error rate exceeds 1%',
    runbook: 'https://docs.act.place/runbooks/high-error-rate'
  });
}
```

## Summary

The transition from current to future state represents a complete modernization of data management:

**Current State:**
- Fragmented data sources
- No caching strategy
- Manual error handling
- Poor performance
- Security vulnerabilities

**Future State:**
- Unified data layer
- Intelligent caching
- Automatic resilience
- Sub-second response times
- Enterprise-grade security

This architecture will enable ACT Placemat to scale from hundreds to millions of users while reducing operational costs and improving developer productivity.