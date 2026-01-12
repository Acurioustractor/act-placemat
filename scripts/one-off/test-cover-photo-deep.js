import { Client } from '@notionhq/client';
import 'dotenv/config';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function testCoverPhoto() {
  console.log('🔍 Testing Cover Photo property access...\n');

  try {
    // Query the Projects database
    const response = await notion.databases.query({
      database_id: process.env.NOTION_PROJECTS_DATABASE_ID,
      page_size: 1
    });

    if (response.results.length === 0) {
      console.log('No projects found');
      return;
    }

    const page = response.results[0];
    const pageId = page.id;

    console.log('📄 Page:', page.properties?.Name?.title[0]?.plain_text || 'Unknown');
    console.log('📄 Page ID:', pageId);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check the Cover Photo property from database query
    const coverPhotoFromQuery = page.properties?.['Cover Photo'];
    console.log('1️⃣  Cover Photo from database.query:');
    console.log(JSON.stringify(coverPhotoFromQuery, null, 2));
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Fetch the page directly
    const directPage = await notion.pages.retrieve({ page_id: pageId });
    const coverPhotoFromPage = directPage.properties?.['Cover Photo'];
    console.log('2️⃣  Cover Photo from pages.retrieve:');
    console.log(JSON.stringify(coverPhotoFromPage, null, 2));
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check page.cover (native Notion cover)
    console.log('3️⃣  page.cover (native):');
    console.log(JSON.stringify(directPage.cover, null, 2));
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // If Cover Photo property has an ID, try to retrieve it
    if (coverPhotoFromPage?.id) {
      try {
        const propertyItem = await notion.pages.properties.retrieve({
          page_id: pageId,
          property_id: coverPhotoFromPage.id
        });
        console.log('4️⃣  Cover Photo from pages.properties.retrieve:');
        console.log(JSON.stringify(propertyItem, null, 2));
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      } catch (err) {
        console.log('❌ Error retrieving property:', err.message);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testCoverPhoto();
