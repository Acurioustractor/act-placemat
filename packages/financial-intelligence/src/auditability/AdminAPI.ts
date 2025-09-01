/**
 * Admin API for Rollback Operations
 * 
 * REST API endpoints for policy version management, rollback planning,
 * execution, and monitoring with comprehensive admin capabilities
 */

import {
  PolicyVersionService,
  RollbackPlan,
  RollbackTarget,
  RollbackScope,
  RollbackMetadata,
  RollbackExecution,
  PolicyVersion,
  ValidationResult,
  ComplianceReport,
  PolicyChange,
  AuditEntry,
  RollbackRisk,
  RollbackStatus,
  PolicyVersionStatus,
  ChangeType,
  AuditAction,
  AuditResult
} from './types';

export interface AdminAPIRequest {
  userId: string;
  sessionId: string;
  requestId: string;
  ipAddress: string;
  userAgent?: string;
  roles: string[];
}

export interface AdminAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  requestId: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PolicyVersionFilter {
  status?: PolicyVersionStatus[];
  createdBy?: string;
  fromDate?: Date;
  toDate?: Date;
  tags?: string[];
}

export interface RollbackPlanFilter {
  status?: RollbackStatus[];
  risk?: RollbackRisk[];
  createdBy?: string;
  fromDate?: Date;
  toDate?: Date;
}

export class AdminAPI {
  private policyService: PolicyVersionService;
  private authorizationRoles: Record<string, string[]>;

  constructor(
    policyService: PolicyVersionService,
    options: {
      authorizationRoles?: Record<string, string[]>;
    } = {}
  ) {
    this.policyService = policyService;
    this.authorizationRoles = options.authorizationRoles || {
      'view_policies': ['policy_viewer', 'policy_admin', 'system_admin'],
      'create_policies': ['policy_admin', 'system_admin'],
      'approve_policies': ['policy_approver', 'system_admin'],
      'deploy_policies': ['policy_deployer', 'system_admin'],
      'create_rollback': ['rollback_admin', 'system_admin'],
      'approve_rollback': ['rollback_approver', 'system_admin'],
      'execute_rollback': ['rollback_executor', 'system_admin'],
      'view_audit': ['audit_viewer', 'compliance_officer', 'system_admin'],
      'generate_reports': ['report_generator', 'compliance_officer', 'system_admin']
    };
  }

  // Policy Version Management Endpoints

  async getPolicyVersions(
    request: AdminAPIRequest,
    policyId: string,
    filter?: PolicyVersionFilter,
    pagination?: PaginationOptions
  ): Promise<AdminAPIResponse<{
    versions: PolicyVersion[];
    totalCount: number;
    pageInfo: {
      currentPage: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }>> {
    try {
      this.checkPermission(request, 'view_policies');

      const allVersions = await this.policyService.getVersionHistory(policyId);
      
      // Apply filters
      let filteredVersions = allVersions;
      
      if (filter?.status) {
        filteredVersions = filteredVersions.filter(v => filter.status!.includes(v.status));
      }
      
      if (filter?.createdBy) {
        filteredVersions = filteredVersions.filter(v => v.createdBy === filter.createdBy);
      }
      
      if (filter?.fromDate) {
        filteredVersions = filteredVersions.filter(v => v.createdAt >= filter.fromDate!);
      }
      
      if (filter?.toDate) {
        filteredVersions = filteredVersions.filter(v => v.createdAt <= filter.toDate!);
      }
      
      if (filter?.tags) {
        filteredVersions = filteredVersions.filter(v => 
          filter.tags!.some(tag => v.tags.includes(tag))
        );
      }

      // Apply sorting
      if (pagination?.sortBy) {
        filteredVersions.sort((a, b) => {
          const aVal = this.getNestedProperty(a, pagination.sortBy!);
          const bVal = this.getNestedProperty(b, pagination.sortBy!);
          const order = pagination.sortOrder === 'desc' ? -1 : 1;
          return aVal < bVal ? -order : aVal > bVal ? order : 0;
        });
      }

      // Apply pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const offset = (page - 1) * limit;
      
      const paginatedVersions = filteredVersions.slice(offset, offset + limit);
      const totalCount = filteredVersions.length;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        success: true,
        data: {
          versions: paginatedVersions,
          totalCount,
          pageInfo: {
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
          }
        },
        timestamp: new Date(),
        requestId: request.requestId
      };

    } catch (error) {
      return this.createErrorResponse(request, error);
    }
  }

