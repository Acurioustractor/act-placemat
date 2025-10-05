/**
 * Constitutional Safety Service
 * 
 * Core service for constitutional compliance checking and safety prompt management
 * for AI agents in Australian financial systems
 */

import crypto from 'crypto';
import {
  ConstitutionalSafetyService,
  ConstitutionalRepository,
  SafetyCheck,
  SafetyCheckContext,
  AgentEventType,
  TriggeredPrompt,
  PromptResponse,
  SafetyResolution,
  SafetyMetrics,
  SafetyCheckResult,
  SafetySeverity,
  PromptType,
  ResponseType,
  ConstitutionalConfig,
  SafetyPrompt,
  ConstitutionalPrinciple
} from './types';
import { CONSTITUTIONAL_SAFETY_PROMPTS, evaluatePromptTrigger } from './prompts';
import { AUSTRALIAN_CONSTITUTIONAL_PRINCIPLES } from './principles';

export class ConstitutionalSafetyServiceImpl implements ConstitutionalSafetyService {
  private repository: ConstitutionalRepository;
  private config: ConstitutionalConfig;
  private activeChecks: Map<string, SafetyCheck> = new Map();
  private metrics: {
    totalChecks: number;
    allowedChecks: number;
    blockedChecks: number;
    escalatedChecks: number;
    principleViolations: Record<string, number>;
  } = {
    totalChecks: 0,
    allowedChecks: 0,
    blockedChecks: 0,
    escalatedChecks: 0,
    principleViolations: {}
  };

  constructor(repository: ConstitutionalRepository, config: ConstitutionalConfig) {
    this.repository = repository;
    this.config = config;
  }

  async checkAction(
    context: SafetyCheckContext,
    eventType: AgentEventType,
    data: any
  ): Promise<SafetyCheck> {
    const checkId = crypto.randomUUID();
    const timestamp = new Date();

    try {
      // Create initial safety check record
      const safetyCheck: SafetyCheck = {
        id: checkId,
        agentId: context.userId, // Assuming agent ID is in user context
        eventType,
        timestamp,
        context,
        triggeredPrompts: [],
        result: SafetyCheckResult.PENDING,
        auditTrail: [
          {
            timestamp,
            action: 'check_initiated',
            performedBy: 'system',
            details: { eventType, dataSize: JSON.stringify(data).length },
            systemGenerated: true
          }
        ]
      };

      // Store initial check
      this.activeChecks.set(checkId, safetyCheck);
      this.metrics.totalChecks++;

      // Get applicable prompts
      const applicablePrompts = await this.getApplicablePrompts(eventType, data, context);
      
      // Evaluate each prompt
      const triggeredPrompts: TriggeredPrompt[] = [];
      
      for (const prompt of applicablePrompts) {
        if (this.shouldEvaluatePrompt(prompt, context)) {
          const triggered = await this.evaluatePrompt(prompt, data, context, timestamp);
          if (triggered) {
            triggeredPrompts.push(triggered);
          }
        }
      }

      // Update safety check with triggered prompts
      safetyCheck.triggeredPrompts = triggeredPrompts;

      // Determine overall result
      const result = this.determineCheckResult(triggeredPrompts);
      safetyCheck.result = result;

      // Update metrics
      this.updateMetrics(result, triggeredPrompts);

      // Add audit entry for completion
      safetyCheck.auditTrail.push({
        timestamp: new Date(),
        action: 'check_completed',
        performedBy: 'system',
        details: {
          result,
          triggeredPrompts: triggeredPrompts.length,
          severity: this.getHighestSeverity(triggeredPrompts)
        },
        systemGenerated: true
      });

      // Store final check
      await this.repository.storeSafetyCheck(safetyCheck);
      this.activeChecks.set(checkId, safetyCheck);

      return safetyCheck;

    } catch (error) {
      // Create error safety check
      const errorCheck: SafetyCheck = {
        id: checkId,
        agentId: context.userId,
        eventType,
        timestamp,
        context,
        triggeredPrompts: [],
        result: SafetyCheckResult.BLOCKED,
        auditTrail: [
          {
            timestamp: new Date(),
            action: 'check_error',
            performedBy: 'system',
            details: { error: error instanceof Error ? error.message : String(error) },
            systemGenerated: true
          }
        ]
      };

      await this.repository.storeSafetyCheck(errorCheck);
      this.metrics.blockedChecks++;
      
      return errorCheck;
    }
  }

