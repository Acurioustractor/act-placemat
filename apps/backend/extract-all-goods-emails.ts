/**
 * COMPREHENSIVE GOODS EMAIL EXTRACTION
 * 
 * Extract ALL unique email addresses from all Goods-related email categories.
 * Output as simple list for manual review before database import.
 */

import { config } from 'dotenv';
config({ path: '../../.env' });

interface EmailContact {
  email: string;
  name?: string;
  source: string;
  occurrences: number;
}

async function extractAllGoodsEmails() {
  console.log('📧 COMPREHENSIVE GOODS EMAIL EXTRACTION\n');
  console.log('='.repeat(80));
  console.log('\nScanning ALL Goods-related email categories for unique contacts...\n');
  console.log('='.repeat(80));

  const emailMap = new Map<string, EmailContact>();

  // Email categories to scan
  const searches = [
    { query: 'nicholas@act.place goods', label: 'Core Goods emails' },
    { query: 'nicholas@act.place (media OR journalist OR story OR PR) AND goods', label: 'Media/Communications' },
    { query: 'nicholas@act.place ("circular economy" OR recycling OR plastic) AND goods', label: 'Recycling/Circular Economy' },
    { query: 'nicholas@act.place (from:defydesign.org OR to:defydesign.org)', label: 'Defy Design' },
    { query: 'nicholas@act.place (from:wilyajanta.org OR to:wilyajanta.org)', label: 'Wilya Janta' },
    { query: 'nicholas@act.place (from:ourshed.org OR to:ourshed.org)', label: 'Our Shed' },
    { query: 'nicholas@act.place (from:oonchiumpa.com.au OR to:oonchiumpa.com.au)', label: 'Oonchiumpa' },
    { query: 'nicholas@act.place (from:picc.com.au OR to:picc.com.au)', label: 'PICC (Palm Island)' },
    { query: 'nicholas@act.place (from:julalikari.com.au OR to:julalikari.com.au)', label: 'Julalikari Council' },
    { query: 'nicholas@act.place (mattress OR bed OR washing) AND goods', label: 'Product-specific' },
    { query: 'nicholas@act.place ("tennant creek" OR "alice springs" OR "palm island") AND goods', label: 'Location-specific' },
    { query: 'nicholas@act.place (training OR skills OR workshop) AND goods', label: 'Training/Skills' },
    { query: 'nicholas@act.place (council OR government) AND goods', label: 'Government/Councils' }
  ];

  console.log(`\n📋 Will scan ${searches.length} email categories\n`);

  // Note: In a real implementation, you would use the Gmail MCP tools here
  // For now, we'll output the search queries for manual execution
  
  console.log('='.repeat(80));
  console.log('\n🔍 SEARCH QUERIES TO EXECUTE:\n');
  
  searches.forEach((search, index) => {
    console.log(`${index + 1}. ${search.label}`);
    console.log(`   Query: ${search.query}`);
    console.log('');
  });

  console.log('='.repeat(80));
  console.log('\n📝 NEXT STEPS:\n');
  console.log('1. Execute each search query using Gmail MCP tools');
  console.log('2. For each result, extract email addresses from:');
  console.log('   - From field');
  console.log('   - To field');
  console.log('   - CC field');
  console.log('   - BCC field');
  console.log('3. Exclude @act.place addresses (internal)');
  console.log('4. Create deduplicated list with:');
  console.log('   - Email address');
  console.log('   - Name (if available from headers)');
  console.log('   - Source category');
  console.log('   - Number of occurrences');
  console.log('\n');
  console.log('='.repeat(80));
}

extractAllGoodsEmails()
  .then(() => {
    console.log('\n✅ Search query list generated!');
    console.log('\nUse MCP Gmail tools to execute searches and extract contacts.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
