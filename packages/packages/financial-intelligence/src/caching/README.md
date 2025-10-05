# Performance Caching System

A high-performance caching solution specifically designed for policy decisions and financial operations, with support for Redis, in-memory caching, and comprehensive monitoring.

## Features

### Core Capabilities

- 🚀 **High Performance**: Optimized for financial operations with sub-millisecond cache lookups
- 🔑 **Smart Key Generation**: Consistent cache key building with parameter hashing
- 📊 **Policy Decision Caching**: Specialized caching for policy evaluation results
- 🔄 **Intelligent Invalidation**: Context-aware cache invalidation based on policy changes
- 📈 **Comprehensive Monitoring**: Real-time health monitoring and performance metrics
- 🔒 **Security**: Encryption, compression, and access control support
- ⚡ **Multiple Backends**: Redis and in-memory providers with consistent APIs
- 🎯 **TTL Management**: Configurable time-to-live with risk-based adjustments

### Policy Decision Features

- **Input Hash Validation**: Ensures cache hits only for identical policy inputs
- **Version-Aware Caching**: Automatic invalidation on policy version changes
- **Risk-Based TTL**: Shorter cache times for high-risk decisions
- **Compliance Tracking**: Audit trails for all cached policy decisions
- **Invalidation Triggers**: Automatic cache clearing on consent/role changes

## Quick Start

### Basic Setup

```typescript
import { createCacheSystem } from '@act-placemat/financial-intelligence/caching';

// Create complete cache system
const cacheSystem = await createCacheSystem({
  type: 'redis', // or 'memory' for development
  redis: {
    client: redisClient,
    encryptionKey: 'your-256-bit-hex-key'
  },
  monitoring: {
    enabled: true,
    alertThresholds: {
      hitRateThreshold: 0.8,
      responseTimeThreshold: 50 // ms
    }
  }
});

const { provider, policyCache, monitor } = cacheSystem;
```

### Policy Decision Caching

```typescript
import { 
  PolicyDecisionInput, 
  PolicyDecisionCacheEntry,
  RiskLevel,
  DataClassification 
} from '@act-placemat/financial-intelligence/caching';

// Create policy decision input
const input: PolicyDecisionInput = {
  userId: 'user-123',
  action: 'transfer_funds',
  resource: '/accounts/savings',
  context: {
    amount: 50000,
    currency: 'AUD',
    destination: 'external'
  },
  timestamp: new Date(),
  inputHash: generateInputHash(/* normalized input */)
};

// Check cache first
const cached = await policyCache.getCachedDecision(input);
if (cached) {
  console.log('Cache hit! Decision:', cached.decision);
  return cached.decision;
}

// Evaluate policy (this would be your policy engine)
const decision = await evaluatePolicy(input);

// Cache the decision
const cacheEntry: PolicyDecisionCacheEntry = {
  decisionId: generateId(),
  policyVersion: 'v2.1.0',
  input,
  decision,
  reasoning: ['User has sufficient balance', 'Transfer within daily limit'],
  metadata: {
    evaluationTime: 45,
    rulesEvaluated: 12,
    cacheHit: false,
    complianceFrameworks: ['AML', 'AUSTRAC'],
    riskLevel: RiskLevel.MEDIUM,
    dataClassification: DataClassification.CONFIDENTIAL,
    auditRequired: true
  },
  cacheKey: '', // Will be generated automatically
  invalidationTriggers: [
    {
      type: 'policy_change',
      condition: 'policyVersion:v2.1.0',
      priority: 'immediate'
    },
    {
      type: 'consent_change',
      condition: `userId:${input.userId}`,
      priority: 'high'
    }
  ]
};

await policyCache.cacheDecision(cacheEntry);
```

### Cache Monitoring

