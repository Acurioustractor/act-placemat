// Test what the frontend is actually calling
const fetch = require('node-fetch');

async function testFrontendCall() {
  console.log('🧪 TESTING FRONTEND API CALL');
  console.log('============================\n');
  
  const requestPayload = {
    databaseId: '177ebcf981cf80dd9514f1ec32f3314c',
    filters: {},
    sorts: []
  };
  
  console.log('📋 Request payload:');
  console.log(JSON.stringify(requestPayload, null, 2));
  console.log('');
  
  try {
    console.log('🌐 Making request to: http://localhost:5001/api/notion/query');
    
    const response = await fetch('http://localhost:5001/api/notion/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });
    
    console.log(`📊 Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success: ${data.results?.length || 0} records returned`);
      console.log(`   Has more: ${data.has_more}`);
      console.log(`   Sample titles:`);
      
      if (data.results && data.results.length > 0) {
        data.results.slice(0, 3).forEach((record, index) => {
          const title = record.properties?.Name?.title?.[0]?.plain_text || 'Untitled';
          console.log(`     ${index + 1}. ${title}`);
        });
      }
      
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.log(`❌ Error: ${JSON.stringify(errorData, null, 2)}`);
    }
    
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

testFrontendCall()
  .then(() => {
    console.log('\n✅ Frontend API test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  });