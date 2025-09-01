/**
 * Security API Endpoints
 * Provides endpoints for security monitoring, violation reporting, and system status
 */

import express from 'express';
import securityGuardrailsService from '../services/securityGuardrailsService.js';
import tracingService from '../services/tracingService.js';

const router = express.Router();

/**
 * Get security system status
 */
router.get('/status', async (req, res) => {
  try {
    const status = securityGuardrailsService.getSecurityStatus();
    
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting security status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security status'
    });
  }
});

/**
 * Get recent security violations
 */
router.get('/violations', async (req, res) => {
  try {
    const { limit = 50, severity, type } = req.query;
    
    let violations = securityGuardrailsService.getRecentViolations(parseInt(limit));
    
    // Filter by severity if specified
    if (severity) {
      violations = violations.filter(v => v.severity === severity);
    }
    
    // Filter by type if specified
    if (type) {
      violations = violations.filter(v => v.type === type);
    }
    
    res.json({
      success: true,
      violations,
      total: violations.length,
      filters: { limit, severity, type }
    });
  } catch (error) {
    console.error('Error getting security violations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security violations'
    });
  }
});

/**
 * Test security validation
 */
router.post('/test', async (req, res) => {
  try {
    const { 
      testType = 'input_validation',
      testData,
      endpoint = '/api/test'
    } = req.body;

    const result = await tracingService.startActiveSpan('api.security.test', {
      attributes: {
        'test.type': testType,
        'test.endpoint': endpoint,
        'test.has_data': !!testData
      }
    }, async (span) => {
      
      switch (testType) {
        case 'input_validation':
          try {
            const validation = await securityGuardrailsService.validateApiInput(
              testData, 
              endpoint, 
              'test-user'
            );
            
            return {
              testType: 'input_validation',
              passed: true,
              result: 'Input validation successful',
              sanitized: validation.sanitizedInput !== validation.originalInput,
              originalLength: typeof validation.originalInput === 'string' 
                ? validation.originalInput.length 
                : JSON.stringify(validation.originalInput).length,
              sanitizedLength: typeof validation.sanitizedInput === 'string'
                ? validation.sanitizedInput.length 
                : JSON.stringify(validation.sanitizedInput).length
            };
          } catch (error) {
            return {
              testType: 'input_validation',
              passed: false,
              result: 'Input validation failed',
              error: error.message,
              blocked: true
            };
          }

        case 'sql_injection':
          const sqlTests = [
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "admin'--",
            "1; DELETE FROM projects WHERE 1=1",
            "UNION SELECT * FROM user_profiles"
          ];
          
          const sqlResults = [];
          for (const sqlTest of sqlTests) {
            try {
              await securityGuardrailsService.validateDatabaseQuery(
                `SELECT * FROM users WHERE id = '${sqlTest}'`,
                {},
                'SELECT'
              );
              sqlResults.push({ input: sqlTest, blocked: false });
            } catch (error) {
              sqlResults.push({ input: sqlTest, blocked: true, reason: error.message });
            }
          }
          
          return {
            testType: 'sql_injection',
            results: sqlResults,
            totalTests: sqlTests.length,
            blocked: sqlResults.filter(r => r.blocked).length
          };

        case 'xss_detection':
          const xssTests = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "javascript:alert('XSS')",
            "<iframe src='javascript:alert(`XSS`)'></iframe>",
            "<svg onload=alert('XSS')>"
          ];
          
          const xssResults = [];
          for (const xssTest of xssTests) {
            const detected = securityGuardrailsService.detectXss(xssTest);
            const sanitized = securityGuardrailsService.sanitizeUserContent(xssTest);
            xssResults.push({ 
              input: xssTest, 
              detected, 
              sanitized,
              safe: sanitized !== xssTest
            });
          }
          
          return {
            testType: 'xss_detection',
            results: xssResults,
            totalTests: xssTests.length,
            detected: xssResults.filter(r => r.detected).length
          };

        case 'rate_limiting':
          const identifier = `test-${Date.now()}`;
          const rateLimitResults = [];
          
          // Test multiple rapid requests
          for (let i = 0; i < 105; i++) {
            const rateLimit = securityGuardrailsService.checkRateLimit(identifier, 100, 60000);
            if (i === 0 || i === 99 || i === 100 || i === 104) {
              rateLimitResults.push({
                request: i + 1,
                allowed: rateLimit.allowed,
                requestCount: rateLimit.requestCount,
                remaining: rateLimit.remaining
              });
            }
            if (!rateLimit.allowed) break;
          }
          
          return {
            testType: 'rate_limiting',
            results: rateLimitResults,
            rateLimitTriggered: rateLimitResults.some(r => !r.allowed)
          };

        case 'neo4j_injection':
          const cypherTests = [
            "MATCH (u:User) DELETE u",
            "CALL apoc.cypher.run('DROP DATABASE neo4j')",
            "MATCH (n) DETACH DELETE n",
            "CREATE (:Admin {password: 'hacked'})",
            "MATCH (u:User) SET u.admin = true"
          ];
          
          const cypherResults = [];
          for (const cypherTest of cypherTests) {
            try {
              await securityGuardrailsService.validateNeo4jQuery(cypherTest, {});
              cypherResults.push({ input: cypherTest, blocked: false });
            } catch (error) {
              cypherResults.push({ input: cypherTest, blocked: true, reason: error.message });
            }
          }
          
          return {
            testType: 'neo4j_injection',
            results: cypherResults,
            totalTests: cypherTests.length,
            blocked: cypherResults.filter(r => r.blocked).length
          };

        default:
          throw new Error(`Unknown test type: ${testType}`);
      }
    });

    res.json({
      success: true,
      test: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Security test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      testType: req.body.testType || 'unknown'
    });
  }
});

