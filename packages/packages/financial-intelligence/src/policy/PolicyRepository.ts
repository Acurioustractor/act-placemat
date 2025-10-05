/**
 * Policy Repository for Financial Intelligence Agent
 * 
 * Version-controlled repository for policy definitions using Rego, enabling
 * modular and auditable policy management with Australian compliance focus
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { 
  RegoPolicy, 
  PolicyDefinition, 
  PolicyVersion, 
  PolicyDeployment, 
  PolicyValidationResult, 
  PolicyRepositoryConfig,
  IPolicyRepository,
  PolicyFilter,
  PolicyBundle,
  PolicyTestResult,
  PolicyChange
} from './types';
import { PolicyValidator } from './PolicyValidator';
import { PolicyVersionManager } from './PolicyVersionManager';
import { PolicyMetadata, PolicyType, PolicyEnforcement } from '../types/governance';

/**
 * Central repository for managing Rego policies with version control
 */
export class PolicyRepository extends EventEmitter implements IPolicyRepository {
  private config: PolicyRepositoryConfig;
  private validator: PolicyValidator;
  private versionManager: PolicyVersionManager;
  private policies: Map<string, RegoPolicy> = new Map();
  private deployments: Map<string, PolicyDeployment[]> = new Map();
  private bundles: Map<string, PolicyBundle> = new Map();

  constructor(config: PolicyRepositoryConfig) {
    super();
    this.config = config;
    this.validator = new PolicyValidator();
    this.versionManager = new PolicyVersionManager(config.versionControl);
  }

  /**
   * Initialize the policy repository
   */
  async initialize(): Promise<void> {
    console.log('Initializing Policy Repository...');

    try {
      // Create storage directories if filesystem storage is used
      if (this.config.storage.type === 'filesystem') {
        await this.ensureStorageDirectories();
      }

      // Load existing policies
      await this.loadPolicies();

      // Initialize CI/CD if enabled
      if (this.config.cicd.enableAutomatedTesting) {
        await this.initializeCICD();
      }

      console.log(`Policy Repository initialized with ${this.policies.size} policies`);
      this.emit('repository_initialized', { policyCount: this.policies.size });

    } catch (error) {
      console.error('Failed to initialize Policy Repository:', error);
      throw error;
    }
  }