  async createPolicyVersion(
    request: AdminAPIRequest,
    policyId: string,
    content: any,
    metadata: any
  ): Promise<AdminAPIResponse<PolicyVersion>> {
    try {
      this.checkPermission(request, 'create_policies');

      const version = await this.policyService.createVersion(
        policyId,
        content,
        metadata,
        request.userId
      );

      return {
        success: true,
        data: version,
        timestamp: new Date(),
        requestId: request.requestId
      };

    } catch (error) {
      return this.createErrorResponse(request, error);
    }
  }

  async approveVersion(
    request: AdminAPIRequest,
    policyId: string,
    version: string
  ): Promise<AdminAPIResponse<void>> {
    try {
      this.checkPermission(request, 'approve_policies');

      await this.policyService.approveVersion(policyId, version, request.userId);

      return {
        success: true,
        timestamp: new Date(),
        requestId: request.requestId
      };

    } catch (error) {
      return this.createErrorResponse(request, error);
    }
  }

  async deployVersion(
    request: AdminAPIRequest,
    policyId: string,
    version: string
  ): Promise<AdminAPIResponse<void>> {
    try {
      this.checkPermission(request, 'deploy_policies');

      await this.policyService.deployVersion(policyId, version, request.userId);

      return {
        success: true,
        timestamp: new Date(),
        requestId: request.requestId
      };

    } catch (error) {
      return this.createErrorResponse(request, error);
    }
  }

  async compareVersions(
    request: AdminAPIRequest,
    policyId: string,
    fromVersion: string,
    toVersion: string
  ): Promise<AdminAPIResponse<any>> {
    try {
      this.checkPermission(request, 'view_policies');

      const diff = await this.policyService.compareVersions(policyId, fromVersion, toVersion);

      return {
        success: true,
        data: diff,
        timestamp: new Date(),
        requestId: request.requestId
      };

    } catch (error) {
      return this.createErrorResponse(request, error);
    }
  }

  // Rollback Management Endpoints

  async getRollbackPlans(
    request: AdminAPIRequest,
    filter?: RollbackPlanFilter,
    pagination?: PaginationOptions
  ): Promise<AdminAPIResponse<{
    plans: RollbackPlan[];
    totalCount: number;
    pageInfo: any;
  }>> {
    try {
      this.checkPermission(request, 'view_policies');

      // This would integrate with repository query methods
      const plans: RollbackPlan[] = []; // Placeholder

      return {
        success: true,
        data: {
          plans,
          totalCount: plans.length,
          pageInfo: {
            currentPage: pagination?.page || 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false
          }
        },
        timestamp: new Date(),
        requestId: request.requestId
      };

    } catch (error) {
      return this.createErrorResponse(request, error);
    }
  }

  async createRollbackPlan(
    request: AdminAPIRequest,
    target: RollbackTarget,
    scope: RollbackScope,
    metadata: RollbackMetadata
  ): Promise<AdminAPIResponse<RollbackPlan>> {
    try {
      this.checkPermission(request, 'create_rollback');

      const plan = await this.policyService.createRollbackPlan(
        target,
        scope,
        metadata,
        request.userId
      );

      return {
        success: true,
        data: plan,
        timestamp: new Date(),
        requestId: request.requestId
      };

    } catch (error) {
      return this.createErrorResponse(request, error);
    }
  }

