# Policy-as-Code Repository

A comprehensive, version-controlled repository for policy definitions using Rego, enabling modular and auditable policy management with Australian compliance focus.

## Overview

This Policy-as-Code system provides:
- **Version Control**: Full versioning with semantic versioning support
- **Rego Integration**: Open Policy Agent (OPA) compatible policies
- **Australian Compliance**: Built-in support for Privacy Act 1988, ACNC, AUSTRAC
- **CI/CD Integration**: Automated testing and deployment pipelines
- **Audit Logging**: Comprehensive decision and change tracking
- **Indigenous Protocols**: CARE principles and cultural protocol support

## Architecture

```
policy/
├── PolicyRepository.ts      # Main repository for policy management
├── RegoPolicyEngine.ts      # Policy execution engine with OPA integration
├── PolicyValidator.ts       # Comprehensive policy validation
├── PolicyVersionManager.ts  # Version control and rollback capabilities
├── types.ts                # Type definitions for all policy structures
├── modules/                # Pre-built policy modules
│   ├── financial.ts        # Financial operation policies
│   ├── compliance.ts       # Regulatory compliance policies
│   ├── community.ts        # Community governance policies
│   └── security.ts         # Security and access control policies
└── README.md              # This documentation
```

## Quick Start

### 1. Initialize the Policy Repository

```typescript
import { PolicyRepository, PolicyRepositoryConfig } from '@act/financial-intelligence';

const config: PolicyRepositoryConfig = {
  storage: {
    type: 'filesystem',
    path: './policies'
  },
  versionControl: {
    autoVersioning: true,
    semanticVersioning: true,
    requireChangeLog: true,
    maxVersionHistory: 50
  },
  cicd: {
    enableAutomatedTesting: true,
    enableAutomatedDeployment: false,
    requireApprovalForProduction: true,
    rollbackOnFailure: true,
    healthCheckInterval: 60
  },
  compliance: {
    enforceDataResidency: true,
    requireIndigenousProtocols: true,
    mandatoryComplianceChecks: ['privacy_act', 'acnc'],
    auditRetentionDays: 2555 // 7 years
  }
};

const repository = new PolicyRepository(config);
await repository.initialize();
```

### 2. Create a New Policy

```typescript
import { PolicyDefinition, PolicyType, PolicyEnforcement, ConsentScope } from '@act/financial-intelligence';

const policyDefinition: PolicyDefinition = {
  name: 'Spending Limits',
  description: 'Enforces daily spending limits based on consent level',
  module: 'financial.spending_limits',
  type: PolicyType.OPERATIONAL,
  enforcement: PolicyEnforcement.MANDATORY,
  scopes: [ConsentScope.CASH_FLOW],
  rego: `
package financial.spending_limits

allow if {
    input.amount <= 1000
    input.consent_level == "basic"
}

allow if {
    input.amount <= 10000
    input.consent_level == "enhanced"
}
`,
  testCases: [
    {
      id: 'test-1',
      name: 'Allow small transaction',
      description: 'Transaction within basic limit',
      input: { amount: 500, consent_level: 'basic' },
      expectedOutput: { allowed: true },
      expectedDecision: 'allow'
    }
  ]
};

const policy = await repository.createPolicy(policyDefinition);
```

### 3. Execute Policy Decisions

```typescript
import { RegoPolicyEngine, PolicyEngineConfig } from '@act/financial-intelligence';

const engineConfig: PolicyEngineConfig = {
  opa: {
    serverUrl: 'http://localhost:8181',
    timeout: 5000,
    retries: 3,
    enableDecisionLogging: true
  },
  cache: {
    enableCaching: true,
    cacheTTL: 300,
    maxCacheSize: 1000
  },
  security: {
    enableInputValidation: true,
    sanitizeInputs: true,
    enableAuditLogging: true
  }
};

const engine = new RegoPolicyEngine(engineConfig);
await engine.initialize();

// Load policy into engine
await engine.loadPolicy(policy);

// Evaluate decision
const result = await engine.evaluatePolicy(policy, {
  amount: 750,
  consent_level: 'basic',
  user: { id: 'user123' }
});

console.log(`Decision: ${result.decision}`); // "allow"
console.log(`Execution time: ${result.executionTime}ms`);
```

