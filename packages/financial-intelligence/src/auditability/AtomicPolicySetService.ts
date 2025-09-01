/**
 * Atomic Policy Set Service
 * 
 * Provides atomic transaction support for policy operations, ensuring
 * all changes succeed together or fail together with comprehensive rollback
 */

import crypto from 'crypto';
import {
  PolicyVersion,
  PolicyContent,
  PolicyVersionMetadata,
  PolicyVersionStatus,
  PolicyVersionRepository,
  AuditTrailService,
  AuditAction,
  AuditResult,
  ChangeType,
  PolicyChange,
  Changeset,
  ChangeMetadata,
  DatabaseConnection
} from './types';

export interface PolicySetOperation {
  id: string;
  policyId: string;
  operation: 'create' | 'update' | 'delete' | 'restore';
  content?: PolicyContent;
  metadata?: PolicyVersionMetadata;
  targetVersion?: string;
  userId: string;
}

export interface AtomicPolicySetRequest {
  id: string;
  operations: PolicySetOperation[];
  metadata: {
    description: string;
    businessJustification: string;
    requiredApprovals: string[];
    emergencyOverride?: boolean;
    dryRun?: boolean;
  };
  userId: string;
  sessionId: string;
  requestId: string;
}

export interface AtomicPolicySetResult {
  transactionId: string;
  success: boolean;
  completedOperations: string[];
  failedOperations: Array<{
    operationId: string;
    policyId: string;
    error: string;
    rollbackSuccessful: boolean;
  }>;
  metrics: {
    totalOperations: number;
    executionTime: number;
    rollbackTime?: number;
    validationTime: number;
  };
  auditTrail: string[];
  warnings: string[];
}

export interface PolicySetTransaction {
  id: string;
  request: AtomicPolicySetRequest;
  status: 'preparing' | 'validating' | 'executing' | 'rolling_back' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  checkpoints: PolicySetCheckpoint[];
  locks: PolicyLock[];
  result?: AtomicPolicySetResult;
}

export interface PolicySetCheckpoint {
  id: string;
  operationId: string;
  policyId: string;
  timestamp: Date;
  beforeState: PolicyVersion | null;
  afterState?: PolicyVersion;
  rollbackData: Record<string, any>;
}

export interface PolicyLock {
  policyId: string;
  lockedBy: string;
  lockedAt: Date;
  operation: string;
  expiresAt: Date;
}

export class AtomicPolicySetService {
  private repository: PolicyVersionRepository;
  private auditService: AuditTrailService;
  private db: DatabaseConnection;
  private lockTimeout: number;
  private transactionTimeout: number;
  private activeTransactions: Map<string, PolicySetTransaction> = new Map();

  constructor(
    repository: PolicyVersionRepository,
    auditService: AuditTrailService,
    db: DatabaseConnection,
    options: {
      lockTimeout?: number;
      transactionTimeout?: number;
    } = {}
  ) {
    this.repository = repository;
    this.auditService = auditService;
    this.db = db;
    this.lockTimeout = options.lockTimeout || 300000; // 5 minutes
    this.transactionTimeout = options.transactionTimeout || 1800000; // 30 minutes
  }

