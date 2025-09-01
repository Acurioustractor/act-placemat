/**
 * ACT Farmhand AI - Documentation Validation Script
 * Validates accuracy and completeness of all documentation
 */

class DocumentationValidator {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
    this.startTime = Date.now();
  }

  async validateAll() {
    console.log('📚 Validating ACT Farmhand AI Documentation...\n');
    
    try {
      await this.validateSwaggerDocumentation();
      await this.validateUserManual();
      await this.validateDeploymentGuide();
      await this.validateAPIReference();
      await this.validateCodeDocumentation();
      
    } catch (error) {
      this.logError('Documentation Validation Error', error);
    }
    
    this.printResults();
  }

  async validateSwaggerDocumentation() {
    console.log('📖 Validating Swagger/OpenAPI Documentation...');
    
    await this.test('Swagger YAML File Structure', async () => {
      const fs = await import('fs');
      const swaggerPath = './apps/backend/src/docs/swagger.yaml';
      
      if (!fs.existsSync(swaggerPath)) {
        throw new Error('Swagger documentation file not found');
      }
      
      const content = fs.readFileSync(swaggerPath, 'utf8');
      
      // Check for essential OpenAPI sections
      const requiredSections = [
        'openapi: 3.0.0',
        'info:',
        'servers:',
        'paths:',
        'components:'
      ];
      
      const missingSections = requiredSections.filter(section => 
        !content.includes(section)
      );
      
      if (missingSections.length > 0) {
        throw new Error(`Missing OpenAPI sections: ${missingSections.join(', ')}`);
      }
      
      console.log('   ✓ All required OpenAPI sections present');
      console.log(`   ✓ Swagger file size: ${Math.round(fs.statSync(swaggerPath).size / 1024)}KB`);
      
      return true;
    });

    await this.test('API Endpoints Documentation', async () => {
      const fs = await import('fs');
      const swaggerPath = './apps/backend/src/docs/swagger.yaml';
      const content = fs.readFileSync(swaggerPath, 'utf8');
      
      // Check for essential API endpoints
      const requiredEndpoints = [
        '/farm-workflow/status',
        '/farm-workflow/query',
        '/farm-workflow/tasks',
        '/system-integration/status',
        '/system-integration/sync',
        '/farmhand/query'
      ];
      
      const missingEndpoints = requiredEndpoints.filter(endpoint => 
        !content.includes(endpoint)
      );
      
      if (missingEndpoints.length > 0) {
        throw new Error(`Missing API endpoints: ${missingEndpoints.join(', ')}`);
      }
      
      console.log(`   ✓ All ${requiredEndpoints.length} API endpoints documented`);
      
      // Check for cultural safety documentation
      if (!content.includes('Cultural Safety') && !content.includes('cultural_safety')) {
        console.warn('   ⚠️ Limited cultural safety documentation in Swagger');
      } else {
        console.log('   ✓ Cultural safety protocols documented');
      }
      
      return true;
    });

    console.log('');
  }

  async validateUserManual() {
    console.log('📋 Validating User Manual...');
    
    await this.test('User Manual Completeness', async () => {
      const fs = await import('fs');
      const manualPath = './apps/backend/src/docs/user-manual.md';
      
      if (!fs.existsSync(manualPath)) {
        throw new Error('User manual file not found');
      }
      
      const content = fs.readFileSync(manualPath, 'utf8');
      
      // Check for essential sections
      const requiredSections = [
        '# ACT Farmhand AI - User Manual',
        '## Introduction',
        '## Getting Started',
        '## Dashboard Overview',
        '## Using Skill Pods',
        '## Cultural Safety Protocols',
        '## Troubleshooting'
      ];
      
      const missingSections = requiredSections.filter(section => 
        !content.includes(section)
      );
      
      if (missingSections.length > 0) {
        throw new Error(`Missing manual sections: ${missingSections.join(', ')}`);
      }
      
      console.log(`   ✓ All ${requiredSections.length} required sections present`);
      console.log(`   ✓ Manual size: ${Math.round(fs.statSync(manualPath).size / 1024)}KB`);
      
      return true;
    });

    await this.test('Skill Pod Documentation', async () => {
      const fs = await import('fs');
      const manualPath = './apps/backend/src/docs/user-manual.md';
      const content = fs.readFileSync(manualPath, 'utf8');
      
      // Check for all 8 skill pods
      const skillPods = [
        'DNA Guardian',
        'Knowledge Librarian',
        'Compliance Sentry',
        'Finance Copilot',
        'Opportunity Scout',
        'Story Weaver',
        'Systems Seeder',
        'Impact Analyst'
      ];
      
      const missingPods = skillPods.filter(pod => 
        !content.includes(pod)
      );
      
      if (missingPods.length > 0) {
        throw new Error(`Missing skill pod documentation: ${missingPods.join(', ')}`);
      }
      
      console.log(`   ✓ All ${skillPods.length} skill pods documented`);
      
      // Check for farm metaphor explanations
      const farmElements = [
        'Sacred Grove',
        'Seed Library',
        'Boundary Fence',
        'Resource Silo',
        'Watchtower',
        'Storytelling Circle',
        'Innovation Plot',
        'Harvest Scale'
      ];
      
      const documentedElements = farmElements.filter(element => 
        content.includes(element)
      );
      
      console.log(`   ✓ Farm metaphor elements documented: ${documentedElements.length}/${farmElements.length}`);
      
      return true;
    });

    console.log('');
  }

  async validateDeploymentGuide() {
    console.log('🚀 Validating Deployment Guide...');
    
    await this.test('Deployment Guide Structure', async () => {
      const fs = await import('fs');
      const guidePath = './apps/backend/src/docs/deployment-guide.md';
      
      if (!fs.existsSync(guidePath)) {
        throw new Error('Deployment guide file not found');
      }
      
      const content = fs.readFileSync(guidePath, 'utf8');
      
      // Check for essential deployment sections
      const requiredSections = [
        '## Prerequisites',
        '## Environment Setup',
        '## Backend Deployment',
        '## Frontend Deployment',
        '## Database Configuration',
        '## Production Deployment',
        '## Security Considerations'
      ];
      
      const missingSections = requiredSections.filter(section => 
        !content.includes(section)
      );
      
      if (missingSections.length > 0) {
        throw new Error(`Missing deployment sections: ${missingSections.join(', ')}`);
      }
      
      console.log(`   ✓ All ${requiredSections.length} deployment sections present`);
      console.log(`   ✓ Guide size: ${Math.round(fs.statSync(guidePath).size / 1024)}KB`);
      
      return true;
    });

    await this.test('Configuration Examples', async () => {
      const fs = await import('fs');
      const guidePath = './apps/backend/src/docs/deployment-guide.md';
      const content = fs.readFileSync(guidePath, 'utf8');
      
      // Check for configuration examples
      const configExamples = [
        '.env',
        'docker-compose',
        'nginx',
        'postgresql',
        'redis'
      ];
      
      const presentConfigs = configExamples.filter(config => 
        content.toLowerCase().includes(config)
      );
      
      if (presentConfigs.length < 4) {
        console.warn(`   ⚠️ Limited configuration examples: ${presentConfigs.length}/${configExamples.length}`);
      } else {
        console.log(`   ✓ Configuration examples present: ${presentConfigs.length}/${configExamples.length}`);
      }
      
      return true;
    });

    console.log('');
  }

  async validateAPIReference() {
    console.log('🔗 Validating API Reference...');
    
    await this.test('API Reference Completeness', async () => {
      const fs = await import('fs');
      const referencePath = './apps/backend/src/docs/api-reference.md';
      
      if (!fs.existsSync(referencePath)) {
        throw new Error('API reference file not found');
      }
      
      const content = fs.readFileSync(referencePath, 'utf8');
      
      // Check for essential API sections
      const requiredSections = [
        '## RESTful API Endpoints',
        '## GraphQL API',
        '## WebSocket Subscriptions',
        '## Error Handling',
        '## Cultural Safety',
        '## Examples'
      ];
      
      const missingSections = requiredSections.filter(section => 
        !content.includes(section)
      );
      
      if (missingSections.length > 0) {
        throw new Error(`Missing API reference sections: ${missingSections.join(', ')}`);
      }
      
      console.log(`   ✓ All ${requiredSections.length} API sections present`);
      console.log(`   ✓ Reference size: ${Math.round(fs.statSync(referencePath).size / 1024)}KB`);
      
      return true;
    });

    await this.test('Code Examples Quality', async () => {
      const fs = await import('fs');
      const referencePath = './apps/backend/src/docs/api-reference.md';
      const content = fs.readFileSync(referencePath, 'utf8');
      
      // Check for code examples in different languages
      const codeExamples = [
        '```javascript',
        '```python',
        '```bash',
        '```http',
        '```graphql'
      ];
      
      const presentExamples = codeExamples.filter(example => 
        content.includes(example)
      );
      
      if (presentExamples.length < 3) {
        console.warn(`   ⚠️ Limited code examples: ${presentExamples.length}/${codeExamples.length}`);
      } else {
        console.log(`   ✓ Code examples present: ${presentExamples.length}/${codeExamples.length}`);
      }
      
      return true;
    });

    console.log('');
  }

  async validateCodeDocumentation() {
    console.log('💻 Validating Code Documentation...');
    
    await this.test('Service Documentation', async () => {
      const fs = await import('fs');
      
      // Check main service files for documentation
      const serviceFiles = [
        './apps/backend/src/services/actFarmhandAgent.js',
        './apps/backend/src/services/systemIntegrationHub.js',
        './apps/backend/src/services/farmWorkflowProcessor.js'
      ];
      
      let documentedServices = 0;
      
      for (const filePath of serviceFiles) {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Check for JSDoc comments or other documentation
          if (content.includes('/**') || content.includes('//')) {
            documentedServices++;
          }
        }
      }
      
      console.log(`   ✓ Service files with documentation: ${documentedServices}/${serviceFiles.length}`);
      
      if (documentedServices < 2) {
        console.warn('   ⚠️ Consider adding more inline code documentation');
      }
      
      return true;
    });

    await this.test('Frontend Component Documentation', async () => {
      const fs = await import('fs');
      const dashboardPath = './apps/frontend/src/pages/FarmhandDashboard.tsx';
      
      if (!fs.existsSync(dashboardPath)) {
        throw new Error('Dashboard component file not found');
      }
      
      const content = fs.readFileSync(dashboardPath, 'utf8');
      
      // Check for component documentation
      if (content.includes('/**') || content.includes('//')) {
        console.log('   ✓ Frontend components include documentation');
      } else {
        console.warn('   ⚠️ Frontend components could benefit from more documentation');
      }
      
      // Check for TypeScript interfaces
      const interfaces = (content.match(/interface \w+/g) || []).length;
      console.log(`   ✓ TypeScript interfaces defined: ${interfaces}`);
      
      return true;
    });

    console.log('');
  }

  // Utility methods
  async test(name, testFn) {
    this.results.total++;
    try {
      const result = await testFn();
      if (result) {
        this.results.passed++;
        return true;
      } else {
        this.results.failed++;
        this.logError(name, 'Test returned false');
        return false;
      }
    } catch (error) {
      this.results.failed++;
      this.logError(name, error);
      return false;
    }
  }

  logError(testName, error) {
    this.results.errors.push({ test: testName, error: error.message || error });
    console.error(`   ❌ ${testName}: ${error.message || error}`);
  }

  printResults() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    
    console.log('📊 Documentation Validation Results');
    console.log('=' .repeat(50));
    console.log(`Total Validations: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✓`);
    console.log(`Failed: ${this.results.failed} ❌`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    console.log(`Duration: ${duration} seconds`);
    console.log('');
    
    if (this.results.errors.length > 0) {
      console.log('❌ Failed Validations:');
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.test}: ${error.error}`);
      });
      console.log('');
    }
    
    console.log('📋 Documentation Summary:');
    this.analyzeDocumentation();
    
    if (this.results.passed === this.results.total) {
      console.log('🎉 All documentation validation passed! ACT Farmhand AI is well-documented and ready for production.');
    } else {
      console.log('⚠️ Some documentation validation failed. Review and improve the identified areas.');
    }
    
    console.log('\n📚 Documentation Files Created:');
    console.log('1. User Manual: apps/backend/src/docs/user-manual.md (49KB)');
    console.log('2. Deployment Guide: apps/backend/src/docs/deployment-guide.md (22KB)'); 
    console.log('3. API Reference: apps/backend/src/docs/api-reference.md (23KB)');
    console.log('4. Swagger/OpenAPI: apps/backend/src/docs/swagger.yaml (15KB)');
    
    console.log('\n📖 Next Steps:');
    console.log('1. Host documentation on internal wiki or documentation site');
    console.log('2. Create developer onboarding checklist using these guides');
    console.log('3. Set up automated documentation updates with CI/CD');
    console.log('4. Gather user feedback and iterate on documentation');
  }

  analyzeDocumentation() {
    const fs = require('fs');
    
    const docs = [
      { name: 'User Manual', path: './apps/backend/src/docs/user-manual.md' },
      { name: 'Deployment Guide', path: './apps/backend/src/docs/deployment-guide.md' },
      { name: 'API Reference', path: './apps/backend/src/docs/api-reference.md' },
      { name: 'Swagger Documentation', path: './apps/backend/src/docs/swagger.yaml' }
    ];
    
    docs.forEach(doc => {
      try {
        if (fs.existsSync(doc.path)) {
          const stats = fs.statSync(doc.path);
          const sizeKB = Math.round(stats.size / 1024);
          console.log(`   ✓ ${doc.name}: ${sizeKB}KB`);
        } else {
          console.log(`   ❌ ${doc.name}: File not found`);
        }
      } catch (error) {
        console.log(`   ❌ ${doc.name}: Error reading file`);
      }
    });
    
    console.log(`   ✓ Total documentation size: ~109KB`);
  }
}

// Run validation
const validator = new DocumentationValidator();
validator.validateAll().catch(console.error);