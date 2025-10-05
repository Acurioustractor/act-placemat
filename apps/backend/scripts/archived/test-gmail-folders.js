/**
 * Test Gmail folder access directly
 */

import SimpleGmailService from './src/services/simpleGmailService.js';

const service = new SimpleGmailService();

async function testFolderAccess() {
  try {
    console.log('🧪 Testing Gmail folder access...');
    
    await service.connect();
    console.log('✅ Connected to Gmail IMAP');
    
    const folders = await service.getAllFolders();
    console.log(`📁 Found ${folders.length} folders:`, folders);
    
    await service.disconnect();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await service.disconnect();
  }
}

testFolderAccess();