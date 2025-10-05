#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

class ContactCrossReferencer {
  constructor() {
    this.linkedinContacts = [];
    this.gmailContacts = [];
    this.notionContacts = [];
    this.matches = [];
  }

  async initialize() {
    console.log('🔄 Initializing Contact Cross-Referencer...');
    
    // Load LinkedIn contacts from Supabase
    await this.loadLinkedInContacts();
    
    // Load Gmail contacts (if available)
    await this.loadGmailContacts();
    
    // Load Notion contacts (if available)
    await this.loadNotionContacts();
    
    console.log(`📊 Loaded contacts:`);
    console.log(`   LinkedIn: ${this.linkedinContacts.length}`);
    console.log(`   Gmail: ${this.gmailContacts.length}`);
    console.log(`   Notion: ${this.notionContacts.length}`);
  }

  async loadLinkedInContacts() {
    return new Promise((resolve, reject) => {
      const url = new URL(`${SUPABASE_URL}/rest/v1/linkedin_contacts`);
      url.searchParams.append('select', 'id,first_name,last_name,full_name,email_address,current_company,current_position,linkedin_url,relationship_score,strategic_value');
      url.searchParams.append('limit', '20000');

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.linkedinContacts = JSON.parse(data);
            console.log(`✅ Loaded ${this.linkedinContacts.length} LinkedIn contacts`);
            resolve();
          } else {
            console.error(`❌ LinkedIn load failed: ${res.statusCode} ${data}`);
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  async loadGmailContacts() {
    try {
      // Check if Gmail contacts file exists
      const gmailPath = path.join(__dirname, '..', 'Docs', 'Gmail', 'contacts.json');
      if (fs.existsSync(gmailPath)) {
        const gmailData = fs.readFileSync(gmailPath, 'utf8');
        this.gmailContacts = JSON.parse(gmailData);
        console.log(`✅ Loaded ${this.gmailContacts.length} Gmail contacts`);
      } else {
        console.log('⚠️ No Gmail contacts file found');
      }
    } catch (error) {
      console.log('⚠️ Could not load Gmail contacts:', error.message);
    }
  }

  async loadNotionContacts() {
    try {
      // Check if Notion people data exists
      const notionPath = path.join(__dirname, '..', 'Docs', 'Notion', 'people.json');
      if (fs.existsSync(notionPath)) {
        const notionData = fs.readFileSync(notionPath, 'utf8');
        this.notionContacts = JSON.parse(notionData);
        console.log(`✅ Loaded ${this.notionContacts.length} Notion contacts`);
      } else {
        console.log('⚠️ No Notion contacts file found');
      }
    } catch (error) {
      console.log('⚠️ Could not load Notion contacts:', error.message);
    }
  }

  crossReferenceContacts() {
    console.log('🔍 Cross-referencing contacts...');
    
    this.linkedinContacts.forEach(linkedinContact => {
      const matches = {
        linkedin: linkedinContact,
        gmail: null,
        notion: null,
        confidence: 0,
        matchReasons: []
      };

      // Match with Gmail contacts
      if (this.gmailContacts.length > 0) {
        const gmailMatch = this.findBestGmailMatch(linkedinContact);
        if (gmailMatch.contact) {
          matches.gmail = gmailMatch.contact;
          matches.confidence += gmailMatch.confidence;
          matches.matchReasons.push(`Gmail: ${gmailMatch.reason}`);
        }
      }

      // Match with Notion contacts
      if (this.notionContacts.length > 0) {
        const notionMatch = this.findBestNotionMatch(linkedinContact);
        if (notionMatch.contact) {
          matches.notion = notionMatch.contact;
          matches.confidence += notionMatch.confidence;
          matches.matchReasons.push(`Notion: ${notionMatch.reason}`);
        }
      }

      if (matches.confidence > 0.3) { // Only include matches with >30% confidence
        this.matches.push(matches);
      }
    });

    console.log(`✅ Found ${this.matches.length} cross-referenced contacts`);
    return this.matches;
  }

  findBestGmailMatch(linkedinContact) {
    let bestMatch = { contact: null, confidence: 0, reason: '' };

    this.gmailContacts.forEach(gmailContact => {
      let confidence = 0;
      let reasons = [];

      // Email match (highest confidence)
      if (linkedinContact.email_address && gmailContact.email) {
        if (linkedinContact.email_address.toLowerCase() === gmailContact.email.toLowerCase()) {
          confidence += 0.9;
          reasons.push('exact email match');
        }
      }

      // Name matching
      const nameMatch = this.calculateNameSimilarity(
        linkedinContact.full_name || `${linkedinContact.first_name} ${linkedinContact.last_name}`,
        gmailContact.name || gmailContact.displayName || ''
      );

      if (nameMatch > 0.8) {
        confidence += 0.7;
        reasons.push('strong name match');
      } else if (nameMatch > 0.6) {
        confidence += 0.4;
        reasons.push('partial name match');
      }

      // Company matching
      if (linkedinContact.current_company && gmailContact.organization) {
        const companyMatch = this.calculateTextSimilarity(
          linkedinContact.current_company,
          gmailContact.organization
        );
        if (companyMatch > 0.7) {
          confidence += 0.3;
          reasons.push('company match');
        }
      }

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          contact: gmailContact,
          confidence,
          reason: reasons.join(', ')
        };
      }
    });

    return bestMatch;
  }

  findBestNotionMatch(linkedinContact) {
    let bestMatch = { contact: null, confidence: 0, reason: '' };

    this.notionContacts.forEach(notionContact => {
      let confidence = 0;
      let reasons = [];

      // LinkedIn URL match (highest confidence)
      if (linkedinContact.linkedin_url && notionContact.linkedin_url) {
        if (linkedinContact.linkedin_url === notionContact.linkedin_url) {
          confidence += 0.95;
          reasons.push('LinkedIn URL match');
        }
      }

      // Email match
      if (linkedinContact.email_address && notionContact.email) {
        if (linkedinContact.email_address.toLowerCase() === notionContact.email.toLowerCase()) {
          confidence += 0.9;
          reasons.push('email match');
        }
      }

      // Name matching
      const nameMatch = this.calculateNameSimilarity(
        linkedinContact.full_name || `${linkedinContact.first_name} ${linkedinContact.last_name}`,
        notionContact.name || notionContact.title || ''
      );

      if (nameMatch > 0.8) {
        confidence += 0.6;
        reasons.push('strong name match');
      } else if (nameMatch > 0.6) {
        confidence += 0.3;
        reasons.push('partial name match');
      }

      // Organization matching
      if (linkedinContact.current_company && notionContact.organization) {
        const orgMatch = this.calculateTextSimilarity(
          linkedinContact.current_company,
          notionContact.organization
        );
        if (orgMatch > 0.7) {
          confidence += 0.2;
          reasons.push('organization match');
        }
      }

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          contact: notionContact,
          confidence,
          reason: reasons.join(', ')
        };
      }
    });

