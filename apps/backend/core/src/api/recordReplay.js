/**
 * Record/Replay API Endpoints
 * Provides REST API for managing test recording, replay, and regression testing
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import recordReplayService from '../services/recordReplayService.js';
import tracingService from '../services/tracingService.js';
import { recordDatabaseQuery } from '../middleware/recordReplayMiddleware.js';

const router = express.Router();

/**
 * Get service status and statistics
 */
router.get('/status', async (req, res) => {
  try {
    const status = recordReplayService.getStatus();
    
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting record/replay status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get record/replay status'
    });
  }
});

/**
 * List all available scenarios
 */
router.get('/scenarios', async (req, res) => {
  try {
    const { type, limit, offset } = req.query;
    
    let scenarios = recordReplayService.listScenarios(type);
    
    // Apply pagination
    const totalCount = scenarios.length;
    const startIndex = parseInt(offset) || 0;
    const endIndex = limit ? startIndex + parseInt(limit) : scenarios.length;
    
    scenarios = scenarios.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      scenarios,
      pagination: {
        total: totalCount,
        offset: startIndex,
        limit: parseInt(limit) || totalCount,
        count: scenarios.length
      },
      filters: { type }
    });
  } catch (error) {
    console.error('Error listing scenarios:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list scenarios'
    });
  }
});

/**
 * Get details of a specific scenario
 */
router.get('/scenarios/:scenarioId', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const scenario = recordReplayService.scenarios.get(scenarioId);
    
    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: 'Scenario not found',
        scenarioId
      });
    }
    
    res.json({
      success: true,
      scenario
    });
  } catch (error) {
    console.error('Error getting scenario details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scenario details'
    });
  }
});

/**
 * Start recording a new scenario
 */
router.post('/recording/start', async (req, res) => {
  try {
    const {
      scenarioName,
      description,
      type = 'integration',
      tags = [],
      userId
    } = req.body;
    
    if (!scenarioName) {
      return res.status(400).json({
        success: false,
        error: 'Scenario name is required'
      });
    }
    
    const result = await recordReplayService.startRecording(scenarioName, {
      description,
      type,
      tags,
      userId
    });
    
    res.json({
      success: true,
      recording: result,
      message: `Started recording scenario: ${scenarioName}`
    });
    
  } catch (error) {
    console.error('Error starting recording:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start recording'
    });
  }
});

/**
 * Stop current recording
 */
router.post('/recording/stop', async (req, res) => {
  try {
    if (!recordReplayService.isRecording) {
      return res.status(400).json({
        success: false,
        error: 'No recording in progress'
      });
    }
    
    const result = await recordReplayService.stopRecording();
    
    res.json({
      success: true,
      recording: result,
      message: 'Recording stopped successfully'
    });
    
  } catch (error) {
    console.error('Error stopping recording:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to stop recording'
    });
  }
});

/**
 * Start replaying a scenario
 */
router.post('/replay/start', async (req, res) => {
  try {
    const { scenarioId, deterministicMode = true } = req.body;
    
    if (!scenarioId) {
      return res.status(400).json({
        success: false,
        error: 'Scenario ID is required'
      });
    }
    
    const result = await recordReplayService.startReplay(scenarioId, {
      deterministicMode
    });
    
    res.json({
      success: true,
      replay: result,
      message: `Started replaying scenario: ${scenarioId}`
    });
    
  } catch (error) {
    console.error('Error starting replay:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start replay'
    });
  }
});

/**
 * Stop current replay
 */
router.post('/replay/stop', async (req, res) => {
  try {
    if (!recordReplayService.isReplaying) {
      return res.status(400).json({
        success: false,
        error: 'No replay in progress'
      });
    }
    
    const result = await recordReplayService.stopReplay();
    
    res.json({
      success: true,
      replay: result,
      message: 'Replay stopped successfully'
    });
    
  } catch (error) {
    console.error('Error stopping replay:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to stop replay'
    });
  }
});