## Pre-built Policy Modules

### Financial Policies

Located in `modules/financial.ts`:

- **Spending Limits**: Daily spending limits with Australian GST considerations
- **Budget Allocation**: Community benefit allocation requirements (30% minimum)
- **AUSTRAC Reporting**: Automatic reporting for transactions ≥$10,000

### Compliance Policies

Located in `modules/compliance.ts`:

- **Privacy Act 1988**: Australian Privacy Principles (APPs) compliance
- **ACNC Governance**: Charity governance standards compliance
- **Data Sovereignty**: Australian data residency and Indigenous data sovereignty

### Community Policies

Located in `modules/community.ts`:

- **Benefit Distribution**: Equitable community benefit distribution (40% minimum community development)
- **Cultural Protocols**: Indigenous cultural protocols with CARE principles

### Security Policies

Located in `modules/security.ts`:

- **Access Control**: Role-based access with Australian security standards
- **Data Protection**: Encryption, privacy, and secure data handling

## Policy Development Workflow

### 1. Write Policy

Create Rego policy with proper package structure:

```rego
package financial.my_policy

import rego.v1

# Rule definitions
allow if {
    # Policy logic here
    input.valid == true
}
```

### 2. Add Test Cases

Include comprehensive test cases:

```typescript
testCases: [
  {
    id: 'test-positive',
    name: 'Valid transaction',
    input: { valid: true, amount: 100 },
    expectedDecision: 'allow'
  },
  {
    id: 'test-negative', 
    name: 'Invalid transaction',
    input: { valid: false, amount: 100 },
    expectedDecision: 'deny'
  }
]
```

### 3. Validate Policy

```typescript
const validation = await repository.validatePolicy(policy);
if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
  console.log('Compliance issues:', validation.complianceCheck.issues);
}
```

### 4. Version and Deploy

```typescript
// Create new version
const version = await repository.createVersion(policy.id, 'Added new validation rules');

// Deploy to staging
await repository.deployPolicy(policy.id, 'staging');

// After testing, deploy to production
await repository.deployPolicy(policy.id, 'production');
```

## Australian Compliance Features

### Privacy Act 1988 Support

Automatic validation for:
- Australian Privacy Principles (APPs)
- Cross-border data transfer restrictions
- Consent requirements for personal data
- Data breach notification obligations

### ACNC Compliance

Built-in checks for:
- Governance standards (5 standards)
- Responsible person suitability
- Financial reporting thresholds
- Charitable purpose requirements

### Indigenous Data Sovereignty

CARE principles enforcement:
- **Collective Benefit**: Data ecosystems benefit Indigenous communities
- **Authority to Control**: Indigenous peoples' rights to control their data  
- **Responsibility**: Shared responsibility for data use and benefits
- **Ethics**: Indigenous rights and wellbeing are primary concern

### AUSTRAC Integration

Automatic compliance for:
- Large transaction reporting (≥$10,000)
- Suspicious transaction detection
- Customer identification requirements
- Structured transaction prevention

## Version Control

### Semantic Versioning

- **Major** (X.0.0): Breaking changes, critical impact
- **Minor** (0.X.0): New features, high/medium impact  
- **Patch** (0.0.X): Bug fixes, low impact

### Rollback Capabilities

```typescript
// Rollback to previous version
await repository.rollbackToVersion(policyId, '1.2.1');

// Rollback deployment
await repository.rollbackDeployment(deploymentId);
```

### Change Tracking

All changes are tracked with:
- Change type (create, update, delete)
- Impact level (low, medium, high, critical)
- Approval requirements
- Detailed change descriptions

## CI/CD Integration

### Automated Testing

```typescript
// Run all tests for a policy
const testResults = await repository.runTests(policyId);

// Check if all tests passed
const allPassed = testResults.every(result => result.passed);
```

### Deployment Pipeline

