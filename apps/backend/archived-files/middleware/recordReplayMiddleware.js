/**
 * Record/Replay Middleware
 * Middleware for automatically recording API interactions during test scenarios
 */

import recordReplayService from '../services/recordReplayService.js';
import tracingService from '../services/tracingService.js';

/**
 * Recording middleware - captures all API requests and responses
 */
export const recordingMiddleware = (options = {}) => {
  return (req, res, next) => {
    // Skip recording if not in recording mode or if excluded
    if (!recordReplayService.isRecording) {
      return next();
    }

    const skipPaths = options.skipPaths || ['/health', '/status', '/api/record-replay'];
    const shouldSkip = skipPaths.some(path => req.url.includes(path));
    
    if (shouldSkip) {
      return next();
    }

    const startTime = Date.now();
    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody = null;
    let responseSent = false;

    // Capture response body
    res.send = function(body) {
      if (!responseSent) {
        responseBody = body;
        responseSent = true;
      }
      return originalSend.call(this, body);
    };

    res.json = function(body) {
      if (!responseSent) {
        responseBody = body;
        responseSent = true;
      }
      return originalJson.call(this, body);
    };

    // Record the interaction after response is sent
    const originalEnd = res.end;
    res.end = async function(chunk) {
      if (chunk && !responseSent) {
        responseBody = chunk;
        responseSent = true;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      try {
        // Create a mock response object for recording
        const mockResponse = {
          statusCode: res.statusCode,
          getHeaders: () => res.getHeaders(),
          body: responseBody
        };

        await recordReplayService.recordApiInteraction(
          req, 
          mockResponse,
          {
            duration,
            userAgent: req.headers['user-agent'],
            ip: req.ip || req.connection.remoteAddress,
            timestamp: startTime
          }
        );
      } catch (error) {
        console.warn('⚠️ Failed to record API interaction:', error.message);
      }

      return originalEnd.call(this, chunk);
    };

    next();
  };
};

/**
 * Replay middleware - intercepts requests during replay mode and returns recorded responses
 */
export const replayMiddleware = (options = {}) => {
  return async (req, res, next) => {
    // Skip replay if not in replay mode
    if (!recordReplayService.isReplaying) {
      return next();
    }

    const skipPaths = options.skipPaths || ['/health', '/status', '/api/record-replay'];
    const shouldSkip = skipPaths.some(path => req.url.includes(path));
    
    if (shouldSkip) {
      return next();
    }

    try {
      const span = tracingService.startSpan('middleware.replay', {
        attributes: {
          'http.method': req.method,
          'http.url': req.url,
          'middleware.type': 'replay'
        }
      });

      // Create request signature for matching
      const requestSignature = {
        method: req.method,
        url: req.url,
        query: req.query,
        body: req.body
      };

      // Try to get recorded response
      const recordedResponse = await recordReplayService.getReplayResponse('api', requestSignature);
      
      if (recordedResponse) {
        span.setAttributes({
          'replay.match_found': true,
          'replay.recorded_status': recordedResponse.status
        });

        // Set headers from recorded response
        if (recordedResponse.headers) {
          Object.entries(recordedResponse.headers).forEach(([key, value]) => {
            if (value !== '[REDACTED]') {
              res.setHeader(key, value);
            }
          });
        }

        // Send recorded response
        span.setStatus('OK');
        span.end();
        
        return res.status(recordedResponse.status).json(recordedResponse.body);
      }

      span.setAttributes({
        'replay.match_found': false
      });

      span.setStatus('OK');
      span.end();

      // No recorded response found, continue to actual handler
      next();

    } catch (error) {
      console.error('❌ Replay middleware error:', error);
      // On error, continue to actual handler
      next();
    }
  };
};

/**
 * Database recording wrapper
 */
export const recordDatabaseQuery = async (operation, query, parameters, executeQuery) => {
  const startTime = Date.now();
  
  try {
    // Execute the actual query
    const result = await executeQuery();
    const duration = Date.now() - startTime;
    
    // Record the operation if in recording mode
    if (recordReplayService.isRecording) {
      await recordReplayService.recordDatabaseOperation(
        operation, 
        query, 
        parameters, 
        result,
        { duration, timestamp: startTime }
      );
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Record the failed operation
    if (recordReplayService.isRecording) {
      await recordReplayService.recordDatabaseOperation(
        operation,
        query,
        parameters,
        { error: error.message },
        { duration, timestamp: startTime, failed: true }
      );
    }
    
    throw error;
  }
};

/**
 * External API recording wrapper
 */
export const recordExternalCall = async (service, endpoint, request, makeCall) => {
  const startTime = Date.now();
  
  try {
    // Check if we're in replay mode first
    if (recordReplayService.isReplaying) {
      const requestSignature = { service, endpoint, request };
      const recordedResponse = await recordReplayService.getReplayResponse('external', requestSignature);
      
      if (recordedResponse) {
        return recordedResponse.response;
      }
    }
    
    // Execute the actual call
    const response = await makeCall();
    const duration = Date.now() - startTime;
    
    // Record the call if in recording mode
    if (recordReplayService.isRecording) {
      await recordReplayService.recordExternalCall(
        service,
        endpoint,
        request,
        response,
        { duration, timestamp: startTime }
      );
    }
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Record the failed call
    if (recordReplayService.isRecording) {
      await recordReplayService.recordExternalCall(
        service,
        endpoint,
        request,
        { error: error.message },
        { duration, timestamp: startTime, failed: true }
      );
    }
    
    throw error;
  }
};

/**
 * Auto-recording middleware that starts/stops recording based on test headers
 */
export const autoRecordingMiddleware = (options = {}) => {
  return async (req, res, next) => {
    try {
      // Check for recording control headers
      const recordingAction = req.headers['x-test-recording'];
      const scenarioName = req.headers['x-test-scenario'];
      const scenarioType = req.headers['x-test-type'] || 'integration';
      
      if (recordingAction === 'start' && scenarioName) {
        if (!recordReplayService.isRecording) {
          await recordReplayService.startRecording(scenarioName, {
            type: scenarioType,
            description: req.headers['x-test-description'],
            tags: req.headers['x-test-tags']?.split(',') || [],
            userId: req.headers['x-test-user-id']
          });
          
          console.log(`🎬 Auto-started recording: ${scenarioName}`);
        }
      }
      
      if (recordingAction === 'stop') {
        if (recordReplayService.isRecording) {
          const result = await recordReplayService.stopRecording();
          console.log(`🛑 Auto-stopped recording: ${result.scenarioId}`);
          
          // Add recording info to response headers
          res.setHeader('X-Test-Recording-Id', result.scenarioId);
          res.setHeader('X-Test-Recording-Duration', result.duration);
          res.setHeader('X-Test-Recording-Interactions', result.interactions);
        }
      }
      
      // Check for replay control headers
      const replayAction = req.headers['x-test-replay'];
      const scenarioId = req.headers['x-test-scenario-id'];
      
      if (replayAction === 'start' && scenarioId) {
        if (!recordReplayService.isReplaying) {
          await recordReplayService.startReplay(scenarioId, {
            deterministicMode: req.headers['x-test-deterministic'] !== 'false'
          });
          
          console.log(`▶️ Auto-started replay: ${scenarioId}`);
        }
      }
      
      if (replayAction === 'stop') {
        if (recordReplayService.isReplaying) {
          const result = await recordReplayService.stopReplay();
          console.log(`⏹️ Auto-stopped replay: ${result.scenarioId}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Auto-recording middleware error:', error);
      // Continue processing request even if recording/replay fails
    }
    
    next();
  };
};

/**
 * Test scenario middleware that automatically manages recording/replay for test suites
 */
export const testScenarioMiddleware = (options = {}) => {
  const activeScenarios = new Map();
  
  return async (req, res, next) => {
    try {
      const testSuite = req.headers['x-test-suite'];
      const testCase = req.headers['x-test-case'];
      const testAction = req.headers['x-test-action']; // setup, run, teardown
      
      if (testSuite && testCase) {
        const scenarioKey = `${testSuite}.${testCase}`;
        
        switch (testAction) {
          case 'setup':
            // Start recording for this test case
            const recordingResult = await recordReplayService.startRecording(scenarioKey, {
              type: 'regression',
              description: `Regression test: ${testSuite} - ${testCase}`,
              tags: ['regression', testSuite],
              userId: 'test-suite'
            });
            activeScenarios.set(scenarioKey, recordingResult.scenarioId);
            break;
            
          case 'teardown':
            // Stop recording for this test case
            if (activeScenarios.has(scenarioKey) && recordReplayService.isRecording) {
              const result = await recordReplayService.stopRecording();
              activeScenarios.delete(scenarioKey);
              
              res.setHeader('X-Test-Scenario-Id', result.scenarioId);
              res.setHeader('X-Test-Duration', result.duration);
            }
            break;
            
          case 'replay':
            // Start replay mode for this test case
            const scenarioId = activeScenarios.get(scenarioKey);
            if (scenarioId) {
              await recordReplayService.startReplay(scenarioId);
            }
            break;
        }
      }
      
    } catch (error) {
      console.error('❌ Test scenario middleware error:', error);
    }
    
    next();
  };
};

export default {
  recordingMiddleware,
  replayMiddleware,
  recordDatabaseQuery,
  recordExternalCall,
  autoRecordingMiddleware,
  testScenarioMiddleware
};