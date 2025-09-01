/**
 * Security Guardrails Service
 * Provides comprehensive security validation and sanitization for all data operations
 * Prevents injection attacks, validates inputs, and ensures data integrity
 */

// Note: Using built-in validation instead of external deps due to dependency conflicts
// import { z } from 'zod';
// import DOMPurify from 'isomorphic-dompurify';
import tracingService, { traceExternalCall } from './tracingService.js';

class SecurityGuardrailsService {
  constructor() {
    this.isInitialized = false;
    this.securityPolicies = new Map();
    this.violationLog = [];
    this.maxViolationLogSize = 1000;
    
    // SQL injection patterns to detect
    this.sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
      /(--|\/\*|\*\/|;|'|")/g,
      /(\bOR\b.*=.*|1=1|' OR '|" OR ")/gi,
      /(\bAND\b.*=.*|\bWHERE\b.*=.*)/gi,
      /(xp_cmdshell|sp_executesql|exec\s*\()/gi
    ];
    
    // NoSQL injection patterns (for Neo4j Cypher)
    this.noSqlInjectionPatterns = [
      /(MATCH|CREATE|DELETE|SET|REMOVE|MERGE|WITH|RETURN|WHERE)/gi,
      /(\$[a-zA-Z_]+|\{[^}]*\})/g,
      /(CALL\s+\w+|LOAD\s+CSV)/gi,
      /(apoc\.|algo\.|gds\.)/gi
    ];
    
    // XSS patterns
    this.xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<embed|<object|<applet/gi
    ];
    
