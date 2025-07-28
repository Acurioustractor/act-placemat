#!/usr/bin/env node

/**
 * ACT Placemat Complete Example Creator
 * 
 * This script demonstrates how all databases work together by creating:
 * 1. An Organisation: "Ford Foundation"
 * 2. A Person: "Jane Smith" from Ford Foundation
 * 3. An Opportunity: "$100K Climate Justice Grant" linking Ford Foundation and Jane
 * 4. A Project to link the opportunity to
 * 5. An Artefact: "Grant Proposal Draft" linked to the opportunity
 * 
 * Shows how two-way relations automatically connect everything.
 */

const { Client } = require('@notionhq/client');
require('dotenv').config();

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// Database IDs from environment
const DATABASES = {
  projects: process.env.NOTION_DATABASE_ID || process.env.NOTION_PROJECTS_DB,
  opportunities: process.env.NOTION_OPPORTUNITIES_DB,
  organizations: process.env.NOTION_ORGANIZATIONS_DB,
  people: process.env.NOTION_PEOPLE_DB,
  artifacts: process.env.NOTION_ARTIFACTS_DB,
};

console.log('🚀 ACT Placemat Complete Example Creator');
console.log('========================================\n');

// Helper function to create a page in Notion
async function createNotionPage(databaseId, properties) {
  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: properties,
    });
    return response;
  } catch (error) {
    console.error('Error creating page:', error);
    throw error;
  }
}

// Helper function to get database properties (to understand schema)
async function getDatabaseSchema(databaseId) {
  try {
    const response = await notion.databases.retrieve({ database_id: databaseId });
    return response.properties;
  } catch (error) {
    console.error('Error retrieving database schema:', error);
    throw error;
  }
}