  async getActivePrompts(checkId: string): Promise<TriggeredPrompt[]> {
    const check = this.activeChecks.get(checkId) || await this.repository.getSafetyCheck(checkId);
    return check?.triggeredPrompts.filter(p => !p.userResponse) || [];
  }

  async respondToPrompt(
    checkId: string,
    promptId: string,
    response: PromptResponse
  ): Promise<SafetyCheck> {
    const check = this.activeChecks.get(checkId) || await this.repository.getSafetyCheck(checkId);
    
    if (!check) {
      throw new Error(`Safety check not found: ${checkId}`);
    }

    // Find the triggered prompt
    const triggeredPrompt = check.triggeredPrompts.find(p => p.promptId === promptId);
    if (!triggeredPrompt) {
      throw new Error(`Prompted not found: ${promptId}`);
    }

    // Update prompt with response
    triggeredPrompt.userResponse = response;

    // Add audit entry
    check.auditTrail.push({
      timestamp: new Date(),
      action: 'prompt_response',
      performedBy: response.userId,
      details: {
        promptId,
        responseType: response.responseType,
        hasJustification: !!response.justification
      },
      systemGenerated: false
    });

    // Handle response based on type
    await this.handlePromptResponse(check, triggeredPrompt, response);

    // Update check result
    check.result = this.determineCheckResult(check.triggeredPrompts);

    // Store updated check
    await this.repository.updateSafetyCheck(checkId, check);
    this.activeChecks.set(checkId, check);

    return check;
  }

  async resolveCheck(checkId: string, resolution: SafetyResolution): Promise<SafetyCheck> {
    const check = this.activeChecks.get(checkId) || await this.repository.getSafetyCheck(checkId);
    
    if (!check) {
      throw new Error(`Safety check not found: ${checkId}`);
    }

    // Apply resolution
    check.resolution = resolution;
    check.result = SafetyCheckResult.ALLOWED; // Assume resolution allows action

    // Add audit entry
    check.auditTrail.push({
      timestamp: new Date(),
      action: 'check_resolved',
      performedBy: resolution.resolvedBy,
      details: {
        resolutionType: resolution.resolutionType,
        hasConditions: !!resolution.conditions?.length,
        followUpRequired: resolution.followUpRequired
      },
      systemGenerated: false
    });

    // Store resolved check
    await this.repository.updateSafetyCheck(checkId, check);
    this.activeChecks.delete(checkId); // Remove from active checks

    return check;
  }

  async getMetrics(startDate: Date, endDate: Date): Promise<SafetyMetrics> {
    // Get checks from repository for the date range
    const checks = await this.repository.queryChecks({
      startDate,
      endDate
    });

    // Calculate metrics
    const totalChecks = checks.length;
    const allowedChecks = checks.filter(c => c.result === SafetyCheckResult.ALLOWED).length;
    const blockedChecks = checks.filter(c => c.result === SafetyCheckResult.BLOCKED).length;
    const escalatedChecks = checks.filter(c => c.result === SafetyCheckResult.ESCALATED).length;

    // Calculate principle violations
    const principleViolations: Record<string, number> = {};
    for (const check of checks) {
      for (const prompt of check.triggeredPrompts) {
        principleViolations[prompt.principleId] = (principleViolations[prompt.principleId] || 0) + 1;
      }
    }

    // Calculate resolution times
    const resolutionTimes = checks
      .filter(c => c.resolution)
      .map(c => {
        const resolutionTime = c.resolution!.resolvedAt.getTime() - c.timestamp.getTime();
        return resolutionTime / (1000 * 60); // Convert to minutes
      })
      .sort((a, b) => a - b);

    const timeToResolution = {
      p50: resolutionTimes[Math.floor(resolutionTimes.length * 0.5)] || 0,
      p90: resolutionTimes[Math.floor(resolutionTimes.length * 0.9)] || 0,
      p99: resolutionTimes[Math.floor(resolutionTimes.length * 0.99)] || 0
    };

    return {
      totalChecks,
      allowedChecks,
      blockedChecks,
      escalatedChecks,
      averageResolutionTime: resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length || 0,
      principleViolations,
      exemptionsUsed: checks.filter(c => 
        c.triggeredPrompts.some(p => p.userResponse?.responseType === ResponseType.REQUEST_EXEMPTION)
      ).length,
      emergencyOverrides: checks.filter(c => 
        c.triggeredPrompts.some(p => p.userResponse?.responseType === ResponseType.EMERGENCY_OVERRIDE)
      ).length,
      timeToResolution
    };
  }

