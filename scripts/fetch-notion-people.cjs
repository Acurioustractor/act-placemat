#!/usr/bin/env node

const https = require('https');
require('dotenv').config();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_PEOPLE_DB = process.env.NOTION_PEOPLE_DB;

if (!NOTION_TOKEN || !NOTION_PEOPLE_DB) {
  console.error('❌ Missing NOTION_TOKEN or NOTION_PEOPLE_DB in .env file');
  process.exit(1);
}

async function fetchNotionPeople() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      page_size: 100
    });

    const options = {
      hostname: 'api.notion.com',
      port: 443,
      path: `/v1/databases/${NOTION_PEOPLE_DB}/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
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

async function main() {
  try {
    console.log('📋 Fetching Notion People database...');
    const response = await fetchNotionPeople();
    
    const people = response.results.map(page => {
      const properties = page.properties;
      
      // Extract common fields
      const name = properties.Name?.title?.[0]?.text?.content || 
                   properties.Title?.title?.[0]?.text?.content || 
                   'Unknown';
      
      const email = properties.Email?.email || 
                    properties['Email Address']?.email || 
                    properties.Contact?.email || null;
      
      const linkedin = properties.LinkedIn?.url || 
                       properties['LinkedIn URL']?.url || 
                       properties['LinkedIn Profile']?.url || null;
      
      const organization = properties.Organization?.select?.name || 
                          properties.Company?.select?.name || 
                          properties.Employer?.select?.name || null;
      
      const phone = properties.Phone?.phone_number || 
                    properties['Phone Number']?.phone_number || null;

      return {
        id: page.id,
        name,
        email,
        linkedin,
        organization,
        phone,
        created_time: page.created_time,
        last_edited_time: page.last_edited_time,
        raw_properties: properties
      };
    });

    console.log(`✅ Fetched ${people.length} people from Notion`);
    
    // Save to file for cross-referencing
    const fs = require('fs');
    const path = require('path');
    
    const outputPath = path.join(__dirname, '..', 'Docs', 'Notion', 'people.json');
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(people, null, 2));
    console.log(`💾 Saved Notion people to: ${outputPath}`);
    
    // Show sample data
    console.log('\n📊 Sample Notion People:');
    people.slice(0, 5).forEach((person, index) => {
      console.log(`   ${index + 1}. ${person.name}`);
      if (person.email) console.log(`      Email: ${person.email}`);
      if (person.linkedin) console.log(`      LinkedIn: ${person.linkedin}`);
      if (person.organization) console.log(`      Organization: ${person.organization}`);
      console.log('');
    });
    
    return people;
    
  } catch (error) {
    console.error('❌ Failed to fetch Notion people:', error.message);
    process.exit(1);
  }
}

main();