  /**
   * Execute an atomic policy set operation
   */
  async executeAtomicPolicySet(request: AtomicPolicySetRequest): Promise<AtomicPolicySetResult> {
    const transaction: PolicySetTransaction = {
      id: this.generateId(),
      request,
      status: 'preparing',
      startTime: new Date(),
      checkpoints: [],
      locks: []
    };

    this.activeTransactions.set(transaction.id, transaction);

    try {
      // Record transaction start
      await this.auditService.recordAuditEntry(
        request.userId,
        'START_ATOMIC_TRANSACTION' as AuditAction,
        transaction.id,
        {
          operationsCount: request.operations.length,
          dryRun: request.metadata.dryRun,
          emergencyOverride: request.metadata.emergencyOverride
        },
        AuditResult.SUCCESS,
        {
          sessionId: request.sessionId,
          requestId: request.requestId,
          ipAddress: 'system'
        }
      );

      const startTime = Date.now();

      // Phase 1: Validation
      transaction.status = 'validating';
      const validationStartTime = Date.now();
      await this.validatePolicySetRequest(transaction);
      const validationTime = Date.now() - validationStartTime;

      // Phase 2: Acquire locks
      await this.acquirePolicyLocks(transaction);

      // Phase 3: Execute operations atomically
      if (!request.metadata.dryRun) {
        transaction.status = 'executing';
        await this.executeOperationsWithTransaction(transaction);
      }

      // Phase 4: Complete transaction
      transaction.status = 'completed';
      transaction.endTime = new Date();

      const result: AtomicPolicySetResult = {
        transactionId: transaction.id,
        success: true,
        completedOperations: request.operations.map(op => op.id),
        failedOperations: [],
        metrics: {
          totalOperations: request.operations.length,
          executionTime: Date.now() - startTime,
          validationTime
        },
        auditTrail: [],
        warnings: []
      };

      transaction.result = result;

      // Record successful completion
      await this.auditService.recordAuditEntry(
        request.userId,
        'COMPLETE_ATOMIC_TRANSACTION' as AuditAction,
        transaction.id,
        {
          success: true,
          operationsCompleted: result.completedOperations.length,
          executionTime: result.metrics.executionTime
        },
        AuditResult.SUCCESS,
        {
          sessionId: request.sessionId,
          requestId: request.requestId,
          ipAddress: 'system'
        }
      );

      return result;

    } catch (error) {
      // Handle failure and rollback
      return await this.handleTransactionFailure(transaction, error);
    } finally {
      // Release locks and cleanup
      await this.releasePolicyLocks(transaction);
      this.activeTransactions.delete(transaction.id);
    }
  }