    // Command injection patterns
    this.commandInjectionPatterns = [
      /[;&|`$(){}[\]\\]/g,
      /(rm|del|format|mkdir|rmdir|cat|type|copy|move|wget|curl)/gi,
      /(\|\||&&|>>|>|<)/g
    ];

    this.initialize();
  }

  /**
   * Initialize security guardrails service
   */
  async initialize() {
    try {
      console.log('🛡️ Initializing Security Guardrails Service...');
      
      // Set up default security policies
      this.setupDefaultPolicies();
      
      // Initialize rate limiting maps
      this.rateLimitMap = new Map();
      this.suspiciousActivityMap = new Map();
      
      this.isInitialized = true;
      console.log('✅ Security Guardrails Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Security Guardrails Service:', error.message);
      return false;
    }
  }

  /**
   * Set up default security policies
   */
  setupDefaultPolicies() {
    // API endpoint policies
    this.securityPolicies.set('api_input', {
      maxLength: 10000,
      allowHtml: false,
      requireSanitization: true,
      blockSqlInjection: true,
      blockXss: true,
      blockCommandInjection: true
    });

    // Database query policies  
    this.securityPolicies.set('database_query', {
      maxLength: 5000,
      requireParameterization: true,
      blockDynamicSql: true,
      allowedTables: ['user_profiles', 'projects', 'community_events', 'ai_recommendations'],
      forbiddenOperations: ['DROP', 'TRUNCATE', 'ALTER', 'CREATE']
    });

    // Neo4j query policies
    this.securityPolicies.set('neo4j_query', {
      maxLength: 3000,
      requireParameterization: true,
      allowedLabels: ['User', 'Project', 'Skill', 'Interest', 'Location'],
      forbiddenOperations: ['DELETE', 'DETACH DELETE', 'DROP', 'CREATE INDEX'],
      maxNodeLimit: 1000
    });

    // File upload policies
    this.securityPolicies.set('file_upload', {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      forbiddenExtensions: ['.exe', '.bat', '.cmd', '.sh', '.php', '.jsp'],
      requireVirusScan: true
    });

    // User input policies
    this.securityPolicies.set('user_content', {
      maxLength: 5000,
      allowBasicHtml: true,
      allowedHtmlTags: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
      requireModeration: true,
      blockProfanity: true
    });
  }

  /**
   * Validate and sanitize API input
   */
  async validateApiInput(input, endpoint, userId = null) {
    return await traceExternalCall('security_guardrails', 'validate_api_input', async (span) => {
      try {
        span.setAttributes({
          'security.endpoint': endpoint,
          'security.user_id': userId || 'anonymous',
          'security.input_length': typeof input === 'string' ? input.length : JSON.stringify(input).length
        });

        const policy = this.securityPolicies.get('api_input');
        const violations = [];

        // Check input length
        const inputString = typeof input === 'string' ? input : JSON.stringify(input);
        if (inputString.length > policy.maxLength) {
          violations.push(`Input exceeds maximum length of ${policy.maxLength} characters`);
        }

        // Check for SQL injection
        if (policy.blockSqlInjection && this.detectSqlInjection(inputString)) {
          violations.push('Potential SQL injection detected');
        }

        // Check for XSS
        if (policy.blockXss && this.detectXss(inputString)) {
          violations.push('Potential XSS attack detected');
        }

        // Check for command injection
        if (policy.blockCommandInjection && this.detectCommandInjection(inputString)) {
          violations.push('Potential command injection detected');
        }

        if (violations.length > 0) {
          this.logSecurityViolation({
            type: 'api_input_validation',
            endpoint,
            userId,
            violations,
            input: inputString.substring(0, 200) + '...', // Log first 200 chars only
            timestamp: new Date().toISOString(),
            severity: 'high'
          });

          span.setAttributes({
            'security.violations_count': violations.length,
            'security.blocked': true
          });

          throw new Error(`Security violation detected: ${violations.join(', ')}`);
        }

        // Sanitize input if required
        let sanitizedInput = input;
        if (policy.requireSanitization && typeof input === 'string') {
          sanitizedInput = this.sanitizeString(input, policy);
        }

        span.setAttributes({
          'security.violations_count': 0,
          'security.sanitized': sanitizedInput !== input
        });

        return {
          isValid: true,
          sanitizedInput,
          originalInput: input
        };

      } catch (error) {
        span.recordException(error);
        throw error;
      }
    });
  }

  /**
   * Validate database queries before execution
   */
  async validateDatabaseQuery(query, parameters = {}, operation = 'SELECT') {
    return await traceExternalCall('security_guardrails', 'validate_database_query', async (span) => {
      try {
        span.setAttributes({
          'security.query_type': operation,
          'security.query_length': query.length,
          'security.parameter_count': Object.keys(parameters).length
        });

        const policy = this.securityPolicies.get('database_query');
        const violations = [];

        // Check query length
        if (query.length > policy.maxLength) {
          violations.push(`Query exceeds maximum length of ${policy.maxLength} characters`);
        }

        // Check for forbidden operations
        const upperQuery = query.toUpperCase();
        for (const forbiddenOp of policy.forbiddenOperations) {
          if (upperQuery.includes(forbiddenOp)) {
            violations.push(`Forbidden operation detected: ${forbiddenOp}`);
          }
        }

        // Ensure parameterized queries
        if (policy.requireParameterization && this.detectDynamicSqlConstruction(query)) {
          violations.push('Dynamic SQL construction detected - use parameterized queries');
        }

        // Check for SQL injection patterns
        if (this.detectSqlInjection(query)) {
          violations.push('Potential SQL injection patterns detected');
        }

        if (violations.length > 0) {
          this.logSecurityViolation({
            type: 'database_query_validation',
            operation,
            violations,
            query: query.substring(0, 200) + '...',
            parameters: Object.keys(parameters),
            timestamp: new Date().toISOString(),
            severity: 'critical'
          });

          span.setAttributes({
            'security.violations_count': violations.length,
            'security.blocked': true
          });

          throw new Error(`Database query security violation: ${violations.join(', ')}`);
        }

        span.setAttributes({
          'security.violations_count': 0,
          'security.approved': true
        });

        return {
          isValid: true,
          query,
          parameters
        };

      } catch (error) {
        span.recordException(error);
        throw error;
      }
    });
  }

  /**
   * Validate Neo4j Cypher queries
   */
  async validateNeo4jQuery(cypher, parameters = {}) {
    return await traceExternalCall('security_guardrails', 'validate_neo4j_query', async (span) => {
      try {
        span.setAttributes({
          'security.cypher_length': cypher.length,
          'security.parameter_count': Object.keys(parameters).length
        });

        const policy = this.securityPolicies.get('neo4j_query');
        const violations = [];

        // Check query length
        if (cypher.length > policy.maxLength) {
          violations.push(`Cypher query exceeds maximum length of ${policy.maxLength} characters`);
        }

        // Check for forbidden operations
        const upperCypher = cypher.toUpperCase();
        for (const forbiddenOp of policy.forbiddenOperations) {
          if (upperCypher.includes(forbiddenOp)) {
            violations.push(`Forbidden Cypher operation detected: ${forbiddenOp}`);
          }
        }

        // Check for NoSQL injection patterns
        if (this.detectNoSqlInjection(cypher)) {
          violations.push('Potential Cypher injection patterns detected');
        }

        // Check node limit safety
        if (upperCypher.includes('MATCH') && !upperCypher.includes('LIMIT') && !upperCypher.includes('WHERE')) {
          violations.push('Unbounded MATCH query detected - add LIMIT or WHERE clause');
        }

        if (violations.length > 0) {
          this.logSecurityViolation({
            type: 'neo4j_query_validation',
            violations,
            cypher: cypher.substring(0, 200) + '...',
            parameters: Object.keys(parameters),
            timestamp: new Date().toISOString(),
            severity: 'high'
          });

          span.setAttributes({
            'security.violations_count': violations.length,
            'security.blocked': true
          });

          throw new Error(`Neo4j query security violation: ${violations.join(', ')}`);
        }

        span.setAttributes({
          'security.violations_count': 0,
          'security.approved': true
        });

        return {
          isValid: true,
          cypher,
          parameters
        };

      } catch (error) {
        span.recordException(error);
        throw error;
      }
    });
  }

  /**
   * Sanitize user content for safe display
   */
  sanitizeUserContent(content, allowBasicHtml = false) {
    if (typeof content !== 'string') {
      return content;
    }

    const policy = this.securityPolicies.get('user_content');
    
    if (allowBasicHtml || policy.allowBasicHtml) {
      // Simple HTML sanitization without DOMPurify
      // Allow only basic safe tags and remove dangerous attributes
      return content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove object tags
        .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // Remove embed tags
        .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '') // Remove form tags
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .replace(/javascript:/gi, '') // Remove javascript: links
        .replace(/<[^>]*style\s*=/gi, '<') // Remove inline styles
        .replace(/<(?!\/?(p|br|strong|em|u|a|ul|ol|li)\b)[^>]+>/gi, ''); // Allow only basic tags
    }

    // Strip all HTML and escape special characters
    return content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>&"']/g, (char) => {
        const entityMap = {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;',
          "'": '&#x27;'
        };
        return entityMap[char];
      });
  }

  /**
   * Rate limiting check
   */
  checkRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.rateLimitMap.has(identifier)) {
      this.rateLimitMap.set(identifier, []);
    }
    
    const requests = this.rateLimitMap.get(identifier);
    
    // Remove old requests outside the window
    while (requests.length > 0 && requests[0] < windowStart) {
      requests.shift();
    }
    
    // Check if limit exceeded
    if (requests.length >= maxRequests) {
      this.logSecurityViolation({
        type: 'rate_limit_exceeded',
        identifier,
        requestCount: requests.length,
        maxRequests,
        windowMs,
        timestamp: new Date().toISOString(),
        severity: 'medium'
      });
      
      return {
        allowed: false,
        requestCount: requests.length,
        resetTime: requests[0] + windowMs
      };
    }
    
    // Add current request
    requests.push(now);
    
    return {
      allowed: true,
      requestCount: requests.length,
      remaining: maxRequests - requests.length
    };
  }

  /**
   * Detect SQL injection patterns
   */
  detectSqlInjection(input) {
    if (typeof input !== 'string') return false;
    
    return this.sqlInjectionPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Detect NoSQL injection patterns
   */
  detectNoSqlInjection(input) {
    if (typeof input !== 'string') return false;
    
    return this.noSqlInjectionPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Detect XSS patterns
   */
  detectXss(input) {
    if (typeof input !== 'string') return false;
    
    return this.xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Detect command injection patterns
   */
  detectCommandInjection(input) {
    if (typeof input !== 'string') return false;
    
    return this.commandInjectionPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Detect dynamic SQL construction
   */
  detectDynamicSqlConstruction(query) {
    const dynamicPatterns = [
      /\+\s*["'][^"']*["']/g, // String concatenation
      /CONCAT\s*\(/gi,
      /\$\{[^}]+\}/g, // Template literals
      /%[sd]/g // Printf-style formatting
    ];
    
    return dynamicPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Sanitize string input
   */
  sanitizeString(input, policy = {}) {
    if (typeof input !== 'string') return input;
    
    let sanitized = input;
    
    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, '');
    
    // Normalize unicode
    sanitized = sanitized.normalize('NFKC');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Apply HTML sanitization if needed
    if (!policy.allowHtml) {
      sanitized = this.sanitizeUserContent(sanitized, false);
    }
    
    return sanitized;
  }

  /**
   * Log security violations
   */
  logSecurityViolation(violation) {
    // Add to violation log
    this.violationLog.push({
      id: `viol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...violation
    });
    