1. **Development**: Local testing and validation
2. **Staging**: Automated deployment for integration testing
3. **Production**: Manual approval required, automated rollback on failure

### Health Monitoring

Continuous monitoring of deployed policies:
- Performance metrics tracking
- Error rate monitoring  
- Decision audit logging
- Automated alerts for failures

## Audit and Compliance

### Decision Logging

Every policy decision is logged with:
- Input data (sanitized)
- Policy version used
- Decision outcome
- Execution metadata
- Australian compliance markers

### Audit Trail

Complete audit trail including:
- Policy creation and modifications
- Version changes and rollbacks
- Deployment activities
- Access and usage patterns

### Compliance Reporting

Automated generation of:
- Privacy Act compliance reports
- ACNC governance assessments
- AUSTRAC transaction summaries
- Indigenous protocol compliance status

## Performance and Scalability

### Caching Strategy

- **Decision Caching**: Cache recent policy decisions (TTL configurable)
- **Policy Caching**: Cache compiled policies for faster execution
- **Automatic Invalidation**: Cache invalidation on policy updates

### Performance Monitoring

Track key metrics:
- Policy execution time
- Cache hit rates
- Memory usage
- Error rates

## Security Features

### Input Validation

- Schema validation for all inputs
- Sanitization of potentially dangerous data
- Protection against injection attacks

### Access Control

- Role-based access to policy management
- Audit logging of all administrative actions
- Australian location restrictions for sensitive operations

### Encryption

- At-rest encryption for policy storage
- In-transit encryption for all communications
- Key management with HSM support

## Best Practices

### Policy Writing

1. **Clear Package Structure**: Use hierarchical package naming
2. **Comprehensive Testing**: Include positive and negative test cases
3. **Documentation**: Provide clear policy documentation
4. **Australian Context**: Consider local regulations and cultural protocols

### Governance

1. **Change Management**: Require approvals for production changes
2. **Regular Reviews**: Schedule periodic policy reviews
3. **Community Consultation**: Include community stakeholders in governance decisions
4. **Cultural Sensitivity**: Respect Indigenous protocols and data sovereignty

### Operational

1. **Monitoring**: Implement comprehensive monitoring and alerting
2. **Backup**: Regular backups of policy repository
3. **Disaster Recovery**: Test rollback and recovery procedures
4. **Performance**: Monitor and optimize policy execution performance

## API Reference

### PolicyRepository

Main interface for policy management:

```typescript
interface IPolicyRepository {
  createPolicy(definition: PolicyDefinition): Promise<RegoPolicy>;
  getPolicy(id: string): Promise<RegoPolicy | null>;
  updatePolicy(id: string, definition: Partial<PolicyDefinition>): Promise<RegoPolicy>;
  deletePolicy(id: string): Promise<void>;
  listPolicies(filter?: PolicyFilter): Promise<RegoPolicy[]>;
  
  createVersion(policyId: string, changeLog: string): Promise<PolicyVersion>;
  deployPolicy(policyId: string, environment: string): Promise<PolicyDeployment>;
  validatePolicy(policy: RegoPolicy): Promise<PolicyValidationResult>;
  runTests(policyId: string): Promise<PolicyTestResult[]>;
}
```

### RegoPolicyEngine

Policy execution engine:

```typescript
class RegoPolicyEngine {
  async evaluatePolicy(policy: RegoPolicy, input: any): Promise<PolicyDecisionResult>;
  async evaluatePolicies(policies: RegoPolicy[], input: any): Promise<PolicyDecisionResult[]>;
  async loadPolicy(policy: RegoPolicy): Promise<void>;
  getStatistics(): EngineStatistics;
}
```

## Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Write** comprehensive tests
4. **Ensure** Australian compliance
5. **Submit** a pull request

## Support

For questions and support:
- Review this documentation
- Check the examples in `modules/`
- Consult Australian regulatory guidance
- Engage with Indigenous protocol advisors for cultural matters

## License

This Policy-as-Code system is designed for Australian community organisations and includes specific compliance features for local regulations and Indigenous data sovereignty.