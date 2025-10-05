# OPA Integration Service

Comprehensive Open Policy Agent (OPA) integration for Financial Intelligence with decision logging, audit capabilities, and Australian compliance features.

## Overview

The OPA Integration Service provides:

- **Policy Evaluation**: Real-time evaluation of financial intents against Rego policies
- **Decision Logging**: Comprehensive audit trails with Australian compliance context
- **Audit Queries**: Flexible querying interface for compliance reporting and investigation
- **Australian Compliance**: Built-in support for Privacy Act 1988, ACNC, AUSTRAC, and Indigenous data sovereignty
- **Performance Optimization**: Caching, batching, and monitoring capabilities

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Financial       │    │ OPA Service     │    │ Open Policy     │
│ Intelligence    │───▶│                 │───▶│ Agent Server    │
│ Agent           │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ Decision Logger │
                       │ (PostgreSQL)    │
                       └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ Audit Query     │
                       │ Interface       │
                       └─────────────────┘
```

## Quick Start

### 1. Basic Setup

```typescript
import { OPAServiceFactory, FinancialIntent, FinancialOperation } from '@act/financial-intelligence';

// Create OPA service
const opaService = OPAServiceFactory.createForDevelopment('http://localhost:8181');

// Initialize the service
await opaService.initialize();

// Load policies from Policy-as-Code repository
const financialPolicies = await loadFinancialPolicies();
for (const policy of financialPolicies) {
  await opaService.loadPolicy(policy);
}
```

### 2. Evaluate Financial Intent

```typescript
// Create a financial intent
const intent: FinancialIntent = {
  id: 'intent-123',
  operation: FinancialOperation.CREATE_PAYMENT,
  user: {
    id: 'user-456',
    roles: ['financial_manager'],
    consentLevels: ['enhanced_operations'],
    authentication: {
      verified: true,
      mfaCompleted: true,
      sessionAge: 1, // hours
      lastPasswordChange: 30 // days ago
    },
    location: {
      country: 'Australia',
      region: 'NSW',
      verified: true
    },
    network: {
      type: 'corporate',
      securityVerified: true,
      ipAddress: '10.0.1.100'
    }
  },
  financial: {
    amount: 500000, // $5,000 in cents
    currency: 'AUD',
    categories: ['community_development'],
    sensitivity: 'confidential',
    containsPersonalData: false
  },
  request: {
    timestamp: new Date(),
    requestId: 'req-789',
    sessionId: 'session-101',
    endpoint: '/api/payments',
    method: 'POST',
    justification: 'Community project funding'
  },
  compliance: {
    privacyAct: {
      personalDataInvolved: false,
      consentObtained: true,
      purposeLimitation: ['financial_operations'],
      crossBorderTransfer: false
    },
    dataResidency: {
      country: 'Australia',
      region: 'ap-southeast-2',
      governmentApproved: true
    }
  }
};

// Evaluate against policies
const decision = await opaService.evaluateIntent(intent, [
  'financial.spending_limits',
  'compliance.privacy_act',
  'security.access_control'
]);

console.log('Decision:', decision.decision); // 'allow', 'deny', or 'conditional'
console.log('Reason:', decision.reason);
console.log('Execution time:', decision.performance.evaluationTime, 'ms');
```

### 3. Query Audit Logs

```typescript
import { AuditQueryBuilder, AuditQueryTemplates } from '@act/financial-intelligence';

// Build custom audit query
const query = new AuditQueryBuilder()
  .recentActivity(24) // Last 24 hours
  .forUser('user-456')
  .withDecision('deny')
  .privacyActDecisions()
  .sortBy('timestamp', 'desc')
  .paginate(0, 50)
  .build();

// Execute query
const results = await opaService.queryAuditLogs(query);

console.log(`Found ${results.totalCount} audit entries`);
for (const log of results.logs) {
  console.log(`${log.timestamp}: ${log.decision.decision} - ${log.decision.reason}`);
}

// Use pre-built templates
const complianceQuery = AuditQueryTemplates.dailyComplianceReport(new Date());
const complianceResults = await opaService.queryAuditLogs(complianceQuery);
```

### 4. Generate Compliance Reports

```typescript
import { AuditReportGenerator } from '@act/financial-intelligence';

// Generate compliance summary
const complianceReport = AuditReportGenerator.generateComplianceSummary(results);

