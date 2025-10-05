/**
 * Policy Decision Cache
 * 
 * High-level cache implementation specifically for policy decisions
 * with support for invalidation triggers and policy versioning
 */

import {
  PolicyDecisionCache as IPolicyDecisionCache,
  PolicyDecisionCacheEntry,
  PolicyDecisionInput,
  PolicyDecisionStats,
  WarmupResult,
  CacheProvider,
  CacheKeyBuilder,
  CacheMetadata,
  CacheSource,
  RetentionPolicy,
  InvalidationType,
  InvalidationPriority,
  InvalidationTrigger,
  RiskLevel,
  DataClassification
} from './types';

export class PolicyDecisionCache implements IPolicyDecisionCache {
  private provider: CacheProvider;
  private keyBuilder: CacheKeyBuilder;
  private defaultTtl: number;
  private invalidationTriggers: Map<string, InvalidationTrigger[]> = new Map();

  constructor(
    provider: CacheProvider,
    keyBuilder: CacheKeyBuilder,
    options: {
      defaultTtl?: number;
      autoInvalidationEnabled?: boolean;
    } = {}
  ) {
    this.provider = provider;
    this.keyBuilder = keyBuilder;
    this.defaultTtl = options.defaultTtl || 300000; // 5 minutes default

    if (options.autoInvalidationEnabled) {
      this.setupAutoInvalidation();
    }
  }

  async getCachedDecision(input: PolicyDecisionInput): Promise<PolicyDecisionCacheEntry | null> {
    try {
      const key = this.keyBuilder.buildPolicyDecisionKey(input);
      const cached = await this.provider.get<PolicyDecisionCacheEntry>(key);
      
      if (!cached) {
        return null;
      }

      // Validate cache entry is still valid
      if (!this.validateCacheEntry(cached.value, input)) {
        // Invalid entry, remove it
        await this.provider.delete(key);
        return null;
      }

      // Update access tracking
      await this.provider.touch(key);
      
      return cached.value;

    } catch (error) {
      console.warn('Error retrieving cached policy decision:', error);
      return null;
    }
  }

  async cacheDecision(entry: PolicyDecisionCacheEntry): Promise<boolean> {
    try {
      const key = this.keyBuilder.buildPolicyDecisionKey(entry.input);
      
      // Create cache metadata
      const metadata: CacheMetadata = {
        source: CacheSource.POLICY_DECISION,
        tags: this.generateTags(entry),
        dependencies: this.generateDependencies(entry),
        checksum: this.generateChecksum(entry),
        compressed: false,
        sensitive: this.isSensitiveDecision(entry),
        retentionPolicy: this.getRetentionPolicy(entry),
        accessControl: this.getAccessControl(entry)
      };

      // Store invalidation triggers
      this.invalidationTriggers.set(key, entry.invalidationTriggers);

      // Calculate TTL based on risk and data classification
      const ttl = this.calculateTtl(entry);

      return await this.provider.set(key, entry, metadata, ttl);

    } catch (error) {
      console.error('Error caching policy decision:', error);
      return false;
    }
  }

  async invalidatePolicyDecisions(policyId: string, reason: string): Promise<number> {
    try {
      const pattern = this.keyBuilder.buildPatternKey('policy', 'decision', `*${policyId}*`);
      return await this.provider.invalidate(pattern, reason);
    } catch (error) {
      console.error('Error invalidating policy decisions:', error);
      return 0;
    }
  }

  async invalidateUserDecisions(userId: string, reason: string): Promise<number> {
    try {
      const pattern = this.keyBuilder.buildPatternKey('policy', 'decision', `${userId}*`);
      return await this.provider.invalidate(pattern, reason);
    } catch (error) {
      console.error('Error invalidating user decisions:', error);
      return 0;
    }
  }