  async validateRollbackPlan(
    request: AdminAPIRequest,
    planId: string
  ): Promise<AdminAPIResponse<{
    valid: boolean;
    validationResults: ValidationResult[];
    summary: {
      totalChecks: number;
      passed: number;
      failed: number;
      criticalFailures: number;
    };
  }>> {
    try {
      this.checkPermission(request, 'view_policies');

      const validationResults = await this.policyService.validateRollbackPlan(planId);
      
      const passed = validationResults.filter(r => r.passed).length;
      const failed = validationResults.filter(r => !r.passed).length;
      const criticalFailures = validationResults.filter(r => 
        !r.passed && r.checkId.includes('critical')
      ).length;

      return {
        success: true,
        data: {
          valid: criticalFailures === 0,
          validationResults,
          summary: {
            totalChecks: validationResults.length,
            passed,
            failed,
            criticalFailures
          }
        },
        timestamp: new Date(),
        requestId: request.requestId
      };

    } catch (error) {
      return this.createErrorResponse(request, error);
    }
  }

  async executeRollback(
    request: AdminAPIRequest,
    planId: string
  ): Promise<AdminAPIResponse<RollbackExecution>> {
    try {
      this.checkPermission(request, 'execute_rollback');

      const execution = await this.policyService.executeRollback(planId, request.userId);

      return {
        success: true,
        data: execution,
        timestamp: new Date(),
        requestId: request.requestId
      };

    } catch (error) {
      return this.createErrorResponse(request, error);
    }
  }

  async getRollbackExecution(
    request: AdminAPIRequest,
    executionId: string
  ): Promise<AdminAPIResponse<RollbackExecution>> {
    try {
      this.checkPermission(request, 'view_policies');

      const execution = await this.policyService.monitorRollback(executionId);

      return {
        success: true,
        data: execution,
        timestamp: new Date(),
        requestId: request.requestId
      };

    } catch (error) {
      return this.createErrorResponse(request, error);
    }
  }

  // Audit and Reporting Endpoints

