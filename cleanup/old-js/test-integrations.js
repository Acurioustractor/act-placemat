#!/usr/bin/env node

/**
 * Integration Test Suite for ACT Placemat
 * Tests Notion MCP connection and prepares for Airtable integration
 */

require('dotenv').config();
const { NotionMCP, PlacematNotionIntegration } = require('./notion-mcp.js');

// ANSI color codes for output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m'
};

// Test results collector
const testResults = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
};

// Helper functions
function log(message, type = 'info') {
    const prefix = {
        success: `${colors.green}✓${colors.reset}`,
        error: `${colors.red}✗${colors.reset}`,
        warning: `${colors.yellow}⚠${colors.reset}`,
        info: `${colors.blue}ℹ${colors.reset}`,
        test: `${colors.magenta}▶${colors.reset}`
    };
    console.log(`${prefix[type] || prefix.info} ${message}`);
}

function logSection(title) {
    console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}`);
    console.log(`${colors.blue}${title}${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}\n`);
}

async function testEnvironmentSetup() {
    logSection('1. Environment Configuration Check');
    
    const required = ['NOTION_TOKEN', 'NOTION_DATABASE_ID'];
    const optional = ['NOTION_API_VERSION'];
    let allConfigured = true;
    
    log('Checking required environment variables:', 'test');
    for (const key of required) {
        if (process.env[key]) {
            log(`${key}: Configured ✓`, 'success');
            testResults.passed++;
        } else {
            log(`${key}: Not configured ✗`, 'error');
            testResults.failed++;
            allConfigured = false;
        }
    }
    
    log('\nChecking optional environment variables:', 'test');
    for (const key of optional) {
        if (process.env[key]) {
            log(`${key}: ${process.env[key]}`, 'info');
        } else {
            log(`${key}: Using default`, 'warning');
            testResults.warnings++;
        }
    }
    
    return allConfigured;
}

async function testNotionConnection() {
    logSection('2. Notion MCP Connection Test');
    
    try {
        const notion = new NotionMCP();
        log('NotionMCP instance created', 'success');
        testResults.passed++;
        
        // Test if using mock data
        if (notion.useMockData) {
            log('Using mock data (no valid Notion credentials)', 'warning');
            testResults.warnings++;
            return false;
        }
        
        log('Attempting to fetch projects from Notion...', 'test');
        const projects = await notion.fetchProjects();
        
        if (projects && Array.isArray(projects)) {
            log(`Successfully retrieved ${projects.length} projects`, 'success');
            testResults.passed++;
            
            // Display sample data
            if (projects.length > 0) {
                log('\nSample project data:', 'info');
                const sample = projects[0];
                console.log(JSON.stringify({
                    id: sample.id,
                    name: sample.name,
                    area: sample.area,
                    status: sample.status,
                    funding: sample.funding
                }, null, 2));
            }
            
            return true;
        } else {
            log('Failed to retrieve projects', 'error');
            testResults.failed++;
            return false;
        }
    } catch (error) {
        log(`Connection error: ${error.message}`, 'error');
        testResults.failed++;
        return false;
    }
}

async function analyzeNotionDataPoints() {
    logSection('3. Notion Data Points Analysis');
    
    try {
        const integration = new PlacematNotionIntegration();
        const projects = await integration.getProjects();
        
        if (!projects || projects.length === 0) {
            log('No projects to analyze', 'warning');
            testResults.warnings++;
            return;
        }
        
        // Analyze data completeness
        const dataPoints = {
            'Core Fields': ['id', 'name', 'area', 'description', 'status'],
            'Financial Fields': ['revenueActual', 'revenuePotential', 'actualIncoming', 'potentialIncoming'],
            'Management Fields': ['lead', 'location', 'state', 'themes', 'tags'],
            'Tracking Fields': ['nextMilestone', 'lastModified', 'url'],
            'AI Fields': ['aiSummary']
        };
        
        const fieldStats = {};
        
        // Initialize stats
        Object.values(dataPoints).flat().forEach(field => {
            fieldStats[field] = { present: 0, empty: 0, percentage: 0 };
        });
        
        // Analyze each project
        projects.forEach(project => {
            Object.values(dataPoints).flat().forEach(field => {
                if (project[field] !== undefined && project[field] !== null && project[field] !== '') {
                    fieldStats[field].present++;
                } else {
                    fieldStats[field].empty++;
                }
            });
        });
        
        // Calculate percentages and display results
        log(`\nAnalyzing ${projects.length} projects:`, 'test');
        
        Object.entries(dataPoints).forEach(([category, fields]) => {
            console.log(`\n${colors.magenta}${category}:${colors.reset}`);
            fields.forEach(field => {
                const stat = fieldStats[field];
                stat.percentage = Math.round((stat.present / projects.length) * 100);
                
                const color = stat.percentage >= 80 ? colors.green : 
                             stat.percentage >= 50 ? colors.yellow : 
                             colors.red;
                
                console.log(`  ${field}: ${color}${stat.percentage}%${colors.reset} populated (${stat.present}/${projects.length})`);
                
                if (stat.percentage < 50) {
                    testResults.warnings++;
                }
            });
        });
        
        testResults.passed++;
        
    } catch (error) {
        log(`Analysis error: ${error.message}`, 'error');
        testResults.failed++;
    }
}

async function testNotionAPIEndpoints() {
    logSection('4. Notion API Endpoints Test');
    
    try {
        log('Testing server health endpoint...', 'test');
        const healthResponse = await fetch('http://localhost:3000/api/health');
        
        if (healthResponse.ok) {
            const health = await healthResponse.json();
            log('Server health check passed', 'success');
            log(`Notion token: ${health.notion_token}`, 'info');
            log(`Database ID: ${health.notion_database}`, 'info');
            testResults.passed++;
        } else {
            log('Server health check failed', 'error');
            testResults.failed++;
        }
        
        log('\nTesting Notion query endpoint...', 'test');
        const queryResponse = await fetch('http://localhost:3000/api/notion/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                databaseId: process.env.NOTION_DATABASE_ID,
                filters: {},
                sorts: []
            })
        });
        
        if (queryResponse.ok) {
            const data = await queryResponse.json();
            log(`Query endpoint working - ${data.results?.length || 0} results`, 'success');
            testResults.passed++;
        } else {
            log('Query endpoint failed', 'error');
            testResults.failed++;
        }
        
    } catch (error) {
        log(`API test error: ${error.message}`, 'error');
        log('Make sure the server is running (npm start)', 'warning');
        testResults.failed++;
    }
}

async function checkUnusedDatabases() {
    logSection('5. Unused Notion Databases Check');
    
    const unusedDatabases = [
        { name: 'Opportunities', purpose: 'Funding pipeline and revenue tracking' },
        { name: 'Organizations', purpose: 'Partner and stakeholder management' },
        { name: 'People', purpose: 'CRM and contact management' },
        { name: 'Artifacts', purpose: 'Document and resource management' }
    ];
    
    log('The following databases are designed but not yet integrated:', 'info');
    unusedDatabases.forEach(db => {
        console.log(`  • ${colors.yellow}${db.name}${colors.reset}: ${db.purpose}`);
        testResults.warnings++;
    });
    
    log('\nTo activate these databases:', 'info');
    log('1. Create them in Notion following the template in notion-database-template.md', 'info');
    log('2. Share them with your integration', 'info');
    log('3. Update the notion-mcp.js file to include their IDs', 'info');
}

async function prepareAirtableIntegration() {
    logSection('6. Airtable Integration Preparation');
    
    log('Airtable integration components needed:', 'info');
    
    const components = [
        '1. Airtable API Key (environment variable)',
        '2. Airtable Base ID for each table',
        '3. Airtable MCP connector (similar to notion-mcp.js)',
        '4. Data mapping between Notion and Airtable schemas',
        '5. Sync service to handle bi-directional updates'
    ];
    
    components.forEach(component => {
        console.log(`  • ${component}`);
    });
    
    log('\nCreating Airtable integration template...', 'test');
    
    // Check if airtable-mcp.js already exists
    const fs = require('fs');
    if (!fs.existsSync('./airtable-mcp.js')) {
        log('Template will be created after tests complete', 'info');
        testResults.passed++;
    } else {
        log('Airtable MCP already exists', 'warning');
        testResults.warnings++;
    }
}

async function generateIntegrationReport() {
    logSection('Integration Test Summary');
    
    const total = testResults.passed + testResults.failed + testResults.warnings;
    const passRate = Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100) || 0;
    
    console.log(`\n${colors.green}Passed: ${testResults.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
    console.log(`${colors.yellow}Warnings: ${testResults.warnings}${colors.reset}`);
    console.log(`${colors.blue}Total checks: ${total}${colors.reset}`);
    console.log(`${colors.magenta}Pass rate: ${passRate}%${colors.reset}`);
    
    if (testResults.failed > 0) {
        log('\n⚠️  Some tests failed. Please check the configuration.', 'error');
    } else if (testResults.warnings > 0) {
        log('\n✓ All critical tests passed, but there are warnings to address.', 'warning');
    } else {
        log('\n✅ All tests passed successfully!', 'success');
    }
    
    // Generate recommendations
    logSection('Recommendations');
    
    const recommendations = [];
    
    if (testResults.failed > 0) {
        recommendations.push('1. Verify Notion API credentials in .env file');
        recommendations.push('2. Ensure the Notion database is shared with your integration');
        recommendations.push('3. Check if the server is running (npm start)');
    }
    
    if (testResults.warnings > 0) {
        recommendations.push('• Populate empty data fields in Notion for better analytics');
        recommendations.push('• Implement the unused databases for full functionality');
        recommendations.push('• Consider adding data validation rules');
    }
    
    recommendations.push('• Set up Airtable integration for additional data sources');
    recommendations.push('• Implement automated data synchronization');
    recommendations.push('• Add error handling and retry logic');
    
    recommendations.forEach(rec => {
        console.log(rec);
    });
}

// Main test runner
async function runTests() {
    console.log(`\n${colors.blue}ACT Placemat Integration Test Suite${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}\n`);
    
    // Check if server is running
    try {
        await fetch('http://localhost:3000/api/health');
    } catch (error) {
        log('Server is not running. Starting tests without API checks...', 'warning');
        log('Run "npm start" in another terminal for complete testing', 'info');
    }
    
    // Run all tests
    const envOk = await testEnvironmentSetup();
    
    if (envOk) {
        await testNotionConnection();
        await analyzeNotionDataPoints();
        await testNotionAPIEndpoints();
    }
    
    await checkUnusedDatabases();
    await prepareAirtableIntegration();
    await generateIntegrationReport();
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests if called directly
if (require.main === module) {
    runTests().catch(error => {
        console.error('Test suite error:', error);
        process.exit(1);
    });
}

module.exports = { runTests };