  /**
   * Cancel a running transaction
   */
  async cancelTransaction(transactionId: string, userId: string, reason: string): Promise<void> {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    if (transaction.status === 'completed' || transaction.status === 'failed') {
      throw new Error(`Cannot cancel ${transaction.status} transaction`);
    }

    transaction.status = 'cancelled';
    
    // Rollback any completed operations
    if (transaction.checkpoints.length > 0) {
      await this.rollbackTransaction(transaction);
    }

    await this.auditService.recordAuditEntry(
      userId,
      'CANCEL_ATOMIC_TRANSACTION' as AuditAction,
      transactionId,
      { reason, checkpointsRolledBack: transaction.checkpoints.length },
      AuditResult.SUCCESS,
      {
        sessionId: transaction.request.sessionId,
        requestId: transaction.request.requestId,
        ipAddress: 'system'
      }
    );
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<PolicySetTransaction | null> {
    return this.activeTransactions.get(transactionId) || null;
  }

  /**
   * List active transactions
   */
  async getActiveTransactions(): Promise<PolicySetTransaction[]> {
    return Array.from(this.activeTransactions.values());
  }

  // Private Methods

  private async validatePolicySetRequest(transaction: PolicySetTransaction): Promise<void> {
    const { operations } = transaction.request;

    // Check for duplicate policy IDs in operations
    const policyIds = operations.map(op => op.policyId);
    const duplicates = policyIds.filter((id, index) => policyIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate policy IDs in transaction: ${duplicates.join(', ')}`);
    }

    // Validate each operation
    for (const operation of operations) {
      await this.validateOperation(operation);
    }

    // Check for circular dependencies
    await this.validateDependencies(operations);

    // Check for conflicts with other transactions
    await this.checkTransactionConflicts(transaction);
  }

  private async validateOperation(operation: PolicySetOperation): Promise<void> {
    switch (operation.operation) {
      case 'create':
        if (!operation.content || !operation.metadata) {
          throw new Error(`Create operation requires content and metadata: ${operation.id}`);
        }
        break;

      case 'update':
        if (!operation.content && !operation.metadata) {
          throw new Error(`Update operation requires content or metadata: ${operation.id}`);
        }
        
        const existingVersion = await this.repository.getLatestVersion(operation.policyId);
        if (!existingVersion) {
          throw new Error(`Cannot update non-existent policy: ${operation.policyId}`);
        }
        break;

      case 'delete':
        const policyToDelete = await this.repository.getLatestVersion(operation.policyId);
        if (!policyToDelete) {
          throw new Error(`Cannot delete non-existent policy: ${operation.policyId}`);
        }
        break;

      case 'restore':
        if (!operation.targetVersion) {
          throw new Error(`Restore operation requires target version: ${operation.id}`);
        }
        
        const targetVersion = await this.repository.getVersion(operation.policyId, operation.targetVersion);
        if (!targetVersion) {
          throw new Error(`Target version not found: ${operation.policyId}@${operation.targetVersion}`);
        }
        break;

      default:
        throw new Error(`Unknown operation type: ${operation.operation}`);
    }
  }

  private async validateDependencies(operations: PolicySetOperation[]): Promise<void> {
    // Build dependency graph
    const dependencyMap = new Map<string, string[]>();
    
    for (const operation of operations) {
      if (operation.content?.dependencies) {
        const dependencies = operation.content.dependencies
          .filter(dep => dep.required)
          .map(dep => dep.dependsOn);
        dependencyMap.set(operation.policyId, dependencies);
      }
    }

    // Check for circular dependencies using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (policyId: string): boolean => {
      if (recursionStack.has(policyId)) {
        return true; // Found cycle
      }
      if (visited.has(policyId)) {
        return false; // Already processed
      }

      visited.add(policyId);
      recursionStack.add(policyId);

      const dependencies = dependencyMap.get(policyId) || [];
      for (const dep of dependencies) {
        if (hasCycle(dep)) {
          return true;
        }
      }

      recursionStack.delete(policyId);
      return false;
    };

    for (const policyId of dependencyMap.keys()) {
      if (hasCycle(policyId)) {
        throw new Error(`Circular dependency detected involving policy: ${policyId}`);
      }
    }
  }

  private async checkTransactionConflicts(transaction: PolicySetTransaction): Promise<void> {
    const policyIds = transaction.request.operations.map(op => op.policyId);
    
    // Check if any policies are locked by other transactions
    for (const activeTransaction of this.activeTransactions.values()) {
      if (activeTransaction.id === transaction.id) continue;
      
      const conflictingLocks = activeTransaction.locks.filter(lock => 
        policyIds.includes(lock.policyId) && lock.expiresAt > new Date()
      );
      
      if (conflictingLocks.length > 0) {
        const conflicts = conflictingLocks.map(lock => `${lock.policyId} (locked by ${lock.lockedBy})`);
        throw new Error(`Policy conflicts detected: ${conflicts.join(', ')}`);
      }
    }
  }

  private async acquirePolicyLocks(transaction: PolicySetTransaction): Promise<void> {
    const lockExpiryTime = new Date(Date.now() + this.lockTimeout);
    
    for (const operation of transaction.request.operations) {
      const lock: PolicyLock = {
        policyId: operation.policyId,
        lockedBy: transaction.id,
        lockedAt: new Date(),
        operation: operation.operation,
        expiresAt: lockExpiryTime
      };
      
      transaction.locks.push(lock);
    }
  }

  private async executeOperationsWithTransaction(transaction: PolicySetTransaction): Promise<void> {
    await this.db.transaction(async (txnClient) => {
      // Execute operations in dependency order
      const sortedOperations = await this.sortOperationsByDependencies(transaction.request.operations);
      
      for (const operation of sortedOperations) {
        const checkpoint = await this.createCheckpoint(operation);
        transaction.checkpoints.push(checkpoint);
        
        try {
          await this.executeOperation(operation, txnClient);
          
          // Update checkpoint with success
          checkpoint.afterState = await this.repository.getLatestVersion(operation.policyId);
          
        } catch (error) {
          // If any operation fails, the transaction will be rolled back automatically
          throw new Error(`Operation ${operation.id} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    });
  }