  async getAuditTrail(
    request: AdminAPIRequest,
    target: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
      userId?: string;
      action?: AuditAction;
      result?: AuditResult;
      limit?: number;
      offset?: number;
    }
  ): Promise<AdminAPIResponse<{
    entries: AuditEntry[];
    totalCount: number;
    summary: {
      successfulActions: number;
      failedActions: number;
      uniqueUsers: number;
      timeSpan: number;
    };
  }>> {
    try {
      this.checkPermission(request, 'view_audit');

      const entries = await this.policyService.getAuditTrail(target, options);
      
      const successfulActions = entries.filter(e => e.result === AuditResult.SUCCESS).length;
      const failedActions = entries.filter(e => e.result === AuditResult.FAILURE).length;
      const uniqueUsers = new Set(entries.map(e => e.userId)).size;
      
      let timeSpan = 0;
      if (entries.length > 0) {
        const earliest = entries.reduce((min, e) => e.timestamp < min ? e.timestamp : min, entries[0].timestamp);
        const latest = entries.reduce((max, e) => e.timestamp > max ? e.timestamp : max, entries[0].timestamp);
        timeSpan = latest.getTime() - earliest.getTime();
      }

      return {
        success: true,
        data: {
          entries,
          totalCount: entries.length,
          summary: {
            successfulActions,
            failedActions,
            uniqueUsers,
            timeSpan
          }
        },
        timestamp: new Date(),
        requestId: request.requestId
      };

    } catch (error) {
      return this.createErrorResponse(request, error);
    }
  }

  async getChangeHistory(
    request: AdminAPIRequest,
    policyId: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
      userId?: string;
      changeType?: ChangeType;
      limit?: number;
      offset?: number;
    }
  ): Promise<AdminAPIResponse<{
    changes: PolicyChange[];
    totalCount: number;
    summary: {
      totalChanges: number;
      changesByType: Record<string, number>;
      changesByUser: Record<string, number>;
      averageChangeSize: number;
    };
  }>> {
    try {
      this.checkPermission(request, 'view_policies');

      const changes = await this.policyService.getChangeHistory(policyId, options);
      
      const changesByType: Record<string, number> = {};
      const changesByUser: Record<string, number> = {};
      let totalChangeSize = 0;

      for (const change of changes) {
        changesByType[change.changeType] = (changesByType[change.changeType] || 0) + 1;
        changesByUser[change.userId] = (changesByUser[change.userId] || 0) + 1;
        totalChangeSize += change.diff.summary.linesAdded + change.diff.summary.linesRemoved + change.diff.summary.linesModified;
      }

      return {
        success: true,
        data: {
          changes,
          totalCount: changes.length,
          summary: {
            totalChanges: changes.length,
            changesByType,
            changesByUser,
            averageChangeSize: changes.length > 0 ? totalChangeSize / changes.length : 0
          }
        },
        timestamp: new Date(),
        requestId: request.requestId
      };

    } catch (error) {
      return this.createErrorResponse(request, error);
    }
  }

  async generateComplianceReport(
    request: AdminAPIRequest,
    fromDate: Date,
    toDate: Date,
    options?: {
      format?: 'json' | 'pdf' | 'csv';
      includeDetails?: boolean;
    }
  ): Promise<AdminAPIResponse<ComplianceReport | { downloadUrl: string }>> {
    try {
      this.checkPermission(request, 'generate_reports');

      const report = await this.policyService.generateComplianceReport(fromDate, toDate);

      if (options?.format === 'json' || !options?.format) {
        return {
          success: true,
          data: report,
          timestamp: new Date(),
          requestId: request.requestId
        };
      } else {
        // For other formats, generate file and return download URL
        const downloadUrl = await this.generateReportFile(report, options.format);
        
        return {
          success: true,
          data: { downloadUrl },
          timestamp: new Date(),
          requestId: request.requestId
        };
      }

    } catch (error) {
      return this.createErrorResponse(request, error);
    }
  }

  // Dashboard and Analytics Endpoints

  async getDashboardData(
    request: AdminAPIRequest,
    timeRange?: {
      fromDate: Date;
      toDate: Date;
    }
  ): Promise<AdminAPIResponse<{
    summary: {
      totalPolicies: number;
      activePolicies: number;
      pendingApprovals: number;
      recentChanges: number;
      activeRollbacks: number;
    };
    charts: {
      changesOverTime: Array<{ date: string; count: number }>;
      changesByType: Array<{ type: string; count: number }>;
      rollbacksByRisk: Array<{ risk: string; count: number }>;
      auditActivity: Array<{ action: string; count: number }>;
    };
    recentActivity: {
      changes: PolicyChange[];
      rollbacks: RollbackExecution[];
      auditEntries: AuditEntry[];
    };
  }>> {
    try {
      this.checkPermission(request, 'view_policies');

      // This would aggregate data from various sources
      const summary = {
        totalPolicies: 0,
        activePolicies: 0,
        pendingApprovals: 0,
        recentChanges: 0,
        activeRollbacks: 0
      };

      const charts = {
        changesOverTime: [],
        changesByType: [],
        rollbacksByRisk: [],
        auditActivity: []
      };

      const recentActivity = {
        changes: [],
        rollbacks: [],
        auditEntries: []
      };

      return {
        success: true,
        data: {
          summary,
          charts,
          recentActivity
        },
        timestamp: new Date(),
        requestId: request.requestId
      };

    } catch (error) {
      return this.createErrorResponse(request, error);
    }
  }

  // Helper Methods

  private checkPermission(request: AdminAPIRequest, requiredPermission: string): void {
    const allowedRoles = this.authorizationRoles[requiredPermission];
    if (!allowedRoles) {
      throw new Error(`Unknown permission: ${requiredPermission}`);
    }

    const hasPermission = request.roles.some(role => allowedRoles.includes(role));
    if (!hasPermission) {
      throw new Error(`Insufficient permissions. Required: ${allowedRoles.join(', ')}`);
    }
  }

  private createErrorResponse(request: AdminAPIRequest, error: any): AdminAPIResponse {
    const message = error instanceof Error ? error.message : String(error);
    
    return {
      success: false,
      error: message,
      timestamp: new Date(),
      requestId: request.requestId
    };
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async generateReportFile(report: ComplianceReport, format: string): Promise<string> {
    // This would generate the file in the specified format and return a download URL
    // For now, return a placeholder URL
    return `/api/reports/download/${this.generateId()}.${format}`;
  }

  private generateId(): string {
    return require('crypto').randomBytes(8).toString('hex');
  }
}