  async validatePrinciples(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Validate principles configuration
      const principles = await this.repository.getPrinciples();
      const prompts = await this.repository.getPrompts();

      // Check if all principles referenced in prompts exist
      for (const prompt of prompts) {
        const principle = principles.find(p => p.id === prompt.principleId);
        if (!principle) {
          errors.push(`Prompt ${prompt.id} references unknown principle: ${prompt.principleId}`);
        }
      }

      // Check if all mandatory principles have at least one prompt
      const mandatoryPrinciples = principles.filter(p => p.enforcementLevel === 'mandatory');
      for (const principle of mandatoryPrinciples) {
        const hasPrompts = prompts.some(p => p.principleId === principle.id);
        if (!hasPrompts) {
          errors.push(`Mandatory principle ${principle.id} has no associated prompts`);
        }
      }

      // Validate configuration
      if (!this.config.enabled) {
        errors.push('Constitutional safety service is disabled');
      }

      return {
        valid: errors.length === 0,
        errors
      };

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, errors };
    }
  }

  // Private helper methods

  private async getApplicablePrompts(
    eventType: AgentEventType,
    data: any,
    context: SafetyCheckContext
  ): Promise<SafetyPrompt[]> {
    const allPrompts = await this.repository.getPrompts();
    
    return allPrompts.filter(prompt => {
      // Check if prompt applies to this event type
      if (prompt.trigger.eventType !== eventType) {
        return false;
      }

      // Check jurisdiction if specified
      if (prompt.trigger.contextRequirements) {
        for (const requirement of prompt.trigger.contextRequirements) {
          if (requirement.type === 'jurisdiction' && requirement.required) {
            if (!requirement.validValues?.includes(context.jurisdiction)) {
              return false;
            }
          }
        }
      }

      return true;
    });
  }

  private shouldEvaluatePrompt(prompt: SafetyPrompt, context: SafetyCheckContext): boolean {
    // Check if prompt is enabled in config
    const principleConfig = this.config.principlesConfig[prompt.principleId];
    if (principleConfig && !principleConfig.enabled) {
      return false;
    }

    // Check if user has exempt role
    if (principleConfig?.exemptRoles) {
      const hasExemptRole = context.userRoles.some(role => 
        principleConfig.exemptRoles!.includes(role)
      );
      if (hasExemptRole) {
        return false;
      }
    }

    return true;
  }

  private async evaluatePrompt(
    prompt: SafetyPrompt,
    data: any,
    context: SafetyCheckContext,
    timestamp: Date
  ): Promise<TriggeredPrompt | null> {
    // Use the evaluation logic from prompts.ts
    const isTriggered = evaluatePromptTrigger(prompt, data, prompt.trigger.eventType);
    
    if (!isTriggered) {
      return null;
    }

    return {
      promptId: prompt.id,
      principleId: prompt.principleId,
      triggeredAt: timestamp,
      triggerDetails: {
        conditions: prompt.trigger.conditions,
        thresholds: [
          ...(prompt.trigger.dataThresholds || []),
          ...(prompt.trigger.financialThresholds || [])
        ]
      },
      severity: prompt.severity
    };
  }

  private determineCheckResult(triggeredPrompts: TriggeredPrompt[]): SafetyCheckResult {
    if (triggeredPrompts.length === 0) {
      return SafetyCheckResult.ALLOWED;
    }

    // Check if any prompts are blocking
    const hasBlockingPrompts = triggeredPrompts.some(p => {
      const prompt = CONSTITUTIONAL_SAFETY_PROMPTS.find(sp => sp.id === p.promptId);
      return prompt?.promptType === PromptType.BLOCKING;
    });

    if (hasBlockingPrompts) {
      // Check if all blocking prompts have been resolved
      const unresolvedBlocking = triggeredPrompts.filter(p => {
        const prompt = CONSTITUTIONAL_SAFETY_PROMPTS.find(sp => sp.id === p.promptId);
        return prompt?.promptType === PromptType.BLOCKING && !p.userResponse;
      });

      if (unresolvedBlocking.length > 0) {
        return SafetyCheckResult.BLOCKED;
      }
    }

    // Check if any prompts require escalation
    const hasEscalation = triggeredPrompts.some(p => {
      const prompt = CONSTITUTIONAL_SAFETY_PROMPTS.find(sp => sp.id === p.promptId);
      return prompt?.escalationRequired && !p.userResponse;
    });

    if (hasEscalation) {
      return SafetyCheckResult.ESCALATED;
    }

    // Check if any prompts are still pending response
    const hasPendingPrompts = triggeredPrompts.some(p => !p.userResponse);
    if (hasPendingPrompts) {
      return SafetyCheckResult.PENDING;
    }

    return SafetyCheckResult.CONDITIONAL;
  }

  private async handlePromptResponse(
    check: SafetyCheck,
    triggeredPrompt: TriggeredPrompt,
    response: PromptResponse
  ): Promise<void> {
    switch (response.responseType) {
      case ResponseType.ESCALATE:
        check.result = SafetyCheckResult.ESCALATED;
        break;
      
      case ResponseType.EMERGENCY_OVERRIDE:
        if (this.config.emergencyOverrideEnabled) {
          // Validate user has emergency override role
          const hasEmergencyRole = check.context.userRoles.some(role => 
            this.config.emergencyOverrideRoles.includes(role)
          );
          
          if (hasEmergencyRole) {
            check.result = SafetyCheckResult.ALLOWED;
          } else {
            throw new Error('User does not have emergency override permissions');
          }
        } else {
          throw new Error('Emergency override is not enabled');
        }
        break;
      
      case ResponseType.REQUEST_EXEMPTION:
        // Handle exemption request - this would typically require approval workflow
        check.result = SafetyCheckResult.PENDING;
        break;
      
      case ResponseType.APPROVE:
        // Check if user has authority to approve
        if (response.approvals && response.approvals.length > 0) {
          check.result = SafetyCheckResult.CONDITIONAL;
        }
        break;
      
      case ResponseType.DENY:
        check.result = SafetyCheckResult.BLOCKED;
        break;
      
      default:
        // For acknowledge and other responses, continue evaluation
        break;
    }
  }

  private updateMetrics(result: SafetyCheckResult, triggeredPrompts: TriggeredPrompt[]): void {
    switch (result) {
      case SafetyCheckResult.ALLOWED:
        this.metrics.allowedChecks++;
        break;
      case SafetyCheckResult.BLOCKED:
        this.metrics.blockedChecks++;
        break;
      case SafetyCheckResult.ESCALATED:
        this.metrics.escalatedChecks++;
        break;
    }

    // Update principle violation counts
    for (const prompt of triggeredPrompts) {
      this.metrics.principleViolations[prompt.principleId] = 
        (this.metrics.principleViolations[prompt.principleId] || 0) + 1;
    }
  }

  private getHighestSeverity(triggeredPrompts: TriggeredPrompt[]): SafetySeverity {
    const severityOrder = [
      SafetySeverity.CRITICAL,
      SafetySeverity.HIGH,
      SafetySeverity.MEDIUM,
      SafetySeverity.LOW,
      SafetySeverity.INFO
    ];

    for (const severity of severityOrder) {
      if (triggeredPrompts.some(p => p.severity === severity)) {
        return severity;
      }
    }

    return SafetySeverity.INFO;
  }
}