    // Trim log if too large
    if (this.violationLog.length > this.maxViolationLogSize) {
      this.violationLog = this.violationLog.slice(-this.maxViolationLogSize * 0.8);
    }
    
    // Log to console based on severity
    const logLevel = violation.severity === 'critical' ? 'error' : 
                    violation.severity === 'high' ? 'warn' : 'info';
    
    console[logLevel](`🚨 Security Violation [${violation.type}]:`, {
      violations: violation.violations,
      severity: violation.severity,
      timestamp: violation.timestamp
    });
  }

  /**
   * Get security status and statistics
   */
  getSecurityStatus() {
    const recentViolations = this.violationLog.filter(
      v => Date.now() - new Date(v.timestamp).getTime() < 3600000 // Last hour
    );
    
    const violationsByType = recentViolations.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {});
    
    const violationsBySeverity = recentViolations.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, {});
    
    return {
      initialized: this.isInitialized,
      policies: Array.from(this.securityPolicies.keys()),
      totalViolations: this.violationLog.length,
      recentViolations: recentViolations.length,
      violationsByType,
      violationsBySeverity,
      rateLimitedIdentifiers: this.rateLimitMap.size,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Get recent security violations
   */
  getRecentViolations(limit = 50) {
    return this.violationLog
      .slice(-limit)
      .reverse()
      .map(v => ({
        ...v,
        // Redact sensitive data
        input: v.input ? v.input.substring(0, 100) + '...' : undefined,
        query: v.query ? v.query.substring(0, 100) + '...' : undefined,
        cypher: v.cypher ? v.cypher.substring(0, 100) + '...' : undefined
      }));
  }

  /**
   * Create validation schema for common validations
   */
  createValidationSchema() {
    return {
      userInput: {
        validate: (input) => {
          if (!input || typeof input !== 'string') return { valid: false, error: 'Input cannot be empty' };
          if (input.length > 5000) return { valid: false, error: 'Input too long' };
          if (this.detectSqlInjection(input)) return { valid: false, error: 'SQL injection detected' };
          if (this.detectXss(input)) return { valid: false, error: 'XSS detected' };
          if (this.detectCommandInjection(input)) return { valid: false, error: 'Command injection detected' };
          return { valid: true };
        }
      },
      
      email: {
        validate: (email) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) return { valid: false, error: 'Invalid email format' };
          if (email.length > 255) return { valid: false, error: 'Email too long' };
          return { valid: true };
        }
      },
      
      id: {
        validate: (id) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(id)) return { valid: false, error: 'Invalid ID format' };
          return { valid: true };
        }
      },
      
      queryLimit: {
        validate: (limit) => {
          const num = parseInt(limit);
          if (isNaN(num)) return { valid: false, error: 'Limit must be integer' };
          if (num < 1) return { valid: false, error: 'Limit too small' };
          if (num > 1000) return { valid: false, error: 'Limit too large' };
          return { valid: true };
        }
      },
      
      userProfile: {
        validate: (profile) => {
          if (!profile || typeof profile !== 'object') return { valid: false, error: 'Invalid profile format' };
          
          if (!profile.display_name || profile.display_name.length < 1 || profile.display_name.length > 100) {
            return { valid: false, error: 'Display name must be 1-100 characters' };
          }
          
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!profile.email || !emailRegex.test(profile.email)) {
            return { valid: false, error: 'Invalid email format' };
          }
          
          if (profile.interests && (!Array.isArray(profile.interests) || profile.interests.length > 20)) {
            return { valid: false, error: 'Interests must be array with max 20 items' };
          }
          
          return { valid: true };
        }
      }
    };
  }

  /**
   * Close service and cleanup
   */
  async close() {
    console.log('🛡️ Closing Security Guardrails Service...');
    
    // Clear rate limiting data
    this.rateLimitMap.clear();
    this.suspiciousActivityMap.clear();
    
    // Clear violation log (keep last 100 entries)
    if (this.violationLog.length > 100) {
      this.violationLog = this.violationLog.slice(-100);
    }
    
    this.isInitialized = false;
    console.log('✅ Security Guardrails Service closed');
  }
}

// Create singleton instance
const securityGuardrailsService = new SecurityGuardrailsService();

export default securityGuardrailsService;

// Export utility functions
export const validateApiInput = (input, endpoint, userId) => 
  securityGuardrailsService.validateApiInput(input, endpoint, userId);

export const validateDatabaseQuery = (query, parameters, operation) => 
  securityGuardrailsService.validateDatabaseQuery(query, parameters, operation);

export const validateNeo4jQuery = (cypher, parameters) => 
  securityGuardrailsService.validateNeo4jQuery(cypher, parameters);

export const sanitizeUserContent = (content, allowBasicHtml) => 
  securityGuardrailsService.sanitizeUserContent(content, allowBasicHtml);

export const checkRateLimit = (identifier, maxRequests, windowMs) => 
  securityGuardrailsService.checkRateLimit(identifier, maxRequests, windowMs);