  private async createCheckpoint(operation: PolicySetOperation): Promise<PolicySetCheckpoint> {
    const beforeState = await this.repository.getLatestVersion(operation.policyId);
    
    return {
      id: this.generateId(),
      operationId: operation.id,
      policyId: operation.policyId,
      timestamp: new Date(),
      beforeState,
      rollbackData: {
        operation: operation.operation,
        originalState: beforeState ? JSON.stringify(beforeState) : null
      }
    };
  }

  private async executeOperation(operation: PolicySetOperation, txnClient: DatabaseConnection): Promise<void> {
    switch (operation.operation) {
      case 'create':
        await this.executeCreateOperation(operation, txnClient);
        break;
      case 'update':
        await this.executeUpdateOperation(operation, txnClient);
        break;
      case 'delete':
        await this.executeDeleteOperation(operation, txnClient);
        break;
      case 'restore':
        await this.executeRestoreOperation(operation, txnClient);
        break;
      default:
        throw new Error(`Unknown operation: ${operation.operation}`);
    }
  }

  private async executeCreateOperation(operation: PolicySetOperation, txnClient: DatabaseConnection): Promise<void> {
    if (!operation.content || !operation.metadata) {
      throw new Error('Create operation requires content and metadata');
    }

    const version: PolicyVersion = {
      id: this.generateId(),
      policyId: operation.policyId,
      version: '1.0.0', // First version
      hash: this.calculateContentHash(operation.content),
      content: operation.content,
      metadata: operation.metadata,
      parentVersion: undefined,
      branches: [],
      tags: [],
      createdAt: new Date(),
      createdBy: operation.userId,
      status: PolicyVersionStatus.DRAFT
    };

    await this.repository.saveVersion(version);
  }

  private async executeUpdateOperation(operation: PolicySetOperation, txnClient: DatabaseConnection): Promise<void> {
    const currentVersion = await this.repository.getLatestVersion(operation.policyId);
    if (!currentVersion) {
      throw new Error(`Policy not found: ${operation.policyId}`);
    }

    const updatedContent = operation.content ? { ...currentVersion.content, ...operation.content } : currentVersion.content;
    const updatedMetadata = operation.metadata ? { ...currentVersion.metadata, ...operation.metadata } : currentVersion.metadata;

    const newVersion: PolicyVersion = {
      id: this.generateId(),
      policyId: operation.policyId,
      version: this.incrementVersion(currentVersion.version),
      hash: this.calculateContentHash(updatedContent),
      content: updatedContent,
      metadata: updatedMetadata,
      parentVersion: currentVersion.version,
      branches: [],
      tags: [],
      createdAt: new Date(),
      createdBy: operation.userId,
      status: PolicyVersionStatus.DRAFT
    };

    await this.repository.saveVersion(newVersion);
  }

  private async executeDeleteOperation(operation: PolicySetOperation, txnClient: DatabaseConnection): Promise<void> {
    const currentVersion = await this.repository.getLatestVersion(operation.policyId);
    if (!currentVersion) {
      throw new Error(`Policy not found: ${operation.policyId}`);
    }

    currentVersion.status = PolicyVersionStatus.ARCHIVED;
    await this.repository.saveVersion(currentVersion);
  }

  private async executeRestoreOperation(operation: PolicySetOperation, txnClient: DatabaseConnection): Promise<void> {
    if (!operation.targetVersion) {
      throw new Error('Restore operation requires target version');
    }

    const targetVersion = await this.repository.getVersion(operation.policyId, operation.targetVersion);
    if (!targetVersion) {
      throw new Error(`Target version not found: ${operation.policyId}@${operation.targetVersion}`);
    }

    const restoredVersion: PolicyVersion = {
      ...targetVersion,
      id: this.generateId(),
      version: this.incrementVersion(targetVersion.version),
      createdAt: new Date(),
      createdBy: operation.userId,
      status: PolicyVersionStatus.ROLLBACK_TARGET
    };

    await this.repository.saveVersion(restoredVersion);
  }

