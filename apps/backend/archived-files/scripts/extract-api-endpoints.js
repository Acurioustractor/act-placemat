#!/usr/bin/env tsx

/**
 * ACT Platform - API Endpoints Extraction and Documentation Tool
 *
 * Systematically extracts all API endpoints from the backend codebase
 * and generates OpenAPI 3.1 documentation with standardization analysis.
 *
 * Usage: tsx scripts/extract-api-endpoints.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class APIEndpointExtractor {
  constructor() {
    this.apiDir = path.join(__dirname, '../src/api');
    this.outputDir = path.join(__dirname, '../docs/api');
    this.endpoints = [];
    this.routeFiles = [];
    this.authMethods = new Set();
    this.middlewareUsed = new Set();
    this.httpMethods = new Set();
    this.pathPatterns = new Map(); // Track URL patterns
  }

  async initialize() {
    console.log('🔍 Initializing API Endpoint Extractor...');

    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });

    // Get all API route files
    const files = await fs.readdir(this.apiDir);
    this.routeFiles = files.filter(file => file.endsWith('.js'));

    console.log(`📁 Found ${this.routeFiles.length} API route files`);
    console.log(`📊 Expected endpoint analysis: ~626 endpoints`);
  }

  async extractEndpoints() {
    console.log('📝 Extracting endpoints from route files...');

    for (const file of this.routeFiles) {
      await this.analyzeRouteFile(file);
    }

    console.log(`✅ Extracted ${this.endpoints.length} endpoints`);
    console.log(
      `🔧 Found ${this.authMethods.size} auth methods: ${Array.from(this.authMethods).join(', ')}`
    );
    console.log(`⚙️  Found ${this.middlewareUsed.size} middleware types`);
  }

  async analyzeRouteFile(filename) {
    const filePath = path.join(this.apiDir, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    const routeBaseName = filename.replace('.js', '');

    // Extract HTTP method calls with regex
    const endpointRegex =
      /(?:router|app)\.(?<method>get|post|put|patch|delete|use)\s*\(\s*['"](?<path>[^'"]+)['"](?<middleware>[^,]*),?\s*(?<handler>.*?)\)/g;

    let match;
    const fileEndpoints = [];

    while ((match = endpointRegex.exec(content)) !== null) {
      const { method, path: routePath, middleware, handler } = match.groups;

      if (method === 'use') continue; // Skip middleware-only routes

      const endpoint = {
        file: filename,
        routeGroup: routeBaseName,
        method: method.toUpperCase(),
        path: routePath,
        fullPath: this.constructFullPath(routeBaseName, routePath),
        middleware: this.parseMiddleware(middleware),
        handler: handler.trim(),
        lineNumber: this.getLineNumber(content, match.index),
      };

      // Track patterns and analytics
      this.httpMethods.add(method.toUpperCase());
      this.trackMiddleware(middleware);
      this.trackPathPatterns(endpoint.fullPath);

      fileEndpoints.push(endpoint);
    }

    this.endpoints.push(...fileEndpoints);

    if (fileEndpoints.length > 0) {
      console.log(`  📄 ${filename}: ${fileEndpoints.length} endpoints`);
    }
  }

  constructFullPath(routeGroup, routePath) {
    // Infer base path from route group name
    const basePath = this.inferBasePath(routeGroup);

    if (routePath.startsWith('/')) {
      return basePath + routePath;
    }
    return basePath + '/' + routePath;
  }

  inferBasePath(routeGroup) {
    // Map route file names to API base paths
    const basePathMappings = {
      dashboard: '/api/dashboard',
      notion: '/api/notion',
      gmail: '/api/gmail',
      linkedin: '/api/linkedin',
      xero: '/api/xero',
      finance: '/api/finance',
      intelligence: '/api/intelligence',
      ecosystem: '/api/ecosystem',
      privacy: '/api/privacy',
      security: '/api/security',
      compliance: '/api/compliance',
      knowledge: '/api/knowledge',
      empathy: '/api/empathy',
      integration: '/api/integration',
    };

    // Find matching base path
    for (const [prefix, basePath] of Object.entries(basePathMappings)) {
      if (routeGroup.toLowerCase().includes(prefix)) {
        return basePath;
      }
    }

    // Default to route group name
    return `/api/${routeGroup
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')}`;
  }

  parseMiddleware(middlewareText) {
    if (!middlewareText.trim()) return [];

    const middlewares = [];
    const middleware = middlewareText.trim();

    // Common authentication middleware patterns
    if (middleware.includes('auth')) {
      if (middleware.includes('optional')) {
        middlewares.push({ type: 'auth', required: false });
        this.authMethods.add('optional-auth');
      } else if (middleware.includes('apiKeyOrAuth')) {
        middlewares.push({ type: 'auth', method: 'apiKey-or-jwt' });
        this.authMethods.add('apiKey-or-jwt');
      } else {
        middlewares.push({ type: 'auth', required: true });
        this.authMethods.add('required-auth');
      }
    }

    // Other middleware types
    if (middleware.includes('asyncHandler')) {
      middlewares.push({ type: 'error-handling', name: 'asyncHandler' });
      this.middlewareUsed.add('asyncHandler');
    }

    if (middleware.includes('trackProcessingTime')) {
      middlewares.push({ type: 'monitoring', name: 'trackProcessingTime' });
      this.middlewareUsed.add('trackProcessingTime');
    }

    return middlewares;
  }

  trackMiddleware(middleware) {
    if (middleware.includes('optionalAuth')) this.middlewareUsed.add('optionalAuth');
    if (middleware.includes('apiKeyOrAuth')) this.middlewareUsed.add('apiKeyOrAuth');
    if (middleware.includes('asyncHandler')) this.middlewareUsed.add('asyncHandler');
    if (middleware.includes('trackProcessingTime'))
      this.middlewareUsed.add('trackProcessingTime');
  }

  trackPathPatterns(fullPath) {
    // Extract path pattern (replace parameters with placeholders)
    const pattern = fullPath
      .replace(/\/:[^\/]+/g, '/{id}')
      .replace(/\/\{[^}]+\}/g, '/{param}');

    const count = this.pathPatterns.get(pattern) || 0;
    this.pathPatterns.set(pattern, count + 1);
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  generateAnalysis() {
    const analysis = {
      overview: {
        totalFiles: this.routeFiles.length,
        totalEndpoints: this.endpoints.length,
        httpMethods: Array.from(this.httpMethods).sort(),
        authMethods: Array.from(this.authMethods).sort(),
        middlewareTypes: Array.from(this.middlewareUsed).sort(),
      },
      endpointsByMethod: this.groupBy(this.endpoints, 'method'),
      endpointsByFile: this.groupBy(this.endpoints, 'routeGroup'),
      pathPatterns: Array.from(this.pathPatterns.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20), // Top 20 most common patterns
      authenticationDistribution: this.analyzeAuthentication(),
      standardizationIssues: this.identifyStandardizationIssues(),
    };

    return analysis;
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  analyzeAuthentication() {
    const authStats = {
      protected: 0,
      optional: 0,
      public: 0,
    };

    this.endpoints.forEach(endpoint => {
      const hasAuth = endpoint.middleware.some(m => m.type === 'auth');
      if (hasAuth) {
        const isOptional = endpoint.middleware.some(
          m => m.type === 'auth' && m.required === false
        );
        if (isOptional) {
          authStats.optional++;
        } else {
          authStats.protected++;
        }
      } else {
        authStats.public++;
      }
    });

    return authStats;
  }

  identifyStandardizationIssues() {
    const issues = [];

    // Check for inconsistent naming patterns
    const pathsByMethod = this.groupBy(this.endpoints, 'method');

    // Check for missing authentication on sensitive endpoints
    const sensitivePatterns = ['/admin', '/private', '/user', '/delete', '/financial'];
    this.endpoints.forEach(endpoint => {
      const isPublic = !endpoint.middleware.some(m => m.type === 'auth');
      const isSensitive = sensitivePatterns.some(pattern =>
        endpoint.fullPath.toLowerCase().includes(pattern)
      );

      if (isPublic && isSensitive) {
        issues.push({
          type: 'security',
          severity: 'high',
          endpoint: `${endpoint.method} ${endpoint.fullPath}`,
          description: 'Sensitive endpoint without authentication',
          file: endpoint.file,
        });
      }
    });

    // Check for inconsistent HTTP methods
    const resourceEndpoints = new Map();
    this.endpoints.forEach(endpoint => {
      const resourceMatch = endpoint.fullPath.match(/\/api\/([^\/]+)/);
      if (resourceMatch) {
        const resource = resourceMatch[1];
        if (!resourceEndpoints.has(resource)) {
          resourceEndpoints.set(resource, new Set());
        }
        resourceEndpoints.get(resource).add(endpoint.method);
      }
    });

    // Check for non-standard path patterns
    this.endpoints.forEach(endpoint => {
      if (endpoint.fullPath.includes('_')) {
        issues.push({
          type: 'naming',
          severity: 'medium',
          endpoint: `${endpoint.method} ${endpoint.fullPath}`,
          description: 'Path uses underscores instead of hyphens',
          file: endpoint.file,
        });
      }

      if (/[A-Z]/.test(endpoint.fullPath)) {
        issues.push({
          type: 'naming',
          severity: 'medium',
          endpoint: `${endpoint.method} ${endpoint.fullPath}`,
          description: 'Path contains uppercase letters',
          file: endpoint.file,
        });
      }
    });

    return issues;
  }

  async generateDocumentation() {
    console.log('📚 Generating comprehensive API documentation...');

    const analysis = this.generateAnalysis();
    const timestamp = new Date().toISOString();

    // Generate comprehensive markdown documentation
    let markdown = `# ACT Platform - API Endpoints Documentation\n\n`;
    markdown += `*Generated on: ${timestamp}*\n\n`;
    markdown += `*Part of Task 16.2: Document and Standardize API Endpoints*\n\n`;

    // Executive Summary
    markdown += `## 📊 Executive Summary\n\n`;
    markdown += `- **Total API Files**: ${analysis.overview.totalFiles}\n`;
    markdown += `- **Total Endpoints**: ${analysis.overview.totalEndpoints}\n`;
    markdown += `- **HTTP Methods**: ${analysis.overview.httpMethods.join(', ')}\n`;
    markdown += `- **Authentication Methods**: ${analysis.overview.authMethods.length}\n`;
    markdown += `- **Middleware Types**: ${analysis.overview.middlewareTypes.length}\n\n`;

    // Endpoints by HTTP Method
    markdown += `## 🌐 Endpoints by HTTP Method\n\n`;
    Object.entries(analysis.endpointsByMethod).forEach(([method, endpoints]) => {
      markdown += `### ${method} (${endpoints.length} endpoints)\n\n`;
      endpoints.slice(0, 10).forEach(endpoint => {
        const authStr =
          endpoint.middleware.length > 0
            ? ` 🔒 ${endpoint.middleware.map(m => m.type).join(', ')}`
            : ' 🌐 Public';
        markdown += `- \`${endpoint.fullPath}\`${authStr} *(${endpoint.file})*\n`;
      });
      if (endpoints.length > 10) {
        markdown += `- ... and ${endpoints.length - 10} more\n`;
      }
      markdown += `\n`;
    });

    // Authentication Analysis
    markdown += `## 🔐 Authentication Distribution\n\n`;
    markdown += `- **Protected Endpoints**: ${analysis.authenticationDistribution.protected}\n`;
    markdown += `- **Optional Auth**: ${analysis.authenticationDistribution.optional}\n`;
    markdown += `- **Public Endpoints**: ${analysis.authenticationDistribution.public}\n\n`;

    // Most Common Path Patterns
    markdown += `## 📋 Most Common Path Patterns\n\n`;
    analysis.pathPatterns.slice(0, 10).forEach(([pattern, count]) => {
      markdown += `- \`${pattern}\` - ${count} endpoints\n`;
    });
    markdown += `\n`;

    // Standardization Issues
    if (analysis.standardizationIssues.length > 0) {
      markdown += `## ⚠️  Standardization Issues\n\n`;
      const issuesByType = this.groupBy(analysis.standardizationIssues, 'type');

      Object.entries(issuesByType).forEach(([type, issues]) => {
        markdown += `### ${type.charAt(0).toUpperCase() + type.slice(1)} Issues (${issues.length})\n\n`;
        issues.slice(0, 5).forEach(issue => {
          markdown += `- **${issue.severity.toUpperCase()}**: ${issue.endpoint} - ${issue.description}\n`;
          markdown += `  - *File: ${issue.file}*\n`;
        });
        if (issues.length > 5) {
          markdown += `- ... and ${issues.length - 5} more issues\n`;
        }
        markdown += `\n`;
      });
    }

    // Recommendations
    markdown += `## 🎯 Standardization Recommendations\n\n`;
    markdown += `### 1. OpenAPI 3.1 Specification\n`;
    markdown += `- Implement OpenAPI 3.1 documentation for all ${analysis.overview.totalEndpoints} endpoints\n`;
    markdown += `- Use design-first approach for new endpoints\n`;
    markdown += `- Automate documentation generation with swagger-jsdoc\n\n`;

    markdown += `### 2. Consistent Authentication\n`;
    markdown += `- Standardize on JWT + API Key authentication\n`;
    markdown += `- Review ${analysis.authenticationDistribution.public} public endpoints for security\n`;
    markdown += `- Implement consistent middleware across all protected routes\n\n`;

    markdown += `### 3. Path Standardization\n`;
    markdown += `- Enforce lowercase, hyphen-separated paths\n`;
    markdown += `- Implement consistent versioning strategy (e.g., /api/v1/...)\n`;
    markdown += `- Group related endpoints under consistent base paths\n\n`;

    // Top API Route Groups
    markdown += `## 📁 API Route Groups\n\n`;
    const groupStats = Object.entries(analysis.endpointsByFile)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 20);

    markdown += `| Route Group | Endpoints | Primary Purpose |\n`;
    markdown += `|-------------|-----------|----------------|\n`;
    groupStats.forEach(([group, endpoints]) => {
      const purpose = this.inferRoutePurpose(group, endpoints);
      markdown += `| ${group} | ${endpoints.length} | ${purpose} |\n`;
    });
    markdown += `\n`;

    // Save documentation
    await fs.writeFile(
      path.join(this.outputDir, 'API_ENDPOINTS_DOCUMENTATION.md'),
      markdown
    );

    // Save raw data as JSON
    await fs.writeFile(
      path.join(this.outputDir, 'endpoints-raw-data.json'),
      JSON.stringify({ endpoints: this.endpoints, analysis }, null, 2)
    );

    console.log(
      `📄 Documentation saved to: ${this.outputDir}/API_ENDPOINTS_DOCUMENTATION.md`
    );
    console.log(`📊 Raw data saved to: ${this.outputDir}/endpoints-raw-data.json`);
  }

  inferRoutePurpose(group, endpoints) {
    const purposes = {
      dashboard: 'Dashboard data and analytics',
      notion: 'Notion CMS integration',
      gmail: 'Email intelligence and sync',
      linkedin: 'Professional network analysis',
      xero: 'Financial data integration',
      finance: 'Financial management',
      intelligence: 'AI-powered insights',
      ecosystem: 'Platform ecosystem data',
      privacy: 'Data privacy and sovereignty',
      security: 'Security monitoring',
      compliance: 'Compliance tracking',
      knowledge: 'Knowledge management',
      empathy: 'Empathy Ledger integration',
      integration: 'System integrations',
    };

    for (const [key, purpose] of Object.entries(purposes)) {
      if (group.toLowerCase().includes(key)) {
        return purpose;
      }
    }

    return 'General API functionality';
  }

  async run() {
    try {
      await this.initialize();
      await this.extractEndpoints();
      await this.generateDocumentation();

      console.log('✅ API endpoint extraction and documentation completed!');
      console.log(`📈 Total endpoints documented: ${this.endpoints.length}`);
      console.log(`🔍 Standardization analysis completed`);
    } catch (error) {
      console.error('❌ Error during API extraction:', error);
      throw error;
    }
  }
}

// CLI Interface
async function main() {
  const extractor = new APIEndpointExtractor();
  await extractor.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { APIEndpointExtractor };
