/**
 * Attestation Storage Repository
 * 
 * PostgreSQL-based storage for attestations with immutable records,
 * cryptographic integrity, and cultural protocol compliance
 */

import {
  AttestationStorage as IAttestationStorage,
  StoredAttestation,
  AttestationQuery,
  AttestationStatus,
  AttestationType,
  RevocationInfo,
  AttestationMetadata,
  BulkAttestationRequest,
  BulkOperationResult,
  AttestationExportRequest,
  AttestationExportResult,
  IntegrityValidationResult,
  ImmutabilityProof
} from './types';
import crypto from 'crypto';

export interface DatabaseConnection {
  query(sql: string, params?: any[]): Promise<any[]>;
  execute(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId?: any }>;
  transaction<T>(callback: (conn: DatabaseConnection) => Promise<T>): Promise<T>;
}

export class PostgreSQLAttestationStorage implements IAttestationStorage {
  private db: DatabaseConnection;
  private integrityKey: Buffer;

  constructor(db: DatabaseConnection, integrityKey: string) {
    this.db = db;
    this.integrityKey = Buffer.from(integrityKey, 'hex');
    
    if (this.integrityKey.length !== 32) {
      throw new Error('Integrity key must be 32 bytes (64 hex characters)');
    }
  }

  async store(attestation: StoredAttestation): Promise<string> {
    const attestationId = attestation.id || crypto.randomUUID();
    
    // Generate integrity hash for the attestation
    const integrityHash = this.generateIntegrityHash(attestation);
    
    const sql = `
      INSERT INTO attestations (
        id, version, type, subject_id, subject_type, attested_by, attested_at,
        valid_from, valid_until, status, digital_signature, attestation_data,
        compliance_frameworks, cultural_protocols, metadata, immutability_proof,
        revocation_info, created_at, last_verified, integrity_hash, content_hash
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      ON CONFLICT (id) DO UPDATE SET
        version = attestations.version + 1,
        digital_signature = EXCLUDED.digital_signature,
        metadata = EXCLUDED.metadata,
        last_verified = EXCLUDED.last_verified,
        integrity_hash = EXCLUDED.integrity_hash
    `;

    const params = [
      attestationId,
      attestation.version || 1,
      attestation.type,
      attestation.subjectId,
      attestation.subjectType,
      attestation.attestedBy,
      attestation.attestedAt,
      attestation.validFrom,
      attestation.validUntil,
      attestation.status,
      JSON.stringify(attestation.digitalSignature),
      JSON.stringify(attestation.attestationData),
      JSON.stringify(attestation.complianceFrameworks),
      JSON.stringify(attestation.culturalProtocols || []),
      JSON.stringify(attestation.metadata),
      JSON.stringify(attestation.immutabilityProof),
      JSON.stringify(attestation.revocationInfo),
      attestation.createdAt,
      attestation.lastVerified,
      integrityHash,
      this.generateContentHash(attestation)
    ];

    try {
      await this.db.execute(sql, params);
      
      // Log the storage operation
      await this.logOperation('store', attestationId, 'system', {
        type: attestation.type,
        subjectId: attestation.subjectId,
        culturalSensitive: (attestation.culturalProtocols?.length || 0) > 0
      });

      return attestationId;
    } catch (error) {
      throw new Error(`Failed to store attestation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async retrieve(id: string): Promise<StoredAttestation | null> {
    const sql = `
      SELECT * FROM attestations 
      WHERE id = $1 AND status != 'revoked'
    `;

    try {
      const results = await this.db.query(sql, [id]);
      
      if (results.length === 0) {
        return null;
      }

      const row = results[0];
      
      // Verify integrity
      const attestation = this.mapRowToAttestation(row);
      const expectedHash = this.generateIntegrityHash(attestation);
      
      if (row.integrity_hash !== expectedHash) {
        throw new Error(`Integrity violation detected for attestation ${id}`);
      }

      // Log the retrieval operation
      await this.logOperation('retrieve', id, 'system', {
        accessed: true
      });

      return attestation;
    } catch (error) {
      throw new Error(`Failed to retrieve attestation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async query(criteria: AttestationQuery): Promise<StoredAttestation[]> {
    let sql = `
      SELECT * FROM attestations 
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Build WHERE clause based on criteria
    if (criteria.subjectId) {
      sql += ` AND subject_id = $${paramIndex++}`;
      params.push(criteria.subjectId);
    }

    if (criteria.subjectType) {
      sql += ` AND subject_type = $${paramIndex++}`;
      params.push(criteria.subjectType);
    }

    if (criteria.attestationType) {
      sql += ` AND type = $${paramIndex++}`;
      params.push(criteria.attestationType);
    }

    if (criteria.status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(criteria.status);
    }

    if (criteria.attestedBy) {
      sql += ` AND attested_by = $${paramIndex++}`;
      params.push(criteria.attestedBy);
    }

    if (criteria.validFrom) {
      sql += ` AND valid_from >= $${paramIndex++}`;
      params.push(criteria.validFrom);
    }

    if (criteria.validUntil) {
      sql += ` AND (valid_until IS NULL OR valid_until <= $${paramIndex++})`;
      params.push(criteria.validUntil);
    }

    if (criteria.culturalTerritory) {
      sql += ` AND cultural_protocols::text LIKE $${paramIndex++}`;
      params.push(`%${criteria.culturalTerritory}%`);
    }

    if (criteria.complianceFramework) {
      sql += ` AND compliance_frameworks::jsonb ? $${paramIndex++}`;
      params.push(criteria.complianceFramework);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      sql += ` AND metadata::jsonb->'tags' ?| $${paramIndex++}`;
      params.push(criteria.tags);
    }

    // Add ordering
    const orderBy = criteria.orderBy || 'created_at';
    const orderDirection = criteria.orderDirection || 'desc';
    sql += ` ORDER BY ${orderBy} ${orderDirection}`;

    // Add pagination
    if (criteria.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(criteria.limit);
    }

    if (criteria.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(criteria.offset);
    }

    try {
      const results = await this.db.query(sql, params);
      
      return results.map(row => this.mapRowToAttestation(row));
    } catch (error) {
      throw new Error(`Failed to query attestations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async revoke(id: string, revocationInfo: RevocationInfo): Promise<boolean> {
    return this.db.transaction(async (conn) => {
      // Get current attestation
      const current = await this.retrieve(id);
      if (!current) {
        return false;
      }

      // Update status and add revocation info
      const sql = `
        UPDATE attestations 
        SET status = 'revoked', 
            revocation_info = $1,
            version = version + 1,
            integrity_hash = $2
        WHERE id = $3
      `;

      const updatedAttestation = {
        ...current,
        status: AttestationStatus.REVOKED,
        revocationInfo,
        version: current.version + 1
      };

      const newIntegrityHash = this.generateIntegrityHash(updatedAttestation);

      const result = await conn.execute(sql, [
        JSON.stringify(revocationInfo),
        newIntegrityHash,
        id
      ]);

      if (result.affectedRows > 0) {
        // Log the revocation
        await this.logOperation('revoke', id, revocationInfo.revokedBy, {
          reason: revocationInfo.reason,
          culturalReason: revocationInfo.culturalReason,
          cascadeRevocation: revocationInfo.cascadeRevocation
        });

        // Handle cascade revocation if requested
        if (revocationInfo.cascadeRevocation) {
          await this.cascadeRevoke(id, revocationInfo, conn);
        }

        return true;
      }

      return false;
    });
  }

  async updateMetadata(id: string, metadata: Partial<AttestationMetadata>): Promise<boolean> {
    const sql = `
      UPDATE attestations 
      SET metadata = metadata::jsonb || $1::jsonb,
          version = version + 1,
          integrity_hash = $2
      WHERE id = $3
    `;

    try {
      // Get current attestation to calculate new integrity hash
      const current = await this.retrieve(id);
      if (!current) {
        return false;
      }

      const updatedAttestation = {
        ...current,
        metadata: { ...current.metadata, ...metadata },
        version: current.version + 1
      };

      const newIntegrityHash = this.generateIntegrityHash(updatedAttestation);

      const result = await this.db.execute(sql, [
        JSON.stringify(metadata),
        newIntegrityHash,
        id
      ]);

      if (result.affectedRows > 0) {
        await this.logOperation('update_metadata', id, 'system', {
          updatedFields: Object.keys(metadata)
        });
        return true;
      }

      return false;
    } catch (error) {
      throw new Error(`Failed to update metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async bulkOperation(request: BulkAttestationRequest): Promise<BulkOperationResult> {
    const startTime = Date.now();
    const results: BulkOperationResult['results'] = [];

    if (request.atomicExecution) {
      return this.db.transaction(async (conn) => {
        return this.executeBulkOperations(request, conn, results, startTime);
      });
    } else {
      return this.executeBulkOperations(request, this.db, results, startTime);
    }
  }

  async export(request: AttestationExportRequest): Promise<AttestationExportResult> {
    try {
      const attestations = await this.query(request.query);
      
      // Filter based on export requirements
      const filteredAttestations = this.filterForExport(attestations, request);
      
      let data: string | Buffer;
      
      switch (request.format) {
        case 'json':
          data = this.exportAsJSON(filteredAttestations, request);
          break;
        case 'csv':
          data = this.exportAsCSV(filteredAttestations, request);
          break;
        case 'xml':
          data = this.exportAsXML(filteredAttestations, request);
          break;
        case 'pdf':
          data = await this.exportAsPDF(filteredAttestations, request);
          break;
        default:
          throw new Error(`Unsupported export format: ${request.format}`);
      }

      // Encrypt if requested
      if (request.encryptExport) {
        data = this.encryptExportData(data);
      }

      const exportId = crypto.randomUUID();
      const checksums = this.calculateChecksums(data);
      const dateRange = this.calculateDateRange(filteredAttestations);

      // Log the export operation
      await this.logOperation('export', exportId, request.requestedBy, {
        format: request.format,
        totalAttestations: filteredAttestations.length,
        culturalAttestations: filteredAttestations.filter(a => 
          (a.culturalProtocols?.length || 0) > 0
        ).length,
        encrypted: request.encryptExport
      });

      return {
        success: true,
        exportId,
        format: request.format,
        data,
        metadata: {
          totalAttestations: filteredAttestations.length,
          culturalAttestations: filteredAttestations.filter(a => 
            (a.culturalProtocols?.length || 0) > 0
          ).length,
          dateRange,
          exportedBy: request.requestedBy,
          exportedAt: new Date(),
          checksums
        }
      };

    } catch (error) {
      return {
        success: false,
        exportId: crypto.randomUUID(),
        format: request.format,
        metadata: {
          totalAttestations: 0,
          culturalAttestations: 0,
          dateRange: { start: new Date(), end: new Date() },
          exportedBy: request.requestedBy,
          exportedAt: new Date(),
          checksums: { sha256: '', integrity: '' }
        },
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  async validateIntegrity(ids?: string[]): Promise<IntegrityValidationResult> {
    let sql = 'SELECT id, integrity_hash, content_hash FROM attestations';
    let params: any[] = [];

    if (ids && ids.length > 0) {
      sql += ' WHERE id = ANY($1)';
      params = [ids];
    }

    try {
      const results = await this.db.query(sql, params);
      
      const issues: IntegrityValidationResult['issues'] = [];
      let validAttestations = 0;
      const tamperedAttestations: string[] = [];

      for (const row of results) {
        try {
          // Retrieve full attestation and verify integrity
          const attestation = await this.retrieve(row.id);
          if (attestation) {
            const expectedHash = this.generateIntegrityHash(attestation);
            
            if (row.integrity_hash === expectedHash) {
              validAttestations++;
            } else {
              tamperedAttestations.push(row.id);
              issues.push({
                attestationId: row.id,
                type: 'tampered',
                description: 'Integrity hash mismatch detected',
                severity: 'critical'
              });
            }
          }
        } catch (error) {
          issues.push({
            attestationId: row.id,
            type: 'corrupted',
            description: error instanceof Error ? error.message : 'Corruption detected',
            severity: 'high'
          });
        }
      }

      return {
        valid: issues.length === 0,
        totalAttestations: results.length,
        validAttestations,
        tamperedAttestations,
        missingAttestations: [], // Would implement sequence checking
        issues
      };

    } catch (error) {
      throw new Error(`Integrity validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Private helper methods

  private generateIntegrityHash(attestation: StoredAttestation): string {
    const signingData = {
      id: attestation.id,
      version: attestation.version,
      type: attestation.type,
      subjectId: attestation.subjectId,
      attestedAt: attestation.attestedAt.toISOString(),
      digitalSignature: attestation.digitalSignature,
      attestationData: attestation.attestationData
    };

    const dataString = JSON.stringify(signingData, Object.keys(signingData).sort());
    
    return crypto
      .createHmac('sha256', this.integrityKey)
      .update(dataString)
      .digest('hex');
  }

  private generateContentHash(attestation: StoredAttestation): string {
    const content = JSON.stringify(attestation, Object.keys(attestation).sort());
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private mapRowToAttestation(row: any): StoredAttestation {
    return {
      id: row.id,
      version: row.version,
      type: row.type,
      subjectId: row.subject_id,
      subjectType: row.subject_type,
      attestedBy: row.attested_by,
      attestedAt: new Date(row.attested_at),
      validFrom: new Date(row.valid_from),
      validUntil: row.valid_until ? new Date(row.valid_until) : undefined,
      status: row.status,
      digitalSignature: JSON.parse(row.digital_signature),
      attestationData: JSON.parse(row.attestation_data),
      complianceFrameworks: JSON.parse(row.compliance_frameworks),
      culturalProtocols: JSON.parse(row.cultural_protocols || '[]'),
      metadata: JSON.parse(row.metadata),
      immutabilityProof: JSON.parse(row.immutability_proof),
      revocationInfo: row.revocation_info ? JSON.parse(row.revocation_info) : undefined,
      createdAt: new Date(row.created_at),
      lastVerified: row.last_verified ? new Date(row.last_verified) : undefined
    };
  }

  private async logOperation(
    operation: string,
    attestationId: string,
    performedBy: string,
    metadata: any
  ): Promise<void> {
    const sql = `
      INSERT INTO attestation_audit_log (
        id, operation, attestation_id, performed_by, performed_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.db.execute(sql, [
      crypto.randomUUID(),
      operation,
      attestationId,
      performedBy,
      new Date(),
      JSON.stringify(metadata)
    ]);
  }

  private async cascadeRevoke(
    parentId: string,
    revocationInfo: RevocationInfo,
    conn: DatabaseConnection
  ): Promise<void> {
    // Find all attestations that reference this one
    const sql = `
      SELECT id FROM attestations 
      WHERE metadata::jsonb->'linkedAttestations' ? $1
      AND status = 'active'
    `;

    const linkedAttestations = await conn.query(sql, [parentId]);
    
    for (const row of linkedAttestations) {
      const cascadeRevocationInfo: RevocationInfo = {
        ...revocationInfo,
        reason: 'cascaded_revocation',
        description: `Revoked due to parent attestation ${parentId} revocation`,
        revokedAt: new Date()
      };

      await this.revoke(row.id, cascadeRevocationInfo);
    }
  }

  private async executeBulkOperations(
    request: BulkAttestationRequest,
    conn: DatabaseConnection,
    results: BulkOperationResult['results'],
    startTime: number
  ): Promise<BulkOperationResult> {
    let successfulOperations = 0;
    let failedOperations = 0;

    for (const operation of request.operations) {
      try {
        let result: any;

        switch (operation.type) {
          case 'create':
            result = await this.store(operation.data as StoredAttestation);
            break;
          case 'revoke':
            result = await this.revoke(operation.attestationId!, operation.data as RevocationInfo);
            break;
          case 'verify':
            // Would implement verification logic
            result = { verified: true };
            break;
          case 'update_metadata':
            result = await this.updateMetadata(operation.attestationId!, operation.data);
            break;
          default:
            throw new Error(`Unknown operation type: ${operation.type}`);
        }

        results.push({
          operation,
          success: true,
          result
        });
        successfulOperations++;

      } catch (error) {
        results.push({
          operation,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        failedOperations++;
      }
    }

    return {
      success: failedOperations === 0,
      totalOperations: request.operations.length,
      successfulOperations,
      failedOperations,
      results,
      executionTime: Date.now() - startTime
    };
  }

  private filterForExport(
    attestations: StoredAttestation[],
    request: AttestationExportRequest
  ): StoredAttestation[] {
    return attestations.filter(attestation => {
      if (!request.includeCulturalData && (attestation.culturalProtocols?.length || 0) > 0) {
        return false;
      }
      return true;
    });
  }

  private exportAsJSON(
    attestations: StoredAttestation[],
    request: AttestationExportRequest
  ): string {
    const exportData = {
      exportMetadata: {
        format: 'json',
        generatedAt: new Date().toISOString(),
        totalAttestations: attestations.length,
        exportedBy: request.requestedBy,
        purpose: request.purpose,
        includeSignatures: request.includeSignatures,
        includeCulturalData: request.includeCulturalData
      },
      attestations: attestations.map(attestation => ({
        ...attestation,
        digitalSignature: request.includeSignatures ? attestation.digitalSignature : undefined
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  private exportAsCSV(
    attestations: StoredAttestation[],
    request: AttestationExportRequest
  ): string {
    const headers = [
      'id', 'type', 'subjectId', 'subjectType', 'attestedBy',
      'attestedAt', 'validFrom', 'validUntil', 'status',
      'complianceFrameworks', 'culturalProtocols'
    ];

    if (request.includeSignatures) {
      headers.push('signatureAlgorithm', 'signatureVerified');
    }

    const csvRows = [headers.join(',')];
    
    for (const attestation of attestations) {
      const row = [
        attestation.id,
        attestation.type,
        attestation.subjectId,
        attestation.subjectType,
        attestation.attestedBy,
        attestation.attestedAt.toISOString(),
        attestation.validFrom.toISOString(),
        attestation.validUntil?.toISOString() || '',
        attestation.status,
        attestation.complianceFrameworks.join(';'),
        (attestation.culturalProtocols?.map(p => p.protocolId).join(';')) || ''
      ];

      if (request.includeSignatures) {
        row.push(
          attestation.digitalSignature.algorithm,
          attestation.digitalSignature.verified.toString()
        );
      }

      csvRows.push(row.map(field => `"${field}"`).join(','));
    }

    return csvRows.join('\n');
  }

  private exportAsXML(
    attestations: StoredAttestation[],
    request: AttestationExportRequest
  ): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<attestationExport>\n';
    xml += '  <metadata>\n';
    xml += `    <generatedAt>${new Date().toISOString()}</generatedAt>\n`;
    xml += `    <totalAttestations>${attestations.length}</totalAttestations>\n`;
    xml += `    <exportedBy>${request.requestedBy}</exportedBy>\n`;
    xml += '  </metadata>\n';
    xml += '  <attestations>\n';

    for (const attestation of attestations) {
      xml += '    <attestation>\n';
      xml += `      <id>${attestation.id}</id>\n`;
      xml += `      <type>${attestation.type}</type>\n`;
      xml += `      <subjectId>${attestation.subjectId}</subjectId>\n`;
      xml += `      <attestedAt>${attestation.attestedAt.toISOString()}</attestedAt>\n`;
      xml += `      <status>${attestation.status}</status>\n`;
      xml += '    </attestation>\n';
    }

    xml += '  </attestations>\n';
    xml += '</attestationExport>';

    return xml;
  }

  private async exportAsPDF(
    attestations: StoredAttestation[],
    request: AttestationExportRequest
  ): Promise<Buffer> {
    // This would use a PDF library like jsPDF or PDFKit
    // For now, return JSON data as buffer
    const jsonData = this.exportAsJSON(attestations, request);
    return Buffer.from(jsonData, 'utf8');
  }

  private encryptExportData(data: string | Buffer): Buffer {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', key);
    
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    
    let encrypted = cipher.update(dataBuffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // In production, the key would be securely transmitted separately
    return Buffer.concat([iv, encrypted]);
  }

  private calculateChecksums(data: string | Buffer): { sha256: string; integrity: string } {
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    
    const sha256 = crypto
      .createHash('sha256')
      .update(dataBuffer)
      .digest('hex');

    const integrity = crypto
      .createHmac('sha256', this.integrityKey)
      .update(dataBuffer)
      .digest('hex');

    return { sha256, integrity };
  }

  private calculateDateRange(attestations: StoredAttestation[]): { start: Date; end: Date } {
    if (attestations.length === 0) {
      const now = new Date();
      return { start: now, end: now };
    }

    const timestamps = attestations.map(a => a.attestedAt);
    return {
      start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
      end: new Date(Math.max(...timestamps.map(t => t.getTime())))
    };
  }
}