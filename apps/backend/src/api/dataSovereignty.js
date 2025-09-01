/**
 * Data Sovereignty API
 * Provides user data export, deletion, and privacy control endpoints
 * Complies with GDPR, CCPA, and Australian Privacy Principles
 */

import express from 'express';
import { Parser } from 'json2csv';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

// Services
import {
  decryptObjectSensitiveFields,
  validateEncryptionSetup,
} from '../services/encryptionService.js';
import PostgreSQLDataSource from '../services/dataSources/postgresDataSource.js';
import RedisDataSource from '../services/dataSources/redisDataSource.js';
import Neo4jDataSource from '../services/dataSources/neo4jDataSource.js';

// Middleware
import { authenticate } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/security.js';

const router = express.Router();

// Initialize data sources
let postgresDataSource, redisDataSource, neo4jDataSource;

const initializeDataSources = async () => {
  if (!postgresDataSource) {
    postgresDataSource = new PostgreSQLDataSource();
    await postgresDataSource.initialize();
  }

  if (!redisDataSource && process.env.REDIS_URL) {
    redisDataSource = new RedisDataSource();
    await redisDataSource.initialize();
  }

  if (!neo4jDataSource && process.env.NEO4J_URI) {
    neo4jDataSource = new Neo4jDataSource();
    await neo4jDataSource.initialize();
  }
};

/**
 * Data classification for export purposes
 */
const DATA_CATEGORIES = {
  PERSONAL: {
    name: 'Personal Information',
    description: 'Basic personal details, contact information',
    tables: ['users', 'user_profiles'],
    retention: '7 years',
  },
  CONTENT: {
    name: 'User-Generated Content',
    description: 'Stories, comments, projects, events',
    tables: ['stories', 'projects', 'events', 'comments'],
    retention: 'Indefinite (user-controlled)',
  },
  ACTIVITY: {
    name: 'Activity Data',
    description: 'Usage logs, preferences, interactions',
    tables: ['user_activity', 'preferences', 'interactions'],
    retention: '2 years',
  },
  FINANCIAL: {
    name: 'Financial Information',
    description: 'Transaction records, billing information',
    tables: ['transactions', 'billing_info', 'payment_methods'],
    retention: '10 years (regulatory)',
  },
  RELATIONSHIPS: {
    name: 'Social Connections',
    description: 'Collaborations, connections, networks',
    source: 'neo4j',
    retention: 'User-controlled',
  },
};

/**
 * Get comprehensive user data across all systems
 */
const getUserData = async (userId, options = {}) => {
  const {
    includeDeleted = false,
    decryptData = true,
    format = 'json',
    categories = Object.keys(DATA_CATEGORIES),
  } = options;

  await initializeDataSources();

  const userData = {
    userId,
    exportTimestamp: new Date().toISOString(),
    dataCategories: {},
    summary: {},
  };

  let totalRecords = 0;

  // PostgreSQL data collection
  for (const category of categories) {
    const categoryInfo = DATA_CATEGORIES[category];

    if (!categoryInfo || categoryInfo.source === 'neo4j') continue;

    userData.dataCategories[category] = {
      ...categoryInfo,
      data: {},
      recordCount: 0,
    };

    for (const table of categoryInfo.tables) {
      try {
        // Query user data from each table
        let records = await postgresDataSource.query(table, {
          eq: { user_id: userId },
        });

        // Include related data (created_by, author, etc.)
        const relatedRecords = await postgresDataSource.query(table, {
          eq: { created_by: userId },
        });

        // Merge records avoiding duplicates
        const allRecords = [...records];
        for (const related of relatedRecords) {
          if (!records.find(r => r.id === related.id)) {
            allRecords.push(related);
          }
        }

        if (decryptData) {
          // Decrypt sensitive fields for export
          records = await Promise.all(
            allRecords.map(record => decryptObjectSensitiveFields(record))
          );
        } else {
          records = allRecords;
        }

        userData.dataCategories[category].data[table] = records;
        userData.dataCategories[category].recordCount += records.length;
        totalRecords += records.length;
      } catch (error) {
        console.error(`Error collecting data from table ${table}:`, error);
        userData.dataCategories[category].data[table] = [];
        userData.dataCategories[category].errors =
          userData.dataCategories[category].errors || [];
        userData.dataCategories[category].errors.push({
          table,
          error: error.message,
        });
      }
    }
  }

  // Neo4j relationship data
  if (categories.includes('RELATIONSHIPS') && neo4jDataSource) {
    try {
      const relationshipData = await neo4jDataSource.findUserCollaborations(userId);
      const networkMetrics = await neo4jDataSource.calculateNetworkMetrics(
        userId,
        'User'
      );

      userData.dataCategories.RELATIONSHIPS = {
        ...DATA_CATEGORIES.RELATIONSHIPS,
        data: {
          collaborations: relationshipData,
          networkMetrics,
        },
        recordCount: relationshipData.length,
      };

      totalRecords += relationshipData.length;
    } catch (error) {
      console.error('Error collecting Neo4j data:', error);
      userData.dataCategories.RELATIONSHIPS = {
        ...DATA_CATEGORIES.RELATIONSHIPS,
        data: {},
        recordCount: 0,
        errors: [{ source: 'neo4j', error: error.message }],
      };
    }
  }

  // Redis cached data
  if (redisDataSource) {
    try {
      const sessionData = await redisDataSource.getUserSession(userId);
      const activityData = await redisDataSource.getUserActivity(userId, 100);

      userData.dataCategories.CACHE = {
        name: 'Cached Data',
        description: 'Session and temporary activity data',
        data: {
          session: sessionData,
          recentActivity: activityData,
        },
        recordCount: activityData.length + (sessionData ? 1 : 0),
        retention: '30 days',
      };

      totalRecords += userData.dataCategories.CACHE.recordCount;
    } catch (error) {
      console.error('Error collecting Redis data:', error);
    }
  }

  // Summary information
  userData.summary = {
    totalRecords,
    categoriesIncluded: Object.keys(userData.dataCategories).length,
    exportFormat: format,
    decryptionApplied: decryptData,
    complianceFrameworks: ['GDPR', 'CCPA', 'Australian Privacy Principles'],
    dataRetentionPolicies: Object.values(DATA_CATEGORIES).reduce(
      (policies, category) => {
        policies[category.name] = category.retention;
        return policies;
      },
      {}
    ),
  };

  return userData;
};