/**
 * Run regression tests
 */
router.post('/tests/regression', async (req, res) => {
  try {
    const {
      scenarioIds = [],
      saveReport = true,
      parallel = false,
      timeout = 300000 // 5 minutes
    } = req.body;
    
    // Set timeout for long-running regression tests
    req.setTimeout(timeout);
    
    const result = await tracingService.startActiveSpan('api.regression_tests', {
      attributes: {
        'test.type': 'regression',
        'test.scenario_count': scenarioIds.length,
        'test.parallel': parallel,
        'test.timeout': timeout
      }
    }, async (span) => {
      
      const testResult = await recordReplayService.runRegressionTests(scenarioIds, {
        saveReport,
        parallel,
        timeout
      });
      
      span.setAttributes({
        'test.total_tests': testResult.totalTests,
        'test.passed_tests': testResult.passed,
        'test.failed_tests': testResult.failed,
        'test.pass_rate': testResult.passRate,
        'test.duration': testResult.duration
      });
      
      return testResult;
    });
    
    res.json({
      success: true,
      tests: result,
      message: `Regression tests completed: ${result.passed}/${result.totalTests} passed`
    });
    
  } catch (error) {
    console.error('Error running regression tests:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run regression tests'
    });
  }
});

/**
 * Run a single test scenario
 */
router.post('/tests/scenario/:scenarioId', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const { timeout = 60000 } = req.body;
    
    req.setTimeout(timeout);
    
    const result = await tracingService.startActiveSpan('api.single_scenario_test', {
      attributes: {
        'test.type': 'single_scenario',
        'test.scenario_id': scenarioId,
        'test.timeout': timeout
      }
    }, async (span) => {
      
      // Start replay for this scenario
      await recordReplayService.startReplay(scenarioId, { deterministicMode: true });
      
      try {
        // Run the test by replaying the scenario
        // In a full implementation, this would trigger actual test execution
        const testResult = await recordReplayService.runSingleRegressionTest(scenarioId, {
          timeout
        });
        
        span.setAttributes({
          'test.passed': testResult.passed,
          'test.duration': testResult.duration
        });
        
        return testResult;
        
      } finally {
        // Always stop replay
        await recordReplayService.stopReplay();
      }
    });
    
    res.json({
      success: true,
      test: result,
      message: `Test completed: ${result.passed ? 'PASSED' : 'FAILED'}`
    });
    
  } catch (error) {
    console.error('Error running single scenario test:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run scenario test'
    });
  }
});

/**
 * Delete a scenario
 */
router.delete('/scenarios/:scenarioId', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const result = await recordReplayService.deleteScenario(scenarioId);
    
    res.json({
      success: true,
      deleted: result,
      message: `Scenario deleted: ${scenarioId}`
    });
    
  } catch (error) {
    console.error('Error deleting scenario:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Failed to delete scenario'
    });
  }
});

/**
 * Export scenario in different formats
 */
