#!/usr/bin/env node
/**
 * Standalone LinkedIn Data Import Script
 * Uses direct HTTP requests to Supabase REST API
 * No npm dependencies required
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration - using environment variables from .env
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

// Statistics
const stats = {
  totalConnections: 0,
  imported: 0,
  updated: 0,
  errors: 0,
  duplicates: 0
};

/**
 * Make Supabase API request
 */
function supabaseRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);
    
    const options = {
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data ? JSON.parse(data) : null);
          } else {
            reject(new Error(`API error ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Parse CSV manually
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Skip the LinkedIn notice (first line) and get headers
  const headers = lines[1].split(',').map(h => h.trim());
  const records = [];
  
  for (let i = 2; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    
    records.push(record);
  }
  
  return records;
}

/**
 * Parse LinkedIn date
 */
function parseLinkedInDate(dateStr) {
  const months = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  
  const parts = dateStr.split(' ');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = months[parts[1]] || '01';
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return null;
}

/**
 * Normalize connection data
 */
function normalizeConnection(connection, source) {
  const firstName = connection['First Name'] || '';
  const lastName = connection['Last Name'] || '';
  
  return {
    first_name: firstName,
    last_name: lastName,
    linkedin_url: connection['URL'] || null,
    email_address: connection['Email Address'] || null,
    current_company: connection['Company'] || null,
    current_position: connection['Position'] || null,
    connected_date: connection['Connected On'] ? parseLinkedInDate(connection['Connected On']) : null,
    data_source: source,
    relationship_score: 0.5,
    strategic_value: 'unknown',
    alignment_tags: [],
    skills_extracted: [],
    raw_data: connection
  };
}

/**
 * Calculate strategic value
 */
function calculateStrategicValue(connection) {
  let value = 'unknown';
  let score = 0.5;
  
  if (connection.current_position) {
    const position = connection.current_position.toLowerCase();
    if (position.includes('director') || position.includes('ceo') || 
        position.includes('founder') || position.includes('president')) {
      value = 'high';
      score = 0.8;
    } else if (position.includes('manager') || position.includes('lead') || 
               position.includes('head') || position.includes('senior')) {
      value = 'medium';
      score = 0.65;
    } else {
      value = 'low';
      score = 0.5;
    }
  }
  
  // Bonus for having email
  if (connection.email_address) {
    score += 0.1;
  }
  
  return { value, score: Math.min(score, 1.0) };
}

/**
 * Import connections in batches
 */
async function importConnections(connections, source) {
  console.log(`\n📥 Importing ${connections.length} connections from ${source}...`);
  
  const batchSize = 50;
  
  for (let i = 0; i < connections.length; i += batchSize) {
    const batch = connections.slice(i, i + batchSize);
    
    try {
      // Add strategic value calculation
      const enhancedBatch = batch.map(conn => {
        const { value, score } = calculateStrategicValue(conn);
        return {
          ...conn,
          strategic_value: value,
          relationship_score: score
        };
      });
      
      // Insert batch
      await supabaseRequest('POST', 'linkedin_contacts', enhancedBatch);
      
      stats.imported += batch.length;
      
      if ((i + batch.length) % 500 === 0 || i + batch.length === connections.length) {
        console.log(`✅ Progress: ${i + batch.length}/${connections.length} imported`);
      }
      
    } catch (error) {
      console.error(`❌ Batch ${i}-${i + batch.length} error:`, error.message);
      
      // Try to insert one by one for this batch
      for (const conn of batch) {
        try {
          const { value, score } = calculateStrategicValue(conn);
          await supabaseRequest('POST', 'linkedin_contacts', {
            ...conn,
            strategic_value: value,
            relationship_score: score
          });
          stats.imported++;
        } catch (e) {
          if (e.message.includes('duplicate')) {
            stats.duplicates++;
          } else {
            stats.errors++;
          }
        }
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Process messages
 */
async function processMessages(messagesPath, source) {
  if (!fs.existsSync(messagesPath)) {
    console.log(`⚠️  No messages file for ${source}`);
    return;
  }
  
  console.log(`\n💬 Processing messages for ${source}...`);
  
  try {
    const messages = parseCSV(messagesPath);
    console.log(`   Found ${messages.length} messages`);
    
    // Extract interaction data
    const interactions = [];
    const contactUpdates = new Map();
    
    for (const msg of messages) {
      const from = msg['FROM'];
      const to = msg['TO'];
      const date = msg['DATE'];
      const content = msg['CONTENT'] || '';
      
      if (from && to && date) {
        // Track interactions by contact name
        const otherPerson = (from === 'Benjamin Knight' || from === 'Nic Marchesi') ? to : from;
        const direction = (from === 'Benjamin Knight' || from === 'Nic Marchesi') ? 'outbound' : 'inbound';
        
        if (!contactUpdates.has(otherPerson)) {
          contactUpdates.set(otherPerson, {
            messageCount: 0,
            lastInteraction: date
          });
        }
        contactUpdates.get(otherPerson).messageCount++;
        
        interactions.push({
          conversation_id: msg['CONVERSATION ID'],
          subject: msg['SUBJECT'],
          content: content.substring(0, 500), // Limit content length
          interaction_date: date,
          direction: direction,
          folder: msg['FOLDER'],
          is_draft: msg['IS MESSAGE DRAFT'] === 'Yes'
        });
      }
    }
    
    console.log(`   Extracted ${interactions.length} interactions from ${contactUpdates.size} contacts`);
    
    // We'll update this after contacts are imported
    return { interactions, contactUpdates };
    
  } catch (error) {
    console.error(`❌ Error processing messages:`, error.message);
    return { interactions: [], contactUpdates: new Map() };
  }
}

/**
 * Generate final report
 */
async function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 LINKEDIN IMPORT REPORT');
  console.log('='.repeat(60));
  console.log(`\n📈 Import Statistics:`);
  console.log(`   Total Connections: ${stats.totalConnections}`);
  console.log(`   Successfully Imported: ${stats.imported}`);
  console.log(`   Duplicates: ${stats.duplicates}`);
  console.log(`   Errors: ${stats.errors}`);
  
  try {
    // Get summary from database
    const summary = await supabaseRequest('GET', 'linkedin_contacts?select=strategic_value');
    
    const breakdown = summary.reduce((acc, contact) => {
      acc[contact.strategic_value] = (acc[contact.strategic_value] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`\n💎 Strategic Value Breakdown:`);
    console.log(`   High Value: ${breakdown.high || 0}`);
    console.log(`   Medium Value: ${breakdown.medium || 0}`);
    console.log(`   Low Value: ${breakdown.low || 0}`);
    console.log(`   Unknown: ${breakdown.unknown || 0}`);
    
    // Get top contacts
    const topContacts = await supabaseRequest('GET', 
      'linkedin_contacts?select=full_name,current_company,current_position,relationship_score&order=relationship_score.desc&limit=10'
    );
    
    if (topContacts && topContacts.length > 0) {
      console.log(`\n🌟 Top Strategic Contacts:`);
      topContacts.forEach((contact, i) => {
        console.log(`   ${i + 1}. ${contact.full_name || 'Unknown'}`);
        if (contact.current_position || contact.current_company) {
          console.log(`      ${contact.current_position || 'Position unknown'} at ${contact.current_company || 'Company unknown'}`);
        }
        console.log(`      Score: ${Math.round((contact.relationship_score || 0) * 100)}%`);
      });
    }
    
  } catch (error) {
    console.log(`\n⚠️  Could not fetch summary: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ IMPORT COMPLETE!');
  console.log('='.repeat(60));
}

/**
 * Main import function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('🚀 LINKEDIN DATA IMPORT (STANDALONE)');
  console.log(`   Supabase URL: ${SUPABASE_URL}`);
  console.log('='.repeat(60));
  
  try {
    const linkedInDir = path.join(__dirname, '../Docs/LinkedIn');
    
    // Process Ben's data
    console.log('\n👤 Processing Ben\'s LinkedIn data...');
    const benPath = path.join(linkedInDir, 'Bens_data/Connections.csv');
    const benConnections = parseCSV(benPath);
    stats.totalConnections += benConnections.length;
    console.log(`   Found ${benConnections.length} connections`);
    
    const benNormalized = benConnections.map(c => normalizeConnection(c, 'ben'));
    await importConnections(benNormalized, "Ben's data");
    
    const benMessages = await processMessages(
      path.join(linkedInDir, 'Bens_data/messages.csv'), 
      'Ben'
    );
    
    // Process Nic's data
    console.log('\n👤 Processing Nic\'s LinkedIn data...');
    const nicPath = path.join(linkedInDir, 'Nics_data/Connections.csv');
    const nicConnections = parseCSV(nicPath);
    stats.totalConnections += nicConnections.length;
    console.log(`   Found ${nicConnections.length} connections`);
    
    const nicNormalized = nicConnections.map(c => normalizeConnection(c, 'nic'));
    await importConnections(nicNormalized, "Nic's data");
    
    const nicMessages = await processMessages(
      path.join(linkedInDir, 'Nics_data/messages.csv'), 
      'Nic'
    );
    
    // Generate report
    await generateReport();
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the import
console.log('Starting LinkedIn import...');
main().catch(console.error);