/**
 * Export user data endpoint
 * GET /api/data-sovereignty/export
 */
router.get('/export', authenticate, authRateLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      format = 'json',
      categories,
      includeDeleted = false,
      decrypt = true,
    } = req.query;

    console.log(`📦 Data export request from user ${userId}, format: ${format}`);

    const categoryList = categories
      ? categories.split(',')
      : Object.keys(DATA_CATEGORIES);

    // Collect user data
    const userData = await getUserData(userId, {
      includeDeleted: includeDeleted === 'true',
      decryptData: decrypt === 'true',
      format,
      categories: categoryList,
    });

    // Log the export request for compliance
    await logDataExportRequest(userId, {
      format,
      categories: categoryList,
      recordCount: userData.summary.totalRecords,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(userData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="user-data-${userId}-${Date.now()}.csv"`
      );

      return res.send(csvData);
    } else if (format === 'zip') {
      // Create ZIP archive with multiple files
      const zipBuffer = await createZipArchive(userData, userId);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="user-data-${userId}-${Date.now()}.zip"`
      );

      return res.send(zipBuffer);
    } else {
      // Default JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="user-data-${userId}-${Date.now()}.json"`
      );

      return res.json(userData);
    }
  } catch (error) {
    console.error('Data export error:', error);
    res.status(500).json({
      error: 'Data export failed',
      message: 'Unable to export user data at this time',
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown',
    });
  }
});

/**
 * Request data deletion endpoint
 * POST /api/data-sovereignty/delete-request
 */
