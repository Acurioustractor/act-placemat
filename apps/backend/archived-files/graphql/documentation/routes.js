/**
 * Documentation Routes
 * Express routes for serving API documentation and version information
 */

import {
  generateAPIDocumentation,
  createPlaygroundConfig,
} from './playgroundConfig.js';
import { generateVersionDocumentation } from '../versioning/versionManager.js';

export function setupDocumentationRoutes(app) {
  // API documentation endpoint
  app.get('/api/docs', (req, res) => {
    try {
      const documentation = generateAPIDocumentation(req);
      res.json(documentation);
    } catch (error) {
      console.error('Documentation generation error:', error);
      res.status(500).json({
        error: 'Failed to generate API documentation',
        message: error.message,
      });
    }
  });

  // Version information endpoint
  app.get('/api/version', (req, res) => {
    try {
      const versionInfo = generateVersionDocumentation();
      res.json(versionInfo);
    } catch (error) {
      console.error('Version info generation error:', error);
      res.status(500).json({
        error: 'Failed to generate version information',
        message: error.message,
      });
    }
  });

  // Playground configuration endpoint
  app.get('/api/playground-config', (req, res) => {
    try {
      const playgroundConfig = createPlaygroundConfig(req);
      res.json(playgroundConfig);
    } catch (error) {
      console.error('Playground config generation error:', error);
      res.status(500).json({
        error: 'Failed to generate playground configuration',
        message: error.message,
      });
    }
  });

  // HTML documentation page
  app.get('/docs', (req, res) => {
    try {
      const documentation = generateAPIDocumentation(req);
      const html = generateDocumentationHTML(documentation);
      res.set('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('HTML documentation generation error:', error);
      res.status(500).send(`
        <h1>Documentation Error</h1>
        <p>Failed to generate documentation: ${error.message}</p>
      `);
    }
  });

  console.log('📚 Documentation routes configured');
  console.log(`   • API Docs: http://localhost:${process.env.PORT || 4000}/api/docs`);
  console.log(
    `   • Version Info: http://localhost:${process.env.PORT || 4000}/api/version`
  );
  console.log(`   • HTML Docs: http://localhost:${process.env.PORT || 4000}/docs`);
}

// Generate HTML documentation page
function generateDocumentationHTML(docs) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docs.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f8f9fa;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 3rem 0;
      margin: -2rem -2rem 2rem -2rem;
      text-align: center;
    }
    
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    
    .version-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      padding: 0.3rem 0.8rem;
      border-radius: 20px;
      font-size: 0.9rem;
      margin-top: 1rem;
    }
    
    .section {
      background: white;
      margin: 2rem 0;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    .section h2 {
      color: #667eea;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #f1f3f4;
    }
    
    .endpoints {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    
    .endpoint {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 6px;
      border-left: 4px solid #667eea;
    }
    
    .endpoint-url {
      font-family: 'Monaco', 'Menlo', monospace;
      background: #667eea;
      color: white;
      padding: 0.3rem 0.6rem;
      border-radius: 4px;
      display: inline-block;
      font-size: 0.9rem;
      margin-top: 0.5rem;
    }
    
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    
    .feature-card {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 6px;
      text-align: center;
    }
    
    .feature-card.enabled {
      border-left: 4px solid #28a745;
    }
    
    .feature-card.disabled {
      border-left: 4px solid #dc3545;
      opacity: 0.6;
    }
    
    .cultural-safety {
      background: linear-gradient(135deg, #f8f9fa 0%, #e8f5e8 100%);
      border: 2px solid #28a745;
    }
    
    .cultural-safety h3 {
      color: #28a745;
      margin-bottom: 1rem;
    }
    
    ul {
      list-style-position: inside;
      margin: 1rem 0;
    }
    
    li {
      margin: 0.5rem 0;
    }
    
    code {
      background: #f1f3f4;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.9rem;
    }
    
    .example-query {
      background: #2d3748;
      color: #e2e8f0;
      padding: 1rem;
      border-radius: 6px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.85rem;
      white-space: pre-wrap;
      overflow-x: auto;
      margin: 1rem 0;
    }
    
    .playground-link {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 0.8rem 1.5rem;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 1rem 0;
      transition: background 0.2s ease;
    }
    
    .playground-link:hover {
      background: #5a67d8;
    }
    
    .footer {
      text-align: center;
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid #e1e5e9;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${docs.title}</h1>
      <p>${docs.description.trim()}</p>
      <div class="version-badge">Version ${docs.version}</div>
    </div>

    <div class="section">
      <h2>🚀 Quick Start</h2>
      <p>Get started with the ACT Ecosystem GraphQL API in seconds:</p>
      
      <div class="endpoints">
        <div class="endpoint">
          <strong>GraphQL Endpoint</strong>
          <div class="endpoint-url">${docs.endpoints.graphql}</div>
        </div>
        <div class="endpoint">
          <strong>Interactive Playground</strong>
          <div class="endpoint-url">${docs.endpoints.playground}</div>
        </div>
        <div class="endpoint">
          <strong>WebSocket Subscriptions</strong>
          <div class="endpoint-url">${docs.endpoints.subscriptions}</div>
        </div>
      </div>
      
      <a href="${docs.endpoints.playground}" class="playground-link" target="_blank">
        🛝 Open GraphQL Playground
      </a>
    </div>

    <div class="section cultural-safety">
      <h3>🛡️ Cultural Safety & Data Sovereignty</h3>
      <p>${docs.culturalSafety.description}</p>
      <ul>
        ${docs.culturalSafety.features.map(feature => `<li>${feature}</li>`).join('')}
      </ul>
    </div>

    <div class="section">
      <h2>🌟 Features (${docs.version})</h2>
      <div class="features-grid">
        ${Object.entries(docs.versioning.features[docs.version] || {})
          .map(
            ([feature, enabled]) => `
            <div class="feature-card ${enabled ? 'enabled' : 'disabled'}">
              <h4>${feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h4>
              <p>${enabled ? '✅ Available' : '❌ Not Available'}</p>
            </div>
          `
          )
          .join('')}
      </div>
    </div>

    <div class="section">
      <h2>🔐 Authentication</h2>
      <p><strong>Type:</strong> ${docs.authentication.type}</p>
      <p><strong>Header:</strong> <code>${docs.authentication.header}</code></p>
      <p>${docs.authentication.description}</p>
      
      <h3>Available Scopes</h3>
      <ul>
        ${docs.authentication.scopes.map(scope => `<li><code>${scope}</code></li>`).join('')}
      </ul>
    </div>

    <div class="section">
      <h2>📚 Example Queries</h2>
      <h3>System Health Check</h3>
      <div class="example-query">${docs.examples.quickStart.query}</div>
      
      <h3>User Registration</h3>
      <div class="example-query">${docs.examples.authentication.mutations[0].example}</div>
    </div>

    <div class="section">
      <h2>🔄 API Versioning</h2>
      <p><strong>Current Version:</strong> ${docs.versioning.currentVersion}</p>
      <p><strong>Supported Versions:</strong> ${docs.versioning.supportedVersions.join(', ')}</p>
      <p><strong>Strategy:</strong> ${docs.versioning.versioningStrategy}</p>
      
      <h3>Version Headers</h3>
      <ul>
        ${Object.entries(docs.versioning.headers)
          .map(
            ([header, description]) => `<li><code>${header}</code>: ${description}</li>`
          )
          .join('')}
      </ul>
    </div>

    <div class="section">
      <h2>🔗 Community Resources</h2>
      <ul>
        ${docs.communityResources
          .map(
            resource => `
          <li><a href="${resource.url}" target="_blank">${resource.name}</a> - ${resource.description}</li>
        `
          )
          .join('')}
      </ul>
    </div>

    <div class="footer">
      <p>Last updated: ${docs.lastUpdated}</p>
      <p>Australian Community Technology (ACT) Ecosystem</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