  async invalidateResourceDecisions(resource: string, reason: string): Promise<number> {
    try {
      const normalizedResource = this.normalizeResource(resource);
      const pattern = this.keyBuilder.buildPatternKey('policy', 'decision', `*${normalizedResource}*`);
      return await this.provider.invalidate(pattern, reason);
    } catch (error) {
      console.error('Error invalidating resource decisions:', error);
      return 0;
    }
  }

  async getDecisionStats(): Promise<PolicyDecisionStats> {
    try {
      const baseStats = await this.provider.getStats();
      
      // Query policy-specific entries
      const policyEntries = await this.provider.query({
        namespace: 'policy',
        source: CacheSource.POLICY_DECISION,
        limit: 1000
      });

      // Calculate policy-specific metrics
      const policyHitRates = this.calculatePolicyHitRates(policyEntries);
      const userHitRates = this.calculateUserHitRates(policyEntries);
      const resourceHitRates = this.calculateResourceHitRates(policyEntries);
      
      const averageDecisionTime = policyEntries.length > 0
        ? policyEntries.reduce((sum, entry) => sum + (entry.metadata as any).evaluationTime || 0, 0) / policyEntries.length
        : 0;

      const cacheEffectiveness = this.calculateCacheEffectiveness(policyEntries);
      const invalidationReasons = this.getInvalidationReasons();

      return {
        ...baseStats,
        policyHitRates,
        userHitRates,
        resourceHitRates,
        averageDecisionTime,
        cacheEffectiveness,
        invalidationReasons
      };

    } catch (error) {
      console.error('Error getting decision stats:', error);
      throw error;
    }
  }