```typescript
// Get health status
const health = monitor.getHealthStatus();
console.log(`Cache is ${health.healthy ? 'healthy' : 'unhealthy'}`);
console.log(`Hit rate: ${(health.metrics.hitRate * 100).toFixed(1)}%`);

if (!health.healthy) {
  console.log('Issues found:');
  health.issues.forEach(issue => {
    console.log(`- ${issue.description} (${issue.severity})`);
    console.log(`  Recommendation: ${issue.recommendation}`);
  });
}

// Get performance trends
const hitRateTrend = monitor.getTrendAnalysis('hitRate', 24); // Last 24 hours
console.log(`Hit rate trend: ${hitRateTrend.trend} (${(hitRateTrend.change * 100).toFixed(1)}% change)`);

// Trigger maintenance if needed
if (health.metrics.memoryUsage > 0.9) {
  const maintenanceResult = await monitor.triggerMaintenence();
  console.log(`Maintenance completed: freed ${maintenanceResult.memoryFreed} bytes`);
}
```

## Cache Key Structure

The system uses a hierarchical key structure for optimal organization:

```
v1:namespace:type:identifier
```

### Examples

```typescript
// Policy decision
v1:policy:decision:user123|transfer_funds|accounts_savings|a1b2c3d4

// User permissions
v1:permission:check:user123|read|accounts_savings

// Configuration
v1:config:policy|v2.1.0

// Consent status
v1:consent:check:user123|accounts_savings|financial_analysis
```

### Key Benefits

- **Consistent Format**: All keys follow the same pattern
- **Namespace Isolation**: Clear separation by functional area
- **Pattern Matching**: Efficient bulk operations with wildcards
- **Version Management**: Built-in versioning support
- **Parameter Hashing**: Long parameters automatically hashed

## Cache Invalidation

### Invalidation Triggers

The system supports multiple invalidation strategies:

```typescript
// Time-based expiry
{
  type: 'time_expiry',
  condition: '300', // seconds
  priority: 'background'
}

// Policy version changes
{
  type: 'policy_change',
  condition: 'policyId:transfer_policy',
  priority: 'immediate'
}

// User role changes
{
  type: 'user_role_change',
  condition: 'userId:user123',
  priority: 'high'
}

// Consent changes
{
  type: 'consent_change',
  condition: 'userId:user123,resource:accounts',
  priority: 'high'
}
```

### Manual Invalidation

```typescript
// Invalidate by pattern
await policyCache.invalidatePolicyDecisions('transfer_policy', 'Policy updated');

// Invalidate user-specific decisions
await policyCache.invalidateUserDecisions('user123', 'Role changed');

// Invalidate resource-specific decisions
await policyCache.invalidateResourceDecisions('/accounts/savings', 'Account closed');
```

## Configuration

### Development Configuration

```typescript
import { CACHE_CONFIGURATIONS } from '@act-placemat/financial-intelligence/caching';

const devCache = await createCacheSystem({
  type: 'memory',
  configuration: CACHE_CONFIGURATIONS.DEVELOPMENT
});
```

### Production Configuration

```typescript
const prodCache = await createCacheSystem({
  type: 'redis',
  redis: {
    client: redisClient,
    encryptionKey: process.env.CACHE_ENCRYPTION_KEY
  },
  configuration: CACHE_CONFIGURATIONS.PRODUCTION,
  monitoring: {
    enabled: true,
    alertThresholds: {
      hitRateThreshold: 0.85,
      responseTimeThreshold: 25,
      memoryUsageThreshold: 0.8,
      errorRateThreshold: 0.01
    }
  }
});
```

### Custom Configuration

```typescript
const customConfig: CacheConfiguration = {
  enabled: true,
  defaultTtl: 180000, // 3 minutes
  maxEntries: 50000,
  maxMemoryUsage: 200 * 1024 * 1024, // 200MB
  compressionEnabled: true,
  compressionThreshold: 512, // 512 bytes
  encryptionEnabled: true,
  evictionPolicy: 'lru',
  persistenceEnabled: true,
  replicationEnabled: false,
  namespaces: [
    {
      name: 'policy',
      enabled: true,
      ttl: 300000, // 5 minutes
      maxEntries: 10000,
      evictionPolicy: 'lru',
      compressionEnabled: true,
      encryptionRequired: true,
      invalidationRules: [
        {
          trigger: 'policy_change',
          pattern: 'v1:policy:decision:*',
          action: 'delete',
          priority: 'immediate',
          cascading: true
        }
      ]
    }
  ]
};
```

## Performance Optimization

### TTL Strategies

The system automatically adjusts TTL based on risk and data classification:

