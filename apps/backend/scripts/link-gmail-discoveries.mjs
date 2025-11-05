#!/usr/bin/env node
/**
 * Gmail Discovery Auto-Linking Script
 * Links Gmail-discovered people and organizations to Notion projects
 *
 * Usage: node link-gmail-discoveries.mjs <PROJECT_NAME> <PROJECT_ID>
 * Example: node link-gmail-discoveries.mjs "BG Fit" "18febcf9-81cf-80fe-a738-fe374e01cd08"
 */

import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Database IDs
const PEOPLE_DB_ID = '47bdc1c4-df99-4ddc-81c4-a0214c919d69';
const ORGANIZATIONS_DB_ID = '948f3946-7d1c-42f2-bd7e-1317a755e67b';

/**
 * Search for a person by email in the People database
 */
async function searchPersonByEmail(email) {
  try {
    const response = await notion.databases.query({
      database_id: PEOPLE_DB_ID,
      filter: {
        property: 'Email',
        email: {
          equals: email
        }
      }
    });
    return response.results.length > 0 ? response.results[0] : null;
  } catch (error) {
    console.error(`   ⚠️  Error searching for ${email}:`, error.message);
    return null;
  }
}

/**
 * Search for an organization by domain in the Organizations database
 */
async function searchOrganizationByDomain(domain) {
  try {
    // Try searching by website/domain property
    const response = await notion.databases.query({
      database_id: ORGANIZATIONS_DB_ID,
      filter: {
        or: [
          {
            property: 'Website',
            url: {
              contains: domain
            }
          },
          {
            property: 'Name',
            title: {
              contains: domain.split('.')[0]
            }
          }
        ]
      }
    });
    return response.results.length > 0 ? response.results[0] : null;
  } catch (error) {
    console.error(`   ⚠️  Error searching for ${domain}:`, error.message);
    return null;
  }
}

/**
 * Create a new person entry in the People database
 */
async function createPerson(email, name) {
  try {
    const response = await notion.pages.create({
      parent: { database_id: PEOPLE_DB_ID },
      properties: {
        'Name': {
          title: [{ text: { content: name || email.split('@')[0] } }]
        },
        'Email': {
          email: email
        }
      }
    });
    return response;
  } catch (error) {
    console.error(`   ❌ Error creating person ${email}:`, error.message);
    return null;
  }
}

/**
 * Create a new organization entry in the Organizations database
 */
async function createOrganization(name, domain) {
  try {
    const response = await notion.pages.create({
      parent: { database_id: ORGANIZATIONS_DB_ID },
      properties: {
        'Name': {
          title: [{ text: { content: name } }]
        },
        'Website': {
          url: `https://${domain}`
        }
      }
    });
    return response;
  } catch (error) {
    console.error(`   ❌ Error creating organization ${name}:`, error.message);
    return null;
  }
}

/**
 * Link a person to a project
 */
async function linkPersonToProject(projectId, personId, existingPeople = []) {
  try {
    // Check if already linked
    if (existingPeople.some(p => p.id === personId)) {
      return { linked: false, duplicate: true };
    }

    // Add the new person to existing people relations
    const allPeople = [...existingPeople.map(p => ({ id: p.id })), { id: personId }];

    await notion.pages.update({
      page_id: projectId,
      properties: {
        'People': {
          relation: allPeople
        }
      }
    });

    return { linked: true, duplicate: false };
  } catch (error) {
    console.error(`   ❌ Error linking person to project:`, error.message);
    return { linked: false, error: error.message };
  }
}

/**
 * Link an organization to a project
 */
async function linkOrganizationToProject(projectId, organizationId, existingOrgs = []) {
  try {
    // Check if already linked
    if (existingOrgs.some(o => o.id === organizationId)) {
      return { linked: false, duplicate: true };
    }

    // Add the new organization to existing organization relations
    const allOrgs = [...existingOrgs.map(o => ({ id: o.id })), { id: organizationId }];

    await notion.pages.update({
      page_id: projectId,
      properties: {
        'Organisations': {
          relation: allOrgs
        }
      }
    });

    return { linked: true, duplicate: false };
  } catch (error) {
    console.error(`   ❌ Error linking organization to project:`, error.message);
    return { linked: false, error: error.message };
  }
}

/**
 * Get current project connections
 */
async function getProjectConnections(projectId) {
  try {
    const page = await notion.pages.retrieve({ page_id: projectId });

    const people = page.properties.People?.relation || [];
    const organizations = page.properties.Organisations?.relation || [];

    return { people, organizations };
  } catch (error) {
    console.error(`   ❌ Error retrieving project:`, error.message);
    return { people: [], organizations: [] };
  }
}

/**
 * Main linking function
 */