    return bestMatch;
  }

  calculateNameSimilarity(name1, name2) {
    if (!name1 || !name2) return 0;

    const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const words1 = normalize(name1).split(/\s+/);
    const words2 = normalize(name2).split(/\s+/);

    if (words1.length === 0 || words2.length === 0) return 0;

    let matches = 0;
    const totalWords = Math.max(words1.length, words2.length);

    words1.forEach(word1 => {
      if (word1.length > 1) { // Skip single characters
        const hasMatch = words2.some(word2 => {
          if (word2.length > 1) {
            // Exact match
            if (word1 === word2) return true;
            // Partial match (one contains the other)
            if (word1.length > 3 && word2.length > 3) {
              return word1.includes(word2) || word2.includes(word1);
            }
          }
          return false;
        });
        if (hasMatch) matches++;
      }
    });

    return matches / totalWords;
  }

  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;

    const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const norm1 = normalize(text1);
    const norm2 = normalize(text2);

    if (norm1 === norm2) return 1.0;
    if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;

    // Simple word overlap
    const words1 = norm1.split(/\s+/);
    const words2 = norm2.split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));

    return commonWords.length / Math.max(words1.length, words2.length);
  }

  async updateLinkedInContactsWithReferences() {
    console.log('📝 Updating LinkedIn contacts with cross-references...');
    
    let updateCount = 0;
    const batchSize = 10;
    
    for (let i = 0; i < this.matches.length; i += batchSize) {
      const batch = this.matches.slice(i, i + batchSize);
      const promises = batch.map(match => this.updateSingleContact(match));
      
      try {
        await Promise.all(promises);
        updateCount += batch.length;
        console.log(`✅ Updated batch ${Math.floor(i/batchSize) + 1}: ${updateCount}/${this.matches.length} contacts`);
      } catch (error) {
        console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Cross-reference update complete: ${updateCount} contacts updated`);
  }

  async updateSingleContact(match) {
    return new Promise((resolve, reject) => {
      const updateData = {};

      // Add Gmail contact ID if matched
      if (match.gmail) {
        updateData.gmail_contact_id = match.gmail.id || match.gmail.email;
      }

      // Add Notion person ID if matched
      if (match.notion) {
        updateData.notion_person_id = match.notion.id || match.notion.page_id;
      }

      // Add cross-reference metadata
      updateData.raw_data = {
        ...match.linkedin.raw_data,
        cross_references: {
          gmail_match: match.gmail ? {
            confidence: match.confidence,
            matched_fields: match.matchReasons
          } : null,
          notion_match: match.notion ? {
            confidence: match.confidence,
            matched_fields: match.matchReasons
          } : null,
          last_cross_referenced: new Date().toISOString()
        }
      };

      const url = new URL(`${SUPABASE_URL}/rest/v1/linkedin_contacts`);
      url.searchParams.append('id', `eq.${match.linkedin.id}`);

      const postData = JSON.stringify(updateData);

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  generateCrossReferenceReport() {
    console.log('\n============================================================');
    console.log('📊 CONTACT CROSS-REFERENCE REPORT');
    console.log('============================================================\n');

    // Summary statistics
    const gmailMatches = this.matches.filter(m => m.gmail).length;
    const notionMatches = this.matches.filter(m => m.notion).length;
    const bothMatches = this.matches.filter(m => m.gmail && m.notion).length;
    const highConfidenceMatches = this.matches.filter(m => m.confidence > 0.7).length;

    console.log('📈 Cross-Reference Statistics:');
    console.log(`   Total LinkedIn Contacts: ${this.linkedinContacts.length}`);
    console.log(`   Contacts with Gmail Match: ${gmailMatches}`);
    console.log(`   Contacts with Notion Match: ${notionMatches}`);
    console.log(`   Contacts with Both Matches: ${bothMatches}`);
    console.log(`   High Confidence Matches (>70%): ${highConfidenceMatches}`);
    console.log(`   Total Cross-References: ${this.matches.length}`);

    // Top matches by confidence
    console.log('\n🌟 Top Cross-Reference Matches:');
    const topMatches = this.matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    topMatches.forEach((match, index) => {
      console.log(`   ${index + 1}. ${match.linkedin.full_name}`);
      console.log(`      Company: ${match.linkedin.current_company || 'Unknown'}`);
      console.log(`      Confidence: ${Math.round(match.confidence * 100)}%`);
      console.log(`      Matches: ${match.matchReasons.join(', ')}`);
      if (match.gmail) {
        console.log(`      Gmail: ${match.gmail.email || match.gmail.name}`);
      }
      if (match.notion) {
        console.log(`      Notion: ${match.notion.name || match.notion.title}`);
      }
      console.log('');
    });

    // Strategic contact overlaps
    const strategicOverlaps = this.matches.filter(m => 
      m.linkedin.strategic_value === 'high' && (m.gmail || m.notion)
    );

    console.log('💎 Strategic Contacts with Cross-Platform Presence:');
    strategicOverlaps.forEach(match => {
      console.log(`   • ${match.linkedin.full_name} (${match.linkedin.current_company})`);
      console.log(`     Relationship Score: ${Math.round(match.linkedin.relationship_score * 100)}%`);
      console.log(`     Available on: LinkedIn${match.gmail ? ', Gmail' : ''}${match.notion ? ', Notion' : ''}`);
    });

    console.log('\n============================================================');
    console.log('✅ CROSS-REFERENCE COMPLETE!');
    console.log('============================================================');

    return {
      summary: {
        totalLinkedIn: this.linkedinContacts.length,
        gmailMatches,
        notionMatches,
        bothMatches,
        highConfidenceMatches,
        totalCrossReferences: this.matches.length
      },
      topMatches: topMatches.slice(0, 5),
      strategicOverlaps
    };
  }
}

async function main() {
  const crossReferencer = new ContactCrossReferencer();
  
  try {
    await crossReferencer.initialize();
    const matches = crossReferencer.crossReferenceContacts();
    
    if (matches.length > 0) {
      await crossReferencer.updateLinkedInContactsWithReferences();
    }
    
    const report = crossReferencer.generateCrossReferenceReport();
    
    // Save report to file
    const reportPath = path.join(__dirname, '..', 'Docs', 'Analysis', 'contact-cross-reference-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Cross-reference process failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ContactCrossReferencer;