console.log('Privacy Act Decisions:', complianceReport.privacyAct.totalDecisions);
console.log('Indigenous Data Decisions:', complianceReport.indigenousData.totalDecisions);
console.log('AUSTRAC Reporting Required:', complianceReport.austrac.totalDecisions);

// Generate user activity report
const userReport = AuditReportGenerator.generateUserActivityReport(results);

console.log('Risk Indicators:', userReport.riskIndicators.suspiciousPatterns);
console.log('After Hours Activity:', userReport.riskIndicators.afterHoursActivity);
```

## Production Setup

### 1. PostgreSQL Configuration

```typescript
import { OPAServiceFactory } from '@act/financial-intelligence';

const opaService = OPAServiceFactory.createWithPostgreSQL(
  // OPA server config
  {
    url: 'https://opa.internal.act.org.au',
    timeout: 5000,
    retries: 3,
    retryDelay: 1000
  },
  // PostgreSQL config
  {
    connection: {
      host: 'postgresql.internal.act.org.au',
      port: 5432,
      database: 'financial_intelligence_audit',
      user: 'opa_service',
      password: process.env.DB_PASSWORD,
      ssl: true,
      max: 20
    },
    tables: {
      decisionsTable: 'opa_decisions',
      auditTable: 'opa_audit',
      complianceTable: 'compliance_reports',
      indexPrefix: 'opa_idx'
    },
    partitioning: {
      enabled: true,
      strategy: 'monthly',
      retentionPeriod: 84 // 7 years in months
    },
    encryption: {
      enabled: true,
      keyId: 'act-opa-encryption-key',
      encryptedFields: ['indigenous_traditional_owners', 'opa_result']
    },
    performance: {
      batchSize: 100,
      flushInterval: 30,
      enableAsyncWrites: true
    },
    compliance: {
      auditRetentionYears: 7,
      complianceRetentionYears: 10,
      indigenousDataRetentionYears: 50,
      enableDataResidencyChecks: true
    }
  }
);

await opaService.initialize();
```

### 2. Policy Loading

```typescript
import { PolicyRepository } from '@act/financial-intelligence';

// Load policies from Policy-as-Code repository
const policyRepo = new PolicyRepository(policyRepoConfig);
await policyRepo.initialize();

const policies = await policyRepo.listPolicies({
  type: ['operational', 'compliance', 'security'],
  environment: 'production'
});

// Load into OPA
for (const policy of policies) {
  await opaService.loadPolicy(policy);
}

console.log(`Loaded ${policies.length} policies into OPA`);
```

### 3. Monitoring and Alerts

```typescript
// Set up monitoring
opaService.on('decision', (event) => {
  // Log decision metrics
  console.log(`Decision: ${event.decision.decision}, Time: ${event.decision.performance.evaluationTime}ms`);
});

opaService.on('error', (error) => {
  // Handle errors
  console.error('OPA Service Error:', error);
  // Send alert to monitoring system
});

opaService.on('health_check_failed', (error) => {
  // Handle health check failures
  console.error('OPA Health Check Failed:', error);
  // Trigger alerting system
});

// Get service statistics
const stats = opaService.getStatistics();
console.log('Cache Hit Rate:', stats.performance.cacheHitRate);
console.log('Average Latency:', stats.performance.averageLatency);
console.log('Compliance Decisions:', stats.compliance);
```

## Australian Compliance Features

### Privacy Act 1988 Support

The service automatically handles Australian Privacy Principles (APPs):

```typescript
const intent: FinancialIntent = {
  // ... other fields
  financial: {
    containsPersonalData: true,
    sensitivity: 'confidential'
  },
  compliance: {
    privacyAct: {
      personalDataInvolved: true,
      consentObtained: true,
      purposeLimitation: ['financial_analysis', 'compliance_reporting'],
      crossBorderTransfer: false,
      destinationCountry: 'Australia'
    }
  }
};

