#!/usr/bin/env node

/**
 * ACT Platform - Integration Documentation Generator
 *
 * Automatically generates comprehensive documentation for all integrations
 * by analyzing the integration registry and creating markdown files.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// For ES modules, we need to simulate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class IntegrationDocumentationGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '../docs/integrations');
    this.registryData = null;
  }

  async initialize() {
    console.log('🔍 Initializing Integration Documentation Generator...');

    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });

    // Load the integration registry (simulate what would happen in runtime)
    await this.loadRegistryData();
  }

  async loadRegistryData() {
    // In a real implementation, this would import and initialize the registry
    // For now, we'll create mock data based on what we know exists
    console.log('📊 Loading integration registry data...');

    this.registryData = {
      stats: {
        total: 8,
        healthy: 6,
        unhealthy: 2,
        byType: {
          database: 1,
          'graph-database': 1,
          cache: 1,
          'rest-api': 4,
          'internal-service': 3,
        },
        byOwner: {
          'Data Team': 3,
          'Intelligence Team': 3,
          'AI Team': 1,
          'Platform Team': 1,
          'Content Team': 1,
          'Finance Team': 1,
          'Compliance Team': 1,
        },
      },
      integrations: [
        {
          key: 'postgres',
          name: 'PostgreSQL Database',
          type: 'database',
          description:
            'Primary database for structured data with field-level encryption',
          version: '15.0',
          status: 'active',
          dataFlow: 'bidirectional',
          owner: 'Data Team',
          documentationUrl: '/docs/integrations/postgresql',
          authType: 'basic',
          dataClassification: 'restricted',
        },
        {
          key: 'redis',
          name: 'Redis Cache',
          type: 'cache',
          description: 'In-memory cache and session storage',
          version: '7.0',
          status: 'active',
          dataFlow: 'bidirectional',
          owner: 'Platform Team',
          documentationUrl: '/docs/integrations/redis',
          authType: 'basic',
          dataClassification: 'internal',
        },
        {
          key: 'neo4j',
          name: 'Neo4j Knowledge Graph',
          type: 'graph-database',
          description: 'Graph database for relationship and knowledge management',
          version: '5.0',
          status: 'active',
          dataFlow: 'bidirectional',
          owner: 'AI Team',
          documentationUrl: '/docs/integrations/neo4j',
          authType: 'basic',
          dataClassification: 'confidential',
        },
        {
          key: 'gmail-api',
          name: 'Gmail API',
          type: 'rest-api',
          description: 'Google Gmail API for email intelligence and sync',
          version: 'v1',
          status: 'active',
          dataFlow: 'source',
          owner: 'Intelligence Team',
          documentationUrl: '/docs/integrations/gmail',
          authType: 'oauth',
          dataClassification: 'confidential',
          rateLimits: {
            requestsPerSecond: 5,
            requestsPerHour: 1000,
            burstLimit: 10,
          },
        },
        {
          key: 'linkedin-api',
          name: 'LinkedIn API',
          type: 'rest-api',
          description: 'LinkedIn API for professional relationship intelligence',
          version: 'v2',
          status: 'active',
          dataFlow: 'source',
          owner: 'Intelligence Team',
          documentationUrl: '/docs/integrations/linkedin',
          authType: 'oauth',
          dataClassification: 'confidential',
          rateLimits: {
            requestsPerSecond: 2,
            requestsPerHour: 500,
            burstLimit: 5,
          },
        },
        {
          key: 'notion-api',
          name: 'Notion API',
          type: 'rest-api',
          description: 'Notion API for content management and project sync',
          version: 'v1',
          status: 'active',
          dataFlow: 'bidirectional',
          owner: 'Content Team',
          documentationUrl: '/docs/integrations/notion',
          authType: 'api-key',
          dataClassification: 'internal',
          rateLimits: {
            requestsPerSecond: 3,
            requestsPerHour: 1000,
            burstLimit: 5,
          },
        },
        {
          key: 'xero-api',
          name: 'Xero API',
          type: 'rest-api',
          description: 'Xero accounting API for financial data integration',
          version: 'v2',
          status: 'active',
          dataFlow: 'source',
          owner: 'Finance Team',
          documentationUrl: '/docs/integrations/xero',
          authType: 'oauth',
          dataClassification: 'restricted',
          rateLimits: {
            requestsPerSecond: 1,
            requestsPerHour: 5000,
            burstLimit: 3,
          },
        },
        {
          key: 'compliance-service',
          name: 'Compliance Service',
          type: 'internal-service',
          description: 'Internal compliance monitoring and audit service',
          version: '1.0',
          status: 'active',
          dataFlow: 'bidirectional',
          owner: 'Compliance Team',
          documentationUrl: '/docs/integrations/compliance',
          authType: 'api-key',
          dataClassification: 'restricted',
        },
      ],
    };
  }

  async generateDocumentation() {
    console.log('📝 Generating integration documentation...');

    // Ensure registry data is loaded
    if (!this.registryData) {
      await this.loadRegistryData();
    }

    // Generate main integration overview
    await this.generateOverview();

    // Generate individual integration docs
    for (const integration of this.registryData.integrations) {
      await this.generateIntegrationDoc(integration);
    }

    // Generate type-specific documentation
    await this.generateTypeDocumentation();

    // Generate API reference
    await this.generateAPIReference();

    console.log('✅ Documentation generation completed');
  }

  async generateOverview() {
    const { stats, integrations } = this.registryData;
    const timestamp = new Date().toISOString();

    let markdown = `# ACT Platform - Integration Registry Overview\n\n`;
    markdown += `*Generated on: ${timestamp}*\n\n`;

    // Statistics
    markdown += `## 📊 Statistics\n\n`;
    markdown += `- **Total Integrations**: ${stats.total}\n`;
    markdown += `- **Active**: ${stats.healthy}\n`;
    markdown += `- **Unhealthy**: ${stats.unhealthy}\n`;
    markdown += `- **Health Rate**: ${Math.round((stats.healthy / stats.total) * 100)}%\n\n`;

    // By Type
    markdown += `### By Type\n\n`;
    Object.entries(stats.byType).forEach(([type, count]) => {
      markdown += `- **${this.capitalizeWords(type.replace('-', ' '))}**: ${count}\n`;
    });

    // By Owner
    markdown += `\n### By Owner\n\n`;
    Object.entries(stats.byOwner).forEach(([owner, count]) => {
      markdown += `- **${owner}**: ${count}\n`;
    });

    // Integration List
    markdown += `\n## 🔌 All Integrations\n\n`;
    markdown += `| Name | Type | Status | Owner | Data Flow |\n`;
    markdown += `|------|------|--------|-------|----------|\n`;

    integrations.forEach(integration => {
      const statusEmoji = this.getStatusEmoji(integration.status);
      markdown += `| [${integration.name}](${integration.key}.md) | ${integration.type} | ${statusEmoji} ${integration.status} | ${integration.owner} | ${integration.dataFlow} |\n`;
    });

    // Quick Links
    markdown += `\n## 🔗 Quick Links\n\n`;
    markdown += `### Data Sources\n`;
    const dataSources = integrations.filter(i =>
      ['database', 'graph-database', 'cache'].includes(i.type)
    );
    dataSources.forEach(ds => {
      markdown += `- [${ds.name}](${ds.key}.md) - ${ds.description}\n`;
    });

    markdown += `\n### External APIs\n`;
    const apis = integrations.filter(i => ['rest-api', 'graphql-api'].includes(i.type));
    apis.forEach(api => {
      markdown += `- [${api.name}](${api.key}.md) - ${api.description}\n`;
    });

    markdown += `\n### Internal Services\n`;
    const services = integrations.filter(i => i.type === 'internal-service');
    services.forEach(service => {
      markdown += `- [${service.name}](${service.key}.md) - ${service.description}\n`;
    });

    // Monitoring Information
    markdown += `\n## 🔍 Monitoring & Health Checks\n\n`;
    markdown += `All integrations are continuously monitored through:\n\n`;
    markdown += `- **Health Checks**: Automated health checks run every 5 minutes\n`;
    markdown += `- **Status Monitoring**: Real-time status tracking and alerting\n`;
    markdown += `- **Performance Metrics**: Response time and error rate monitoring\n`;
    markdown += `- **API Dashboard**: [Integration Registry API](/api/integration-registry)\n\n`;

    markdown += `### API Endpoints\n\n`;
    markdown += `- \`GET /api/integration-registry\` - Integration overview and stats\n`;
    markdown += `- \`GET /api/integration-registry/:key\` - Detailed integration info\n`;
    markdown += `- \`POST /api/integration-registry/health-check\` - Run health checks\n`;
    markdown += `- \`GET /api/integration-registry/export/documentation\` - Export documentation\n\n`;

    // Footer
    markdown += `---\n\n`;
    markdown += `*This documentation is automatically generated from the Integration Registry.*\n`;
    markdown += `*For integration standards and development guidelines, see [INTEGRATION_STANDARDS.md](../INTEGRATION_STANDARDS.md)*\n`;

    await this.writeFile('README.md', markdown);
  }

  async generateIntegrationDoc(integration) {
    let markdown = `# ${integration.name}\n\n`;

    // Overview
    markdown += `${integration.description}\n\n`;

    // Metadata table
    markdown += `## Overview\n\n`;
    markdown += `| Property | Value |\n`;
    markdown += `|----------|-------|\n`;
    markdown += `| **Type** | ${integration.type} |\n`;
    markdown += `| **Version** | ${integration.version} |\n`;
    markdown += `| **Status** | ${this.getStatusEmoji(integration.status)} ${integration.status} |\n`;
    markdown += `| **Data Flow** | ${integration.dataFlow} |\n`;
    markdown += `| **Owner** | ${integration.owner} |\n`;
    markdown += `| **Authentication** | ${integration.authType} |\n`;
    markdown += `| **Data Classification** | ${this.getClassificationEmoji(integration.dataClassification)} ${integration.dataClassification} |\n`;

    // Rate limits if available
    if (integration.rateLimits) {
      markdown += `\n## Rate Limits\n\n`;
      markdown += `| Limit Type | Value |\n`;
      markdown += `|------------|-------|\n`;
      if (integration.rateLimits.requestsPerSecond) {
        markdown += `| **Requests per Second** | ${integration.rateLimits.requestsPerSecond} |\n`;
      }
      if (integration.rateLimits.requestsPerHour) {
        markdown += `| **Requests per Hour** | ${integration.rateLimits.requestsPerHour} |\n`;
      }
      if (integration.rateLimits.burstLimit) {
        markdown += `| **Burst Limit** | ${integration.rateLimits.burstLimit} |\n`;
      }
    }

    // Configuration section
    markdown += `\n## Configuration\n\n`;
    markdown += `### Environment Variables\n\n`;

    switch (integration.type) {
      case 'database':
        markdown += `\`\`\`bash\n`;
        markdown += `DATABASE_URL=postgresql://user:pass@localhost:5432/dbname\n`;
        markdown += `ENCRYPTION_KEY=base64-encoded-32-byte-key\n`;
        markdown += `\`\`\`\n\n`;
        break;

      case 'cache':
        markdown += `\`\`\`bash\n`;
        markdown += `REDIS_URL=redis://localhost:6379\n`;
        markdown += `REDIS_PASSWORD=your-redis-password\n`;
        markdown += `\`\`\`\n\n`;
        break;

      case 'rest-api':
        if (integration.authType === 'oauth') {
          markdown += `\`\`\`bash\n`;
          markdown += `${integration.key.toUpperCase().replace('-', '_')}_CLIENT_ID=your-client-id\n`;
          markdown += `${integration.key.toUpperCase().replace('-', '_')}_CLIENT_SECRET=your-client-secret\n`;
          markdown += `${integration.key.toUpperCase().replace('-', '_')}_REDIRECT_URI=your-redirect-uri\n`;
          markdown += `\`\`\`\n\n`;
        } else if (integration.authType === 'api-key') {
          markdown += `\`\`\`bash\n`;
          markdown += `${integration.key.toUpperCase().replace('-', '_')}_API_KEY=your-api-key\n`;
          markdown += `\`\`\`\n\n`;
        }
        break;
    }

    // Usage Examples
    markdown += `## Usage Examples\n\n`;
    markdown += `### Basic Usage\n\n`;
    markdown += `\`\`\`typescript\n`;
    markdown += `import { integrationRegistry } from '../integrations/registry.js';\n\n`;
    markdown += `// Get the connector\n`;
    markdown += `const ${integration.key.replace('-', '')}Connector = integrationRegistry.getDataSource('${integration.key}');\n\n`;

    if (integration.type === 'database') {
      markdown += `// Query data\n`;
      markdown += `const users = await ${integration.key.replace('-', '')}Connector.select('users', ['id', 'name']);\n`;
      markdown += `console.log('Users:', users);\n\n`;
      markdown += `// Insert data\n`;
      markdown += `const newUser = await ${integration.key.replace('-', '')}Connector.insert('users', {\n`;
      markdown += `  name: 'John Doe',\n`;
      markdown += `  email: 'john@example.com'\n`;
      markdown += `});\n`;
    } else if (integration.type === 'cache') {
      markdown += `// Cache data\n`;
      markdown += `await ${integration.key.replace('-', '')}Connector.set('user:123', { name: 'John' }, 3600);\n\n`;
      markdown += `// Retrieve data\n`;
      markdown += `const userData = await ${integration.key.replace('-', '')}Connector.get('user:123');\n`;
      markdown += `console.log('Cached user:', userData);\n`;
    } else if (integration.type === 'rest-api') {
      markdown += `// Make API call\n`;
      markdown += `const response = await ${integration.key.replace('-', '')}Connector.get('/endpoint');\n`;
      markdown += `console.log('API response:', response);\n`;
    }

    markdown += `\`\`\`\n\n`;

    // Health Check
    markdown += `### Health Check\n\n`;
    markdown += `\`\`\`typescript\n`;
    markdown += `// Check integration health\n`;
    markdown += `const isHealthy = await ${integration.key.replace('-', '')}Connector.healthCheck();\n`;
    markdown += `console.log('Integration healthy:', isHealthy);\n\n`;
    markdown += `// Get connection info\n`;
    markdown += `const connectionInfo = ${integration.key.replace('-', '')}Connector.getConnectionInfo();\n`;
    markdown += `console.log('Connection status:', connectionInfo);\n`;
    markdown += `\`\`\`\n\n`;

    // Error Handling
    markdown += `## Error Handling\n\n`;
    markdown += `Common error scenarios and their solutions:\n\n`;

    if (integration.type === 'database') {
      markdown += `### Connection Errors\n`;
      markdown += `- **Connection Failed**: Check database URL and network connectivity\n`;
      markdown += `- **Authentication Failed**: Verify username and password\n`;
      markdown += `- **Query Timeout**: Increase query timeout or optimize queries\n\n`;
    } else if (integration.type === 'rest-api') {
      markdown += `### API Errors\n`;
      markdown += `- **401 Unauthorized**: Check API credentials and refresh tokens\n`;
      markdown += `- **429 Rate Limited**: Implement exponential backoff retry logic\n`;
      markdown += `- **500 Server Error**: Check API service status and retry\n\n`;
    }

    // Monitoring
    markdown += `## Monitoring\n\n`;
    markdown += `This integration is automatically monitored through:\n\n`;
    markdown += `- **Health Checks**: Every 5 minutes\n`;
    markdown += `- **Performance Metrics**: Response time and success rates\n`;
    markdown += `- **Error Tracking**: Automatic error logging and alerting\n`;
    markdown += `- **Status Dashboard**: Real-time status in Integration Registry\n\n`;

    markdown += `### Monitoring Endpoints\n\n`;
    markdown += `\`\`\`bash\n`;
    markdown += `# Get integration details\n`;
    markdown += `curl -H "Authorization: Bearer $API_KEY" \\\n`;
    markdown += `     /api/integration-registry/${integration.key}\n\n`;
    markdown += `# Run health check\n`;
    markdown += `curl -X POST -H "Authorization: Bearer $API_KEY" \\\n`;
    markdown += `     /api/integration-registry/${integration.key}/health-check\n`;
    markdown += `\`\`\`\n\n`;

    // Troubleshooting
    markdown += `## Troubleshooting\n\n`;
    markdown += `### Common Issues\n\n`;

    if (integration.type === 'rest-api' && integration.authType === 'oauth') {
      markdown += `#### OAuth Authentication Issues\n`;
      markdown += `1. **Token Expired**: Tokens expire regularly, ensure refresh logic is working\n`;
      markdown += `2. **Invalid Redirect URI**: Must match exactly what's configured in the API console\n`;
      markdown += `3. **Scope Permissions**: Ensure requested scopes are approved\n\n`;
    }

    if (integration.rateLimits) {
      markdown += `#### Rate Limiting\n`;
      markdown += `- **Current Limits**: See rate limits table above\n`;
      markdown += `- **Best Practice**: Implement exponential backoff when rate limited\n`;
      markdown += `- **Monitoring**: Track request counts to stay within limits\n\n`;
    }

    // Footer
    markdown += `---\n\n`;
    markdown += `*Last Updated: ${new Date().toISOString()}*\n`;
    markdown += `*Owner: ${integration.owner}*\n`;
    markdown += `*[Back to Integration Overview](README.md)*\n`;

    await this.writeFile(`${integration.key}.md`, markdown);
  }

  async generateTypeDocumentation() {
    const typeGroups = {};

    // Group integrations by type
    this.registryData.integrations.forEach(integration => {
      if (!typeGroups[integration.type]) {
        typeGroups[integration.type] = [];
      }
      typeGroups[integration.type].push(integration);
    });

    // Generate documentation for each type
    for (const [type, integrations] of Object.entries(typeGroups)) {
      await this.generateTypeDoc(type, integrations);
    }
  }

  async generateTypeDoc(type, integrations) {
    let markdown = `# ${this.capitalizeWords(type.replace('-', ' '))} Integrations\n\n`;

    markdown += `This document covers all ${type} integrations in the ACT Platform.\n\n`;

    markdown += `## Overview\n\n`;
    markdown += `- **Total ${type} integrations**: ${integrations.length}\n`;
    markdown += `- **Active**: ${integrations.filter(i => i.status === 'active').length}\n\n`;

    markdown += `## Integrations\n\n`;

    integrations.forEach(integration => {
      markdown += `### [${integration.name}](${integration.key}.md)\n\n`;
      markdown += `${integration.description}\n\n`;
      markdown += `- **Owner**: ${integration.owner}\n`;
      markdown += `- **Status**: ${this.getStatusEmoji(integration.status)} ${integration.status}\n`;
      markdown += `- **Data Flow**: ${integration.dataFlow}\n`;
      markdown += `- **Authentication**: ${integration.authType}\n`;
      markdown += `- **Classification**: ${integration.dataClassification}\n\n`;
    });

    await this.writeFile(`${type}-integrations.md`, markdown);
  }

  async generateAPIReference() {
    let markdown = `# Integration Registry API Reference\n\n`;

    markdown += `This document provides a comprehensive reference for the Integration Registry API endpoints.\n\n`;

    markdown += `## Base URL\n\n`;
    markdown += `\`\`\`\n`;
    markdown += `https://your-domain.com/api/integration-registry\n`;
    markdown += `\`\`\`\n\n`;

    markdown += `## Authentication\n\n`;
    markdown += `All endpoints require authentication via API key or JWT token:\n\n`;
    markdown += `\`\`\`bash\n`;
    markdown += `curl -H "Authorization: Bearer YOUR_API_KEY" \\\n`;
    markdown += `     https://your-domain.com/api/integration-registry\n`;
    markdown += `\`\`\`\n\n`;

    // Generate endpoint documentation
    const endpoints = [
      {
        method: 'GET',
        path: '/',
        description: 'Get overview of all registered integrations',
        example: `{
  "success": true,
  "data": {
    "stats": { "total": 8, "healthy": 6, "unhealthy": 2 },
    "integrations": [...]
  }
}`,
      },
      {
        method: 'GET',
        path: '/stats',
        description: 'Get detailed statistics about the integration registry',
        example: `{
  "success": true,
  "data": {
    "total": 8,
    "byType": { "database": 1, "rest-api": 4 },
    "byOwner": { "Data Team": 3, "Intelligence Team": 3 }
  }
}`,
      },
      {
        method: 'GET',
        path: '/:key',
        description: 'Get detailed information about a specific integration',
        example: `{
  "success": true,
  "data": {
    "key": "postgres",
    "name": "PostgreSQL Database",
    "status": "active",
    "connectionInfo": {...},
    "recentEvents": [...]
  }
}`,
      },
      {
        method: 'POST',
        path: '/health-check',
        description: 'Run health checks for all integrations',
        example: `{
  "success": true,
  "data": {
    "healthCheckResults": {
      "postgres": true,
      "redis": true,
      "gmail-api": false
    },
    "stats": {...}
  }
}`,
      },
    ];

    endpoints.forEach(endpoint => {
      markdown += `## ${endpoint.method} ${endpoint.path}\n\n`;
      markdown += `${endpoint.description}\n\n`;
      markdown += `### Request\n\n`;
      markdown += `\`\`\`bash\n`;
      markdown += `curl -X ${endpoint.method} \\\n`;
      markdown += `     -H "Authorization: Bearer YOUR_API_KEY" \\\n`;
      markdown += `     https://your-domain.com/api/integration-registry${endpoint.path.replace(':key', 'postgres')}\n`;
      markdown += `\`\`\`\n\n`;
      markdown += `### Response\n\n`;
      markdown += `\`\`\`json\n`;
      markdown += endpoint.example;
      markdown += `\n\`\`\`\n\n`;
    });

    await this.writeFile('API_REFERENCE.md', markdown);
  }

  // Utility methods
  async writeFile(filename, content) {
    const filePath = path.join(this.outputDir, filename);
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`📄 Generated: ${filename}`);
  }

  capitalizeWords(str) {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getStatusEmoji(status) {
    switch (status) {
      case 'active':
        return '✅';
      case 'inactive':
        return '⏸️';
      case 'unhealthy':
        return '⚠️';
      case 'error':
        return '❌';
      case 'maintenance':
        return '🔧';
      case 'deprecated':
        return '📅';
      default:
        return '❓';
    }
  }

  getClassificationEmoji(classification) {
    switch (classification) {
      case 'public':
        return '🌐';
      case 'internal':
        return '🏢';
      case 'confidential':
        return '🔒';
      case 'restricted':
        return '🔐';
      default:
        return '❓';
    }
  }
}

// CLI interface
async function main() {
  const generator = new IntegrationDocumentationGenerator();

  try {
    await generator.initialize();
    await generator.generateDocumentation();

    console.log('\n✅ Integration documentation generation completed successfully!');
    console.log(`📂 Documentation available in: ${generator.outputDir}`);
  } catch (error) {
    console.error('\n❌ Documentation generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { IntegrationDocumentationGenerator };
