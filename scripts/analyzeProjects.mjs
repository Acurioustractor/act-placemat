/**
 * Analyze Notion project data
 * Run with: node scripts/analyzeProjects.mjs
 */

import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({ auth: process.env.VITE_NOTION_API_KEY });
const databaseId = process.env.VITE_NOTION_PROJECTS_DB_ID;

async function analyzeProjects() {
  console.log('🔍 Fetching all projects from Notion...\n');

  const response = await notion.databases.query({
    database_id: databaseId,
  });

  const projects = response.results;

  console.log(`📊 Total Projects: ${projects.length}\n`);
  console.log('='.repeat(80));

  // Analyze each project
  projects.forEach((page, index) => {
    const props = page.properties;

    // Extract name
    const name = props.Name?.title?.[0]?.plain_text || 'Unnamed';

    console.log(`\n${index + 1}. ${name}`);
    console.log('-'.repeat(80));

    // Check each common property
    const status = props.Status?.select?.name || props.Status?.status?.name || 'Not set';
    const place = props.Place?.select?.name || 'Not set';
    const area = props.Area?.select?.name || props['Project Area']?.select?.name || 'Not set';
    const location = props.Location?.rich_text?.[0]?.plain_text || 'Not set';
    const state = props.State?.select?.name || 'Not set';

    console.log(`   Status: ${status}`);
    console.log(`   Area: ${area}`);
    console.log(`   Place: ${place}`);
    console.log(`   Location: ${location}`);
    console.log(`   State: ${state}`);

    // Description
    const description = props.Description?.rich_text?.[0]?.plain_text || '';
    const aiSummary = props['AI Summary']?.rich_text?.[0]?.plain_text || '';

    console.log(`   Description: ${description ? description.substring(0, 100) + '...' : 'Not set'}`);
    console.log(`   AI Summary: ${aiSummary ? aiSummary.substring(0, 100) + '...' : 'Not set'}`);

    // Financial
    const revenueActual = props['Revenue (Actual)']?.number || props['Revenue Actual']?.number || 0;
    const revenueTarget = props['Revenue (Target)']?.number || props['Revenue Target']?.number || 0;

    console.log(`   Revenue: ${revenueActual ? `$${revenueActual.toLocaleString()}` : 'Not set'}`);
    console.log(`   Target: ${revenueTarget ? `$${revenueTarget.toLocaleString()}` : 'Not set'}`);

    // Media
    const heroVideo = props['Hero Video URL']?.url || 'Not set';
    const heroImage = props['Hero Image']?.files?.[0]?.name || 'Not set';
    const galleryImages = props['Gallery Images']?.files?.length || 0;

    console.log(`   Hero Video: ${heroVideo}`);
    console.log(`   Hero Image: ${heroImage}`);
    console.log(`   Gallery Images: ${galleryImages} images`);

    // Links
    const website = props['Website']?.url || props['Website Links']?.url || 'Not set';
    console.log(`   Website: ${website}`);

    // Partners
    const partners = props['Partner Organizations']?.relation?.length || props['Organisations']?.relation?.length || 0;
    console.log(`   Partners: ${partners} organizations`);

    // Themes
    const themes = props.Themes?.multi_select?.map(t => t.name).join(', ') || props.Theme?.multi_select?.map(t => t.name).join(', ') || 'None';
    console.log(`   Themes: ${themes}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n📈 FIELD ANALYSIS\n');

  // Count populated fields
  const fieldStats = {
    description: { name: 'Description', count: 0 },
    aiSummary: { name: 'AI Summary', count: 0 },
    heroVideo: { name: 'Hero Video URL', count: 0 },
    heroImage: { name: 'Hero Image', count: 0 },
    galleryImages: { name: 'Gallery Images', count: 0 },
    website: { name: 'Website', count: 0 },
    location: { name: 'Location', count: 0 },
    state: { name: 'State', count: 0 },
    revenue: { name: 'Revenue', count: 0 },
    partners: { name: 'Partners', count: 0 },
    themes: { name: 'Themes', count: 0 },
  };

  projects.forEach(page => {
    const props = page.properties;

    if (props.Description?.rich_text?.[0]?.plain_text) fieldStats.description.count++;
    if (props['AI Summary']?.rich_text?.[0]?.plain_text) fieldStats.aiSummary.count++;
    if (props['Hero Video URL']?.url) fieldStats.heroVideo.count++;
    if (props['Hero Image']?.files?.[0]) fieldStats.heroImage.count++;
    if (props['Gallery Images']?.files?.length > 0) fieldStats.galleryImages.count++;
    if (props.Website?.url || props['Website Links']?.url) fieldStats.website.count++;
    if (props.Location?.rich_text?.[0]?.plain_text) fieldStats.location.count++;
    if (props.State?.select?.name) fieldStats.state.count++;
    if (props['Revenue (Actual)']?.number || props['Revenue Actual']?.number) fieldStats.revenue.count++;
    if ((props['Partner Organizations']?.relation?.length || props.Organisations?.relation?.length || 0) > 0) fieldStats.partners.count++;
    if ((props.Themes?.multi_select?.length || props.Theme?.multi_select?.length || 0) > 0) fieldStats.themes.count++;
  });

  Object.values(fieldStats).forEach(stat => {
    const percentage = ((stat.count / projects.length) * 100).toFixed(0);
    const bar = '█'.repeat(Math.floor(stat.count / projects.length * 20));
    console.log(`${stat.name.padEnd(25)} ${bar.padEnd(20)} ${percentage}% (${stat.count}/${projects.length})`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n💡 RECOMMENDATIONS\n');

  // Count projects by status
  const activeProjects = projects.filter(p => {
    const status = p.properties.Status?.select?.name || p.properties.Status?.status?.name;
    return status === 'Active';
  });

  const projectsWithDescriptions = projects.filter(p =>
    p.properties.Description?.rich_text?.[0]?.plain_text ||
    p.properties['AI Summary']?.rich_text?.[0]?.plain_text
  );

  const projectsWithImages = projects.filter(p =>
    p.properties['Hero Image']?.files?.[0] ||
    (p.properties['Gallery Images']?.files?.length || 0) > 0
  );

  const projectsWithLocation = projects.filter(p =>
    p.properties.Location?.rich_text?.[0]?.plain_text
  );

  console.log(`✅ Active Projects: ${activeProjects.length}`);
  console.log(`📝 With Descriptions: ${projectsWithDescriptions.length} (${((projectsWithDescriptions.length / projects.length) * 100).toFixed(0)}%)`);
  console.log(`📸 With Images: ${projectsWithImages.length} (${((projectsWithImages.length / projects.length) * 100).toFixed(0)}%)`);
  console.log(`📍 With Location: ${projectsWithLocation.length} (${((projectsWithLocation.length / projects.length) * 100).toFixed(0)}%)`);

  console.log('\n🎯 SHOWCASE-READY PROJECTS:\n');

  const showcaseReady = activeProjects.filter(p =>
    (p.properties.Description?.rich_text?.[0]?.plain_text ||
     p.properties['AI Summary']?.rich_text?.[0]?.plain_text) &&
    (p.properties['Hero Image']?.files?.[0] ||
     (p.properties['Gallery Images']?.files?.length || 0) > 0)
  );

  if (showcaseReady.length > 0) {
    showcaseReady.forEach(p => {
      const name = p.properties.Name?.title?.[0]?.plain_text || 'Unnamed';
      console.log(`   ✅ ${name}`);
    });
  } else {
    console.log('   None yet - add descriptions and images to active projects!');
  }

  console.log('\n📋 QUICK WINS:\n');
  console.log('1. Add Description or AI Summary to projects (enables auto-extraction)');
  console.log('2. Upload 3-5 photos to Gallery Images for active projects');
  console.log('3. Add Location for map visualization (e.g., "Canberra", "Sydney")');
  console.log('4. Include numbers in descriptions: "50 people", "12 locations", "85% success"');
  console.log('5. Add quotes: "This changed my life!" - Person Name');
  console.log('\n');
}

analyzeProjects().catch(console.error);