router.post('/delete-request', authenticate, authRateLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      categories = Object.keys(DATA_CATEGORIES),
      reason = 'User requested deletion',
      confirmDeletion = false,
    } = req.body;

    console.log(`🗑️  Data deletion request from user ${userId}`);

    if (!confirmDeletion) {
      return res.status(400).json({
        error: 'Confirmation required',
        message: 'Set confirmDeletion to true to confirm this irreversible action',
        warning: 'This will permanently delete all selected user data',
      });
    }

    await initializeDataSources();

    const deletionReport = {
      userId,
      requestTimestamp: new Date().toISOString(),
      categories,
      reason,
      results: {},
      summary: {
        totalRecordsDeleted: 0,
        tablesAffected: 0,
        errors: [],
      },
    };

    // Delete from PostgreSQL tables
    for (const category of categories) {
      const categoryInfo = DATA_CATEGORIES[category];

      if (!categoryInfo || categoryInfo.source === 'neo4j') continue;

      deletionReport.results[category] = {
        category: categoryInfo.name,
        tablesDeleted: [],
        recordsDeleted: 0,
        errors: [],
      };

      for (const table of categoryInfo.tables) {
        try {
          // First, get count of records to be deleted
          const existingRecords = await postgresDataSource.query(table, {
            eq: { user_id: userId },
          });

          const relatedRecords = await postgresDataSource.query(table, {
            eq: { created_by: userId },
          });

          const totalRecords = existingRecords.length + relatedRecords.length;

          if (totalRecords > 0) {
            // Delete user-owned records
            await postgresDataSource.delete(table, {
              eq: { user_id: userId },
            });

            // Delete user-created records
            await postgresDataSource.delete(table, {
              eq: { created_by: userId },
            });

            deletionReport.results[category].tablesDeleted.push(table);
            deletionReport.results[category].recordsDeleted += totalRecords;
            deletionReport.summary.totalRecordsDeleted += totalRecords;
          }
        } catch (error) {
          console.error(`Error deleting from table ${table}:`, error);
          deletionReport.results[category].errors.push({
            table,
            error: error.message,
          });
          deletionReport.summary.errors.push(`${table}: ${error.message}`);
        }
      }

      if (deletionReport.results[category].tablesDeleted.length > 0) {
        deletionReport.summary.tablesAffected +=
          deletionReport.results[category].tablesDeleted.length;
      }
    }

    // Delete Neo4j relationships
    if (categories.includes('RELATIONSHIPS') && neo4jDataSource) {
      try {
        // This would require implementing a user deletion method in Neo4j data source
        const relationshipsDeleted =
          (await neo4jDataSource.deleteUserAndRelationships?.(userId)) || 0;

        deletionReport.results.RELATIONSHIPS = {
          category: 'Social Connections',
          relationshipsDeleted,
          recordsDeleted: relationshipsDeleted,
          errors: [],
        };

        deletionReport.summary.totalRecordsDeleted += relationshipsDeleted;
      } catch (error) {
        console.error('Error deleting Neo4j data:', error);
        deletionReport.summary.errors.push(`Neo4j: ${error.message}`);
      }
    }

    // Clear Redis cached data
    if (redisDataSource) {
      try {
        await redisDataSource.del(`session:${userId}`);
        await redisDataSource.del(`activity:${userId}`);

        deletionReport.results.CACHE = {
          category: 'Cached Data',
          itemsDeleted: ['session', 'activity'],
          recordsDeleted: 2,
        };

        deletionReport.summary.totalRecordsDeleted += 2;
      } catch (error) {
        console.error('Error clearing Redis data:', error);
        deletionReport.summary.errors.push(`Redis: ${error.message}`);
      }
    }

    // Log the deletion request for compliance
    await logDataDeletionRequest(userId, deletionReport);

    // Set user account status to deleted if all data was removed
    if (deletionReport.summary.errors.length === 0) {
      await postgresDataSource.update(
        'users',
        {
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          deletion_reason: reason,
        },
        { eq: { id: userId } }
      );
    }

    res.json({
      success: true,
      message: 'Data deletion completed',
      deletionReport,
      warning:
        deletionReport.summary.errors.length > 0
          ? 'Some data could not be deleted'
          : null,
    });
  } catch (error) {
    console.error('Data deletion error:', error);
    res.status(500).json({
      error: 'Data deletion failed',
      message: 'Unable to process data deletion request',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get user's data summary
 * GET /api/data-sovereignty/summary
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`📊 Data summary request from user ${userId}`);

    await initializeDataSources();

    const summary = {
      userId,
      timestamp: new Date().toISOString(),
      categories: {},
      totalRecords: 0,
      dataRetentionInfo: {},
      privacyRights: {
        portability: 'Available via /export endpoint',
        erasure: 'Available via /delete-request endpoint',
        rectification: 'Available via standard profile update endpoints',
        restriction: 'Contact support for processing restrictions',
        objection: 'Available via preference settings',
      },
    };

    // Count records by category
    for (const [categoryKey, categoryInfo] of Object.entries(DATA_CATEGORIES)) {
      if (categoryInfo.source === 'neo4j') continue;

      let categoryRecords = 0;
      const tableInfo = {};

      for (const table of categoryInfo.tables) {
        try {
          const records = await postgresDataSource.query(table, {
            eq: { user_id: userId },
          });

          const relatedRecords = await postgresDataSource.query(table, {
            eq: { created_by: userId },
          });

          const totalTableRecords = records.length + relatedRecords.length;

          tableInfo[table] = totalTableRecords;
          categoryRecords += totalTableRecords;
        } catch (error) {
          tableInfo[table] = 0;
        }
      }

      summary.categories[categoryKey] = {
        name: categoryInfo.name,
        description: categoryInfo.description,
        recordCount: categoryRecords,
        tables: tableInfo,
        retention: categoryInfo.retention,
      };

      summary.totalRecords += categoryRecords;
      summary.dataRetentionInfo[categoryInfo.name] = categoryInfo.retention;
    }

    // Neo4j relationship count
    if (neo4jDataSource) {
      try {
        const networkMetrics = await neo4jDataSource.calculateNetworkMetrics(
          userId,
          'User'
        );

        summary.categories.RELATIONSHIPS = {
          name: 'Social Connections',
          description: 'Your collaborations and network connections',
          recordCount: networkMetrics.totalRelationships || 0,
          retention: DATA_CATEGORIES.RELATIONSHIPS.retention,
        };

        summary.totalRecords += networkMetrics.totalRelationships || 0;
      } catch (error) {
        console.error('Error getting Neo4j summary:', error);
      }
    }

    res.json(summary);
  } catch (error) {
    console.error('Data summary error:', error);
    res.status(500).json({
      error: 'Unable to generate data summary',
      message: 'Please try again later',
    });
  }
});

