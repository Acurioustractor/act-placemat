#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create sample Gmail contacts based on known email patterns
function generateSampleGmailContacts() {
  // Common Gmail contact patterns found in the system
  const sampleContacts = [
    {
      id: "gmail_1",
      name: "Ben Knight",
      email: "knighttss@gmail.com",
      displayName: "Ben Knight",
      organization: "ACT Placemat",
      phone: "+61400000001"
    },
    {
      id: "gmail_2", 
      name: "Nic Schiaffo",
      email: "nic@act.place",
      displayName: "Nic Schiaffo",
      organization: "ACT Placemat",
      phone: "+61400000002"
    },
    {
      id: "gmail_3",
      name: "Benjamin Knight",
      email: "benjamin@act.place", 
      displayName: "Benjamin Knight",
      organization: "ACT Placemat",
      phone: "+61400000003"
    }
  ];

  console.log('📧 Creating sample Gmail contacts for cross-referencing...');
  console.log('   (In production, this would fetch from Gmail API)');
  
  // Save to expected location
  const outputPath = path.join(__dirname, '..', 'Docs', 'Gmail', 'contacts.json');
  
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(sampleContacts, null, 2));
  console.log(`💾 Saved ${sampleContacts.length} sample Gmail contacts to: ${outputPath}`);
  
  return sampleContacts;
}

function main() {
  try {
    const contacts = generateSampleGmailContacts();
    
    console.log('\n📊 Sample Gmail Contacts Created:');
    contacts.forEach((contact, index) => {
      console.log(`   ${index + 1}. ${contact.name} (${contact.email})`);
      if (contact.organization) console.log(`      Organization: ${contact.organization}`);
    });
    
    console.log('\n💡 Note: To fetch real Gmail contacts, the Gmail API would need');
    console.log('   fresh authentication tokens and proper OAuth flow.');
    
  } catch (error) {
    console.error('❌ Failed to create Gmail contacts:', error.message);
    process.exit(1);
  }
}

main();