/**
 * Policy Version Manager
 * 
 * Manages versioning, change tracking, and rollback capabilities for policies
 */

import * as crypto from 'crypto';
import { PolicyVersion, PolicyChange } from './types';

/**
 * Version control configuration
 */
export interface VersionControlConfig {
  autoVersioning: boolean;
  semanticVersioning: boolean;
  requireChangeLog: boolean;
  maxVersionHistory: number;
}

/**
 * Manages policy versions with semantic versioning and rollback support
 */
export class PolicyVersionManager {
  private config: VersionControlConfig;
  private versions: Map<string, PolicyVersion[]> = new Map();

  constructor(config: VersionControlConfig) {
    this.config = config;
  }

  /**
   * Create a new version of a policy
   */
  async createVersion(
    policyId: string, 
    currentVersion: string, 
    changeLog: string,
    changes?: PolicyChange[]
  ): Promise<PolicyVersion> {
    const versions = this.versions.get(policyId) || [];
    const nextVersion = this.config.semanticVersioning 
      ? this.incrementSemanticVersion(currentVersion, changes)
      : this.incrementSimpleVersion(currentVersion);

    const version: PolicyVersion = {
      id: crypto.randomUUID(),
      policyId,
      version: nextVersion,
      changeLog,
      changes: changes || [],
      createdBy: 'system', // In production, this would be the actual user
      createdAt: new Date(),
      rollbackAvailable: versions.length > 0,
      previousVersion: versions.length > 0 ? versions[versions.length - 1].version : undefined,
      status: 'draft'
    };

    versions.push(version);

    // Enforce version history limit
    if (versions.length > this.config.maxVersionHistory) {
      const removed = versions.splice(0, versions.length - this.config.maxVersionHistory);
      console.log(`Pruned ${removed.length} old versions for policy ${policyId}`);
    }

    this.versions.set(policyId, versions);

    console.log(`Created version ${nextVersion} for policy ${policyId}`);
    return version;
  }

  /**
   * Get a specific version
   */
  async getVersion(policyId: string, version: string): Promise<PolicyVersion | null> {
    const versions = this.versions.get(policyId) || [];
    return versions.find(v => v.version === version) || null;
  }

  /**
   * List all versions for a policy
   */
  async listVersions(policyId: string): Promise<PolicyVersion[]> {
    return this.versions.get(policyId) || [];
  }

  /**
   * Get the latest version
   */
  async getLatestVersion(policyId: string): Promise<PolicyVersion | null> {
    const versions = this.versions.get(policyId) || [];
    return versions.length > 0 ? versions[versions.length - 1] : null;
  }

  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(policyId: string, targetVersion: string): Promise<void> {
    const versions = this.versions.get(policyId) || [];
    const targetVersionObj = versions.find(v => v.version === targetVersion);

    if (!targetVersionObj) {
      throw new Error(`Version ${targetVersion} not found for policy ${policyId}`);
    }

    if (!targetVersionObj.rollbackAvailable) {
      throw new Error(`Version ${targetVersion} is not available for rollback`);
    }

    // Create a new version that represents the rollback
    const rollbackVersion: PolicyVersion = {
      id: crypto.randomUUID(),
      policyId,
      version: this.incrementVersion(versions[versions.length - 1].version),
      changeLog: `Rollback to version ${targetVersion}`,
      changes: [{
        type: 'update',
        description: `Rolled back to version ${targetVersion}`,
        impact: 'high',
        requiresApproval: true
      }],
      createdBy: 'system',
      createdAt: new Date(),
      rollbackAvailable: true,
      previousVersion: versions[versions.length - 1].version,
      status: 'approved' // Rollbacks are typically pre-approved
    };

    versions.push(rollbackVersion);
    this.versions.set(policyId, versions);

    console.log(`Rolled back policy ${policyId} to version ${targetVersion}`);
  }

  /**
   * Increment version number based on changes
   */
  incrementVersion(currentVersion: string, changes?: PolicyChange[]): string {
    if (this.config.semanticVersioning && changes) {
      return this.incrementSemanticVersion(currentVersion, changes);
    }
    return this.incrementSimpleVersion(currentVersion);
  }

  /**
   * Increment semantic version (MAJOR.MINOR.PATCH)
   */
  private incrementSemanticVersion(currentVersion: string, changes?: PolicyChange[]): string {
    const [major, minor, patch] = currentVersion.split('.').map(Number);

    if (!changes || changes.length === 0) {
      return `${major}.${minor}.${patch + 1}`;
    }

    // Determine the type of increment based on changes
    const hasCriticalChanges = changes.some(c => c.impact === 'critical');
    const hasHighImpactChanges = changes.some(c => c.impact === 'high');
    const hasMediumImpactChanges = changes.some(c => c.impact === 'medium');

    if (hasCriticalChanges) {
      // Major version increment for breaking changes
      return `${major + 1}.0.0`;
    } else if (hasHighImpactChanges) {
      // Minor version increment for significant changes
      return `${major}.${minor + 1}.0`;
    } else if (hasMediumImpactChanges) {
      // Minor version increment for moderate changes
      return `${major}.${minor + 1}.0`;
    } else {
      // Patch version increment for small changes
      return `${major}.${minor}.${patch + 1}`;
    }
  }

