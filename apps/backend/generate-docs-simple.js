#!/usr/bin/env tsx

/**
 * Simple documentation generation script
 */

async function generateDocs() {
  console.log('📚 Starting documentation generation...');

  try {
    const { IntegrationDocumentationGenerator } = await import(
      './scripts/generate-integration-docs.js'
    );
    const generator = new IntegrationDocumentationGenerator();
    await generator.initialize();
    await generator.generateDocumentation();
    console.log('✅ Documentation generated successfully!');
  } catch (error) {
    console.error('❌ Documentation generation failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

generateDocs().catch(console.error);
