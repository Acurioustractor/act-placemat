/**
 * Constitutional Agent Integration
 * 
 * Interface and base implementation for AI agents to integrate with 
 * the constitutional safety service
 */

import {
  ConstitutionalAgent,
  ConstitutionalSafetyService,
  AgentCapability,
  AgentSafetyProfile,
  RiskLevel,
  TriggeredPrompt,
  PromptResponse,
  ResponseType,
  EscalationRule,
  AutomatedResponse,
  SafetyCheckContext,
  AgentEventType,
  SafetyCheck,
  SafetySeverity,
  PromptType
} from './types';

export class BaseConstitutionalAgent implements ConstitutionalAgent {
  public agentId: string;
  public agentType: string;
  public capabilities: AgentCapability[];
  public safetyProfile: AgentSafetyProfile;
  
  private safetyService?: ConstitutionalSafetyService;
  private registrationToken?: string;
  private isRegistered = false;

  constructor(
    agentId: string,
    agentType: string,
    capabilities: AgentCapability[],
    safetyProfile: AgentSafetyProfile
  ) {
    this.agentId = agentId;
    this.agentType = agentType;
    this.capabilities = capabilities;
    this.safetyProfile = safetyProfile;
  }

  async registerWithSafetyService(service: ConstitutionalSafetyService): Promise<void> {
    try {
      this.safetyService = service;
      
      // Validate agent configuration with safety service
      const validation = await service.validatePrinciples();
      if (!validation.valid) {
        throw new Error(`Safety service validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate registration token
      this.registrationToken = this.generateRegistrationToken();
      this.isRegistered = true;

      console.log(`Agent ${this.agentId} successfully registered with constitutional safety service`);
    } catch (error) {
      throw new Error(`Failed to register with safety service: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async handleSafetyPrompt(prompt: TriggeredPrompt): Promise<PromptResponse> {
    if (!this.isRegistered || !this.safetyService) {
      throw new Error('Agent not registered with safety service');
    }

    try {
      // Check for automated responses first
      const automatedResponse = this.checkAutomatedResponse(prompt);
      if (automatedResponse) {
        return automatedResponse;
      }

      // Check escalation rules
      const escalationRequired = this.checkEscalationRules(prompt);
      if (escalationRequired) {
        return {
          responseType: ResponseType.ESCALATE,
          timestamp: new Date(),
          userId: this.agentId,
          justification: 'Escalation required per agent safety profile'
        };
      }

      // Default handling based on prompt characteristics
      return this.defaultPromptHandling(prompt);

    } catch (error) {
      // In case of error, escalate for human review
      return {
        responseType: ResponseType.ESCALATE,
        timestamp: new Date(),
        userId: this.agentId,
        justification: `Error handling prompt: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async requestEmergencyOverride(justification: string): Promise<boolean> {
    if (!this.isRegistered || !this.safetyService) {
      throw new Error('Agent not registered with safety service');
    }

    // Check if agent is authorized for emergency overrides
    const hasEmergencyCapability = this.capabilities.some(cap => 
      cap.id === 'emergency_override' && cap.riskLevel === RiskLevel.CRITICAL
    );

    if (!hasEmergencyCapability) {
      throw new Error('Agent does not have emergency override capability');
    }

    // Log emergency override request
    console.warn(`Emergency override requested by agent ${this.agentId}: ${justification}`);

    // In a real implementation, this would trigger approval workflows
    // For now, return based on agent risk tolerance
    return this.safetyProfile.riskTolerance === RiskLevel.CRITICAL;
  }

  // Protected methods for subclasses to override

  protected async performSafetyCheck(
    context: SafetyCheckContext,
    eventType: AgentEventType,
    data: any
  ): Promise<SafetyCheck> {
    if (!this.safetyService) {
      throw new Error('Safety service not available');
    }

    return await this.safetyService.checkAction(context, eventType, data);
  }

  protected createSafetyContext(
    userId: string,
    sessionId: string,
    requestId: string,
    requestData: any
  ): SafetyCheckContext {
    return {
      userId,
      sessionId,
      requestId,
      userRoles: this.getUserRoles(userId),
      jurisdiction: this.getJurisdiction(requestData),
      requestData,
      systemContext: {
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0',
        configVersion: '1.0.0'
      }
    };
  }

  // Private helper methods

  private checkAutomatedResponse(prompt: TriggeredPrompt): PromptResponse | null {
    for (const autoResponse of this.safetyProfile.automatedResponses) {
      // Check if prompt type matches
      if (autoResponse.promptType !== this.getPromptType(prompt)) {
        continue;
      }

      // Check if conditions are met
      const conditionsMet = autoResponse.conditions.every(condition => {
        return this.evaluateCondition(condition, prompt);
      });

      if (conditionsMet) {
        return {
          responseType: autoResponse.responseType,
          timestamp: new Date(),
          userId: this.agentId,
          justification: autoResponse.justification
        };
      }
    }

    return null;
  }

  private checkEscalationRules(prompt: TriggeredPrompt): boolean {
    for (const rule of this.safetyProfile.escalationRules) {
      const conditionMet = this.evaluateCondition(rule.condition, prompt);
      if (conditionMet) {
        return true;
      }
    }

    // Check if principle is required and not in exempt list
    const isRequiredPrinciple = this.safetyProfile.requiredPrinciples.includes(prompt.principleId);
    const isExemptPrinciple = this.safetyProfile.exemptPrinciples.includes(prompt.principleId);

    return isRequiredPrinciple && !isExemptPrinciple;
  }

  private defaultPromptHandling(prompt: TriggeredPrompt): PromptResponse {
    // Default handling based on severity and agent risk tolerance
    const promptSeverity = prompt.severity;
    const agentRisk = this.safetyProfile.riskTolerance;

    // Critical prompts always require escalation unless specifically automated
    if (promptSeverity === SafetySeverity.CRITICAL) {
      return {
        responseType: ResponseType.ESCALATE,
        timestamp: new Date(),
        userId: this.agentId,
        justification: 'Critical constitutional issue requires human review'
      };
    }

    // High severity prompts require escalation for low-risk agents
    if (promptSeverity === SafetySeverity.HIGH && agentRisk === RiskLevel.LOW) {
      return {
        responseType: ResponseType.ESCALATE,
        timestamp: new Date(),
        userId: this.agentId,
        justification: 'High severity prompt exceeds agent risk tolerance'
      };
    }

    // Medium and below can be acknowledged for medium+ risk agents
    if (agentRisk >= RiskLevel.MEDIUM) {
      return {
        responseType: ResponseType.ACKNOWLEDGE,
        timestamp: new Date(),
        userId: this.agentId,
        justification: 'Acknowledged per agent risk tolerance'
      };
    }

    // Default to escalation for safety
    return {
      responseType: ResponseType.ESCALATE,
      timestamp: new Date(),
      userId: this.agentId,
      justification: 'Default escalation for safety'
    };
  }

  private evaluateCondition(condition: any, prompt: TriggeredPrompt): boolean {
    // Simple condition evaluation - could be extended
    switch (condition.field) {
      case 'severity':
        return prompt.severity === condition.value;
      case 'principleId':
        return prompt.principleId === condition.value;
      default:
        return false;
    }
  }

  private getPromptType(prompt: TriggeredPrompt): PromptType {
    // This would normally query the safety service for prompt details
    // For now, assume based on severity
    switch (prompt.severity) {
      case SafetySeverity.CRITICAL:
        return PromptType.BLOCKING;
      case SafetySeverity.HIGH:
        return PromptType.WARNING;
      default:
        return PromptType.ADVISORY;
    }
  }

  private getUserRoles(userId: string): string[] {
    // This would normally query a user service
    // For now, return default roles based on agent type
    switch (this.agentType) {
      case 'financial':
        return ['financial_agent', 'system_agent'];
      case 'government':
        return ['government_agent', 'system_agent'];
      case 'cultural':
        return ['cultural_agent', 'indigenous_liaison', 'system_agent'];
      default:
        return ['system_agent'];
    }
  }

  private getJurisdiction(requestData: any): any {
    // Extract jurisdiction from request data or use default
    return requestData?.jurisdiction || 'federal';
  }

  private generateRegistrationToken(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `${this.agentId}-${timestamp}-${random}`;
  }
}

// Specialized agent implementations

export class FinancialIntelligenceAgent extends BaseConstitutionalAgent {
  constructor(agentId: string) {
    const capabilities: AgentCapability[] = [
      {
        id: 'financial_analysis',
        name: 'Financial Analysis',
        description: 'Analyze financial data and transactions',
        riskLevel: RiskLevel.MEDIUM,
        requiredApprovals: ['financial_officer'],
        constitutionalRestrictions: ['CP020', 'CP021', 'CP022']
      },
      {
        id: 'transaction_processing',
        name: 'Transaction Processing',
        description: 'Process financial transactions',
        riskLevel: RiskLevel.HIGH,
        requiredApprovals: ['financial_officer', 'compliance_officer'],
        constitutionalRestrictions: ['CP001', 'CP002', 'CP003', 'CP020']
      },
      {
        id: 'policy_recommendation',
        name: 'Policy Recommendation',
        description: 'Recommend financial policies',
        riskLevel: RiskLevel.HIGH,
        requiredApprovals: ['policy_officer'],
        constitutionalRestrictions: ['CP001', 'CP002', 'CP005', 'CP006']
      }
    ];

    const safetyProfile: AgentSafetyProfile = {
      riskTolerance: RiskLevel.MEDIUM,
      requiredPrinciples: ['CP001', 'CP002', 'CP003', 'CP020', 'CP021', 'CP022'],
      exemptPrinciples: [],
      escalationRules: [
        {
          condition: {
            field: 'severity',
            operator: 'equals',
            value: 'critical',
            description: 'Critical severity requires escalation'
          },
          escalateTo: ['constitutional_officer', 'financial_supervisor'],
          timeoutMinutes: 30,
          autoResolve: false
        }
      ],
      automatedResponses: [
        {
          promptType: PromptType.ADVISORY,
          responseType: ResponseType.ACKNOWLEDGE,
          conditions: [
            {
              field: 'severity',
              operator: 'in',
              value: ['low', 'info'],
              description: 'Low severity prompts can be auto-acknowledged'
            }
          ],
          justification: 'Low risk advisory prompts auto-acknowledged per financial agent profile'
        }
      ]
    };

    super(agentId, 'financial', capabilities, safetyProfile);
  }

  async analyzeTransaction(
    userId: string,
    sessionId: string,
    transactionData: any
  ): Promise<{ allowed: boolean; analysis: any; safetyCheck: SafetyCheck }> {
    const context = this.createSafetyContext(
      userId,
      sessionId,
      `txn-${Date.now()}`,
      transactionData
    );

    const safetyCheck = await this.performSafetyCheck(
      context,
      AgentEventType.FINANCIAL_TRANSACTION,
      transactionData
    );

    const allowed = safetyCheck.result === 'allowed' || safetyCheck.result === 'conditional';

    return {
      allowed,
      analysis: this.performAnalysis(transactionData),
      safetyCheck
    };
  }

  private performAnalysis(transactionData: any): any {
    // Placeholder for actual financial analysis
    return {
      riskScore: Math.random() * 10,
      flags: [],
      recommendations: []
    };
  }
}

export class CulturalDataAgent extends BaseConstitutionalAgent {
  constructor(agentId: string) {
    const capabilities: AgentCapability[] = [
      {
        id: 'cultural_data_access',
        name: 'Cultural Data Access',
        description: 'Access Indigenous cultural data',
        riskLevel: RiskLevel.CRITICAL,
        requiredApprovals: ['elder', 'cultural_officer'],
        constitutionalRestrictions: ['CP015', 'CP016', 'CP017']
      },
      {
        id: 'traditional_knowledge_processing',
        name: 'Traditional Knowledge Processing',
        description: 'Process traditional knowledge data',
        riskLevel: RiskLevel.CRITICAL,
        requiredApprovals: ['elder', 'community_representative'],
        constitutionalRestrictions: ['CP015', 'CP016', 'CP017', 'CP014']
      }
    ];

    const safetyProfile: AgentSafetyProfile = {
      riskTolerance: RiskLevel.LOW, // Very conservative for cultural data
      requiredPrinciples: ['CP015', 'CP016', 'CP017', 'CP014'],
      exemptPrinciples: [],
      escalationRules: [
        {
          condition: {
            field: 'principleId',
            operator: 'in',
            value: ['CP015', 'CP016', 'CP017'],
            description: 'All Indigenous rights principles require escalation'
          },
          escalateTo: ['elder', 'cultural_officer'],
          timeoutMinutes: 60,
          autoResolve: false
        }
      ],
      automatedResponses: [] // No automated responses for cultural data
    };

    super(agentId, 'cultural', capabilities, safetyProfile);
  }
}

// Factory function for creating agents
export function createConstitutionalAgent(
  agentType: string,
  agentId: string
): ConstitutionalAgent {
  switch (agentType) {
    case 'financial':
      return new FinancialIntelligenceAgent(agentId);
    case 'cultural':
      return new CulturalDataAgent(agentId);
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
}