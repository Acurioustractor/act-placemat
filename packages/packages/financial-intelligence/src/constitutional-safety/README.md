# Constitutional Safety System

A comprehensive constitutional compliance framework for AI agents operating within Australian financial systems. This system provides constitutional safety prompts, compliance checking, and governance mechanisms to ensure AI agents operate within constitutional boundaries.

## Features

### Core Capabilities

- 🏛️ **Constitutional Compliance**: 25 core Australian constitutional principles covering democracy, rule of law, separation of powers, and Indigenous rights
- ⚠️ **Safety Prompts**: 12 predefined safety prompts for key financial operations and policy boundaries
- 🔍 **Real-time Monitoring**: Continuous monitoring of AI agent actions against constitutional principles
- 📋 **Audit Trail**: Complete audit trail of all constitutional checks and responses
- 🤖 **Agent Integration**: Simple integration interface for AI agents to register and comply
- 🚨 **Emergency Protocols**: Emergency override capabilities with proper controls and documentation

### Constitutional Principles Covered

#### Democracy and Governance
- **Democratic Accountability** (CP001): AI decisions subject to democratic oversight
- **Transparent Decision Making** (CP002): Auditable AI decision processes
- **Ministerial Responsibility** (CP009): Clear government accountability for AI systems
- **Parliamentary Oversight** (CP010): Parliamentary inquiry and oversight mechanisms

#### Rule of Law
- **Legal Consistency** (CP003): AI decisions consistent with legal frameworks
- **Procedural Fairness** (CP004): Fair procedures in all AI decisions
- **Proportionate Response** (CP023): Proportionate AI interventions
- **Due Process Rights** (CP008): Access to appeal and review processes

#### Indigenous Rights
- **Indigenous Data Sovereignty** (CP015): CARE principles compliance
- **Traditional Owner Consultation** (CP016): Proper consultation requirements
- **Cultural Protocol Compliance** (CP017): Respect for cultural protocols

#### Financial System Specific
- **Financial Privacy Protection** (CP020): Individual financial privacy rights
- **Economic Freedom** (CP021): Protection of legitimate economic activity
- **Financial System Stability** (CP022): Consideration of system-wide impacts

### Safety Prompts

#### Critical Prompts (Blocking)
- **SP002**: Decision Transparency Requirements
- **SP003**: Legal Framework Conflict
- **SP005**: Indigenous Data Sovereignty
- **SP007**: Emergency Powers Limitation
- **SP011**: Constitutional Framework Modification

#### High Priority Prompts (Warning)
- **SP001**: Large Transaction Democratic Oversight
- **SP004**: Procedural Fairness Requirements
- **SP006**: Financial Privacy Protection
- **SP008**: Cross-Border Transfer Compliance

#### Advisory Prompts
- **SP009**: Proportionate Response Required
- **SP010**: After Hours Large Transaction
- **SP012**: Economic Freedom Consideration

## Quick Start

### Basic Setup

```typescript
import { createConstitutionalSafetySystem } from '@act-placemat/financial-intelligence/constitutional-safety';

// Initialize the system
const system = await createConstitutionalSafetySystem({
  database: databaseConnection, // Your PostgreSQL connection
  integrityKey: 'your-64-character-hex-integrity-key',
  strictMode: false,
  emergencyOverrideEnabled: true,
  auditRetentionDays: 2555 // 7 years
});

const { service, repository, config } = system;
```

### Agent Registration

```typescript
import { FinancialIntelligenceAgent } from '@act-placemat/financial-intelligence/constitutional-safety';

// Create and register a financial intelligence agent
const agent = new FinancialIntelligenceAgent('agent-001');
await agent.registerWithSafetyService(service);
```

### Safety Check Example

