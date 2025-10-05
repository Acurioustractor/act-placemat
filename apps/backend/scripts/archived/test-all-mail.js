/**
 * Test accessing Gmail [All Mail] folder directly - should have THOUSANDS
 */

import SimpleGmailService from './src/services/simpleGmailService.js';

const service = new SimpleGmailService();

async function testAllMailAccess() {
  try {
    console.log('🧪 Testing [Gmail]/All Mail folder access...');
    
    await service.connect();
    console.log('✅ Connected to Gmail IMAP');
    
    // Try to open [Gmail]/All Mail directly
    await new Promise((resolve, reject) => {
      service.imap.openBox('[Gmail]/All Mail', true, (err, box) => {
        if (err) {
          console.error('❌ Cannot access [Gmail]/All Mail:', err.message);
          reject(err);
        } else {
          console.log(`📧 SUCCESS! [Gmail]/All Mail has ${box.messages.total} total messages`);
          console.log(`📧 Recent: ${box.messages.recent}, Unseen: ${box.messages.unseen}`);
          resolve(box);
        }
      });
    });
    
    // Search for all messages in All Mail
    const uids = await new Promise((resolve, reject) => {
      service.imap.search(['ALL'], (err, results) => {
        if (err) {
          console.error('❌ Search failed:', err.message);
          reject(err);
        } else {
          console.log(`🔍 Found ${results ? results.length : 0} message UIDs in [Gmail]/All Mail`);
          resolve(results || []);
        }
      });
    });
    
    await service.disconnect();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await service.disconnect();
  }
}

testAllMailAccess();