router.get('/scenarios/:scenarioId/export', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const { format = 'json' } = req.query;
    
    const scenario = recordReplayService.scenarios.get(scenarioId);
    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: 'Scenario not found'
      });
    }
    
    switch (format.toLowerCase()) {
      case 'har':
        // Export as HAR format
        const har = {
          log: {
            version: '1.2',
            creator: {
              name: 'ACT Placemat Record/Replay Service',
              version: '1.0.0'
            },
            entries: scenario.interactions
              .filter(i => i.type === 'api')
              .map(i => recordReplayService.convertToHAREntry(i))
          }
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${scenarioId}.har"`);
        res.json(har);
        break;
        
      case 'postman':
        // Export as Postman collection
        const postmanCollection = {
          info: {
            name: scenario.name,
            description: scenario.description,
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
          },
          item: scenario.interactions
            .filter(i => i.type === 'api')
            .map(i => ({
              name: `${i.request.method} ${i.request.url}`,
              request: {
                method: i.request.method,
                header: Object.entries(i.request.headers || {}).map(([key, value]) => ({
                  key,
                  value,
                  type: 'text'
                })),
                url: {
                  raw: i.request.url,
                  query: Object.entries(i.request.query || {}).map(([key, value]) => ({
                    key,
                    value
                  }))
                },
                body: i.request.body ? {
                  mode: 'raw',
                  raw: JSON.stringify(i.request.body),
                  options: {
                    raw: {
                      language: 'json'
                    }
                  }
                } : undefined
              }
            }))
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${scenarioId}.postman.json"`);
        res.json(postmanCollection);
        break;
        
      case 'curl':
        // Export as curl commands
        const curlCommands = scenario.interactions
          .filter(i => i.type === 'api')
          .map(i => {
            let curl = `curl -X ${i.request.method}`;
            
            // Add headers
            Object.entries(i.request.headers || {}).forEach(([key, value]) => {
              if (value !== '[REDACTED]') {
                curl += ` -H "${key}: ${value}"`;
              }
            });
            
            // Add body
            if (i.request.body) {
              curl += ` -d '${JSON.stringify(i.request.body)}'`;
            }
            
            // Add URL with query params
            let url = i.request.url;
            const queryParams = new URLSearchParams(i.request.query || {}).toString();
            if (queryParams) {
              url += `?${queryParams}`;
            }
            curl += ` "${url}"`;
            
            return curl;
          })
          .join('\n\n');
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${scenarioId}.sh"`);
        res.send(curlCommands);
        break;
        
      default:
        // Export as JSON (default)
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${scenarioId}.json"`);
        res.json(scenario);
    }
    
  } catch (error) {
    console.error('Error exporting scenario:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export scenario'
    });
  }
});

/**
 * Import scenario from file
 */
router.post('/scenarios/import', async (req, res) => {
  try {
    const { scenarioData, format = 'json' } = req.body;
    
    if (!scenarioData) {
      return res.status(400).json({
        success: false,
        error: 'Scenario data is required'
      });
    }
    
    let parsedScenario;
    
    switch (format.toLowerCase()) {
      case 'har':
        // Convert HAR format to internal format
        parsedScenario = recordReplayService.convertFromHAR(scenarioData);
        break;
        
      case 'json':
      default:
        parsedScenario = scenarioData;
    }
    
    // Validate scenario structure
    if (!parsedScenario.name || !parsedScenario.interactions) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scenario format - name and interactions required'
      });
    }
    
    // Generate new ID and save
    const newId = recordReplayService.generateScenarioId(parsedScenario.name);
    parsedScenario.id = newId;
    parsedScenario.importedAt = new Date().toISOString();
    
    const scenarioPath = path.join(
      recordReplayService.config.scenariosPath,
      `${newId}.json`
    );
    
    await fs.writeFile(scenarioPath, JSON.stringify(parsedScenario, null, 2));
    
    recordReplayService.scenarios.set(newId, {
      ...parsedScenario,
      filePath: scenarioPath
    });
    
    res.json({
      success: true,
      imported: {
        scenarioId: newId,
        name: parsedScenario.name,
        interactions: parsedScenario.interactions.length
      },
      message: `Scenario imported successfully: ${parsedScenario.name}`
    });
    
  } catch (error) {
    console.error('Error importing scenario:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to import scenario'
    });
  }
});

/**
 * Test the record/replay system with sample data
 */