```typescript
import { AgentEventType, Jurisdiction } from '@act-placemat/financial-intelligence/constitutional-safety';

// Create safety context
const context = {
  userId: 'user-123',
  sessionId: 'session-456',
  requestId: 'request-789',
  userRoles: ['financial_officer'],
  jurisdiction: Jurisdiction.FEDERAL,
  requestData: {
    amount: 150000,
    currency: 'AUD',
    type: 'transfer'
  },
  systemContext: {
    environment: 'production',
    version: '1.0.0',
    configVersion: '1.0.0'
  }
};

// Perform constitutional safety check
const safetyCheck = await service.checkAction(
  context,
  AgentEventType.FINANCIAL_TRANSACTION,
  { amount: 150000, type: 'large_transfer' }
);

console.log(`Safety check result: ${safetyCheck.result}`);
console.log(`Triggered prompts: ${safetyCheck.triggeredPrompts.length}`);
```

### Handling Safety Prompts

```typescript
// Get active prompts for a check
const activePrompts = await service.getActivePrompts(safetyCheck.id);

for (const prompt of activePrompts) {
  // Handle each prompt based on agent logic
  const response = await agent.handleSafetyPrompt(prompt);
  
  // Submit response to safety service
  await service.respondToPrompt(safetyCheck.id, prompt.promptId, response);
}
```

## Agent Integration

### Financial Intelligence Agent

```typescript
const financialAgent = new FinancialIntelligenceAgent('financial-001');
await financialAgent.registerWithSafetyService(service);

// Analyze transaction with constitutional safety
const result = await financialAgent.analyzeTransaction(
  'user-123',
  'session-456',
  {
    amount: 250000,
    from: 'account-1',
    to: 'account-2',
    purpose: 'business_payment'
  }
);

if (result.allowed) {
  console.log('Transaction analysis:', result.analysis);
} else {
  console.log('Transaction blocked by constitutional safety');
  console.log('Safety check:', result.safetyCheck);
}
```

### Cultural Data Agent

```typescript
const culturalAgent = new CulturalDataAgent('cultural-001');
await culturalAgent.registerWithSafetyService(service);

// Cultural agents have strict safety profiles
// All Indigenous data access requires Elder approval
```

### Custom Agent Implementation

```typescript
import { BaseConstitutionalAgent, AgentCapability, RiskLevel } from '@act-placemat/financial-intelligence/constitutional-safety';

class CustomAgent extends BaseConstitutionalAgent {
  constructor(agentId: string) {
    const capabilities: AgentCapability[] = [
      {
        id: 'custom_capability',
        name: 'Custom Financial Analysis',
        description: 'Custom analysis capability',
        riskLevel: RiskLevel.MEDIUM,
        requiredApprovals: ['supervisor'],
        constitutionalRestrictions: ['CP020', 'CP021']
      }
    ];

    const safetyProfile = {
      riskTolerance: RiskLevel.MEDIUM,
      requiredPrinciples: ['CP001', 'CP002', 'CP020'],
      exemptPrinciples: [],
      escalationRules: [],
      automatedResponses: []
    };

    super(agentId, 'custom', capabilities, safetyProfile);
  }

  async performCustomAction(data: any): Promise<any> {
    const context = this.createSafetyContext(
      'user-id',
      'session-id',
      'request-id',
      data
    );

    const safetyCheck = await this.performSafetyCheck(
      context,
      AgentEventType.FINANCIAL_TRANSACTION,
      data
    );

    if (safetyCheck.result === 'blocked') {
      throw new Error('Action blocked by constitutional safety');
    }

    // Perform your custom logic here
    return { success: true, safetyCheck };
  }
}
```

## Database Schema

The system requires PostgreSQL with the following tables:

### Constitutional Principles