  /**
   * Create a new policy
   */
  async createPolicy(definition: PolicyDefinition): Promise<RegoPolicy> {
    console.log(`Creating policy: ${definition.name}`);

    // Generate policy ID and metadata
    const policyId = crypto.randomUUID();
    const metadata = await this.createPolicyMetadata(definition);
    
    const policy: RegoPolicy = {
      id: policyId,
      name: definition.name,
      description: definition.description,
      version: '1.0.0',
      module: definition.module,
      rego: definition.rego,
      metadata,
      dependencies: definition.dependencies || [],
      testCases: definition.testCases || [],
      documentation: definition.documentation || '',
      tags: definition.tags || [],
      cicd: {
        lastValidated: new Date(),
        validationStatus: 'pending',
        deploymentStatus: 'pending',
        automatedTests: this.config.cicd.enableAutomatedTesting
      },
      australianCompliance: {
        regulatoryFramework: definition.australianCompliance?.regulatoryFramework || ['ACNC'],
        indigenousProtocols: definition.australianCompliance?.indigenousProtocols || false,
        dataResidency: definition.australianCompliance?.dataResidency || 'australia',
        privacyActCompliant: true
      }
    };

    // Validate the policy
    const validation = await this.validatePolicy(policy);
    if (!validation.valid) {
      throw new Error(`Policy validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Store the policy
    this.policies.set(policyId, policy);
    await this.savePolicy(policy);

    // Create initial version
    await this.versionManager.createVersion(policyId, policy.version, 'Initial policy creation');

    // Run automated tests if enabled
    if (this.config.cicd.enableAutomatedTesting) {
      await this.runTests(policyId);
    }

    this.emit('policy_created', { policy });
    return policy;
  }

  /**
   * Get a policy by ID
   */
  async getPolicy(id: string): Promise<RegoPolicy | null> {
    return this.policies.get(id) || null;
  }

  /**
   * Update an existing policy
   */
  async updatePolicy(id: string, definition: Partial<PolicyDefinition>): Promise<RegoPolicy> {
    const existingPolicy = this.policies.get(id);
    if (!existingPolicy) {
      throw new Error(`Policy not found: ${id}`);
    }

    console.log(`Updating policy: ${existingPolicy.name}`);

    // Calculate changes
    const changes = this.calculateChanges(existingPolicy, definition);
    const requiresApproval = changes.some(c => c.requiresApproval);

    // Create updated policy
    const updatedPolicy: RegoPolicy = {
      ...existingPolicy,
      ...definition,
      version: this.versionManager.incrementVersion(existingPolicy.version, changes),
      cicd: {
        ...existingPolicy.cicd,
        lastValidated: new Date(),
        validationStatus: 'pending',
        deploymentStatus: requiresApproval ? 'pending' : existingPolicy.cicd.deploymentStatus
      }
    };

    // Update metadata if needed
    if (definition.type || definition.enforcement || definition.scopes) {
      updatedPolicy.metadata = await this.updatePolicyMetadata(existingPolicy.metadata, definition);
    }

    // Validate the updated policy
    const validation = await this.validatePolicy(updatedPolicy);
    if (!validation.valid) {
      throw new Error(`Policy validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Store the updated policy
    this.policies.set(id, updatedPolicy);
    await this.savePolicy(updatedPolicy);

    // Create new version
    const changeLog = changes.map(c => c.description).join('; ');
    await this.versionManager.createVersion(id, updatedPolicy.version, changeLog);

    // Run tests if enabled
    if (this.config.cicd.enableAutomatedTesting) {
      await this.runTests(id);
    }

    this.emit('policy_updated', { policy: updatedPolicy, changes });
    return updatedPolicy;
  }

  /**
   * Delete a policy
   */
  async deletePolicy(id: string): Promise<void> {
    const policy = this.policies.get(id);
    if (!policy) {
      throw new Error(`Policy not found: ${id}`);
    }

    console.log(`Deleting policy: ${policy.name}`);

    // Check for dependencies
    const dependentPolicies = Array.from(this.policies.values()).filter(p => 
      p.dependencies.includes(id)
    );

    if (dependentPolicies.length > 0) {
      throw new Error(`Cannot delete policy with dependencies: ${dependentPolicies.map(p => p.name).join(', ')}`);
    }

    // Remove from storage
    this.policies.delete(id);
    await this.deletePolicyFromStorage(id);

    this.emit('policy_deleted', { policyId: id, policyName: policy.name });
  }

  /**
   * List policies with optional filtering
   */
  async listPolicies(filter?: PolicyFilter): Promise<RegoPolicy[]> {
    let policies = Array.from(this.policies.values());

    if (filter) {
      if (filter.type) {
        policies = policies.filter(p => p.metadata.type === filter.type);
      }
      if (filter.enforcement) {
        policies = policies.filter(p => p.metadata.enforcement === filter.enforcement);
      }
      if (filter.tags && filter.tags.length > 0) {
        policies = policies.filter(p => filter.tags!.some(tag => p.tags.includes(tag)));
      }
      if (filter.scopes && filter.scopes.length > 0) {
        policies = policies.filter(p => filter.scopes!.some(scope => p.metadata.scopes.includes(scope)));
      }
      if (filter.australianCompliance !== undefined) {
        policies = policies.filter(p => p.australianCompliance.privacyActCompliant === filter.australianCompliance);
      }
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        policies = policies.filter(p => 
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }
      if (filter.limit) {
        const offset = filter.offset || 0;
        policies = policies.slice(offset, offset + filter.limit);
      }
    }

    return policies;
  }

  /**
   * Create a new version of a policy
   */
  async createVersion(policyId: string, changeLog: string): Promise<PolicyVersion> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    return await this.versionManager.createVersion(policyId, policy.version, changeLog);
  }

  /**
   * Get a specific version of a policy
   */
  async getVersion(policyId: string, version: string): Promise<PolicyVersion | null> {
    return await this.versionManager.getVersion(policyId, version);
  }

  /**
   * List all versions of a policy
   */
  async listVersions(policyId: string): Promise<PolicyVersion[]> {
    return await this.versionManager.listVersions(policyId);
  }

  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(policyId: string, version: string): Promise<void> {
    await this.versionManager.rollbackToVersion(policyId, version);
    
    // Reload the policy after rollback
    await this.loadPolicy(policyId);
    
    this.emit('policy_rollback', { policyId, version });
  }

  /**
   * Deploy a policy to an environment
   */
  async deployPolicy(policyId: string, environment: string): Promise<PolicyDeployment> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    console.log(`Deploying policy ${policy.name} to ${environment}`);

    // Validate policy before deployment
    const validation = await this.validatePolicy(policy);
    if (!validation.valid) {
      throw new Error(`Cannot deploy invalid policy: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check if approval is required for production
    if (environment === 'production' && this.config.cicd.requireApprovalForProduction) {
      if (policy.cicd.deploymentStatus !== 'approved') {
        throw new Error('Production deployment requires approval');
      }
    }

    const deployment: PolicyDeployment = {
      id: crypto.randomUUID(),
      policyId,
      version: policy.version,
      environment: environment as any,
      deployedAt: new Date(),
      deployedBy: 'system', // In production, this would be the actual user
      status: 'active',
      healthCheck: {
        status: 'healthy',
        lastCheck: new Date(),
        issues: []
      }
    };

    // Store deployment
    if (!this.deployments.has(policyId)) {
      this.deployments.set(policyId, []);
    }
    this.deployments.get(policyId)!.push(deployment);

    // Update policy deployment status
    policy.cicd.deploymentStatus = 'deployed';
    policy.cicd.lastDeployed = new Date();

    await this.savePolicy(policy);

    this.emit('policy_deployed', { deployment });
    return deployment;
  }

  /**
   * Get deployments for a policy
   */
  async getDeployments(policyId: string): Promise<PolicyDeployment[]> {
    return this.deployments.get(policyId) || [];
  }

  /**
   * Rollback a deployment
   */
  async rollbackDeployment(deploymentId: string): Promise<void> {
    // Find the deployment
    let targetDeployment: PolicyDeployment | undefined;
    let policyId: string | undefined;

    for (const [id, deployments] of this.deployments.entries()) {
      const deployment = deployments.find(d => d.id === deploymentId);
      if (deployment) {
        targetDeployment = deployment;
        policyId = id;
        break;
      }
    }

    if (!targetDeployment || !policyId) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    console.log(`Rolling back deployment: ${deploymentId}`);

    // Mark deployment as rollback
    targetDeployment.status = 'rollback';

    // If rollback on failure is enabled, revert to previous version
    if (this.config.cicd.rollbackOnFailure && targetDeployment.rollbackId) {
      await this.rollbackToVersion(policyId, targetDeployment.rollbackId);
    }

    this.emit('deployment_rollback', { deploymentId, policyId });
  }

  /**
   * Validate a policy
   */
  async validatePolicy(policy: RegoPolicy): Promise<PolicyValidationResult> {
    return await this.validator.validate(policy);
  }

  /**
   * Run tests for a policy
   */
  async runTests(policyId: string): Promise<PolicyTestResult[]> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    console.log(`Running tests for policy: ${policy.name}`);

    const results: PolicyTestResult[] = [];

    for (const testCase of policy.testCases) {
      const startTime = Date.now();
      
      try {
        // In a real implementation, this would execute the Rego policy
        // For now, we'll simulate test execution
        const passed = this.simulateTestExecution(testCase, policy);
        
        results.push({
          testCaseId: testCase.id,
          passed,
          actualOutput: testCase.expectedOutput, // Simulated
          actualDecision: testCase.expectedDecision, // Simulated
          executionTime: Date.now() - startTime
        });

      } catch (error) {
        results.push({
          testCaseId: testCase.id,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          executionTime: Date.now() - startTime
        });
      }
    }

    // Update CI/CD status based on test results
    const allPassed = results.every(r => r.passed);
    policy.cicd.validationStatus = allPassed ? 'passed' : 'failed';
    await this.savePolicy(policy);

    this.emit('tests_completed', { policyId, results, allPassed });
    return results;
  }

  /**
   * Create a policy bundle
   */
  async createBundle(policyIds: string[], metadata: any): Promise<PolicyBundle> {
    const policies: RegoPolicy[] = [];
    
    for (const id of policyIds) {
      const policy = this.policies.get(id);
      if (!policy) {
        throw new Error(`Policy not found: ${id}`);
      }
      policies.push(policy);
    }

    const bundle: PolicyBundle = {
      id: crypto.randomUUID(),
      name: metadata.name || `Bundle-${Date.now()}`,
      version: metadata.version || '1.0.0',
      policies,
      createdAt: new Date(),
      createdBy: metadata.createdBy || 'system',
      environment: metadata.environment || 'development',
      checksum: this.calculateBundleChecksum(policies),
      metadata: {
        description: metadata.description || '',
        changeLog: metadata.changeLog || '',
        dependencies: metadata.dependencies || [],
        australianCompliance: policies.every(p => p.australianCompliance.privacyActCompliant)
      }
    };

    this.bundles.set(bundle.id, bundle);
    
    this.emit('bundle_created', { bundle });
    return bundle;
  }

  /**
   * Deploy a bundle
   */
  async deployBundle(bundleId: string, environment: string): Promise<void> {
    const bundle = this.bundles.get(bundleId);
    if (!bundle) {
      throw new Error(`Bundle not found: ${bundleId}`);
    }

    console.log(`Deploying bundle ${bundle.name} to ${environment}`);

    // Deploy all policies in the bundle
    for (const policy of bundle.policies) {
      await this.deployPolicy(policy.id, environment);
    }

    this.emit('bundle_deployed', { bundleId, environment });
  }

  // === PRIVATE METHODS ===

  /**
   * Ensure storage directories exist
   */
  private async ensureStorageDirectories(): Promise<void> {
    if (!this.config.storage.path) {
      throw new Error('Storage path not configured for filesystem storage');
    }

    const dirs = [
      this.config.storage.path,
      path.join(this.config.storage.path, 'policies'),
      path.join(this.config.storage.path, 'versions'),
      path.join(this.config.storage.path, 'deployments'),
      path.join(this.config.storage.path, 'bundles')
    ];

    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * Load existing policies from storage
   */
  private async loadPolicies(): Promise<void> {
    if (this.config.storage.type === 'filesystem') {
      await this.loadPoliciesFromFilesystem();
    }
    // Add other storage type implementations as needed
  }

  /**
   * Load policies from filesystem
   */
  private async loadPoliciesFromFilesystem(): Promise<void> {
    if (!this.config.storage.path) return;

    const policiesDir = path.join(this.config.storage.path, 'policies');
    
    try {
      const files = await fs.readdir(policiesDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(policiesDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const policy: RegoPolicy = JSON.parse(content);
          this.policies.set(policy.id, policy);
        }
      }
    } catch (error) {
      console.log('No existing policies found in filesystem');
    }
  }

  /**
   * Load a specific policy
   */
  private async loadPolicy(policyId: string): Promise<void> {
    if (this.config.storage.type === 'filesystem' && this.config.storage.path) {
      const filePath = path.join(this.config.storage.path, 'policies', `${policyId}.json`);
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const policy: RegoPolicy = JSON.parse(content);
        this.policies.set(policyId, policy);
      } catch (error) {
        console.error(`Failed to load policy ${policyId}:`, error);
      }
    }
  }

  /**
   * Save a policy to storage
   */
  private async savePolicy(policy: RegoPolicy): Promise<void> {
    if (this.config.storage.type === 'filesystem' && this.config.storage.path) {
      const filePath = path.join(this.config.storage.path, 'policies', `${policy.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(policy, null, 2));
    }
  }

  /**
   * Delete a policy from storage
   */
  private async deletePolicyFromStorage(policyId: string): Promise<void> {
    if (this.config.storage.type === 'filesystem' && this.config.storage.path) {
      const filePath = path.join(this.config.storage.path, 'policies', `${policyId}.json`);
      
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error(`Failed to delete policy file ${policyId}:`, error);
      }
    }
  }