// Evaluation will enforce Privacy Act requirements
const decision = await opaService.evaluateIntent(intent);
```

### Indigenous Data Sovereignty

Full support for CARE principles and traditional owner protocols:

```typescript
const indigenousIntent: FinancialIntent = {
  // ... other fields
  financial: {
    indigenousData: {
      traditionalOwners: ['Wiradjuri', 'Gundungurra'],
      careCompliance: {
        collectiveBenefit: true,
        authorityToControl: true,
        responsibility: true,
        ethics: true
      },
      culturalProtocols: {
        consultationCompleted: true,
        elderApproval: true,
        culturalImpactAssessed: true
      },
      containsSacredKnowledge: false
    }
  },
  compliance: {
    indigenousProtocols: {
      required: true,
      protocolsFollowed: true,
      traditionalOwnerConsent: true
    }
  }
};

const decision = await opaService.evaluateIntent(indigenousIntent);
```

### AUSTRAC Compliance

Automatic handling of financial reporting thresholds:

```typescript
const largeTransactionIntent: FinancialIntent = {
  // ... other fields
  financial: {
    amount: 1500000, // $15,000 - above AUSTRAC threshold
    currency: 'AUD'
  },
  compliance: {
    austrac: {
      reportingRequired: true,
      transactionType: 'electronic',
      suspiciousActivity: false
    }
  }
};

// Will trigger AUSTRAC compliance checks
const decision = await opaService.evaluateIntent(largeTransactionIntent);
```

## Audit Query Examples

### Security Investigation

```typescript
// Investigate potential security incident
const securityQuery = new AuditQueryBuilder()
  .timeRange(new Date('2024-01-01'), new Date('2024-01-02'))
  .deniedDecisions()
  .highSensitivityData()
  .withComplianceFlags(['cross_border', 'sovereignty_violation'])
  .sortBy('timestamp', 'desc')
  .build();

const incidents = await opaService.queryAuditLogs(securityQuery);

// Generate detailed incident report
for (const log of incidents.logs) {
  console.log(`INCIDENT: ${log.timestamp}`);
  console.log(`User: ${log.intent.user.id} (${log.intent.user.roles.join(', ')})`);
  console.log(`Operation: ${log.intent.operation}`);
  console.log(`Reason: ${log.decision.reason}`);
  console.log(`Location: ${log.intent.user.location.country}/${log.intent.user.location.region}`);
  console.log('---');
}
```

### Compliance Audit

```typescript
// Monthly Privacy Act compliance audit
const month = new Date('2024-01-01');
const privacyQuery = AuditQueryTemplates.privacyActComplianceAudit(month);
const privacyResults = await opaService.queryAuditLogs(privacyQuery);

const complianceReport = AuditReportGenerator.generateComplianceSummary(privacyResults);

console.log('PRIVACY ACT COMPLIANCE REPORT');
console.log('==============================');
console.log(`Total Privacy Act Decisions: ${complianceReport.privacyAct.totalDecisions}`);
console.log(`Denied Decisions: ${complianceReport.privacyAct.deniedDecisions}`);
console.log(`Cross-border Attempts: ${complianceReport.privacyAct.crossBorderAttempts}`);
console.log(`Personal Data Access: ${complianceReport.privacyAct.personalDataAccess}`);

// Generate formal compliance report
const reportData = {
  period: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
  ...complianceReport
};

// Save to compliance reporting system
await saveComplianceReport('privacy_act_monthly', reportData);
```

### User Activity Analysis

```typescript
// Analyze user activity for risk assessment
const userQuery = AuditQueryTemplates.userActivitySummary('user-456', 30);
const userResults = await opaService.queryAuditLogs(userQuery);

const userReport = AuditReportGenerator.generateUserActivityReport(userResults);

console.log('USER RISK ASSESSMENT');
console.log('===================');
console.log(`User: ${userReport.userId}`);
console.log(`Total Activities: ${userReport.totalActivities}`);
console.log(`Denied Access: ${userReport.riskIndicators.deniedAccess}`);
console.log(`After Hours Activity: ${userReport.riskIndicators.afterHoursActivity}`);
console.log(`Suspicious Patterns: ${userReport.riskIndicators.suspiciousPatterns.join(', ')}`);

