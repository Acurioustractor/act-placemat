#!/usr/bin/env node

/**
 * ACT Platform - OpenAPI Documentation Generator
 *
 * Generates OpenAPI 3.1 documentation from JSDoc comments in route files
 * and creates interactive Swagger UI documentation.
 *
 * Usage: node scripts/generate-openapi-docs.js
 */

import swaggerJsdoc from 'swagger-jsdoc';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class OpenAPIDocumentationGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '../docs/api');
    this.apiDir = path.join(__dirname, '../src/api');
    this.docsOutputFile = path.join(this.outputDir, 'openapi.yaml');
    this.jsonOutputFile = path.join(this.outputDir, 'openapi.json');
  }

  async initialize() {
    console.log('🔍 Initializing OpenAPI Documentation Generator...');

    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });
    console.log(`📁 Output directory: ${this.outputDir}`);
  }

  async generateOpenAPISpec() {
    console.log('📝 Generating OpenAPI 3.1 specification...');

    // OpenAPI configuration
    const options = {
      definition: {
        openapi: '3.1.0',
        info: {
          title: 'ACT Platform API',
          version: '1.0.0',
          description: `
**ACT Platform API** - Community collaboration and social impact platform

The ACT Platform connects people, projects, and opportunities across Australia, 
focusing on collaborative social impact initiatives.

This API provides access to:
- **Dashboard & Analytics**: Real-time insights and community metrics
- **Financial Management**: Bookkeeping, receipts, billing, and financial tracking  
- **External Integrations**: Notion, Gmail, LinkedIn, Xero, and other services
- **AI & Intelligence**: Content generation, relationship analysis, and insights
- **Data Management**: Knowledge graphs, ecosystem data, and validation
- **Security & Compliance**: Privacy controls, audit logs, and governance

## Authentication

The API supports multiple authentication methods:
- **JWT Bearer Tokens** for user authentication
- **API Keys** for service-to-service communication
- **Optional Auth** for public/private data access

## Rate Limiting

Standard rate limits apply:
- **Authenticated requests**: 1000 requests/hour
- **Public endpoints**: 100 requests/hour
- **AI/ML endpoints**: 50 requests/hour (higher processing cost)
          `.trim(),
          contact: {
            name: 'ACT Platform Team',
            url: 'https://act.place',
            email: 'platform@act.place',
          },
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT',
          },
        },
        servers: [
          {
            url: 'https://api.act.place/v1',
            description: 'Production server',
          },
          {
            url: 'https://staging-api.act.place/v1',
            description: 'Staging server',
          },
          {
            url: 'http://localhost:4000/api',
            description: 'Local development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'JWT token obtained from authentication endpoint',
            },
            apiKeyAuth: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key',
              description: 'API key for service-to-service authentication',
            },
            optionalAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description:
                'Optional JWT authentication - provides additional data when authenticated',
            },
          },
          schemas: {
            ApiResponse: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  description: 'Whether the request was successful',
                },
                data: {
                  type: 'object',
                  description: 'The response data (when success is true)',
                },
                error: {
                  type: 'string',
                  description: 'Error message (when success is false)',
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                },
                requestId: {
                  type: 'string',
                  description: 'Unique request identifier for tracking',
                },
              },
              required: ['success'],
            },
            ErrorResponse: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: false,
                },
                error: {
                  type: 'string',
                  description: 'Human-readable error message',
                },
                code: {
                  type: 'string',
                  description: 'Machine-readable error code',
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                },
                requestId: {
                  type: 'string',
                },
              },
              required: ['success', 'error'],
            },
          },
          responses: {
            BadRequest: {
              description: 'Bad request - invalid input parameters',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            Unauthorized: {
              description: 'Unauthorized - invalid or missing authentication',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            Forbidden: {
              description: 'Forbidden - insufficient permissions',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            NotFound: {
              description: 'Resource not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            InternalServerError: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
        tags: [
          { name: 'System', description: 'System health and status endpoints' },
          {
            name: 'Authentication',
            description: 'User authentication and authorization',
          },
          { name: 'Dashboard', description: 'Dashboard data and analytics' },
          { name: 'Financial', description: 'Financial management and bookkeeping' },
          {
            name: 'Integration Registry',
            description: 'Integration registry management',
          },
          { name: 'AI Intelligence', description: 'AI-powered insights and analysis' },
          { name: 'Data Management', description: 'Data processing and validation' },
          { name: 'Security', description: 'Security monitoring and compliance' },
          {
            name: 'External Integrations',
            description: 'Third-party service integrations',
          },
        ],
      },
      apis: [
        `${this.apiDir}/*.js`, // All API route files
        path.join(__dirname, '../src/server.js'), // Main server file
        `${__dirname}/../docs/api/*.yaml`, // Additional schema files
      ],
    };

    try {
      // Generate the OpenAPI specification
      const specs = swaggerJsdoc(options);

      // Add manual endpoints that don't have JSDoc yet
      await this.addManualEndpoints(specs);

      console.log(
        `✅ Generated OpenAPI spec with ${Object.keys(specs.paths || {}).length} endpoints`
      );
      return specs;
    } catch (error) {
      console.error('❌ Error generating OpenAPI spec:', error);
      throw error;
    }
  }

  async addManualEndpoints(specs) {
    console.log('📄 Adding manual endpoint definitions...');

    // Ensure paths object exists
    if (!specs.paths) {
      specs.paths = {};
    }

    // Add health check endpoint
    specs.paths['/health'] = {
      get: {
        summary: 'API Health Check',
        description: 'Returns the health status of the API and its dependencies',
        tags: ['System'],
        security: [], // Public endpoint
        responses: {
          200: {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['healthy', 'degraded', 'unhealthy'],
                    },
                    timestamp: {
                      type: 'string',
                      format: 'date-time',
                    },
                    version: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    // Add integration registry endpoints
    specs.paths['/integration-registry'] = {
      get: {
        summary: 'Get integration registry overview',
        description:
          'Returns overview of all registered integrations and their health status',
        tags: ['Integration Registry'],
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
        responses: {
          200: {
            description: 'Integration registry data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/InternalServerError' },
        },
      },
    };

    console.log(
      `📝 Added ${Object.keys(specs.paths).length} total endpoints to specification`
    );
  }

  async saveDocumentation(specs) {
    console.log('💾 Saving OpenAPI documentation...');

    try {
      // Save as YAML
      const yamlString = yaml.dump(specs, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
      });
      await fs.writeFile(this.docsOutputFile, yamlString);
      console.log(`📄 YAML documentation saved: ${this.docsOutputFile}`);

      // Save as JSON
      const jsonString = JSON.stringify(specs, null, 2);
      await fs.writeFile(this.jsonOutputFile, jsonString);
      console.log(`📄 JSON documentation saved: ${this.jsonOutputFile}`);

      // Generate summary statistics
      const stats = {
        totalEndpoints: Object.keys(specs.paths || {}).length,
        tags: specs.tags?.map(t => t.name) || [],
        securitySchemes: Object.keys(specs.components?.securitySchemes || {}),
        schemas: Object.keys(specs.components?.schemas || {}),
        generatedAt: new Date().toISOString(),
      };

      await fs.writeFile(
        path.join(this.outputDir, 'documentation-stats.json'),
        JSON.stringify(stats, null, 2)
      );

      console.log(`📊 Documentation statistics saved`);
      return stats;
    } catch (error) {
      console.error('❌ Error saving documentation:', error);
      throw error;
    }
  }

  async generateSwaggerUIConfig() {
    console.log('🎨 Generating Swagger UI configuration...');

    const swaggerUIConfig = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ACT Platform API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui.css" />
    <style>
        html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        body {
            margin:0;
            background: #fafafa;
        }
        .swagger-ui .topbar {
            background-color: #2c5282;
        }
        .swagger-ui .topbar .download-url-wrapper input[type=text] {
            border: 1px solid #2c5282;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-standalone-preset.js"></script>
    <script>
    window.onload = function() {
        const ui = SwaggerUIBundle({
            url: './openapi.yaml',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
            ],
            plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout",
            tryItOutEnabled: true,
            requestInterceptor: function(request) {
                // Add custom headers if needed
                request.headers['X-API-Client'] = 'swagger-ui';
                return request;
            },
            responseInterceptor: function(response) {
                // Log responses for debugging
                console.log('API Response:', response);
                return response;
            }
        });
    };
    </script>
</body>
</html>
    `.trim();

    await fs.writeFile(path.join(this.outputDir, 'swagger-ui.html'), swaggerUIConfig);

    console.log(`🎨 Swagger UI HTML saved: ${this.outputDir}/swagger-ui.html`);
  }

  async generateImplementationGuide() {
    console.log('📚 Generating implementation guide...');

    const implementationGuide = `# ACT Platform - OpenAPI Implementation Guide

*Generated on: ${new Date().toISOString()}*

## 📋 Current Status

This OpenAPI documentation is **under development**. Currently documented:
- Base API structure and authentication
- Health check endpoints
- Integration registry endpoints
- Standard error responses and schemas

## 🎯 Next Steps for Complete Documentation

### Phase 1: High-Priority Endpoints (Priority order)

1. **Financial Management** (bookkeeping.js - 20 endpoints)
2. **Dashboard Analytics** (dashboard.js - 14 endpoints)  
3. **Integration Registry** (integration-registry.js)
4. **Security & Compliance** (security.js, privacy.js)

### Phase 2: External Integrations

1. **Notion Integration** (notion-*.js files)
2. **Gmail Intelligence** (gmail-*.js files)
3. **LinkedIn Analysis** (linkedin-*.js files)
4. **Xero Financial** (xero-*.js files)

### Phase 3: AI & Intelligence

1. **AI Decision Support** (aiDecisionSupport.js)
2. **Relationship Intelligence** (relationshipIntelligence.js)
3. **Content Creation** (contentCreation.js)
4. **ML Pipeline** (mlPipeline.js)

## 🛠️ Adding JSDoc Documentation

To document an endpoint, add JSDoc comments above the route definition:

\`\`\`javascript
/**
 * @openapi
 * /api/financial/invoices:
 *   get:
 *     summary: Get all invoices
 *     description: Retrieve a list of all invoices with optional filtering
 *     tags:
 *       - Financial
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         description: Filter by invoice status
 *         schema:
 *           type: string
 *           enum: [draft, sent, paid, overdue]
 *       - name: limit
 *         in: query
 *         description: Maximum number of results
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: List of invoices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Invoice'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/invoices', apiKeyOrAuth, asyncHandler(async (req, res) => {
    // Implementation here
}));
\`\`\`

## 🧪 Testing the Documentation

1. **View Interactive Docs**: Open \`docs/api/swagger-ui.html\` in a browser
2. **Validate Schema**: Use online OpenAPI validators
3. **Test Endpoints**: Use the "Try it out" feature in Swagger UI

## 📊 Documentation Coverage Goals

- **Week 1**: 50 endpoints documented (8% of 626 total)
- **Week 2**: 150 endpoints documented (24% of 626 total)  
- **Week 4**: 400 endpoints documented (64% of 626 total)
- **Week 6**: 626 endpoints documented (100% coverage)

## 🔧 Regenerating Documentation

Run the documentation generator after adding JSDoc comments:

\`\`\`bash
node scripts/generate-openapi-docs.js
\`\`\`

This will update:
- \`docs/api/openapi.yaml\` - Main OpenAPI specification
- \`docs/api/openapi.json\` - JSON format for tooling
- \`docs/api/swagger-ui.html\` - Interactive documentation
- \`docs/api/documentation-stats.json\` - Coverage statistics
`;

    await fs.writeFile(
      path.join(this.outputDir, 'IMPLEMENTATION_GUIDE.md'),
      implementationGuide
    );

    console.log(
      `📚 Implementation guide saved: ${this.outputDir}/IMPLEMENTATION_GUIDE.md`
    );
  }

  async run() {
    try {
      await this.initialize();

      const specs = await this.generateOpenAPISpec();
      const stats = await this.saveDocumentation(specs);

      await this.generateSwaggerUIConfig();
      await this.generateImplementationGuide();

      console.log('\\n✅ OpenAPI documentation generation completed!');
      console.log(`📈 Total endpoints in spec: ${stats.totalEndpoints}`);
      console.log(`🏷️  Tags: ${stats.tags.join(', ')}`);
      console.log(`🔐 Security schemes: ${stats.securitySchemes.join(', ')}`);
      console.log(`📄 Generated files:`);
      console.log(`   - ${this.docsOutputFile}`);
      console.log(`   - ${this.jsonOutputFile}`);
      console.log(`   - ${path.join(this.outputDir, 'swagger-ui.html')}`);
      console.log(`   - ${path.join(this.outputDir, 'IMPLEMENTATION_GUIDE.md')}`);

      console.log('\\n🎯 Next steps:');
      console.log('   1. Add JSDoc comments to high-priority route files');
      console.log(
        '   2. Open docs/api/swagger-ui.html to view interactive documentation'
      );
      console.log('   3. Run this script again after adding documentation');
    } catch (error) {
      console.error('❌ Error during OpenAPI documentation generation:', error);
      process.exit(1);
    }
  }
}

// CLI execution
console.log('Script starting...');
console.log('import.meta.url:', import.meta.url);
console.log('process.argv[1]:', process.argv[1]);
console.log('file://process.argv[1]:', `file://${process.argv[1]}`);

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running generator...');
  const generator = new OpenAPIDocumentationGenerator();
  generator.run();
} else {
  console.log('CLI condition not met, running anyway for testing...');
  const generator = new OpenAPIDocumentationGenerator();
  generator.run();
}

export { OpenAPIDocumentationGenerator };