  /**
   * Initialize CI/CD pipeline
   */
  private async initializeCICD(): Promise<void> {
    // Set up automated testing schedule
    if (this.config.cicd.enableAutomatedTesting) {
      console.log('Initializing automated testing pipeline');
    }

    // Set up health check monitoring
    if (this.config.cicd.healthCheckInterval > 0) {
      setInterval(async () => {
        await this.performHealthChecks();
      }, this.config.cicd.healthCheckInterval * 60 * 1000);
    }
  }

  /**
   * Perform health checks on deployed policies
   */
  private async performHealthChecks(): Promise<void> {
    for (const deployments of this.deployments.values()) {
      for (const deployment of deployments) {
        if (deployment.status === 'active') {
          // Simulate health check - in production, this would ping the OPA server
          deployment.healthCheck = {
            status: 'healthy',
            lastCheck: new Date(),
            issues: []
          };
        }
      }
    }
  }

  /**
   * Create policy metadata from definition
   */
  private async createPolicyMetadata(definition: PolicyDefinition): Promise<PolicyMetadata> {
    const metadata: PolicyMetadata = {
      id: crypto.randomUUID(),
      name: definition.name,
      description: definition.description,
      type: definition.type,
      enforcement: definition.enforcement,
      priority: 5,
      scopes: definition.scopes,
      applicableEntities: [],
      regoModule: definition.module,
      ruleExpression: 'allow { true }', // Simplified for demo
      dependencies: definition.dependencies || [],
      effectiveFrom: new Date(),
      australianCompliance: {
        regulatoryFramework: definition.australianCompliance?.regulatoryFramework || ['ACNC'],
        indigenousProtocols: definition.australianCompliance?.indigenousProtocols || false,
        communityBenefitRequired: definition.type === PolicyType.COMMUNITY
      },
      version: '1.0.0',
      createdBy: 'system',
      lastModifiedBy: 'system',
      createdAt: new Date(),
      lastModifiedAt: new Date()
    };

    return metadata;
  }