// Flag high-risk users for review
if (userReport.riskIndicators.suspiciousPatterns.length > 0) {
  await flagUserForReview(userReport.userId, userReport.riskIndicators.suspiciousPatterns);
}
```

## Error Handling

```typescript
try {
  const decision = await opaService.evaluateIntent(intent);
  
  if (decision.decision === 'deny') {
    throw new Error(`Access denied: ${decision.reason}`);
  }
  
  if (decision.decision === 'conditional') {
    // Handle conditional approval
    for (const condition of decision.conditions || []) {
      console.log(`Condition required: ${condition.description}`);
      // Implement condition handling logic
    }
  }
  
} catch (error) {
  console.error('Policy evaluation failed:', error);
  
  // In case of policy evaluation failure, default to deny
  throw new Error('Access denied due to policy evaluation failure');
}
```

## Performance Considerations

### Caching Strategy

```typescript
// Configure caching for high-performance scenarios
const decision = await opaService.evaluateIntent(intent, policies, {
  useCache: true,
  cacheTTL: 300, // 5 minutes
  timeout: 1000   // 1 second max evaluation time
});

// Monitor cache performance
const stats = opaService.getStatistics();
console.log(`Cache hit rate: ${stats.performance.cacheHitRate * 100}%`);

// Clear cache when policies change
await opaService.clearCache();
```

### Batch Operations

```typescript
// Evaluate multiple intents efficiently
const intents = [intent1, intent2, intent3];
const requests = intents.map(intent => ({
  intent,
  policies: ['financial.spending_limits'],
  options: { useCache: true }
}));

const decisions = await opaService.evaluateIntents(requests);

for (let i = 0; i < decisions.length; i++) {
  console.log(`Intent ${i}: ${decisions[i].decision}`);
}
```

### Monitoring and Alerting

```typescript
// Set up performance monitoring
opaService.on('statistics', (stats) => {
  // Send metrics to monitoring system
  if (stats.performance.averageLatency > 1000) {
    console.warn('High latency detected:', stats.performance.averageLatency);
  }
  
  if (stats.performance.cacheHitRate < 0.8) {
    console.warn('Low cache hit rate:', stats.performance.cacheHitRate);
  }
});

// Health check monitoring
setInterval(async () => {
  try {
    const health = await opaService.healthCheck();
    if (health.status !== 'healthy') {
      console.error('OPA Service unhealthy:', health);
    }
  } catch (error) {
    console.error('Health check failed:', error);
  }
}, 30000); // Every 30 seconds
```

## Best Practices

### 1. Policy Management

- Load policies at startup and reload when policies change
- Use semantic versioning for policy deployments
- Test policies thoroughly before production deployment
- Monitor policy effectiveness and adjust as needed

### 2. Decision Logging

- Ensure all decisions are logged for compliance and audit
- Use appropriate retention periods for different data types
- Implement data encryption for sensitive information
- Regular purge old logs based on retention policies

### 3. Performance Optimization

- Use caching for frequently evaluated policies
- Implement appropriate timeout values
- Monitor and alert on performance metrics
- Use batch operations where possible

### 4. Security

- Validate all inputs before policy evaluation
- Use encrypted connections to OPA server
- Implement proper access controls for audit logs
- Regular security reviews of policy logic

### 5. Australian Compliance

- Ensure data residency requirements are met
- Implement proper Indigenous data sovereignty protocols
- Regular compliance audits and reporting
- Stay updated with regulatory changes

## Troubleshooting

### Common Issues

1. **OPA Server Connection Failures**
   ```typescript
   // Check OPA server health
   const health = await opaService.healthCheck();
   console.log('OPA Status:', health.components.opaServer);
   ```

2. **Policy Loading Errors**
   ```typescript
   try {
     await opaService.loadPolicy(policy);
   } catch (error) {
     console.error('Policy loading failed:', error);
     // Check policy syntax and OPA server logs
   }
   ```

3. **Database Connection Issues**
   ```typescript
   // Test database connectivity
   try {
     await opaService.queryAuditLogs(simpleQuery);
   } catch (error) {
     console.error('Database connection failed:', error);
     // Check PostgreSQL connection and credentials
   }
   ```

4. **Performance Issues**
   ```typescript
   const stats = opaService.getStatistics();
   if (stats.performance.averageLatency > 1000) {
     // Check OPA server performance
     // Review policy complexity
     // Increase cache TTL
   }
   ```

## License

This OPA Integration Service is designed for Australian community organisations and includes specific compliance features for local regulations and Indigenous data sovereignty.

## Support

For technical support:
- Check this documentation
- Review the examples in this file
- Consult OPA documentation for policy-specific issues
- For Australian compliance questions, refer to relevant regulatory guidance