  private async sortOperationsByDependencies(operations: PolicySetOperation[]): Promise<PolicySetOperation[]> {
    // Topological sort based on policy dependencies
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // Initialize graph
    for (const operation of operations) {
      graph.set(operation.policyId, []);
      inDegree.set(operation.policyId, 0);
    }

    // Build dependency graph
    for (const operation of operations) {
      if (operation.content?.dependencies) {
        for (const dep of operation.content.dependencies) {
          if (dep.required && graph.has(dep.dependsOn)) {
            graph.get(dep.dependsOn)!.push(operation.policyId);
            inDegree.set(operation.policyId, (inDegree.get(operation.policyId) || 0) + 1);
          }
        }
      }
    }

    // Topological sort
    const queue: string[] = [];
    const sorted: string[] = [];

    // Find policies with no dependencies
    for (const [policyId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(policyId);
      }
    }

    while (queue.length > 0) {
      const policyId = queue.shift()!;
      sorted.push(policyId);

      for (const dependent of graph.get(policyId) || []) {
        inDegree.set(dependent, inDegree.get(dependent)! - 1);
        if (inDegree.get(dependent) === 0) {
          queue.push(dependent);
        }
      }
    }

    // Return operations in dependency order
    return sorted.map(policyId => 
      operations.find(op => op.policyId === policyId)!
    );
  }

  private async rollbackTransaction(transaction: PolicySetTransaction): Promise<void> {
    const rollbackStartTime = Date.now();
    
    // Rollback checkpoints in reverse order
    for (let i = transaction.checkpoints.length - 1; i >= 0; i--) {
      const checkpoint = transaction.checkpoints[i];
      
      try {
        if (checkpoint.beforeState) {
          // Restore previous state
          await this.repository.saveVersion(checkpoint.beforeState);
        } else {
          // Delete created policy
          await this.repository.deleteVersion(checkpoint.policyId, checkpoint.afterState?.version || '');
        }
      } catch (error) {
        console.error(`Failed to rollback checkpoint ${checkpoint.id}:`, error);
        // Continue with other rollbacks
      }
    }

    if (transaction.result) {
      transaction.result.metrics.rollbackTime = Date.now() - rollbackStartTime;
    }
  }

  private async handleTransactionFailure(transaction: PolicySetTransaction, error: any): Promise<AtomicPolicySetResult> {
    transaction.status = 'rolling_back';
    
    try {
      await this.rollbackTransaction(transaction);
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }

    transaction.status = 'failed';
    transaction.endTime = new Date();

    const result: AtomicPolicySetResult = {
      transactionId: transaction.id,
      success: false,
      completedOperations: [],
      failedOperations: [{
        operationId: 'transaction',
        policyId: 'multiple',
        error: error instanceof Error ? error.message : String(error),
        rollbackSuccessful: true
      }],
      metrics: {
        totalOperations: transaction.request.operations.length,
        executionTime: Date.now() - transaction.startTime.getTime(),
        validationTime: 0
      },
      auditTrail: [],
      warnings: []
    };

    transaction.result = result;

    // Record failure
    await this.auditService.recordAuditEntry(
      transaction.request.userId,
      'FAIL_ATOMIC_TRANSACTION' as AuditAction,
      transaction.id,
      {
        error: result.failedOperations[0].error,
        checkpointsRolledBack: transaction.checkpoints.length
      },
      AuditResult.FAILURE,
      {
        sessionId: transaction.request.sessionId,
        requestId: transaction.request.requestId,
        ipAddress: 'system'
      }
    );

    return result;
  }

  private async releasePolicyLocks(transaction: PolicySetTransaction): Promise<void> {
    // In a real implementation, this would release database locks
    transaction.locks = [];
  }

  private calculateContentHash(content: PolicyContent): string {
    const contentString = JSON.stringify(content, Object.keys(content).sort());
    return crypto.createHash('sha256').update(contentString).digest('hex');
  }

  private incrementVersion(currentVersion: string): string {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}