router.post('/test/sample', async (req, res) => {
  try {
    const testResults = await tracingService.startActiveSpan('api.test_record_replay', {
      attributes: {
        'test.type': 'sample_test',
        'test.component': 'record_replay_service'
      }
    }, async (span) => {
      
      const results = {
        recording: null,
        replay: null,
        errors: []
      };
      
      try {
        // Test recording
        console.log('🧪 Testing record/replay system...');
        
        // Start recording
        const recordingResult = await recordReplayService.startRecording('sample-test', {
          type: 'integration',
          description: 'Sample test for record/replay system',
          tags: ['sample', 'test']
        });
        
        // Record some sample interactions
        await recordReplayService.recordApiInteraction(
          {
            method: 'GET',
            url: '/api/test',
            headers: { 'user-agent': 'test-client' },
            query: { test: 'true' },
            body: null
          },
          {
            statusCode: 200,
            getHeaders: () => ({ 'content-type': 'application/json' }),
            body: { message: 'test response', success: true }
          },
          { duration: 50 }
        );
        
        await recordReplayService.recordDatabaseOperation(
          'SELECT',
          'SELECT * FROM users WHERE id = $1',
          { id: 'test-user' },
          [{ id: 'test-user', name: 'Test User' }],
          { duration: 25 }
        );
        
        // Stop recording
        const stopResult = await recordReplayService.stopRecording();
        results.recording = {
          started: recordingResult,
          stopped: stopResult,
          success: true
        };
        
        // Test replay
        const replayStart = await recordReplayService.startReplay(stopResult.scenarioId);
        
        // Try to get recorded response
        const replayResponse = await recordReplayService.getReplayResponse('api', {
          method: 'GET',
          url: '/api/test'
        });
        
        const replayStop = await recordReplayService.stopReplay();
        
        results.replay = {
          started: replayStart,
          response: replayResponse,
          stopped: replayStop,
          success: !!replayResponse
        };
        
        // Clean up test scenario
        await recordReplayService.deleteScenario(stopResult.scenarioId);
        
      } catch (error) {
        results.errors.push(error.message);
        span.recordException(error);
      }
      
      span.setAttributes({
        'test.recording_success': !!results.recording?.success,
        'test.replay_success': !!results.replay?.success,
        'test.error_count': results.errors.length
      });
      
      return results;
    });
    
    const allTestsPassed = testResults.recording?.success && testResults.replay?.success && testResults.errors.length === 0;
    
    res.json({
      success: allTestsPassed,
      tests: testResults,
      message: allTestsPassed ? 'All record/replay tests passed' : 'Some tests failed',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error running record/replay tests:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run tests'
    });
  }
});

/**
 * Get service configuration and help
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    configuration: {
      features: {
        recording: 'Record API interactions, database operations, and external calls',
        replay: 'Deterministically replay recorded interactions for testing',
        scenarios: 'Manage test scenarios with metadata and organization',
        regression_testing: 'Automated regression test execution',
        export_import: 'Export scenarios in HAR, Postman, cURL formats',
        tracing_integration: 'Full OpenTelemetry integration for observability'
      },
      endpoints: {
        status: 'GET /api/record-replay/status - Service status and statistics',
        scenarios: 'GET /api/record-replay/scenarios - List all scenarios',
        recording: {
          start: 'POST /api/record-replay/recording/start - Start recording',
          stop: 'POST /api/record-replay/recording/stop - Stop recording'
        },
        replay: {
          start: 'POST /api/record-replay/replay/start - Start replay',
          stop: 'POST /api/record-replay/replay/stop - Stop replay'
        },
        tests: {
          regression: 'POST /api/record-replay/tests/regression - Run regression tests',
          scenario: 'POST /api/record-replay/tests/scenario/:id - Run single scenario test'
        },
        export: 'GET /api/record-replay/scenarios/:id/export?format=json|har|postman|curl',
        import: 'POST /api/record-replay/scenarios/import - Import scenario',
        sample_test: 'POST /api/record-replay/test/sample - Test system functionality'
      },
      supported_formats: ['json', 'har', 'postman', 'curl'],
      scenario_types: ['integration', 'regression', 'performance', 'functional'],
      middleware: {
        recording: 'Automatically record API interactions during scenarios',
        replay: 'Intercept requests and return recorded responses',
        auto_recording: 'Control recording via HTTP headers',
        test_scenario: 'Manage recording/replay for test suites'
      }
    }
  });
});

export default router;