```sql
CREATE TABLE constitutional_principles (
  id VARCHAR(10) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL,
  enforcement_level VARCHAR(20) NOT NULL,
  applicable_jurisdictions JSONB NOT NULL,
  related_principles JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Constitutional Prompts

```sql
CREATE TABLE constitutional_prompts (
  id VARCHAR(10) PRIMARY KEY,
  principle_id VARCHAR(10) NOT NULL,
  trigger JSONB NOT NULL,
  prompt_type VARCHAR(20) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  suggested_actions JSONB NOT NULL,
  escalation_required BOOLEAN NOT NULL DEFAULT false,
  human_review_required BOOLEAN NOT NULL DEFAULT false,
  blocking_conditions JSONB NOT NULL,
  exemptions JSONB,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (principle_id) REFERENCES constitutional_principles(id)
);
```

### Safety Checks

```sql
CREATE TABLE constitutional_safety_checks (
  id UUID PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  context JSONB NOT NULL,
  triggered_prompts JSONB NOT NULL,
  result VARCHAR(20) NOT NULL,
  resolution JSONB,
  audit_trail JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  integrity_hash VARCHAR(64) NOT NULL
);
```

## Configuration

### System Configuration

```typescript
const config: ConstitutionalConfig = {
  enabled: true,
  strictMode: false, // In strict mode, all checks are mandatory
  defaultJurisdiction: Jurisdiction.FEDERAL,
  emergencyOverrideEnabled: true,
  emergencyOverrideRoles: ['constitutional_officer', 'emergency_coordinator'],
  auditRetentionDays: 2555, // 7 years
  escalationTimeoutMinutes: 60,
  principlesConfig: {
    'CP001': {
      enabled: true,
      enforcementLevel: 'mandatory',
      requiresJustification: true
    }
  }
};
```

### Agent Safety Profiles

```typescript
// Conservative profile for high-risk operations
const conservativeProfile = {
  riskTolerance: RiskLevel.LOW,
  requiredPrinciples: ['CP001', 'CP002', 'CP003', 'CP015'],
  exemptPrinciples: [],
  escalationRules: [
    {
      condition: { field: 'severity', operator: 'greater_than', value: 'low' },
      escalateTo: ['supervisor', 'compliance_officer'],
      timeoutMinutes: 30,
      autoResolve: false
    }
  ],
  automatedResponses: []
};

// Balanced profile for standard operations
const balancedProfile = {
  riskTolerance: RiskLevel.MEDIUM,
  requiredPrinciples: ['CP001', 'CP002', 'CP020'],
  exemptPrinciples: [],
  escalationRules: [
    {
      condition: { field: 'severity', operator: 'equals', value: 'critical' },
      escalateTo: ['constitutional_officer'],
      timeoutMinutes: 60,
      autoResolve: false
    }
  ],
  automatedResponses: [
    {
      promptType: PromptType.ADVISORY,
      responseType: ResponseType.ACKNOWLEDGE,
      conditions: [{ field: 'severity', operator: 'equals', value: 'low' }],
      justification: 'Low severity auto-acknowledged'
    }
  ]
};
```

## Monitoring and Metrics

### Getting System Metrics

```typescript
// Get metrics for a time period
const metrics = await service.getMetrics(
  new Date('2024-01-01'),
  new Date('2024-12-31')
);