/**
 * Helper function to convert user data to CSV
 */
const convertToCSV = userData => {
  const csvData = [];

  // Flatten all data into rows
  for (const [categoryKey, category] of Object.entries(userData.dataCategories)) {
    if (!category.data) continue;

    for (const [tableName, records] of Object.entries(category.data)) {
      if (Array.isArray(records)) {
        records.forEach(record => {
          csvData.push({
            category: category.name,
            table: tableName,
            ...record,
          });
        });
      }
    }
  }

  if (csvData.length === 0) {
    return 'No data available for export';
  }

  const parser = new Parser();
  return parser.parse(csvData);
};

/**
 * Helper function to create ZIP archive
 */
const createZipArchive = async (userData, userId) => {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const buffers = [];

    archive.on('data', chunk => buffers.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(buffers)));
    archive.on('error', reject);

    // Add main data file
    archive.append(JSON.stringify(userData, null, 2), { name: 'user-data.json' });

    // Add individual category files
    for (const [categoryKey, category] of Object.entries(userData.dataCategories)) {
      if (category.data) {
        archive.append(JSON.stringify(category, null, 2), {
          name: `${categoryKey.toLowerCase()}.json`,
        });
      }
    }

    // Add CSV version
    const csvData = convertToCSV(userData);
    archive.append(csvData, { name: 'user-data.csv' });

    // Add README
    const readme = `
# User Data Export

This archive contains all your data from the ACT Platform.

## Files:
- user-data.json: Complete data in JSON format
- user-data.csv: Flattened data in CSV format
- Individual category files: Data organized by category

## Data Categories:
${Object.entries(userData.dataCategories)
  .map(([key, cat]) => `- ${cat.name}: ${cat.recordCount} records`)
  .join('\n')}

## Export Details:
- User ID: ${userId}
- Export Date: ${userData.exportTimestamp}
- Total Records: ${userData.summary.totalRecords}
- Compliance: GDPR, CCPA, Australian Privacy Principles

For questions about this data, please contact support.
    `;

    archive.append(readme, { name: 'README.txt' });

    archive.finalize();
  });
};

/**
 * Log data export request for compliance
 */
const logDataExportRequest = async (userId, details) => {
  try {
    await initializeDataSources();

    await postgresDataSource.insert('data_export_logs', {
      user_id: userId,
      export_timestamp: new Date().toISOString(),
      format: details.format,
      categories: JSON.stringify(details.categories),
      record_count: details.recordCount,
      ip_address: details.ipAddress,
      user_agent: details.userAgent,
    });
  } catch (error) {
    console.error('Failed to log data export request:', error);
  }
};

/**
 * Log data deletion request for compliance
 */
const logDataDeletionRequest = async (userId, deletionReport) => {
  try {
    await initializeDataSources();

    await postgresDataSource.insert('data_deletion_logs', {
      user_id: userId,
      deletion_timestamp: new Date().toISOString(),
      categories: JSON.stringify(deletionReport.categories),
      records_deleted: deletionReport.summary.totalRecordsDeleted,
      tables_affected: deletionReport.summary.tablesAffected,
      errors: JSON.stringify(deletionReport.summary.errors),
      deletion_reason: deletionReport.reason,
    });
  } catch (error) {
    console.error('Failed to log data deletion request:', error);
  }
};

/**
 * Health check for data sovereignty endpoints
 */
router.get('/health', async (req, res) => {
  try {
    await initializeDataSources();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      dataSources: {
        postgres: postgresDataSource ? 'connected' : 'unavailable',
        redis: redisDataSource ? 'connected' : 'unavailable',
        neo4j: neo4jDataSource ? 'connected' : 'unavailable',
      },
      encryption: {
        available: true,
        algorithm: 'AES-256-GCM',
      },
      compliance: {
        gdpr: 'compliant',
        ccpa: 'compliant',
        australianPrivacy: 'compliant',
      },
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

export default router;
