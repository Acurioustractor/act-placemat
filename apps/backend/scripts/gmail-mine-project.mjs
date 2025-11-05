#!/usr/bin/env node
/**
 * Gmail Mining Script - Discover people and organizations from email
 *
 * Usage: node gmail-mine-project.mjs <PROJECT_NAME> [lookbackDays]
 * Example: node gmail-mine-project.mjs "BG Fit" 365
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Load Gmail tokens
const TOKEN_PATH = path.resolve(__dirname, '../core/.gmail_tokens.json');

async function mineGmailForProject(projectName, lookbackDays = 365) {
  try {
    // Load tokens
    if (!fs.existsSync(TOKEN_PATH)) {
      console.error('❌ Gmail tokens not found at:', TOKEN_PATH);
      console.error('   Please authenticate first via /api/google/auth');
      process.exit(1);
    }

    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    console.log('✅ Gmail tokens loaded');

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI
    );

    oauth2Client.setCredentials(tokens);

    // Initialize Gmail API
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    console.log('✅ Gmail API initialized');

    // Calculate date range
    const after = Math.floor(Date.now() / 1000) - (lookbackDays * 24 * 60 * 60);

    // Search for emails mentioning the project
    console.log(`\n🔍 Searching Gmail for "${projectName}"...`);
    console.log(`   Lookback: ${lookbackDays} days`);

    const query = `"${projectName}" after:${after}`;
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100
    });

    const messages = response.data.messages || [];
    console.log(`   Found: ${messages.length} emails\n`);

    if (messages.length === 0) {
      console.log('No emails found for this project.');
      return {
        project: projectName,
        emailsScanned: 0,
        people: [],
        organizations: [],
        relatedProjects: []
      };
    }

    // Get full message details
    console.log('📧 Analyzing emails...');
    const emailDetails = await Promise.all(
      messages.slice(0, 50).map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date']
        });
        return detail.data;
      })
    );

    // Extract people (email addresses)
    const peopleMap = new Map();
    const orgMap = new Map();

    for (const email of emailDetails) {
      const headers = email.payload.headers;
      const from = headers.find(h => h.name === 'From')?.value || '';
      const to = headers.find(h => h.name === 'To')?.value || '';
      const cc = headers.find(h => h.name === 'Cc')?.value || '';

      const allAddresses = `${from} ${to} ${cc}`;
      const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
      const matches = allAddresses.match(emailRegex) || [];

      for (const emailAddr of matches) {
        // Skip common no-reply addresses
        if (emailAddr.includes('noreply') || emailAddr.includes('no-reply')) continue;

        // Track person
        if (!peopleMap.has(emailAddr)) {
          peopleMap.set(emailAddr, { email: emailAddr, count: 0, emails: [] });
        }
        const person = peopleMap.get(emailAddr);
        person.count++;
        person.emails.push(email.id);

        // Extract organization from domain
        const domain = emailAddr.split('@')[1];
        if (domain && !domain.includes('gmail.com') && !domain.includes('outlook.com')) {
          if (!orgMap.has(domain)) {
            orgMap.set(domain, { domain, name: domain.split('.')[0], count: 0 });
          }
          orgMap.get(domain).count++;
        }
      }
    }

    // Filter and score
    const minMentions = 2;

    const people = Array.from(peopleMap.values())
      .filter(p => p.count >= minMentions)
      .map(p => ({
        email: p.email,
        name: p.email.split('@')[0], // Extract name from email
        confidence: Math.min(0.5 + (p.count * 0.05), 0.95),
        mentionCount: p.count,
        evidence: `mentioned in ${p.count} emails`
      }))
      .sort((a, b) => b.mentionCount - a.mentionCount);

    const organizations = Array.from(orgMap.values())
      .filter(o => o.count >= minMentions)
      .map(o => ({
        domain: o.domain,
        name: o.name.charAt(0).toUpperCase() + o.name.slice(1), // Capitalize
        confidence: Math.min(0.5 + (o.count * 0.05), 0.95),
        mentionCount: o.count,
        evidence: `${o.count} emails from this domain`
      }))
      .sort((a, b) => b.mentionCount - a.mentionCount);

    // Print results
    console.log('\n📊 DISCOVERY RESULTS');
    console.log('='.repeat(60));
    console.log(`Project: ${projectName}`);
    console.log(`Emails Scanned: ${emailDetails.length}`);

    console.log(`\n👥 PEOPLE DISCOVERED: ${people.length}`);
    people.slice(0, 10).forEach((p, i) => {
      console.log(`${i + 1}. ${p.email} (${p.mentionCount} mentions, confidence: ${p.confidence.toFixed(2)})`);
    });

    console.log(`\n🏢 ORGANIZATIONS DISCOVERED: ${organizations.length}`);
    organizations.slice(0, 10).forEach((o, i) => {
      console.log(`${i + 1}. ${o.name} - ${o.domain} (${o.mentionCount} emails, confidence: ${o.confidence.toFixed(2)})`);
    });

    // Save results
    const results = {
      project: projectName,
      emailsScanned: emailDetails.length,
      discovered: {
        people,
        organizations,
        relatedProjects: [] // Could extract from email content
      },
      timestamp: new Date().toISOString()
    };

    const outputPath = `/tmp/gmail_discovery_${projectName.replace(/\s+/g, '_')}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n✅ Results saved to: ${outputPath}`);

    return results;

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Parse command line arguments
const projectName = process.argv[2];
const lookbackDays = parseInt(process.argv[3] || '365');

if (!projectName) {
  console.error('Usage: node gmail-mine-project.mjs <PROJECT_NAME> [lookbackDays]');
  console.error('Example: node gmail-mine-project.mjs "BG Fit" 365');
  process.exit(1);
}

// Run the mining
mineGmailForProject(projectName, lookbackDays)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