```typescript
// High-risk decisions: 1 minute TTL
RiskLevel.HIGH || RiskLevel.CRITICAL → 60000ms

// Medium-risk decisions: 5 minutes TTL
RiskLevel.MEDIUM → 300000ms

// Low-risk decisions: 15 minutes TTL
RiskLevel.LOW → 900000ms

// Cultural/sensitive data: 30 seconds TTL
DataClassification.CULTURAL → 30000ms
```

### Compression

Automatic compression for large cache entries:

```typescript
// Compression threshold: 1KB (configurable)
if (serializedSize > 1024) {
  // Apply compression before storage
  compressed = await compressData(serialized);
}
```

### Key Optimization

Use key templates for high-frequency operations:

```typescript
import { CacheKeyBuilder } from '@act-placemat/financial-intelligence/caching';

const keyBuilder = new CacheKeyBuilder();
const template = keyBuilder.createKeyTemplate('policy', 'decision');

// Fast key generation
const key1 = template.buildKey(['user123', 'transfer', 'hash1']);
const key2 = template.buildKey(['user456', 'withdraw', 'hash2']);
```

## Monitoring and Alerting

### Health Monitoring

```typescript
// Start monitoring
monitor.startMonitoring();

// Get real-time health status
const health = monitor.getHealthStatus();

// Health check results
interface CacheHealthStatus {
  healthy: boolean;
  issues: HealthIssue[];
  recommendations: string[];
  metrics: {
    hitRate: number;
    responseTime: number;
    memoryUsage: number;
    errorRate: number;
  };
}
```

### Performance Metrics

```typescript
// Get comprehensive stats
const stats = await policyCache.getDecisionStats();

console.log(`Policy hit rates:`, stats.policyHitRates);
console.log(`User hit rates:`, stats.userHitRates);
console.log(`Average decision time:`, stats.averageDecisionTime);
console.log(`Cache effectiveness:`, stats.cacheEffectiveness);
```

### Trend Analysis

```typescript
// Analyze trends over time
const hitRateTrend = monitor.getTrendAnalysis('hitRate', 24);
const responseTimeTrend = monitor.getTrendAnalysis('responseTime', 6);

if (hitRateTrend.trend === 'degrading') {
  console.warn('Hit rate is declining');
  // Take corrective action
}
```

### Exporting Metrics

```typescript
// Export metrics for external monitoring
const metricsExport = await monitor.exportMetrics();

// Save to file or send to monitoring system
fs.writeFileSync('cache-metrics.json', metricsExport.data);

// Verify integrity
const isValid = crypto.createHash('sha256')
  .update(metricsExport.data)
  .digest('hex') === metricsExport.checksum;
```

## Testing

### Mock Cache Provider

```typescript
import { InMemoryCacheProvider } from '@act-placemat/financial-intelligence/caching';

// Create test cache
const testCache = new InMemoryCacheProvider({
  defaultTtl: 1000, // 1 second for testing
  maxEntries: 100
});

// Use in tests
describe('Policy Cache Tests', () => {
  let policyCache: PolicyDecisionCache;
  
  beforeEach(() => {
    policyCache = new PolicyDecisionCache(testCache, new CacheKeyBuilder());
  });
  
  afterEach(() => {
    testCache.destroy(); // Clean up
  });
  
  it('should cache policy decisions', async () => {
    // Test implementation
  });
});
```

### Cache Warming

```typescript
// Warm cache with common patterns
const warmupPatterns = [
  'user:frequent_users',
  'action:high_volume_actions',
  'resource:critical_resources'
];

const warmupResult = await policyCache.warmupCache(warmupPatterns);
console.log(`Warmed ${warmupResult.entriesLoaded} entries in ${warmupResult.loadTime}ms`);
```

## Security Considerations

### Encryption

All sensitive cache data is encrypted at rest:

```typescript
// Automatic encryption for sensitive classifications
if (dataClassification === DataClassification.CONFIDENTIAL ||
    dataClassification === DataClassification.RESTRICTED ||
    dataClassification === DataClassification.CULTURAL) {
  // Data will be encrypted before storage
}
```

### Access Control