// Express.js route handlers for easy integration
export const createExpressRoutes = (adminAPI: AdminAPI) => {
  const routes: Array<{
    method: string;
    path: string;
    handler: (req: any, res: any) => Promise<void>;
  }> = [];

  // Policy version routes
  routes.push({
    method: 'GET',
    path: '/api/admin/policies/:policyId/versions',
    handler: async (req, res) => {
      const request = extractAdminRequest(req);
      const response = await adminAPI.getPolicyVersions(
        request,
        req.params.policyId,
        req.query.filter ? JSON.parse(req.query.filter) : undefined,
        req.query.pagination ? JSON.parse(req.query.pagination) : undefined
      );
      res.json(response);
    }
  });

  routes.push({
    method: 'POST',
    path: '/api/admin/policies/:policyId/versions',
    handler: async (req, res) => {
      const request = extractAdminRequest(req);
      const response = await adminAPI.createPolicyVersion(
        request,
        req.params.policyId,
        req.body.content,
        req.body.metadata
      );
      res.json(response);
    }
  });

  routes.push({
    method: 'POST',
    path: '/api/admin/policies/:policyId/versions/:version/approve',
    handler: async (req, res) => {
      const request = extractAdminRequest(req);
      const response = await adminAPI.approveVersion(
        request,
        req.params.policyId,
        req.params.version
      );
      res.json(response);
    }
  });

  routes.push({
    method: 'POST',
    path: '/api/admin/policies/:policyId/versions/:version/deploy',
    handler: async (req, res) => {
      const request = extractAdminRequest(req);
      const response = await adminAPI.deployVersion(
        request,
        req.params.policyId,
        req.params.version
      );
      res.json(response);
    }
  });

  // Rollback routes
  routes.push({
    method: 'GET',
    path: '/api/admin/rollbacks/plans',
    handler: async (req, res) => {
      const request = extractAdminRequest(req);
      const response = await adminAPI.getRollbackPlans(
        request,
        req.query.filter ? JSON.parse(req.query.filter) : undefined,
        req.query.pagination ? JSON.parse(req.query.pagination) : undefined
      );
      res.json(response);
    }
  });

  routes.push({
    method: 'POST',
    path: '/api/admin/rollbacks/plans',
    handler: async (req, res) => {
      const request = extractAdminRequest(req);
      const response = await adminAPI.createRollbackPlan(
        request,
        req.body.target,
        req.body.scope,
        req.body.metadata
      );
      res.json(response);
    }
  });

  routes.push({
    method: 'POST',
    path: '/api/admin/rollbacks/plans/:planId/execute',
    handler: async (req, res) => {
      const request = extractAdminRequest(req);
      const response = await adminAPI.executeRollback(
        request,
        req.params.planId
      );
      res.json(response);
    }
  });

  // Audit routes
  routes.push({
    method: 'GET',
    path: '/api/admin/audit/:target',
    handler: async (req, res) => {
      const request = extractAdminRequest(req);
      const response = await adminAPI.getAuditTrail(
        request,
        req.params.target,
        req.query
      );
      res.json(response);
    }
  });

  // Dashboard route
  routes.push({
    method: 'GET',
    path: '/api/admin/dashboard',
    handler: async (req, res) => {
      const request = extractAdminRequest(req);
      const response = await adminAPI.getDashboardData(
        request,
        req.query.timeRange ? JSON.parse(req.query.timeRange) : undefined
      );
      res.json(response);
    }
  });

  return routes;
};

// Helper function to extract admin request from Express request
function extractAdminRequest(req: any): AdminAPIRequest {
  return {
    userId: req.user?.id || 'unknown',
    sessionId: req.sessionID || 'unknown',
    requestId: req.headers['x-request-id'] || require('crypto').randomBytes(8).toString('hex'),
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'],
    roles: req.user?.roles || []
  };
}