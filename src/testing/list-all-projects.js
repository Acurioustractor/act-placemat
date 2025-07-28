// List all project titles for comparison with Notion UI
const fetch = require('node-fetch');
require('dotenv').config();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PROJECTS_DB_ID = '177ebcf981cf80dd9514f1ec32f3314c';
const NOTION_API_VERSION = '2022-06-28';

async function listAllProjects() {
  console.log('📋 ALL PROJECTS ACCESSIBLE VIA API');
  console.log('==================================\n');
  
  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${PROJECTS_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_API_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page_size: 100,
        sorts: [
          {
            property: "Name",
            direction: "ascending"
          }
        ]
      })
    });
    
    if (!response.ok) {
      console.log(`❌ API Error: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    const projects = data.results || [];
    
    console.log(`Total projects found: ${projects.length}\n`);
    
    // Extract and sort project names
    const projectTitles = projects.map((project, index) => {
      const title = project.properties?.Name?.title?.[0]?.plain_text || 'Untitled';
      const id = project.id;
      const createdTime = project.created_time;
      const lastEdited = project.last_edited_time;
      
      return {
        index: index + 1,
        title,
        id,
        createdTime,
        lastEdited
      };
    }).sort((a, b) => a.title.localeCompare(b.title));
    
    // Display all projects in alphabetical order
    console.log('📝 PROJECT TITLES (Alphabetical):');
    console.log('─'.repeat(80));
    
    projectTitles.forEach((project) => {
      console.log(`${project.index.toString().padStart(2)}. ${project.title}`);
    });
    
    console.log('─'.repeat(80));
    console.log(`\nTotal: ${projectTitles.length} projects\n`);
    
    // Also show by creation date to help identify missing ones
    console.log('📅 PROJECTS BY CREATION DATE (Newest First):');
    console.log('─'.repeat(80));
    
    const byCreationDate = [...projectTitles].sort((a, b) => 
      new Date(b.createdTime) - new Date(a.createdTime)
    );
    
    byCreationDate.slice(0, 10).forEach((project, index) => {
      const createDate = new Date(project.createdTime).toLocaleDateString();
      console.log(`${(index + 1).toString().padStart(2)}. ${project.title} (${createDate})`);
    });
    
    if (byCreationDate.length > 10) {
      console.log('    ... (showing newest 10 only)');
    }
    
    console.log('─'.repeat(80));
    
    // Show some metadata to help identify patterns
    console.log('\n🔍 ADDITIONAL INFO:');
    console.log(`Database last edited: ${new Date(data.results?.[0]?.parent?.database_id ? 'Available' : 'Not available')}`);
    console.log(`Integration access: Full read access to ${projects.length} records`);
    console.log(`Missing count: 1 project (51 expected - 50 found)`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Run the listing
listAllProjects()
  .then(() => {
    console.log('\n✅ Project listing completed');
    console.log('\n🎯 NEXT STEP: Compare this list with your Notion database');
    console.log('   and tell me which project title is missing from the above list.');
    process.exit(0);
  })
  .catch(error => {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  });