```typescript
// Access control for sensitive cache entries
const accessControl = {
  requiredRoles: ['financial_officer', 'compliance_officer'],
  userRestrictions: ['specific_user_id'],
  jurisdictionRestrictions: ['AU'],
  timeRestrictions: {
    startTime: '09:00',
    endTime: '17:00',
    timezone: 'Australia/Sydney'
  }
};
```

### Audit Logging

All cache operations on sensitive data are automatically logged:

```typescript
// Automatic audit logging for:
// - High-risk policy decisions
// - Cultural/Indigenous data
// - Compliance-required operations
// - Emergency overrides
```

## Troubleshooting

### Common Issues

#### Low Hit Rate

```typescript
// Check invalidation patterns
const stats = await policyCache.getDecisionStats();
console.log('Invalidation reasons:', stats.invalidationReasons);

// Review TTL settings
if (stats.averageDecisionTime > ttl) {
  console.warn('TTL may be too short for decision complexity');
}
```

#### High Memory Usage

```typescript
// Check compression settings
const health = monitor.getHealthStatus();
if (health.metrics.memoryUsage > 0.8) {
  // Enable compression
  // Reduce TTL values
  // Implement more aggressive eviction
}
```

#### Slow Response Times

```typescript
// Profile cache operations
const performanceReport = monitor.getPerformanceReport();
console.log('Performance summary:', performanceReport.summary);

// Check for serialization bottlenecks
// Consider key optimization
// Review network latency to Redis
```

### Maintenance

```typescript
// Regular maintenance
setInterval(async () => {
  const health = monitor.getHealthStatus();
  
  if (!health.healthy) {
    const maintenance = await monitor.triggerMaintenence();
    console.log('Maintenance completed:', maintenance);
  }
}, 3600000); // Every hour
```

### Debug Mode

```typescript
// Enable detailed logging
const debugCache = await createCacheSystem({
  type: 'memory',
  configuration: {
    ...CACHE_CONFIGURATIONS.DEVELOPMENT,
    // Additional debug options would go here
  }
});

// Monitor all cache events
debugCache.provider.monitor((event) => {
  console.log('Cache event:', event);
});
```

## Best Practices

### 1. TTL Management

- Use shorter TTL for high-risk decisions (1-5 minutes)
- Longer TTL for stable configuration data (15-60 minutes)
- Consider business hours for time-sensitive caches

### 2. Key Design

- Use consistent naming conventions
- Include version information in keys
- Avoid including sensitive data in keys

### 3. Invalidation Strategy

- Set up appropriate invalidation triggers
- Use cascading invalidation carefully
- Monitor invalidation frequency

### 4. Monitoring

- Set up alerting for health issues
- Track performance trends over time
- Regular maintenance scheduling

### 5. Security

- Encrypt sensitive cache data
- Implement proper access controls
- Audit high-risk operations

### 6. Testing

- Test cache behavior in integration tests
- Validate invalidation logic
- Performance test under load

## Integration Examples

### With Policy Engine

```typescript
class PolicyEngine {
  constructor(private cache: PolicyDecisionCache) {}
  
  async evaluatePolicy(input: PolicyDecisionInput): Promise<PolicyDecision> {
    // Check cache first
    const cached = await this.cache.getCachedDecision(input);
    if (cached) {
      return cached.decision;
    }
    
    // Evaluate policy
    const decision = await this.doEvaluation(input);
    
    // Cache result
    await this.cache.cacheDecision({
      decisionId: generateId(),
      policyVersion: this.version,
      input,
      decision,
      // ... other fields
    });
    
    return decision;
  }
}
```

### With Constitutional Safety

```typescript
class ConstitutionalSafetyService {
  constructor(private cache: PolicyDecisionCache) {}
  
  async checkAction(context: SafetyCheckContext): Promise<SafetyCheck> {
    const input = this.createPolicyInput(context);
    
    // Use cache for constitutional checks
    const cached = await this.cache.getCachedDecision(input);
    if (cached) {
      return this.createSafetyCheck(cached);
    }
    
    // Perform full constitutional check
    const result = await this.performConstitutionalCheck(context);
    
    // Cache constitutional decision
    await this.cacheSafetyCheck(input, result);
    
    return result;
  }
}
```

## License

This caching system is part of the ACT Placemat Financial Intelligence project and follows the same licensing terms.