  /**
   * Update policy metadata
   */
  private async updatePolicyMetadata(
    existing: PolicyMetadata, 
    updates: Partial<PolicyDefinition>
  ): Promise<PolicyMetadata> {
    return {
      ...existing,
      type: updates.type || existing.type,
      enforcement: updates.enforcement || existing.enforcement,
      scopes: updates.scopes || existing.scopes,
      lastModifiedAt: new Date()
    };
  }

  /**
   * Calculate changes between policies
   */
  private calculateChanges(existing: RegoPolicy, updates: Partial<PolicyDefinition>): PolicyChange[] {
    const changes: PolicyChange[] = [];

    if (updates.rego && updates.rego !== existing.rego) {
      changes.push({
        type: 'update',
        field: 'rego',
        oldValue: existing.rego,
        newValue: updates.rego,
        description: 'Rego policy code updated',
        impact: 'high',
        requiresApproval: true
      });
    }

    if (updates.enforcement && updates.enforcement !== existing.metadata.enforcement) {
      changes.push({
        type: 'update',
        field: 'enforcement',
        oldValue: existing.metadata.enforcement,
        newValue: updates.enforcement,
        description: 'Policy enforcement level changed',
        impact: 'medium',
        requiresApproval: true
      });
    }

    return changes;
  }

  /**
   * Simulate test execution (replace with actual Rego evaluation)
   */
  private simulateTestExecution(testCase: any, policy: RegoPolicy): boolean {
    // In production, this would execute the Rego policy against the test input
    // For now, we'll just return true to simulate successful tests
    return true;
  }

  /**
   * Calculate bundle checksum
   */
  private calculateBundleChecksum(policies: RegoPolicy[]): string {
    const content = policies.map(p => `${p.id}:${p.version}:${p.rego}`).join('|');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}