async function linkGmailDiscoveries(projectName, projectId) {
  console.log('🔗 GMAIL DISCOVERY AUTO-LINKING');
  console.log('='.repeat(60));
  console.log(`Project: ${projectName}`);
  console.log(`Project ID: ${projectId}\n`);

  // Load Gmail discovery results
  const discoveryPath = `/tmp/gmail_discovery_${projectName.replace(/\s+/g, '_')}.json`;

  if (!fs.existsSync(discoveryPath)) {
    console.error(`❌ Discovery file not found: ${discoveryPath}`);
    console.error('   Please run gmail-mine-project.mjs first!');
    process.exit(1);
  }

  const discoveryResults = JSON.parse(fs.readFileSync(discoveryPath, 'utf8'));
  const { people, organizations } = discoveryResults.discovered;

  console.log(`📊 Discoveries to Link:`);
  console.log(`   👥 People: ${people.length}`);
  console.log(`   🏢 Organizations: ${organizations.length}\n`);

  // Get current project connections
  console.log('📋 Fetching current project connections...');
  const { people: existingPeople, organizations: existingOrgs } = await getProjectConnections(projectId);
  console.log(`   Current people: ${existingPeople.length}`);
  console.log(`   Current organizations: ${existingOrgs.length}\n`);

  // Stats
  let peopleLinked = 0;
  let peopleCreated = 0;
  let peopleDuplicates = 0;
  let peopleErrors = 0;

  let orgsLinked = 0;
  let orgsCreated = 0;
  let orgsDuplicates = 0;
  let orgsErrors = 0;

  // Process people
  console.log('👥 PROCESSING PEOPLE');
  console.log('-'.repeat(60));

  for (const person of people) {
    console.log(`\n${person.email} (confidence: ${person.confidence.toFixed(2)})`);

    // Search for existing person
    let personPage = await searchPersonByEmail(person.email);

    if (!personPage) {
      // Create new person
      console.log('   ➕ Creating new person...');
      personPage = await createPerson(person.email, person.name);

      if (personPage) {
        console.log('   ✅ Created');
        peopleCreated++;
      } else {
        console.log('   ❌ Failed to create');
        peopleErrors++;
        continue;
      }
    } else {
      console.log('   ✓ Found existing person');
    }

    // Link to project
    console.log('   🔗 Linking to project...');
    const linkResult = await linkPersonToProject(projectId, personPage.id, existingPeople);

    if (linkResult.linked) {
      console.log('   ✅ Linked');
      peopleLinked++;
      existingPeople.push({ id: personPage.id }); // Update local cache
    } else if (linkResult.duplicate) {
      console.log('   🔁 Already linked');
      peopleDuplicates++;
    } else {
      console.log('   ❌ Failed to link');
      peopleErrors++;
    }
  }

  // Process organizations
  console.log('\n\n🏢 PROCESSING ORGANIZATIONS');
  console.log('-'.repeat(60));

  for (const org of organizations) {
    console.log(`\n${org.name} (${org.domain}) (confidence: ${org.confidence.toFixed(2)})`);

    // Search for existing organization
    let orgPage = await searchOrganizationByDomain(org.domain);

    if (!orgPage) {
      // Create new organization
      console.log('   ➕ Creating new organization...');
      orgPage = await createOrganization(org.name, org.domain);

      if (orgPage) {
        console.log('   ✅ Created');
        orgsCreated++;
      } else {
        console.log('   ❌ Failed to create');
        orgsErrors++;
        continue;
      }
    } else {
      console.log('   ✓ Found existing organization');
    }

    // Link to project
    console.log('   🔗 Linking to project...');
    const linkResult = await linkOrganizationToProject(projectId, orgPage.id, existingOrgs);

    if (linkResult.linked) {
      console.log('   ✅ Linked');
      orgsLinked++;
      existingOrgs.push({ id: orgPage.id }); // Update local cache
    } else if (linkResult.duplicate) {
      console.log('   🔁 Already linked');
      orgsDuplicates++;
    } else {
      console.log('   ❌ Failed to link');
      orgsErrors++;
    }
  }

  // Final report
  console.log('\n\n🎉 LINKING COMPLETE!');
  console.log('='.repeat(60));
  console.log('\n👥 PEOPLE SUMMARY:');
  console.log(`   ✅ Linked: ${peopleLinked}`);
  console.log(`   ➕ Created: ${peopleCreated}`);
  console.log(`   🔁 Duplicates: ${peopleDuplicates}`);
  console.log(`   ❌ Errors: ${peopleErrors}`);

  console.log('\n🏢 ORGANIZATIONS SUMMARY:');
  console.log(`   ✅ Linked: ${orgsLinked}`);
  console.log(`   ➕ Created: ${orgsCreated}`);
  console.log(`   🔁 Duplicates: ${orgsDuplicates}`);
  console.log(`   ❌ Errors: ${orgsErrors}`);

  console.log('\n📊 TOTAL IMPACT:');
  console.log(`   New connections added: ${peopleLinked + orgsLinked}`);
  console.log(`   New database entries: ${peopleCreated + orgsCreated}`);

  const results = {
    project: projectName,
    projectId: projectId,
    people: {
      linked: peopleLinked,
      created: peopleCreated,
      duplicates: peopleDuplicates,
      errors: peopleErrors
    },
    organizations: {
      linked: orgsLinked,
      created: orgsCreated,
      duplicates: orgsDuplicates,
      errors: orgsErrors
    },
    timestamp: new Date().toISOString()
  };

  // Save results
  const resultsPath = `/tmp/gmail_linking_${projectName.replace(/\s+/g, '_')}.json`;
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to: ${resultsPath}`);

  return results;
}

// Parse command line arguments
const projectName = process.argv[2];
const projectId = process.argv[3];

if (!projectName || !projectId) {
  console.error('Usage: node link-gmail-discoveries.mjs <PROJECT_NAME> <PROJECT_ID>');
  console.error('Example: node link-gmail-discoveries.mjs "BG Fit" "18febcf9-81cf-80fe-a738-fe374e01cd08"');
  process.exit(1);
}

// Run the linking
linkGmailDiscoveries(projectName, projectId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
