#!/usr/bin/env tsx

/**
 * Test script to check integration registry functionality
 */

import { integrationRegistry } from './src/integrations/registry.js';

async function testRegistry() {
  console.log('🔍 Testing Integration Registry...');

  try {
    console.log('📊 Registry size before init:', integrationRegistry.getStats().total);

    console.log('🚀 Attempting to initialize registry...');
    await integrationRegistry.initialize();

    console.log('✅ Registry initialized successfully!');
    console.log('📊 Registry stats:', integrationRegistry.getStats());

    const integrations = integrationRegistry.exportForDocumentation();
    console.log('🔌 Available integrations:', integrations.length);
    integrations.forEach(integration => {
      console.log(`  - ${integration.name} (${integration.type})`);
    });

    // Test documentation generation
    console.log('📚 Testing documentation generation...');
    const { IntegrationDocumentationGenerator } = await import(
      './scripts/generate-integration-docs.js'
    );
    const generator = new IntegrationDocumentationGenerator();
    await generator.generateDocumentation();
    console.log('✅ Documentation generated successfully!');
  } catch (error) {
    console.log('❌ Registry test failed:', error.message);
    console.log('Stack:', error.stack);

    // Still try to show what's in the registry
    console.log('📊 Registry size after error:', integrationRegistry.getStats().total);
  }
}

testRegistry().catch(console.error);