/**
 * Get validation schemas
 */
router.get('/schemas', (req, res) => {
  try {
    const schemas = securityGuardrailsService.createValidationSchema();
    
    // Convert Zod schemas to JSON descriptions
    const schemaDescriptions = {};
    for (const [key, schema] of Object.entries(schemas)) {
      try {
        // Get schema description by attempting to parse with empty/invalid data
        schemaDescriptions[key] = {
          type: schema.constructor.name,
          description: `Validation schema for ${key}`,
          // Note: In a real implementation, you might want to extract more details
          // from the Zod schema, but this requires additional parsing
        };
      } catch (error) {
        schemaDescriptions[key] = {
          type: 'ZodSchema',
          description: `Validation schema for ${key}`,
          error: 'Could not extract schema details'
        };
      }
    }
    
    res.json({
      success: true,
      schemas: schemaDescriptions,
      availableSchemas: Object.keys(schemas)
    });
  } catch (error) {
    console.error('Error getting validation schemas:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get validation schemas'
    });
  }
});

/**
 * Get security policies
 */
router.get('/policies', (req, res) => {
  try {
    const policies = Array.from(securityGuardrailsService.securityPolicies.entries())
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
    
    res.json({
      success: true,
      policies,
      policyCount: Object.keys(policies).length
    });
  } catch (error) {
    console.error('Error getting security policies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security policies'
    });
  }
});

/**
 * Security configuration help
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    configuration: {
      security_features: {
        input_validation: 'Validates and sanitizes all API inputs',
        sql_injection_prevention: 'Blocks SQL injection patterns and requires parameterized queries',
        xss_protection: 'Detects and sanitizes XSS attempts',
        nosql_injection_prevention: 'Validates Neo4j Cypher queries for injection patterns',
        rate_limiting: 'Prevents abuse through request rate limiting',
        content_sanitization: 'Sanitizes user-generated content',
        security_headers: 'Sets comprehensive security HTTP headers'
      },
      endpoints: {
        status: 'GET /api/security/status - Get security system status',
        violations: 'GET /api/security/violations - Get recent security violations',
        test: 'POST /api/security/test - Test security validation',
        schemas: 'GET /api/security/schemas - Get validation schemas',
        policies: 'GET /api/security/policies - Get security policies',
        config: 'GET /api/security/config - This configuration help'
      },
      test_types: [
        'input_validation',
        'sql_injection', 
        'xss_detection',
        'rate_limiting',
        'neo4j_injection'
      ],
      violation_severities: ['low', 'medium', 'high', 'critical'],
      violation_types: [
        'api_input_validation',
        'database_query_validation',
        'neo4j_query_validation',
        'rate_limit_exceeded'
      ]
    }
  });
});

/**
 * Health check for security service
 */
router.get('/health', (req, res) => {
  const status = securityGuardrailsService.getSecurityStatus();
  
  res.json({
    success: true,
    service: 'security_guardrails',
    initialized: status.initialized,
    policies: status.policies.length,
    timestamp: new Date().toISOString()
  });
});

export default router;