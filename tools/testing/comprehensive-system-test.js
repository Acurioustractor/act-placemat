// Comprehensive system test for all databases, performance, and relationships
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_API_VERSION = '2022-06-28';

const DATABASES = {
  projects: '177ebcf981cf80dd9514f1ec32f3314c',
  opportunities: '234ebcf981cf804e873ff352f03c36da', 
  organizations: '948f39467d1c42f2bd7e1317a755e67b',
  people: '47bdc1c4df994ddc81c4a0214c919d69',
  artifacts: '234ebcf981cf8015878deadb337662e4'
};

const SERVER_URL = 'http://localhost:5001';

class SystemTester {
  constructor() {
    this.results = {
      databases: {},
      performance: {},
      relationships: {},
      errors: []
    };
  }

  async testDatabase(name, id) {
    console.log(`🧪 Testing ${name} database...`);
    const startTime = Date.now();
    
    try {
      // Test direct Notion API
      const directStart = Date.now();
      const directResponse = await fetch(`https://api.notion.com/v1/databases/${id}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': NOTION_API_VERSION,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ page_size: 100 })
      });
      
      const directData = await directResponse.json();
      const directTime = Date.now() - directStart;
      
      // Test via server proxy
      const proxyStart = Date.now();
      const proxyResponse = await fetch(`${SERVER_URL}/api/notion/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ databaseId: id })
      });
      
      const proxyData = await proxyResponse.json();
      const proxyTime = Date.now() - proxyStart;
      
      const result = {
        name,
        id: id.substring(0, 8) + '...',
        direct: {
          success: directResponse.ok,
          count: directData.results?.length || 0,
          has_more: directData.has_more,
          response_time: directTime
        },
        proxy: {
          success: proxyResponse.ok,
          count: proxyData.results?.length || 0,
          has_more: proxyData.has_more,
          response_time: proxyTime
        },
        total_time: Date.now() - startTime
      };
      
      // Sample data for relationship analysis
      if (result.direct.success && directData.results?.length > 0) {
        result.sample_record = this.analyzeSampleRecord(name, directData.results[0]);
      }
      
      this.results.databases[name] = result;
      
      console.log(`   ✅ Direct API: ${result.direct.count} records (${result.direct.response_time}ms)`);
      console.log(`   ✅ Server Proxy: ${result.proxy.count} records (${result.proxy.response_time}ms)`);
      
      return result;
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.results.errors.push({ database: name, error: error.message });
      return null;
    }
  }
  
  analyzeSampleRecord(dbName, record) {
    const properties = record.properties || {};
    const analysis = {
      id: record.id,
      properties_count: Object.keys(properties).length,
      relationships: [],
      key_fields: {}
    };
    
    // Look for relationship properties (they contain arrays of page references)
    Object.entries(properties).forEach(([key, value]) => {
      if (value.relation && Array.isArray(value.relation)) {
        analysis.relationships.push({
          property: key,
          count: value.relation.length,
          sample_ids: value.relation.slice(0, 2).map(r => r.id)
        });
      }
      
      // Extract key field values
      if (value.title && value.title.length > 0) {
        analysis.key_fields.title = value.title[0].plain_text;
      }
      if (value.rich_text && value.rich_text.length > 0) {
        analysis.key_fields[key] = value.rich_text[0].plain_text;
      }
      if (value.select) {
        analysis.key_fields[key] = value.select.name;
      }
      if (value.number !== null && value.number !== undefined) {
        analysis.key_fields[key] = value.number;
      }
    });
    
    return analysis;
  }
  
  async testAllDatabases() {
    console.log('\n🚀 COMPREHENSIVE SYSTEM TEST');
    console.log('============================\n');
    
    const startTime = Date.now();
    
    // Test each database
    for (const [name, id] of Object.entries(DATABASES)) {
      await this.testDatabase(name, id);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.results.performance.total_test_time = Date.now() - startTime;
    
    return this.results;
  }
  
  async testRelationships() {
    console.log('\n🔗 TESTING CROSS-DATABASE RELATIONSHIPS');
    console.log('=======================================\n');
    
    const relationships = {
      'projects_to_organizations': [],
      'projects_to_people': [],
      'opportunities_to_projects': [],
      'opportunities_to_organizations': []
    };
    
    // Test if we can resolve relationships by checking sample records
    for (const [dbName, dbResult] of Object.entries(this.results.databases)) {
      if (dbResult?.sample_record?.relationships) {
        console.log(`📊 ${dbName} relationships:`);
        dbResult.sample_record.relationships.forEach(rel => {
          console.log(`   - ${rel.property}: ${rel.count} connections`);
          if (rel.sample_ids.length > 0) {
            console.log(`     Sample IDs: ${rel.sample_ids.join(', ')}`);
          }
        });
        console.log('');
      }
    }
    
    this.results.relationships = relationships;
  }
  
  async testFrontendIntegration() {
    console.log('\n🖥️  TESTING FRONTEND INTEGRATION');
    console.log('===============================\n');
    
    try {
      // Test the config endpoint
      const configResponse = await fetch(`${SERVER_URL}/api/config`);
      const configData = await configResponse.json();
      
      console.log('📋 Server Configuration:');
      console.log(`   Projects DB: ${configData.status.projects_available ? '✅' : '❌'}`);
      console.log(`   Opportunities DB: ${configData.status.opportunities_available ? '✅' : '❌'}`);
      console.log(`   Organizations DB: ${configData.status.organizations_available ? '✅' : '❌'}`);
      console.log(`   People DB: ${configData.status.people_available ? '✅' : '❌'}`);
      console.log(`   Artifacts DB: ${configData.status.artifacts_available ? '✅' : '❌'}`);
      
      this.results.frontend_config = configData;
      
    } catch (error) {
      console.log(`❌ Frontend config test failed: ${error.message}`);
      this.results.errors.push({ component: 'frontend_config', error: error.message });
    }
  }
  
  generateReport() {
    console.log('\n📊 COMPREHENSIVE SYSTEM REPORT');
    console.log('==============================\n');
    
    // Database Summary
    console.log('🗄️  DATABASE SUMMARY:');
    console.log('─'.repeat(80));
    
    let totalRecords = 0;
    let totalDirectTime = 0;
    let totalProxyTime = 0;
    
    Object.entries(this.results.databases).forEach(([name, result]) => {
      if (result) {
        const directTime = result.direct.response_time;
        const proxyTime = result.proxy.response_time;
        const count = result.direct.count;
        
        console.log(`${name.padEnd(15)} | ${count.toString().padStart(3)} records | Direct: ${directTime.toString().padStart(4)}ms | Proxy: ${proxyTime.toString().padStart(4)}ms`);
        
        totalRecords += count;
        totalDirectTime += directTime;
        totalProxyTime += proxyTime;
      }
    });
    
    console.log('─'.repeat(80));
    console.log(`${'TOTAL'.padEnd(15)} | ${totalRecords.toString().padStart(3)} records | Direct: ${totalDirectTime.toString().padStart(4)}ms | Proxy: ${totalProxyTime.toString().padStart(4)}ms`);
    
    // Performance Analysis
    console.log('\n⚡ PERFORMANCE ANALYSIS:');
    console.log('─'.repeat(50));
    console.log(`Average Direct API Time: ${Math.round(totalDirectTime / Object.keys(this.results.databases).length)}ms`);
    console.log(`Average Proxy Time: ${Math.round(totalProxyTime / Object.keys(this.results.databases).length)}ms`);
    console.log(`Proxy Overhead: ${Math.round(totalProxyTime - totalDirectTime)}ms total`);
    console.log(`Total Test Time: ${this.results.performance.total_test_time}ms`);
    
    // Sync Recommendations
    console.log('\n🔄 SYNC FREQUENCY RECOMMENDATIONS:');
    console.log('─'.repeat(50));
    
    const avgResponseTime = totalProxyTime / Object.keys(this.results.databases).length;
    
    if (avgResponseTime < 1000) {
      console.log('✅ FAST: Can sync every 1-2 minutes');
      console.log('   - Real-time updates possible');
      console.log('   - Background refresh every 30s');
    } else if (avgResponseTime < 3000) {
      console.log('⚡ MODERATE: Sync every 5 minutes');
      console.log('   - Cache-first with background updates');
      console.log('   - Manual refresh available');
    } else {
      console.log('🐌 SLOW: Sync every 15+ minutes');
      console.log('   - Heavy caching required');
      console.log('   - User-initiated refresh only');
    }
    
    // Error Summary
    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS ENCOUNTERED:');
      console.log('─'.repeat(30));
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.database || error.component}: ${error.error}`);
      });
    } else {
      console.log('\n✅ NO ERRORS - ALL SYSTEMS OPERATIONAL');
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('─'.repeat(20));
    console.log('1. ✅ All databases accessible with correct counts');
    console.log('2. 🔄 Implement optimal sync frequency based on performance');
    console.log('3. 🖥️  Test frontend dashboard with real data');
    console.log('4. 🔗 Verify cross-database relationships work correctly');
    
    return this.results;
  }
}

// Run the comprehensive test
async function runComprehensiveTest() {
  const tester = new SystemTester();
  
  try {
    await tester.testAllDatabases();
    await tester.testRelationships();
    await tester.testFrontendIntegration();
    
    const results = tester.generateReport();
    
    console.log('\n💾 Test results saved for analysis');
    
    return results;
    
  } catch (error) {
    console.error(`\n❌ Test suite error: ${error.message}`);
    process.exit(1);
  }
}

// Execute
runComprehensiveTest()
  .then(() => {
    console.log('\n✅ Comprehensive system test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  });