  /**
   * Increment simple version (just incrementing the last number)
   */
  private incrementSimpleVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    const lastPart = parseInt(parts[parts.length - 1]) + 1;
    parts[parts.length - 1] = lastPart.toString();
    return parts.join('.');
  }

  /**
   * Compare two versions
   */
  compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }

    return 0;
  }

  /**
   * Check if a version is compatible with another
   */
  isCompatibleVersion(version1: string, version2: string): boolean {
    if (!this.config.semanticVersioning) {
      return true; // Simple versioning assumes compatibility
    }

    const [major1] = version1.split('.').map(Number);
    const [major2] = version2.split('.').map(Number);

    // Compatible if major versions match
    return major1 === major2;
  }

  /**
   * Get version statistics
   */
  getVersionStatistics(policyId: string): {
    totalVersions: number;
    latestVersion: string | null;
    averageVersionAge: number; // days
    rollbackCount: number;
  } {
    const versions = this.versions.get(policyId) || [];
    
    if (versions.length === 0) {
      return {
        totalVersions: 0,
        latestVersion: null,
        averageVersionAge: 0,
        rollbackCount: 0
      };
    }

    const now = new Date();
    const totalAge = versions.reduce((sum, version) => {
      const age = now.getTime() - version.createdAt.getTime();
      return sum + (age / (1000 * 60 * 60 * 24)); // Convert to days
    }, 0);

    const rollbackCount = versions.filter(v => 
      v.changeLog.toLowerCase().includes('rollback')
    ).length;

    return {
      totalVersions: versions.length,
      latestVersion: versions[versions.length - 1].version,
      averageVersionAge: totalAge / versions.length,
      rollbackCount
    };
  }

  /**
   * Get version history for a policy
   */
  getVersionHistory(policyId: string, limit?: number): PolicyVersion[] {
    const versions = this.versions.get(policyId) || [];
    
    if (limit) {
      return versions.slice(-limit).reverse(); // Get most recent versions
    }
    
    return [...versions].reverse(); // Return all versions, most recent first
  }

  /**
   * Mark a version as approved
   */
  async approveVersion(policyId: string, version: string): Promise<void> {
    const versions = this.versions.get(policyId) || [];
    const versionObj = versions.find(v => v.version === version);

    if (!versionObj) {
      throw new Error(`Version ${version} not found for policy ${policyId}`);
    }

    versionObj.status = 'approved';
    console.log(`Approved version ${version} for policy ${policyId}`);
  }

  /**
   * Mark a version as deployed
   */
  async markVersionDeployed(policyId: string, version: string): Promise<void> {
    const versions = this.versions.get(policyId) || [];
    const versionObj = versions.find(v => v.version === version);

    if (!versionObj) {
      throw new Error(`Version ${version} not found for policy ${policyId}`);
    }

    versionObj.status = 'deployed';
    versionObj.deployedAt = new Date();
    console.log(`Marked version ${version} as deployed for policy ${policyId}`);
  }

  /**
   * Deprecate old versions
   */
  async deprecateOldVersions(policyId: string, keepLatest: number = 3): Promise<void> {
    const versions = this.versions.get(policyId) || [];
    
    if (versions.length <= keepLatest) {
      return; // Nothing to deprecate
    }

    const versionsToDeprecate = versions.slice(0, versions.length - keepLatest);
    
    versionsToDeprecate.forEach(version => {
      version.status = 'deprecated';
      version.rollbackAvailable = false;
    });

    console.log(`Deprecated ${versionsToDeprecate.length} old versions for policy ${policyId}`);
  }

  /**
   * Export version history for audit purposes
   */
  exportVersionHistory(policyId: string): any {
    const versions = this.versions.get(policyId) || [];
    
    return {
      policyId,
      exportedAt: new Date().toISOString(),
      totalVersions: versions.length,
      versions: versions.map(version => ({
        version: version.version,
        changeLog: version.changeLog,
        createdBy: version.createdBy,
        createdAt: version.createdAt.toISOString(),
        deployedAt: version.deployedAt?.toISOString(),
        status: version.status,
        changes: version.changes,
        previousVersion: version.previousVersion
      }))
    };
  }

  /**
   * Import version history (for migration or backup restore)
   */
  async importVersionHistory(exportData: any): Promise<void> {
    const { policyId, versions } = exportData;
    
    const importedVersions: PolicyVersion[] = versions.map((versionData: any) => ({
      id: crypto.randomUUID(),
      policyId,
      version: versionData.version,
      changeLog: versionData.changeLog,
      changes: versionData.changes || [],
      createdBy: versionData.createdBy,
      createdAt: new Date(versionData.createdAt),
      deployedAt: versionData.deployedAt ? new Date(versionData.deployedAt) : undefined,
      rollbackAvailable: true,
      previousVersion: versionData.previousVersion,
      status: versionData.status || 'deployed'
    }));

    this.versions.set(policyId, importedVersions);
    console.log(`Imported ${importedVersions.length} versions for policy ${policyId}`);
  }
}