console.log(`Total checks: ${metrics.totalChecks}`);
console.log(`Blocked checks: ${metrics.blockedChecks}`);
console.log(`Average resolution time: ${metrics.averageResolutionTime} minutes`);
console.log('Principle violations:', metrics.principleViolations);
```

### Key Monitoring Points

- **Check Success Rate**: Percentage of checks that result in 'allowed'
- **Escalation Rate**: Frequency of escalations to human review
- **Resolution Time**: Time taken to resolve blocked or escalated checks
- **Principle Violations**: Most frequently triggered constitutional principles
- **Emergency Overrides**: Frequency and justification of emergency overrides

### Alert Conditions

```typescript
const alertConditions = {
  highBlockageRate: metrics.blockedChecks / metrics.totalChecks > 0.1,
  longResolutionTimes: metrics.averageResolutionTime > 120, // minutes
  frequentOverrides: metrics.emergencyOverrides > 10,
  constitutionalViolations: Object.values(metrics.principleViolations).some(count => count > 50)
};
```

## Security Features

### Cryptographic Integrity

- **Integrity Hashes**: All safety checks protected with HMAC-SHA256
- **Tamper Detection**: Immediate detection of any data modification
- **Audit Chain**: Immutable audit trail with cryptographic verification

### Access Control

```typescript
// Role-based access control
const accessControl = {
  constitutional_officer: ['read', 'write', 'approve', 'override'],
  compliance_officer: ['read', 'approve'],
  financial_officer: ['read'],
  emergency_coordinator: ['read', 'emergency_override']
};
```

### Data Protection

- **Encryption at Rest**: Sensitive data encrypted in database
- **Audit Retention**: 7-year retention for general data, 50-year for Indigenous data
- **Data Residency**: All data stored within Australian jurisdiction
- **Cultural Sensitivity**: Special handling for Indigenous cultural data

## Legal Compliance

This system helps achieve compliance with:

- **Australian Constitution**: Core constitutional principles and requirements
- **Privacy Act 1988 (Cth)**: Personal information protection and consent
- **AUSTRAC AML/CTF**: Anti-money laundering transaction monitoring
- **Corporations Act 2001**: Corporate governance requirements
- **Native Title Act 1993**: Traditional Owner rights and consultation
- **CARE Principles**: Indigenous Data Governance framework

## Best Practices

### Implementation Guidelines

1. **Start Conservative**: Begin with low risk tolerance and gradually adjust
2. **Monitor Actively**: Set up alerts for unusual patterns or high violation rates
3. **Regular Review**: Periodically review and update constitutional principles
4. **Document Decisions**: Maintain comprehensive audit trails
5. **Train Staff**: Ensure staff understand constitutional requirements
6. **Test Scenarios**: Regularly test emergency and edge case scenarios

### Agent Development

1. **Register Early**: Register agents with safety service during initialization
2. **Handle Prompts**: Implement proper prompt handling logic
3. **Respect Blocks**: Never override blocking conditions without proper authorization
4. **Log Actions**: Maintain detailed logs of all agent actions
5. **Escalate Appropriately**: Escalate complex constitutional issues to humans
6. **Test Thoroughly**: Test agents with various constitutional scenarios

### Operational Security

1. **Monitor Overrides**: Track and review all emergency overrides
2. **Validate Integrity**: Regular integrity validation of stored data
3. **Backup Safely**: Secure backup of constitutional configuration and audit data
4. **Update Regularly**: Keep constitutional principles and prompts current
5. **Incident Response**: Have clear procedures for constitutional violations

## Troubleshooting

### Common Issues

#### Agent Registration Fails
```typescript
// Check if service is properly initialized
const validation = await service.validatePrinciples();
if (!validation.valid) {
  console.error('Service validation errors:', validation.errors);
}
```

#### Prompts Not Triggering
```typescript
// Verify prompt configuration
const prompts = await repository.getPrompts();
console.log('Available prompts:', prompts.length);

// Check if principle is enabled
const principles = await repository.getPrinciples();
const principle = principles.find(p => p.id === 'CP001');
console.log('Principle enabled:', principle?.enforcementLevel);
```

#### High Blockage Rate
- Review prompt thresholds and conditions
- Check if agent safety profiles are too conservative
- Verify user roles and permissions
- Consider if principles need adjustment

#### Performance Issues
- Enable connection pooling for database
- Add indexes for frequently queried fields
- Consider caching for read-heavy operations
- Monitor query performance

## Support

For technical support and constitutional guidance:

- **Technical Issues**: Review logs and run system validation
- **Constitutional Questions**: Consult with constitutional law experts
- **Indigenous Rights**: Engage with Traditional Owners and cultural advisors
- **Compliance**: Work with legal and compliance teams

## License

This system is part of the ACT Placemat project and follows the same licensing terms.