#!/usr/bin/env node
/**
 * LinkedIn Data Import Script
 * Imports 15,020 LinkedIn connections and related data into Supabase
 * Enables relationship intelligence and cross-referencing
 */

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Statistics tracking
const stats = {
  totalConnections: 0,
  imported: 0,
  updated: 0,
  errors: 0,
  duplicates: 0,
  messages: 0,
  skills: 0,
  positions: 0
};

/**
 * Parse CSV file into objects
 */
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = fs.createReadStream(filePath);
    
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      skip_records_with_empty_values: false,
      trim: true,
      from_line: 2 // Skip the LinkedIn export notice
    });
    
    stream.pipe(parser)
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

/**
 * Clean and normalize connection data
 */
function normalizeConnection(connection, source) {
  const firstName = connection['First Name'] || '';
  const lastName = connection['Last Name'] || '';
  
  return {
    first_name: firstName,
    last_name: lastName,
    full_name: `${firstName} ${lastName}`.trim(),
    linkedin_url: connection['URL'] || connection['url'] || null,
    email_address: connection['Email Address'] || null,
    current_company: connection['Company'] || null,
    current_position: connection['Position'] || null,
    connected_date: connection['Connected On'] ? parseLinkedInDate(connection['Connected On']) : null,
    data_source: source, // 'ben' or 'nic'
    
    // Initialize intelligence fields
    relationship_score: 0.5,
    strategic_value: 'unknown',
    alignment_tags: [],
    skills_extracted: [],
    network_reach: null,
    influence_level: null,
    engagement_frequency: null,
    
    // Metadata
    raw_data: connection,
    imported_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Parse LinkedIn date format (e.g., "05 Aug 2025")
 */
function parseLinkedInDate(dateStr) {
  try {
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
  } catch (error) {
    return null;
  }
}

/**
 * Import connections to Supabase
 */
async function importConnections(connections, source) {
  console.log(`\n📥 Importing ${connections.length} connections from ${source}'s data...`);
  
  const batchSize = 100;
  for (let i = 0; i < connections.length; i += batchSize) {
    const batch = connections.slice(i, i + batchSize);
    
    try {
      // Check for existing connections by LinkedIn URL
      const urls = batch.map(c => c.linkedin_url).filter(Boolean);
      const { data: existing } = await supabase
        .from('linkedin_contacts')
        .select('linkedin_url')
        .in('linkedin_url', urls);
      
      const existingUrls = new Set(existing?.map(e => e.linkedin_url) || []);
      
      // Separate new vs update
      const newConnections = batch.filter(c => !c.linkedin_url || !existingUrls.has(c.linkedin_url));
      const updateConnections = batch.filter(c => c.linkedin_url && existingUrls.has(c.linkedin_url));
      
      // Insert new connections
      if (newConnections.length > 0) {
        const { error } = await supabase
          .from('linkedin_contacts')
          .insert(newConnections);
        
        if (error) {
          console.error(`❌ Error inserting batch ${i}-${i + batch.length}:`, error.message);
          stats.errors += newConnections.length;
        } else {
          stats.imported += newConnections.length;
          console.log(`✅ Imported ${newConnections.length} new connections (${i + newConnections.length}/${connections.length})`);
        }
      }
      
      // Update existing connections if needed
      if (updateConnections.length > 0) {
        for (const conn of updateConnections) {
          const { error } = await supabase
            .from('linkedin_contacts')
            .update({
              current_company: conn.current_company,
              current_position: conn.current_position,
              email_address: conn.email_address || undefined,
              updated_at: new Date().toISOString()
            })
            .eq('linkedin_url', conn.linkedin_url);
          
          if (!error) stats.updated++;
        }
        stats.duplicates += updateConnections.length;
      }
      
    } catch (error) {
      console.error(`❌ Batch error:`, error);
      stats.errors += batch.length;
    }
    
    // Progress indicator
    if ((i + batch.length) % 500 === 0) {
      console.log(`📊 Progress: ${i + batch.length}/${connections.length} processed`);
    }
  }
}

/**
 * Import messages and extract interaction data
 */
async function importMessages(messagesPath, source) {
  try {
    if (!fs.existsSync(messagesPath)) {
      console.log(`⚠️  No messages file found for ${source}`);
      return;
    }
    
    console.log(`\n💬 Processing messages from ${source}...`);
    const messages = await parseCSV(messagesPath);
    
    // Extract unique contacts from messages
    const messageContacts = new Map();
    
    for (const msg of messages) {
      const fromName = msg['FROM'];
      const toName = msg['TO'];
      const date = msg['DATE'];
      const content = msg['CONTENT'] || '';
      
      // Track interaction frequency
      if (fromName && fromName !== 'Benjamin Knight' && fromName !== 'Nic Marchesi') {
        if (!messageContacts.has(fromName)) {
          messageContacts.set(fromName, {
            name: fromName,
            messageCount: 0,
            lastInteraction: date,
            sentiment: analyzeSentiment(content)
          });
        }
        messageContacts.get(fromName).messageCount++;
      }
    }
    
    console.log(`📧 Found ${messageContacts.size} contacts with messages`);
    
    // Update contacts with interaction data
    for (const [name, data] of messageContacts) {
      const names = name.split(' ');
      const firstName = names[0];
      const lastName = names.slice(1).join(' ');
      
      const { error } = await supabase
        .from('linkedin_contacts')
        .update({
          engagement_frequency: calculateEngagementLevel(data.messageCount),
          last_interaction: data.lastInteraction,
          interaction_count: data.messageCount
        })
        .eq('first_name', firstName)
        .eq('last_name', lastName);
      
      if (!error) stats.messages++;
    }
    
    console.log(`✅ Updated ${stats.messages} contacts with message data`);
    
  } catch (error) {
    console.error(`❌ Error processing messages:`, error.message);
  }
}

/**
 * Simple sentiment analysis
 */
function analyzeSentiment(text) {
  const positive = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'thank'];
  const negative = ['unfortunately', 'sorry', 'issue', 'problem', 'concern', 'difficult'];
  
  const lowerText = text.toLowerCase();
  const positiveCount = positive.filter(word => lowerText.includes(word)).length;
  const negativeCount = negative.filter(word => lowerText.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

/**
 * Calculate engagement level based on message count
 */
function calculateEngagementLevel(messageCount) {
  if (messageCount >= 10) return 'high';
  if (messageCount >= 3) return 'medium';
  if (messageCount >= 1) return 'low';
  return 'none';
}

/**
 * Import skills data
 */
async function importSkills(skillsPath, source) {
  try {
    if (!fs.existsSync(skillsPath)) {
      console.log(`⚠️  No skills file found for ${source}`);
      return;
    }
    
    console.log(`\n🎯 Processing skills from ${source}...`);
    const skills = await parseCSV(skillsPath);
    
    // Skills would need to be matched to the person's own profile
    // For now, we'll store them as metadata
    console.log(`📋 Found ${skills.length} skills for ${source}`);
    
  } catch (error) {
    console.error(`❌ Error processing skills:`, error.message);
  }
}

/**
 * Cross-reference with existing data sources
 */
async function crossReferenceData() {
  console.log('\n🔗 Cross-referencing with existing data sources...');
  
  try {
    // 1. Match with Gmail contacts by email
    const { data: gmailContacts } = await supabase
      .from('gmail_notion_contacts')
      .select('gmail_email, gmail_name, notion_person_id');
    
    if (gmailContacts && gmailContacts.length > 0) {
      console.log(`📧 Found ${gmailContacts.length} Gmail contacts to match`);
      
      for (const gmail of gmailContacts) {
        if (gmail.gmail_email) {
          const { error } = await supabase
            .from('linkedin_contacts')
            .update({
              email_address: gmail.gmail_email,
              notion_person_id: gmail.notion_person_id,
              strategic_value: 'medium' // Has email = more valuable
            })
            .eq('email_address', gmail.gmail_email);
        }
      }
    }
    
    // 2. Match with Notion People database by name
    console.log('🔍 Matching with Notion People database...');
    // This would require access to Notion API
    
    // 3. Calculate relationship scores
    console.log('📊 Calculating relationship intelligence scores...');
    await calculateRelationshipScores();
    
  } catch (error) {
    console.error('❌ Cross-reference error:', error.message);
  }
}

/**
 * Calculate relationship intelligence scores
 */
async function calculateRelationshipScores() {
  console.log('\n🧮 Calculating relationship intelligence...');
  
  // Get all contacts
  const { data: contacts } = await supabase
    .from('linkedin_contacts')
    .select('*');
  
  if (!contacts) return;
  
  const batchSize = 100;
  let processed = 0;
  
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    
    for (const contact of batch) {
      let score = 0.5; // Base score
      let strategicValue = 'unknown';
      let alignmentTags = [];
      
      // Score based on completeness
      if (contact.email_address) score += 0.1;
      if (contact.current_company) score += 0.05;
      if (contact.current_position) score += 0.05;
      if (contact.interaction_count > 0) score += 0.1;
      if (contact.engagement_frequency === 'high') score += 0.2;
      
      // Strategic value based on position/company
      if (contact.current_position) {
        const position = contact.current_position.toLowerCase();
        if (position.includes('director') || position.includes('ceo') || position.includes('founder')) {
          strategicValue = 'high';
          score += 0.2;
        } else if (position.includes('manager') || position.includes('lead')) {
          strategicValue = 'medium';
          score += 0.1;
        }
      }
      
      // Alignment tags based on company/position
      if (contact.current_company) {
        const company = contact.current_company.toLowerCase();
        if (company.includes('government') || company.includes('federal')) alignmentTags.push('government');
        if (company.includes('nonprofit') || company.includes('charity')) alignmentTags.push('nonprofit');
        if (company.includes('tech') || company.includes('digital')) alignmentTags.push('technology');
        if (company.includes('community') || company.includes('social')) alignmentTags.push('community');
      }
      
      // Update contact with calculated values
      await supabase
        .from('linkedin_contacts')
        .update({
          relationship_score: Math.min(score, 1.0),
          strategic_value: strategicValue,
          alignment_tags: alignmentTags
        })
        .eq('id', contact.id);
      
      processed++;
    }
    
    console.log(`📈 Scored ${processed}/${contacts.length} contacts`);
  }
}

/**
 * Generate intelligence report
 */
async function generateIntelligenceReport() {
  console.log('\n📊 Generating Intelligence Report...\n');
  
  const { data: summary } = await supabase
    .from('linkedin_contacts')
    .select('strategic_value')
    .not('strategic_value', 'is', null);
  
  const { data: topContacts } = await supabase
    .from('linkedin_contacts')
    .select('full_name, current_company, current_position, relationship_score')
    .order('relationship_score', { ascending: false })
    .limit(10);
  
  const { data: withEmail } = await supabase
    .from('linkedin_contacts')
    .select('email_address')
    .not('email_address', 'is', null);
  
  const valueBreakdown = summary?.reduce((acc, contact) => {
    acc[contact.strategic_value] = (acc[contact.strategic_value] || 0) + 1;
    return acc;
  }, {}) || {};
  
  console.log('='.repeat(60));
  console.log('📈 LINKEDIN INTELLIGENCE REPORT');
  console.log('='.repeat(60));
  console.log(`\n📊 Import Statistics:`);
  console.log(`   Total Connections: ${stats.totalConnections}`);
  console.log(`   Successfully Imported: ${stats.imported}`);
  console.log(`   Updated Existing: ${stats.updated}`);
  console.log(`   Duplicates Skipped: ${stats.duplicates}`);
  console.log(`   Errors: ${stats.errors}`);
  console.log(`   With Email Addresses: ${withEmail?.length || 0}`);
  console.log(`   With Message History: ${stats.messages}`);
  
  console.log(`\n💎 Strategic Value Breakdown:`);
  console.log(`   High Value: ${valueBreakdown.high || 0}`);
  console.log(`   Medium Value: ${valueBreakdown.medium || 0}`);
  console.log(`   Unknown: ${valueBreakdown.unknown || 0}`);
  
  console.log(`\n🌟 Top 10 Strategic Contacts:`);
  topContacts?.forEach((contact, index) => {
    console.log(`   ${index + 1}. ${contact.full_name}`);
    console.log(`      ${contact.current_position} at ${contact.current_company}`);
    console.log(`      Score: ${(contact.relationship_score * 100).toFixed(0)}%`);
  });
  
  console.log('\n='.repeat(60));
  console.log('✅ IMPORT COMPLETE!');
  console.log('='.repeat(60));
}

/**
 * Main import function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('🚀 LINKEDIN DATA IMPORT SCRIPT');
  console.log('   Importing 15,020 connections to Supabase');
  console.log('='.repeat(60));
  
  try {
    const linkedInDir = path.join(__dirname, '../Docs/LinkedIn');
    
    // Process Ben's data
    console.log('\n👤 Processing Ben\'s LinkedIn data...');
    const benConnections = await parseCSV(path.join(linkedInDir, 'Bens_data/Connections.csv'));
    stats.totalConnections += benConnections.length;
    const benNormalized = benConnections.map(c => normalizeConnection(c, 'ben'));
    await importConnections(benNormalized, 'Ben');
    await importMessages(path.join(linkedInDir, 'Bens_data/messages.csv'), 'Ben');
    await importSkills(path.join(linkedInDir, 'Bens_data/Skills.csv'), 'Ben');
    
    // Process Nic's data
    console.log('\n👤 Processing Nic\'s LinkedIn data...');
    const nicConnections = await parseCSV(path.join(linkedInDir, 'Nics_data/Connections.csv'));
    stats.totalConnections += nicConnections.length;
    const nicNormalized = nicConnections.map(c => normalizeConnection(c, 'nic'));
    await importConnections(nicNormalized, 'Nic');
    await importMessages(path.join(linkedInDir, 'Nics_data/messages.csv'), 'Nic');
    await importSkills(path.join(linkedInDir, 'Nics_data/Skills.csv'), 'Nic');
    
    // Cross-reference with other data sources
    await crossReferenceData();
    
    // Generate final report
    await generateIntelligenceReport();
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the import
main().catch(console.error);