// Main function to create the complete example
async function createCompleteExample() {
  try {
    // Step 0: Check which databases are configured
    console.log('📋 Checking configured databases...\n');
    
    const configuredDatabases = {};
    for (const [name, id] of Object.entries(DATABASES)) {
      if (id) {
        try {
          await getDatabaseSchema(id);
          configuredDatabases[name] = id;
          console.log(`✅ ${name} database: Configured`);
        } catch (error) {
          console.log(`❌ ${name} database: Not accessible (${error.code})`);
        }
      } else {
        console.log(`❌ ${name} database: Not configured`);
      }
    }
    
    console.log('\n');
    
    // Check if we have the minimum required databases
    if (!configuredDatabases.projects) {
      console.error('❌ Projects database is required but not configured.');
      console.log('Please set NOTION_DATABASE_ID or NOTION_PROJECTS_DB in your .env file');
      return;
    }
    
    if (Object.keys(configuredDatabases).length === 1) {
      console.log('⚠️  Only Projects database is configured.');
      console.log('To see the full ecosystem in action, please create and configure:');
      console.log('   - Opportunities database (NOTION_OPPORTUNITIES_DB)');
      console.log('   - Organizations database (NOTION_ORGANIZATIONS_DB)');
      console.log('   - People database (NOTION_PEOPLE_DB)');
      console.log('   - Artifacts database (NOTION_ARTIFACTS_DB)');
      console.log('\nRefer to NOTION_DATABASE_SCHEMAS.md for setup instructions.\n');
    }
    
    // Create entries based on what's available
    const createdEntries = {};
    
    // Step 1: Create Organization (if database exists)
    if (configuredDatabases.organizations) {
      console.log('1️⃣  Creating Organization: Ford Foundation...');
      
      const orgProperties = {
        'Organization Name': {
          title: [{ text: { content: 'Ford Foundation' } }]
        },
        'Type': {
          select: { name: 'Foundation' }
        },
        'Sector': {
          multi_select: [{ name: 'Environment' }, { name: 'Finance' }]
        },
        'Size': {
          select: { name: 'Enterprise (500+)' }
        },
        'Website': {
          url: 'https://www.fordfoundation.org'
        },
        'Location': {
          rich_text: [{ text: { content: 'New York, NY, USA' } }]
        },
        'Description': {
          rich_text: [{ text: { content: 'The Ford Foundation is a global philanthropy focused on addressing inequality and advancing human dignity and justice.' } }]
        },
        'Relationship Status': {
          select: { name: 'Active Partner' }
        },
        'Partnership Type': {
          multi_select: [{ name: 'Funding' }, { name: 'Strategic' }]
        },
        'Funding Capacity': {
          select: { name: '$1M+' }
        },
        'Values Alignment': {
          select: { name: 'High' }
        },
        'Strategic Priority': {
          select: { name: 'Critical' }
        },
        'Annual Budget': {
          number: 600000000
        }
      };
      
      try {
        createdEntries.organization = await createNotionPage(configuredDatabases.organizations, orgProperties);
        console.log('✅ Organization created: Ford Foundation');
      } catch (error) {
        console.error('❌ Failed to create organization:', error.message);
      }
    }
    
    // Step 2: Create Person (if database exists)
    if (configuredDatabases.people) {
      console.log('\n2️⃣  Creating Person: Jane Smith...');
      
      const personProperties = {
        'Full Name': {
          title: [{ text: { content: 'Jane Smith' } }]
        },
        'Role/Title': {
          rich_text: [{ text: { content: 'Director of Climate Justice Initiatives' } }]
        },
        'Email': {
          email: 'jane.smith@fordfoundation.org'
        },
        'Phone': {
          phone_number: '+1 (212) 555-0123'
        },
        'LinkedIn': {
          url: 'https://linkedin.com/in/janesmithclimate'
        },
        'Location': {
          rich_text: [{ text: { content: 'New York, NY, USA' } }]
        },
        'Time Zone': {
          select: { name: 'EST' }
        },
        'Expertise': {
          multi_select: [{ name: 'Strategy' }, { name: 'Finance' }]
        },
        'Interests': {
          multi_select: [{ name: 'Sustainability' }, { name: 'Community' }, { name: 'Innovation' }]
        },
        'Seniority': {
          select: { name: 'Director' }
        },
        'Relationship Type': {
          select: { name: 'Key Stakeholder' }
        },
        'Relationship Strength': {
          select: { name: 'Strong' }
        },
        'Influence Level': {
          select: { name: 'Decision Maker' }
        },
        'Communication Preference': {
          select: { name: 'Email' }
        },
        'Background': {
          rich_text: [{ text: { content: '15+ years in climate philanthropy, former UNDP climate advisor' } }]
        }
      };
      
      // Add organization relation if it was created
      if (createdEntries.organization) {
        personProperties['🏢 Organization'] = {
          relation: [{ id: createdEntries.organization.id }]
        };
      }
      
      try {
        createdEntries.person = await createNotionPage(configuredDatabases.people, personProperties);
        console.log('✅ Person created: Jane Smith');
      } catch (error) {
        console.error('❌ Failed to create person:', error.message);
      }
    }
    
    // Step 3: Create/Find Project
    console.log('\n3️⃣  Creating Project: Climate Justice Innovation Lab...');
    
    const projectProperties = {
      'Name': {
        title: [{ text: { content: 'Climate Justice Innovation Lab' } }]
      },
      'Description': {
        rich_text: [{ text: { content: 'A collaborative platform bringing together communities, innovators, and funders to develop equitable climate solutions that prioritize frontline communities.' } }]
      },
      'Area': {
        select: { name: 'Research & Development' }
      },
      'Status': {
        select: { name: 'Active' }
      },
      'Funding': {
        select: { name: 'Seeking' }
      },
      'Revenue Potential': {
        number: 100000
      },
      'Project Lead': {
        rich_text: [{ text: { content: 'ACT Team' } }]
      },
      'Success Metrics': {
        rich_text: [{ text: { content: '• 10+ community partners engaged\n• 3 pilot projects launched\n• $500K in follow-on funding secured' } }]
      },
      'AI Summary': {
        rich_text: [{ text: { content: 'High-impact initiative addressing climate justice through community-led innovation. Strong alignment with Ford Foundation priorities.' } }]
      }
    };
    
    // Add organization relation if it exists
    if (createdEntries.organization && configuredDatabases.organizations) {
      projectProperties['🏢 Partner Organizations'] = {
        relation: [{ id: createdEntries.organization.id }]
      };
    }
    
    try {
      createdEntries.project = await createNotionPage(configuredDatabases.projects, projectProperties);
      console.log('✅ Project created: Climate Justice Innovation Lab');
    } catch (error) {
      console.error('❌ Failed to create project:', error.message);
      return; // Can't continue without a project
    }
    
    // Step 4: Create Opportunity (if database exists)
    if (configuredDatabases.opportunities) {
      console.log('\n4️⃣  Creating Opportunity: $100K Climate Justice Grant...');
      
      const opportunityProperties = {
        'Opportunity Name': {
          title: [{ text: { content: '$100K Climate Justice Grant - Ford Foundation' } }]
        },
        'Description': {
          rich_text: [{ text: { content: 'Ford Foundation grant to support the Climate Justice Innovation Lab, focusing on community-led solutions to climate change.' } }]
        },
        'Stage': {
          select: { name: 'Proposal 📄' }
        },
        'Type': {
          select: { name: 'Grant' }
        },
        'Revenue Amount': {
          number: 100000
        },
        'Probability': {
          select: { name: '75%' }
        },
        'Application Date': {
          date: { start: new Date().toISOString().split('T')[0] }
        },
        'Deadline': {
          date: { start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
        },
        'Next Action': {
          rich_text: [{ text: { content: 'Submit final proposal with community partner letters of support' } }]
        },
        'Requirements': {
          rich_text: [{ text: { content: '• Demonstrated community engagement\n• Clear metrics for impact\n• Sustainability plan\n• Partnership letters' } }]
        },
        'Success Criteria': {
          rich_text: [{ text: { content: 'Grant awarded with full funding amount and potential for multi-year support' } }]
        },
        'Risk Assessment': {
          select: { name: 'Low' }
        }
      };
      
      // Add relations
      if (createdEntries.project) {
        opportunityProperties['🚀 Related Projects'] = {
          relation: [{ id: createdEntries.project.id }]
        };
      }
      
      if (createdEntries.organization) {
        opportunityProperties['🏢 Organization'] = {
          relation: [{ id: createdEntries.organization.id }]
        };
      }
      
      if (createdEntries.person) {
        opportunityProperties['👥 Primary Contact'] = {
          relation: [{ id: createdEntries.person.id }]
        };
        opportunityProperties['👥 Decision Makers'] = {
          relation: [{ id: createdEntries.person.id }]
        };
      }
      
      try {
        createdEntries.opportunity = await createNotionPage(configuredDatabases.opportunities, opportunityProperties);
        console.log('✅ Opportunity created: $100K Climate Justice Grant');
      } catch (error) {
        console.error('❌ Failed to create opportunity:', error.message);
      }
    }
    
    // Step 5: Create Artifact (if database exists)
    if (configuredDatabases.artifacts) {
      console.log('\n5️⃣  Creating Artifact: Grant Proposal Draft...');
      
      const artifactProperties = {
        'Artifact Name': {
          title: [{ text: { content: 'Ford Foundation Climate Justice Grant Proposal' } }]
        },
        'Type': {
          select: { name: 'Proposal' }
        },
        'Format': {
          select: { name: 'PDF' }
        },
        'Status': {
          select: { name: 'Draft' }
        },
        'Description': {
          rich_text: [{ text: { content: 'Comprehensive grant proposal for Ford Foundation Climate Justice Initiative, including project plan, budget, and impact metrics.' } }]
        },
        'Access Level': {
          select: { name: 'Confidential' }
        },
        'Version': {
          number: 2.0
        },
        'Purpose': {
          select: { name: 'Proposal' }
        },
        'Audience': {
          multi_select: [{ name: 'Funders' }, { name: 'Partners' }]
        },
        'Keywords/Tags': {
          multi_select: [{ name: 'climate' }, { name: 'justice' }, { name: 'grant' }, { name: 'proposal' }]
        },
        'Usage Notes': {
          rich_text: [{ text: { content: 'Final version for submission. Includes all required attachments and partner letters.' } }]
        },
        'Effectiveness Rating': {
          select: { name: 'High' }
        }
      };
      
      // Add relations
      if (createdEntries.project) {
        artifactProperties['🚀 Related Projects'] = {
          relation: [{ id: createdEntries.project.id }]
        };
      }
      
      if (createdEntries.opportunity) {
        artifactProperties['🎯 Related Opportunities'] = {
          relation: [{ id: createdEntries.opportunity.id }]
        };
      }
      
      if (createdEntries.organization) {
        artifactProperties['🏢 Related Organizations'] = {
          relation: [{ id: createdEntries.organization.id }]
        };
      }
      
      if (createdEntries.person) {
        artifactProperties['👥 Created By'] = {
          relation: [{ id: createdEntries.person.id }]
        };
      }
      
      try {
        createdEntries.artifact = await createNotionPage(configuredDatabases.artifacts, artifactProperties);
        console.log('✅ Artifact created: Grant Proposal Draft');
      } catch (error) {
        console.error('❌ Failed to create artifact:', error.message);
      }
    }
    
    // Summary
    console.log('\n📊 Summary of Created Entries:');
    console.log('================================\n');
    
    if (createdEntries.organization) {
      console.log('🏢 Organization: Ford Foundation');
      console.log(`   ID: ${createdEntries.organization.id}`);
      console.log(`   URL: ${createdEntries.organization.url}\n`);
    }
    
    if (createdEntries.person) {
      console.log('👤 Person: Jane Smith');
      console.log(`   ID: ${createdEntries.person.id}`);
      console.log(`   URL: ${createdEntries.person.url}\n`);
    }
    
    if (createdEntries.project) {
      console.log('🚀 Project: Climate Justice Innovation Lab');
      console.log(`   ID: ${createdEntries.project.id}`);
      console.log(`   URL: ${createdEntries.project.url}\n`);
    }
    
    if (createdEntries.opportunity) {
      console.log('🎯 Opportunity: $100K Climate Justice Grant');
      console.log(`   ID: ${createdEntries.opportunity.id}`);
      console.log(`   URL: ${createdEntries.opportunity.url}\n`);
    }
    
    if (createdEntries.artifact) {
      console.log('📄 Artifact: Grant Proposal Draft');
      console.log(`   ID: ${createdEntries.artifact.id}`);
      console.log(`   URL: ${createdEntries.artifact.url}\n`);
    }
    
    console.log('🔗 Two-Way Relations:');
    console.log('====================\n');
    
    if (Object.keys(createdEntries).length > 1) {
      console.log('The following connections were automatically created:');
      
      if (createdEntries.organization && createdEntries.person) {
        console.log('✅ Organization ↔️ Person');
      }
      if (createdEntries.project && createdEntries.organization) {
        console.log('✅ Project ↔️ Organization');
      }
      if (createdEntries.opportunity && createdEntries.project) {
        console.log('✅ Opportunity ↔️ Project');
      }
      if (createdEntries.opportunity && createdEntries.organization) {
        console.log('✅ Opportunity ↔️ Organization');
      }
      if (createdEntries.opportunity && createdEntries.person) {
        console.log('✅ Opportunity ↔️ Person (Primary Contact & Decision Maker)');
      }
      if (createdEntries.artifact && Object.keys(createdEntries).length > 1) {
        console.log('✅ Artifact ↔️ All related entities');
      }
      
      console.log('\n💡 Open any of these entries in Notion to see the automatic two-way relations!');
    } else {
      console.log('⚠️  Only one database is configured, so no relations could be created.');
      console.log('Configure more databases to see the full ecosystem in action.');
    }
    
    console.log('\n✨ Complete example created successfully!');
    
  } catch (error) {
    console.error('\n❌ Error creating complete example:', error);
    console.error('Details:', error.message);
  }
}

// Run the script
createCompleteExample().catch(console.error);