  async warmupCache(patterns: string[]): Promise<WarmupResult> {
    const startTime = Date.now();
    let entriesLoaded = 0;
    const errors: string[] = [];

    try {
      for (const pattern of patterns) {
        try {
          // This would typically load from a policy engine or database
          // For now, we'll simulate cache warming
          const mockEntries = await this.generateWarmupEntries(pattern);
          
          for (const entry of mockEntries) {
            const success = await this.cacheDecision(entry);
            if (success) {
              entriesLoaded++;
            } else {
              errors.push(`Failed to warm entry for pattern: ${pattern}`);
            }
          }
        } catch (error) {
          errors.push(`Error warming pattern ${pattern}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return {
        success: errors.length === 0,
        entriesLoaded,
        loadTime: Date.now() - startTime,
        errors
      };

    } catch (error) {
      return {
        success: false,
        entriesLoaded,
        loadTime: Date.now() - startTime,
        errors: [...errors, error instanceof Error ? error.message : String(error)]
      };
    }
  }

  // Private helper methods

  private validateCacheEntry(entry: PolicyDecisionCacheEntry, input: PolicyDecisionInput): boolean {
    // Check if input hash matches
    if (entry.input.inputHash !== input.inputHash) {
      return false;
    }

    // Check if any invalidation triggers are active
    for (const trigger of entry.invalidationTriggers) {
      if (this.isInvalidationTriggered(trigger, input)) {
        return false;
      }
    }

    // Check time-based expiry
    const age = Date.now() - entry.input.timestamp.getTime();
    const maxAge = this.getMaxAge(entry);
    
    return age <= maxAge;
  }

  private isInvalidationTriggered(trigger: InvalidationTrigger, input: PolicyDecisionInput): boolean {
    switch (trigger.type) {
      case InvalidationType.TIME_EXPIRY:
        return this.checkTimeExpiry(trigger, input);
      case InvalidationType.POLICY_CHANGE:
        return this.checkPolicyChange(trigger);
      case InvalidationType.CONSENT_CHANGE:
        return this.checkConsentChange(trigger, input.userId);
      case InvalidationType.USER_ROLE_CHANGE:
        return this.checkUserRoleChange(trigger, input.userId);
      default:
        return false;
    }
  }

  private checkTimeExpiry(trigger: InvalidationTrigger, input: PolicyDecisionInput): boolean {
    const maxAge = parseInt(trigger.condition) * 1000; // Convert seconds to milliseconds
    const age = Date.now() - input.timestamp.getTime();
    return age > maxAge;
  }

  private checkPolicyChange(trigger: InvalidationTrigger): boolean {
    // This would check against a policy version registry
    // For now, return false (no policy changes detected)
    return false;
  }

  private checkConsentChange(trigger: InvalidationTrigger, userId: string): boolean {
    // This would check against a consent management system
    // For now, return false (no consent changes detected)
    return false;
  }

  private checkUserRoleChange(trigger: InvalidationTrigger, userId: string): boolean {
    // This would check against a user management system
    // For now, return false (no role changes detected)
    return false;
  }

  private generateTags(entry: PolicyDecisionCacheEntry): string[] {
    const tags = [
      `policy:${entry.policyVersion}`,
      `user:${entry.input.userId}`,
      `action:${entry.input.action}`,
      `resource:${this.normalizeResource(entry.input.resource)}`
    ];

    if (entry.metadata.riskLevel) {
      tags.push(`risk:${entry.metadata.riskLevel}`);
    }

    if (entry.metadata.dataClassification) {
      tags.push(`classification:${entry.metadata.dataClassification}`);
    }

    return tags;
  }

  private generateDependencies(entry: PolicyDecisionCacheEntry): string[] {
    const dependencies = [
      this.keyBuilder.buildConfigurationKey('policy', entry.policyVersion),
      this.keyBuilder.buildPermissionKey(entry.input.userId, entry.input.action, entry.input.resource)
    ];

    // Add consent dependencies for sensitive operations
    if (this.isSensitiveDecision(entry)) {
      dependencies.push(
        this.keyBuilder.buildConsentKey(entry.input.userId, entry.input.resource, entry.input.action)
      );
    }

    return dependencies;
  }

  private generateChecksum(entry: PolicyDecisionCacheEntry): string {
    const data = {
      input: entry.input,
      decision: entry.decision,
      policyVersion: entry.policyVersion
    };
    
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').substring(0, 16);
  }

  private isSensitiveDecision(entry: PolicyDecisionCacheEntry): boolean {
    return entry.metadata.dataClassification === DataClassification.CONFIDENTIAL ||
           entry.metadata.dataClassification === DataClassification.RESTRICTED ||
           entry.metadata.dataClassification === DataClassification.CULTURAL ||
           entry.metadata.riskLevel === RiskLevel.HIGH ||
           entry.metadata.riskLevel === RiskLevel.CRITICAL;
  }

  private getRetentionPolicy(entry: PolicyDecisionCacheEntry): RetentionPolicy {
    const isHighRisk = entry.metadata.riskLevel === RiskLevel.HIGH || 
                      entry.metadata.riskLevel === RiskLevel.CRITICAL;
    const isCultural = entry.metadata.dataClassification === DataClassification.CULTURAL;

    return {
      maxAge: isHighRisk ? 60000 : 300000, // 1 minute for high risk, 5 minutes for others
      maxIdleTime: 900000, // 15 minutes
      maxVersions: 3,
      culturalSensitive: isCultural,
      complianceRequired: entry.metadata.auditRequired
    };
  }

  private getAccessControl(entry: PolicyDecisionCacheEntry) {
    if (!this.isSensitiveDecision(entry)) {
      return undefined;
    }

    return {
      requiredRoles: ['financial_officer', 'compliance_officer'],
      userRestrictions: [entry.input.userId],
      jurisdictionRestrictions: ['AU']
    };
  }

  private calculateTtl(entry: PolicyDecisionCacheEntry): number {
    const retentionPolicy = this.getRetentionPolicy(entry);
    
    // Use the shorter of maxAge or default TTL
    return Math.min(retentionPolicy.maxAge, this.defaultTtl);
  }

  private normalizeResource(resource: string): string {
    return resource
      .toLowerCase()
      .replace(/\/+/g, '/')
      .replace(/\/$/, '')
      .replace(/^\//, '');
  }

  private getMaxAge(entry: PolicyDecisionCacheEntry): number {
    const retentionPolicy = this.getRetentionPolicy(entry);
    return retentionPolicy.maxAge;
  }

  private calculatePolicyHitRates(entries: any[]): Record<string, number> {
    const policyStats: Record<string, { hits: number; total: number }> = {};
    
    for (const entry of entries) {
      const policyVersion = (entry.value as PolicyDecisionCacheEntry).policyVersion;
      if (!policyStats[policyVersion]) {
        policyStats[policyVersion] = { hits: 0, total: 0 };
      }
      policyStats[policyVersion].hits += entry.hitCount;
      policyStats[policyVersion].total++;
    }

    const hitRates: Record<string, number> = {};
    for (const [policy, stats] of Object.entries(policyStats)) {
      hitRates[policy] = stats.total > 0 ? stats.hits / stats.total : 0;
    }

    return hitRates;
  }

  private calculateUserHitRates(entries: any[]): Record<string, number> {
    const userStats: Record<string, { hits: number; total: number }> = {};
    
    for (const entry of entries) {
      const userId = (entry.value as PolicyDecisionCacheEntry).input.userId;
      if (!userStats[userId]) {
        userStats[userId] = { hits: 0, total: 0 };
      }
      userStats[userId].hits += entry.hitCount;
      userStats[userId].total++;
    }

    const hitRates: Record<string, number> = {};
    for (const [user, stats] of Object.entries(userStats)) {
      hitRates[user] = stats.total > 0 ? stats.hits / stats.total : 0;
    }

    return hitRates;
  }

  private calculateResourceHitRates(entries: any[]): Record<string, number> {
    const resourceStats: Record<string, { hits: number; total: number }> = {};
    
    for (const entry of entries) {
      const resource = this.normalizeResource((entry.value as PolicyDecisionCacheEntry).input.resource);
      if (!resourceStats[resource]) {
        resourceStats[resource] = { hits: 0, total: 0 };
      }
      resourceStats[resource].hits += entry.hitCount;
      resourceStats[resource].total++;
    }

    const hitRates: Record<string, number> = {};
    for (const [resource, stats] of Object.entries(resourceStats)) {
      hitRates[resource] = stats.total > 0 ? stats.hits / stats.total : 0;
    }

    return hitRates;
  }

  private calculateCacheEffectiveness(entries: any[]): number {
    if (entries.length === 0) return 0;
    
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    const totalPossibleHits = entries.length * 10; // Assume average of 10 possible hits per entry
    
    return totalPossibleHits > 0 ? totalHits / totalPossibleHits : 0;
  }

  private getInvalidationReasons(): Record<string, number> {
    // This would track invalidation reasons over time
    // For now, return empty record
    return {};
  }

  private async generateWarmupEntries(pattern: string): Promise<PolicyDecisionCacheEntry[]> {
    // This would generate cache entries based on common patterns
    // For now, return empty array (warmup would be implemented based on actual usage patterns)
    return [];
  }

  private setupAutoInvalidation(): void {
    // Set up periodic check for invalidation triggers
    setInterval(() => {
      this.processInvalidationTriggers().catch(error => 
        console.error('Error processing invalidation triggers:', error)
      );
    }, 60000); // Check every minute
  }

  private async processInvalidationTriggers(): Promise<void> {
    for (const [key, triggers] of this.invalidationTriggers.entries()) {
      try {
        const cached = await this.provider.get(key);
        if (!cached) {
          // Entry no longer exists, remove triggers
          this.invalidationTriggers.delete(key);
          continue;
        }

        // Check if any trigger is activated
        const entry = cached.value as PolicyDecisionCacheEntry;
        for (const trigger of triggers) {
          if (this.isInvalidationTriggered(trigger, entry.input)) {
            await this.provider.delete(key);
            this.invalidationTriggers.delete(key);
            break;
          }
        }
      } catch (error) {
        console.warn(`Error processing invalidation triggers for key ${key}:`, error);
      }
    }
  }
}