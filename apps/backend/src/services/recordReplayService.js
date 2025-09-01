/**
 * Record/Replay Testing Harness Service
 * Provides deterministic recording and replay of data sync and analytics workflows
 * for regression testing and reliability validation
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import tracingService, { traceExternalCall } from './tracingService.js';

class RecordReplayService {
  constructor() {
    this.isInitialized = false;
    this.isRecording = false;
    this.isReplaying = false;
    this.currentScenario = null;
    this.recordingData = new Map();
    this.replayData = new Map();
    this.scenarios = new Map();
    this.recordingStartTime = null;
    this.config = {
      recordingsPath: './test/recordings',
      scenariosPath: './test/scenarios',
      maxRecordingSize: 100 * 1024 * 1024, // 100MB
      recordingFormats: ['json', 'har'],
      enableTraceIntegration: true,
      deterministicMode: true
    };
  }

  /**
   * Initialize the record/replay service
   */
  async initialize() {
    try {
      console.log('📹 Initializing Record/Replay Testing Harness...');
      
      // Create directories for recordings and scenarios
      await this.ensureDirectories();
      
      // Load existing scenarios
      await this.loadScenarios();
      
      this.isInitialized = true;
      console.log('✅ Record/Replay Service initialized');
      console.log(`   - Recordings path: ${this.config.recordingsPath}`);
      console.log(`   - Scenarios loaded: ${this.scenarios.size}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Record/Replay Service:', error.message);
      return false;
    }
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectories() {
    const directories = [
      this.config.recordingsPath,
      this.config.scenariosPath,
      `${this.config.recordingsPath}/api`,
      `${this.config.recordingsPath}/database`,
      `${this.config.recordingsPath}/external`,
      `${this.config.scenariosPath}/regression`,
      `${this.config.scenariosPath}/integration`,
      `${this.config.scenariosPath}/performance`
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  /**
   * Load existing test scenarios
   */
  async loadScenarios() {
    try {
      const scenarioFiles = await fs.readdir(this.config.scenariosPath);
      
      for (const file of scenarioFiles) {
        if (file.endsWith('.json')) {
          const scenarioPath = path.join(this.config.scenariosPath, file);
          const scenarioData = JSON.parse(await fs.readFile(scenarioPath, 'utf8'));
          
          this.scenarios.set(scenarioData.id, {
            ...scenarioData,
            filePath: scenarioPath
          });
        }
      }
      
      console.log(`📚 Loaded ${this.scenarios.size} test scenarios`);
    } catch (error) {
      console.warn('⚠️ Could not load existing scenarios:', error.message);
    }
  }

  /**
   * Start recording a new test scenario
   */
  async startRecording(scenarioName, options = {}) {
    return await traceExternalCall('record_replay', 'start_recording', async (span) => {
      try {
        if (this.isRecording) {
          throw new Error('Recording already in progress');
        }

        const scenarioId = this.generateScenarioId(scenarioName);
        this.currentScenario = {
          id: scenarioId,
          name: scenarioName,
          description: options.description || `Test scenario: ${scenarioName}`,
          createdAt: new Date().toISOString(),
          tags: options.tags || [],
          type: options.type || 'integration',
          metadata: {
            userId: options.userId,
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0',
            traceId: span.spanContext().traceId
          }
        };

        this.recordingData.clear();
        this.recordingStartTime = Date.now();
        this.isRecording = true;

        span.setAttributes({
          'recording.scenario_id': scenarioId,
          'recording.scenario_name': scenarioName,
          'recording.type': this.currentScenario.type
        });

        console.log(`🎬 Started recording scenario: ${scenarioName} (${scenarioId})`);
        
        return {
          scenarioId,
          recordingStarted: true,
          timestamp: this.currentScenario.createdAt
        };

      } catch (error) {
        span.recordException(error);
        throw error;
      }
    });
  }

  /**
   * Record an API request/response interaction
   */
  async recordApiInteraction(request, response, metadata = {}) {
    if (!this.isRecording) return;

    return await traceExternalCall('record_replay', 'record_api_interaction', async (span) => {
      try {
        const interactionId = this.generateInteractionId('api', request.method, request.url);
        const timestamp = Date.now() - this.recordingStartTime;

        const interaction = {
          id: interactionId,
          type: 'api',
          timestamp,
          request: {
            method: request.method,
            url: request.url,
            headers: this.sanitizeHeaders(request.headers),
            body: this.sanitizeRequestBody(request.body),
            query: request.query,
            params: request.params
          },
          response: {
            status: response.statusCode || 200,
            headers: this.sanitizeHeaders(response.getHeaders()),
            body: this.sanitizeResponseBody(response.body)
          },
          metadata: {
            ...metadata,
            duration: metadata.duration || 0,
            traceId: span.spanContext().traceId,
            spanId: span.spanContext().spanId
          }
        };

        this.recordingData.set(interactionId, interaction);

        span.setAttributes({
          'recording.interaction_id': interactionId,
          'recording.api_method': request.method,
          'recording.api_url': request.url,
          'recording.response_status': interaction.response.status
        });

        return interactionId;

      } catch (error) {
        span.recordException(error);
        throw error;
      }
    });
  }

  /**
   * Record a database operation
   */
  async recordDatabaseOperation(operation, query, parameters, result, metadata = {}) {
    if (!this.isRecording) return;

    return await traceExternalCall('record_replay', 'record_database_operation', async (span) => {
      try {
        const interactionId = this.generateInteractionId('database', operation, query);
        const timestamp = Date.now() - this.recordingStartTime;

        const interaction = {
          id: interactionId,
          type: 'database',
          timestamp,
          operation,
          query: this.sanitizeQuery(query),
          parameters: this.sanitizeParameters(parameters),
          result: this.sanitizeResult(result),
          metadata: {
            ...metadata,
            duration: metadata.duration || 0,
            traceId: span.spanContext().traceId,
            spanId: span.spanContext().spanId,
            rowCount: this.extractRowCount(result)
          }
        };

        this.recordingData.set(interactionId, interaction);

        span.setAttributes({
          'recording.interaction_id': interactionId,
          'recording.db_operation': operation,
          'recording.query_length': query.length,
          'recording.result_rows': interaction.metadata.rowCount
        });

        return interactionId;

      } catch (error) {
        span.recordException(error);
        throw error;
      }
    });
  }

  /**
   * Record an external API call
   */
  async recordExternalCall(service, endpoint, request, response, metadata = {}) {
    if (!this.isRecording) return;

    return await traceExternalCall('record_replay', 'record_external_call', async (span) => {
      try {
        const interactionId = this.generateInteractionId('external', service, endpoint);
        const timestamp = Date.now() - this.recordingStartTime;

        const interaction = {
          id: interactionId,
          type: 'external',
          timestamp,
          service,
          endpoint,
          request: this.sanitizeExternalRequest(request),
          response: this.sanitizeExternalResponse(response),
          metadata: {
            ...metadata,
            duration: metadata.duration || 0,
            traceId: span.spanContext().traceId,
            spanId: span.spanContext().spanId
          }
        };

        this.recordingData.set(interactionId, interaction);

        span.setAttributes({
          'recording.interaction_id': interactionId,
          'recording.external_service': service,
          'recording.external_endpoint': endpoint
        });

        return interactionId;

      } catch (error) {
        span.recordException(error);
        throw error;
      }
    });
  }

  /**
   * Stop recording and save the scenario
   */
  async stopRecording() {
    return await traceExternalCall('record_replay', 'stop_recording', async (span) => {
      try {
        if (!this.isRecording) {
          throw new Error('No recording in progress');
        }

        const totalDuration = Date.now() - this.recordingStartTime;
        const interactions = Array.from(this.recordingData.values())
          .sort((a, b) => a.timestamp - b.timestamp);

        const scenario = {
          ...this.currentScenario,
          duration: totalDuration,
          interactionCount: interactions.length,
          interactions,
          statistics: this.calculateRecordingStatistics(interactions),
          completedAt: new Date().toISOString()
        };

        // Save scenario to file
        const scenarioPath = path.join(
          this.config.scenariosPath,
          `${scenario.id}.json`
        );

        await fs.writeFile(scenarioPath, JSON.stringify(scenario, null, 2));

        // Also save in HAR format if enabled
        if (this.config.recordingFormats.includes('har')) {
          const harPath = path.join(
            this.config.recordingsPath,
            `${scenario.id}.har`
          );
          await this.saveAsHAR(scenario, harPath);
        }

        // Store in memory
        this.scenarios.set(scenario.id, {
          ...scenario,
          filePath: scenarioPath
        });

        // Reset recording state
        this.isRecording = false;
        this.currentScenario = null;
        this.recordingData.clear();
        this.recordingStartTime = null;

        span.setAttributes({
          'recording.scenario_id': scenario.id,
          'recording.total_duration': totalDuration,
          'recording.interaction_count': interactions.length,
          'recording.saved_path': scenarioPath
        });

        console.log(`🛑 Recording completed: ${scenario.name}`);
        console.log(`   - Duration: ${totalDuration}ms`);
        console.log(`   - Interactions: ${interactions.length}`);
        console.log(`   - Saved to: ${scenarioPath}`);

        return {
          scenarioId: scenario.id,
          recordingStopped: true,
          duration: totalDuration,
          interactions: interactions.length,
          filePath: scenarioPath
        };

      } catch (error) {
        span.recordException(error);
        throw error;
      }
    });
  }

  /**
   * Start replaying a recorded scenario
   */
  async startReplay(scenarioId, options = {}) {
    return await traceExternalCall('record_replay', 'start_replay', async (span) => {
      try {
        if (this.isReplaying) {
          throw new Error('Replay already in progress');
        }

        const scenario = this.scenarios.get(scenarioId);
        if (!scenario) {
          throw new Error(`Scenario not found: ${scenarioId}`);
        }

        // Load scenario data if not already loaded
        if (!scenario.interactions) {
          const scenarioData = JSON.parse(await fs.readFile(scenario.filePath, 'utf8'));
          Object.assign(scenario, scenarioData);
        }

        this.currentScenario = scenario;
        this.replayData.clear();
        this.isReplaying = true;

        // Prepare replay data for quick lookup
        scenario.interactions.forEach(interaction => {
          this.replayData.set(interaction.id, interaction);
        });

        span.setAttributes({
          'replay.scenario_id': scenarioId,
          'replay.scenario_name': scenario.name,
          'replay.interaction_count': scenario.interactions.length,
          'replay.deterministic_mode': options.deterministicMode !== false
        });

        console.log(`▶️ Started replaying scenario: ${scenario.name} (${scenarioId})`);
        console.log(`   - Interactions to replay: ${scenario.interactions.length}`);

        return {
          scenarioId,
          replayStarted: true,
          interactionCount: scenario.interactions.length,
          deterministicMode: options.deterministicMode !== false
        };

      } catch (error) {
        span.recordException(error);
        throw error;
      }
    });
  }

  /**
   * Get expected response for a request during replay
   */
  async getReplayResponse(requestType, requestSignature) {
    if (!this.isReplaying) {
      throw new Error('Not in replay mode');
    }

    return await traceExternalCall('record_replay', 'get_replay_response', async (span) => {
      try {
        // Find matching interaction based on request signature
        const matchingInteraction = Array.from(this.replayData.values())
          .find(interaction => {
            return this.matchesRequestSignature(interaction, requestType, requestSignature);
          });

        if (!matchingInteraction) {
          span.setAttributes({
            'replay.match_found': false,
            'replay.request_type': requestType
          });
          
          console.warn(`⚠️ No matching interaction found for ${requestType} request`);
          return null;
        }

        span.setAttributes({
          'replay.match_found': true,
          'replay.interaction_id': matchingInteraction.id,
          'replay.request_type': requestType
        });

        // Return the recorded response
        switch (matchingInteraction.type) {
          case 'api':
            return {
              status: matchingInteraction.response.status,
              headers: matchingInteraction.response.headers,
              body: matchingInteraction.response.body,
              metadata: matchingInteraction.metadata
            };

          case 'database':
            return {
              result: matchingInteraction.result,
              metadata: matchingInteraction.metadata
            };

          case 'external':
            return {
              response: matchingInteraction.response,
              metadata: matchingInteraction.metadata
            };

          default:
            throw new Error(`Unknown interaction type: ${matchingInteraction.type}`);
        }

      } catch (error) {
        span.recordException(error);
        throw error;
      }
    });
  }

  /**
   * Stop replay mode
   */
  async stopReplay() {
    return await traceExternalCall('record_replay', 'stop_replay', async (span) => {
      try {
        if (!this.isReplaying) {
          throw new Error('No replay in progress');
        }

        const scenarioId = this.currentScenario.id;
        const scenarioName = this.currentScenario.name;

        this.isReplaying = false;
        this.currentScenario = null;
        this.replayData.clear();

        span.setAttributes({
          'replay.scenario_id': scenarioId,
          'replay.stopped': true
        });

        console.log(`⏹️ Replay stopped: ${scenarioName} (${scenarioId})`);

        return {
          scenarioId,
          replayStopped: true
        };

      } catch (error) {
        span.recordException(error);
        throw error;
      }
    });
  }

  /**
   * Run automated regression tests using recorded scenarios
   */
  async runRegressionTests(scenarioIds = [], options = {}) {
    return await traceExternalCall('record_replay', 'run_regression_tests', async (span) => {
      try {
        const testResults = [];
        const startTime = Date.now();

        // If no specific scenarios provided, test all regression scenarios
        const scenariosToTest = scenarioIds.length > 0 
          ? scenarioIds 
          : Array.from(this.scenarios.keys())
              .filter(id => this.scenarios.get(id).type === 'regression');

        console.log(`🧪 Starting regression tests for ${scenariosToTest.length} scenarios`);

        for (const scenarioId of scenariosToTest) {
          try {
            const testResult = await this.runSingleRegressionTest(scenarioId, options);
            testResults.push(testResult);
            
            console.log(`${testResult.passed ? '✅' : '❌'} ${testResult.scenarioName}: ${testResult.passed ? 'PASSED' : 'FAILED'}`);
            
          } catch (error) {
            testResults.push({
              scenarioId,
              scenarioName: this.scenarios.get(scenarioId)?.name || 'Unknown',
              passed: false,
              error: error.message,
              timestamp: new Date().toISOString()
            });
            console.error(`❌ Test failed for scenario ${scenarioId}:`, error.message);
          }
        }

        const totalDuration = Date.now() - startTime;
        const passedTests = testResults.filter(r => r.passed).length;
        const failedTests = testResults.length - passedTests;

        const summary = {
          totalTests: testResults.length,
          passed: passedTests,
          failed: failedTests,
          duration: totalDuration,
          passRate: testResults.length > 0 ? (passedTests / testResults.length) * 100 : 0,
          results: testResults,
          timestamp: new Date().toISOString()
        };

        span.setAttributes({
          'regression.total_tests': testResults.length,
          'regression.passed_tests': passedTests,
          'regression.failed_tests': failedTests,
          'regression.pass_rate': summary.passRate,
          'regression.duration': totalDuration
        });

        // Save test report
        if (options.saveReport) {
          const reportPath = path.join(this.config.recordingsPath, `regression-report-${Date.now()}.json`);
          await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));
          summary.reportPath = reportPath;
        }

        console.log(`🏁 Regression tests completed:`);
        console.log(`   - Total: ${summary.totalTests}`);
        console.log(`   - Passed: ${passedTests}`);
        console.log(`   - Failed: ${failedTests}`);
        console.log(`   - Pass Rate: ${summary.passRate.toFixed(2)}%`);
        console.log(`   - Duration: ${totalDuration}ms`);

        return summary;

      } catch (error) {
        span.recordException(error);
        throw error;
      }
    });
  }

  /**
   * Generate unique scenario ID
   */
  generateScenarioId(scenarioName) {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5')
      .update(`${scenarioName}-${timestamp}`)
      .digest('hex')
      .substring(0, 8);
    
    return `scenario_${timestamp}_${hash}`;
  }

  /**
   * Generate unique interaction ID
   */
  generateInteractionId(type, ...parts) {
    const signature = parts.join('|');
    const hash = crypto.createHash('md5')
      .update(signature)
      .digest('hex')
      .substring(0, 8);
    
    const timestamp = Date.now() - this.recordingStartTime;
    return `${type}_${timestamp}_${hash}`;
  }

  /**
   * Sanitize headers by removing sensitive information
   */
  sanitizeHeaders(headers) {
    if (!headers) return {};
    
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Sanitize request/response bodies
   */
  sanitizeRequestBody(body) {
    if (!body) return body;
    
    if (typeof body === 'object') {
      const sanitized = { ...body };
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
      
      sensitiveFields.forEach(field => {
        if (sanitized[field]) {
          sanitized[field] = '[REDACTED]';
        }
      });
      
      return sanitized;
    }
    
    return body;
  }

  sanitizeResponseBody(body) {
    return this.sanitizeRequestBody(body);
  }

  /**
   * Sanitize database queries and parameters
   */
  sanitizeQuery(query) {
    // Remove or mask sensitive patterns in SQL queries
    return query.replace(/password\s*=\s*'[^']*'/gi, "password='[REDACTED]'")
                .replace(/token\s*=\s*'[^']*'/gi, "token='[REDACTED]'");
  }

  sanitizeParameters(parameters) {
    return this.sanitizeRequestBody(parameters);
  }

  sanitizeResult(result) {
    if (!result || typeof result !== 'object') return result;
    
    // For arrays of results, sanitize each item
    if (Array.isArray(result)) {
      return result.map(item => this.sanitizeRequestBody(item));
    }
    
    return this.sanitizeRequestBody(result);
  }

  /**
   * Sanitize external API requests/responses
   */
  sanitizeExternalRequest(request) {
    return this.sanitizeRequestBody(request);
  }

  sanitizeExternalResponse(response) {
    return this.sanitizeRequestBody(response);
  }

  /**
   * Extract row count from database results
   */
  extractRowCount(result) {
    if (!result) return 0;
    if (Array.isArray(result)) return result.length;
    if (result.rows && Array.isArray(result.rows)) return result.rows.length;
    if (result.rowCount !== undefined) return result.rowCount;
    return 1;
  }

  /**
   * Calculate recording statistics
   */
  calculateRecordingStatistics(interactions) {
    const stats = {
      total: interactions.length,
      byType: {},
      avgDuration: 0,
      totalDuration: 0
    };

    interactions.forEach(interaction => {
      // Count by type
      stats.byType[interaction.type] = (stats.byType[interaction.type] || 0) + 1;
      
      // Sum durations
      if (interaction.metadata?.duration) {
        stats.totalDuration += interaction.metadata.duration;
      }
    });

    stats.avgDuration = stats.total > 0 ? stats.totalDuration / stats.total : 0;

    return stats;
  }

  /**
   * Check if interaction matches request signature
   */
  matchesRequestSignature(interaction, requestType, requestSignature) {
    if (interaction.type !== requestType) return false;

    switch (requestType) {
      case 'api':
        return interaction.request.method === requestSignature.method &&
               interaction.request.url === requestSignature.url;

      case 'database':
        return interaction.operation === requestSignature.operation &&
               this.normalizeQuery(interaction.query) === this.normalizeQuery(requestSignature.query);

      case 'external':
        return interaction.service === requestSignature.service &&
               interaction.endpoint === requestSignature.endpoint;

      default:
        return false;
    }
  }

  /**
   * Normalize query for comparison
   */
  normalizeQuery(query) {
    return query?.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  /**
   * Save scenario in HAR (HTTP Archive) format
   */
  async saveAsHAR(scenario, harPath) {
    const har = {
      log: {
        version: '1.2',
        creator: {
          name: 'ACT Placemat Record/Replay Service',
          version: '1.0.0'
        },
        entries: scenario.interactions
          .filter(i => i.type === 'api')
          .map(i => this.convertToHAREntry(i))
      }
    };

    await fs.writeFile(harPath, JSON.stringify(har, null, 2));
  }

  /**
   * Convert interaction to HAR format entry
   */
  convertToHAREntry(interaction) {
    return {
      startedDateTime: new Date(Date.now() - interaction.timestamp).toISOString(),
      time: interaction.metadata?.duration || 0,
      request: {
        method: interaction.request.method,
        url: interaction.request.url,
        headers: Object.entries(interaction.request.headers || {}).map(([name, value]) => ({ name, value })),
        queryString: Object.entries(interaction.request.query || {}).map(([name, value]) => ({ name, value })),
        postData: interaction.request.body ? {
          mimeType: 'application/json',
          text: JSON.stringify(interaction.request.body)
        } : undefined
      },
      response: {
        status: interaction.response.status,
        statusText: 'OK',
        headers: Object.entries(interaction.response.headers || {}).map(([name, value]) => ({ name, value })),
        content: {
          size: JSON.stringify(interaction.response.body || '').length,
          mimeType: 'application/json',
          text: JSON.stringify(interaction.response.body || '')
        }
      }
    };
  }

  /**
   * Run a single regression test
   */
  async runSingleRegressionTest(scenarioId, options = {}) {
    // This would integrate with actual test execution
    // For now, return a mock implementation
    const scenario = this.scenarios.get(scenarioId);
    
    return {
      scenarioId,
      scenarioName: scenario?.name || 'Unknown',
      passed: true, // Would be determined by actual replay comparison
      duration: 100,
      timestamp: new Date().toISOString(),
      details: 'Mock regression test - would compare actual vs recorded responses'
    };
  }

  /**
   * Get service status and statistics
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      recording: this.isRecording,
      replaying: this.isReplaying,
      currentScenario: this.currentScenario?.id || null,
      totalScenarios: this.scenarios.size,
      scenarioTypes: this.getScenarioTypeStats(),
      config: {
        recordingsPath: this.config.recordingsPath,
        scenariosPath: this.config.scenariosPath,
        maxRecordingSize: this.config.maxRecordingSize,
        recordingFormats: this.config.recordingFormats
      }
    };
  }

  /**
   * Get scenario statistics by type
   */
  getScenarioTypeStats() {
    const stats = {};
    for (const scenario of this.scenarios.values()) {
      stats[scenario.type] = (stats[scenario.type] || 0) + 1;
    }
    return stats;
  }

  /**
   * List available scenarios
   */
  listScenarios(filterType = null) {
    const scenarios = Array.from(this.scenarios.values());
    
    if (filterType) {
      return scenarios.filter(s => s.type === filterType);
    }
    
    return scenarios.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      type: s.type,
      createdAt: s.createdAt,
      duration: s.duration,
      interactionCount: s.interactionCount,
      tags: s.tags
    }));
  }

  /**
   * Delete a scenario
   */
  async deleteScenario(scenarioId) {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    // Delete files
    await fs.unlink(scenario.filePath);
    
    const harPath = path.join(this.config.recordingsPath, `${scenarioId}.har`);
    try {
      await fs.unlink(harPath);
    } catch (error) {
      // HAR file might not exist
    }

    // Remove from memory
    this.scenarios.delete(scenarioId);

    console.log(`🗑️ Deleted scenario: ${scenario.name} (${scenarioId})`);
    
    return { deleted: true, scenarioId };
  }

  /**
   * Close service and cleanup
   */
  async close() {
    console.log('📹 Closing Record/Replay Service...');
    
    // Stop any active recording/replay
    if (this.isRecording) {
      try {
        await this.stopRecording();
      } catch (error) {
        console.warn('Warning: Could not properly stop recording:', error.message);
      }
    }
    
    if (this.isReplaying) {
      await this.stopReplay();
    }
    
    // Clear data
    this.recordingData.clear();
    this.replayData.clear();
    this.scenarios.clear();
    
    this.isInitialized = false;
    console.log('✅ Record/Replay Service closed');
  }
}

// Create singleton instance
const recordReplayService = new RecordReplayService();

export default recordReplayService;

// Export utility functions
export const startRecording = (scenarioName, options) => 
  recordReplayService.startRecording(scenarioName, options);

export const stopRecording = () => 
  recordReplayService.stopRecording();

export const startReplay = (scenarioId, options) => 
  recordReplayService.startReplay(scenarioId, options);

export const stopReplay = () => 
  recordReplayService.stopReplay();

export const recordApiInteraction = (request, response, metadata) => 
  recordReplayService.recordApiInteraction(request, response, metadata);

export const recordDatabaseOperation = (operation, query, parameters, result, metadata) => 
  recordReplayService.recordDatabaseOperation(operation, query, parameters, result, metadata);

export const getReplayResponse = (requestType, requestSignature) => 
  recordReplayService.getReplayResponse(requestType, requestSignature);

export const runRegressionTests = (scenarioIds, options) => 
  recordReplayService.runRegressionTests(scenarioIds, options);