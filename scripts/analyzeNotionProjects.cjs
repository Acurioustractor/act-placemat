#!/usr/bin/env node

/**
 * Analyzes Notion project data and generates a text report
 * Run: node scripts/analyzeNotionProjects.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Read .env file manually
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    });
    return env;
  } catch (error) {
    return {};
  }
}

const env = loadEnv();
const NOTION_API_KEY = env.VITE_NOTION_API_KEY || process.env.VITE_NOTION_API_KEY;
const DATABASE_ID = env.VITE_NOTION_PROJECTS_DB_ID || process.env.VITE_NOTION_PROJECTS_DB_ID;

if (!NOTION_API_KEY || !DATABASE_ID) {
  console.error('❌ ERROR: Missing environment variables');
  console.error('   Make sure VITE_NOTION_API_KEY and VITE_NOTION_PROJECTS_DB_ID are set in .env');
  process.exit(1);
}

// Fetch from Notion API
function fetchNotionDatabase(databaseId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.notion.com',
      path: `/v1/databases/${databaseId}/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Notion API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ page_size: 100 }));
    req.end();
  });
}

// Extract text from Notion rich text
function getText(richText) {
  if (!richText || !Array.isArray(richText) || richText.length === 0) return '';
  return richText.map(t => t.plain_text).join('');
}

// Generate report
async function generateReport() {
  console.log('🔍 Fetching projects from Notion...\n');

  try {
    const response = await fetchNotionDatabase(DATABASE_ID);
    const projects = response.results;

    const report = [];
    report.push('='.repeat(80));
    report.push('📊 ACT PLACEMAT PROJECT DATA ANALYSIS');
    report.push('Generated: ' + new Date().toLocaleString());
    report.push('='.repeat(80));
    report.push('');
    report.push(`Total Projects: ${projects.length}`);
    report.push('');

    // Analyze each project
    const analysis = {
      total: projects.length,
      withDescription: 0,
      withAiSummary: 0,
      withImages: 0,
      withLocation: 0,
      withRevenue: 0,
      withPartners: 0,
      activeProjects: 0,
      showcaseReady: [],
      needsDescription: [],
      needsImages: [],
      extractedStats: []
    };

    report.push('='.repeat(80));
    report.push('📋 ALL PROJECTS');
    report.push('='.repeat(80));
    report.push('');

    projects.forEach((page, index) => {
      const props = page.properties;

      // Extract fields
      const name = getText(props.Name?.title) || 'Unnamed';
      const status = props.Status?.select?.name || props.Status?.status?.name || 'Unknown';
      const description = getText(props.Description?.rich_text);
      const aiSummary = getText(props['AI Summary']?.rich_text);
      const location = getText(props.Location?.rich_text);
      const state = props.State?.select?.name || '';
      const area = props.Area?.select?.name || props['Project Area']?.select?.name || '';
      const place = props.Place?.select?.name || '';
      const revenue = props['Revenue (Actual)']?.number || props['Revenue Actual']?.number || 0;
      const heroImage = props['Hero Image']?.files?.[0]?.name;
      const galleryImages = props['Gallery Images']?.files?.length || 0;
      const partners = props['Partner Organizations']?.relation?.length || props.Organisations?.relation?.length || 0;
      const themes = props.Themes?.multi_select?.map(t => t.name) || props.Theme?.multi_select?.map(t => t.name) || [];

      // Track stats
      if (description) analysis.withDescription++;
      if (aiSummary) analysis.withAiSummary++;
      if (heroImage || galleryImages > 0) analysis.withImages++;
      if (location) analysis.withLocation++;
      if (revenue > 0) analysis.withRevenue++;
      if (partners > 0) analysis.withPartners++;
      if (status === 'Active') analysis.activeProjects++;

      // Check if showcase ready
      const hasContent = description || aiSummary;
      const hasMedia = heroImage || galleryImages > 0;
      const isActive = status === 'Active';

      if (isActive && hasContent && hasMedia) {
        analysis.showcaseReady.push(name);
      } else if (isActive && !hasContent) {
        analysis.needsDescription.push(name);
      } else if (isActive && !hasMedia) {
        analysis.needsImages.push(name);
      }

      // Extract stats from description
      const text = aiSummary || description || '';
      const stats = {
        people: text.match(/(\d+)\s+(?:people|participants|youth|students|individuals)/i)?.[1],
        locations: text.match(/(\d+)\s+(?:locations?|communities|sites|regions)/i)?.[1],
        hours: text.match(/(\d+)\s+(?:hours?|sessions?|workshops?)/i)?.[1],
        success: text.match(/(\d+)%?\s*(?:success|completion|graduation)/i)?.[1],
        partners: text.match(/(\d+)\s+(?:partners?|organizations?)/i)?.[1]
      };

      const foundStats = Object.entries(stats).filter(([k, v]) => v).map(([k, v]) => `${k}: ${v}`);
      if (foundStats.length > 0) {
        analysis.extractedStats.push({ name, stats: foundStats });
      }

      // Add to report
      report.push(`${index + 1}. ${name}`);
      report.push('-'.repeat(80));
      report.push(`   Status: ${status}`);
      report.push(`   Area: ${area || 'Not set'}`);
      report.push(`   Place: ${place || 'Not set'}`);
      report.push(`   Location: ${location || 'Not set'}`);
      report.push(`   State: ${state || 'Not set'}`);
      report.push('');
      report.push(`   Description: ${description ? '✅ ' + description.substring(0, 80) + '...' : '❌ Missing'}`);
      report.push(`   AI Summary: ${aiSummary ? '✅ ' + aiSummary.substring(0, 80) + '...' : '❌ Missing'}`);
      report.push('');
      report.push(`   Revenue: ${revenue ? '$' + revenue.toLocaleString() : 'Not set'}`);
      report.push(`   Hero Image: ${heroImage ? '✅ ' + heroImage : '❌ Missing'}`);
      report.push(`   Gallery: ${galleryImages > 0 ? '✅ ' + galleryImages + ' images' : '❌ No images'}`);
      report.push(`   Partners: ${partners > 0 ? '✅ ' + partners + ' partners' : 'None'}`);
      report.push(`   Themes: ${themes.length > 0 ? themes.join(', ') : 'None'}`);

      if (foundStats.length > 0) {
        report.push('');
        report.push(`   🧠 Auto-Extracted Stats: ${foundStats.join(', ')}`);
      }

      report.push('');
    });

    // Summary section
    report.push('');
    report.push('='.repeat(80));
    report.push('📈 SUMMARY STATISTICS');
    report.push('='.repeat(80));
    report.push('');
    report.push(`Total Projects: ${analysis.total}`);
    report.push(`Active Projects: ${analysis.activeProjects}`);
    report.push('');
    report.push('Field Population:');
    report.push(`  Description: ${analysis.withDescription}/${analysis.total} (${Math.round(analysis.withDescription/analysis.total*100)}%)`);
    report.push(`  AI Summary: ${analysis.withAiSummary}/${analysis.total} (${Math.round(analysis.withAiSummary/analysis.total*100)}%)`);
    report.push(`  Images: ${analysis.withImages}/${analysis.total} (${Math.round(analysis.withImages/analysis.total*100)}%)`);
    report.push(`  Location: ${analysis.withLocation}/${analysis.total} (${Math.round(analysis.withLocation/analysis.total*100)}%)`);
    report.push(`  Revenue: ${analysis.withRevenue}/${analysis.total} (${Math.round(analysis.withRevenue/analysis.total*100)}%)`);
    report.push(`  Partners: ${analysis.withPartners}/${analysis.total} (${Math.round(analysis.withPartners/analysis.total*100)}%)`);
    report.push('');

    // Showcase ready
    report.push('='.repeat(80));
    report.push(`✅ SHOWCASE READY PROJECTS (${analysis.showcaseReady.length})`);
    report.push('='.repeat(80));
    report.push('');
    if (analysis.showcaseReady.length > 0) {
      analysis.showcaseReady.forEach(name => report.push(`  ✅ ${name}`));
    } else {
      report.push('  None yet - add descriptions and images to active projects!');
    }
    report.push('');

    // Auto-extracted stats
    if (analysis.extractedStats.length > 0) {
      report.push('='.repeat(80));
      report.push(`🧠 AUTO-EXTRACTED STATISTICS (${analysis.extractedStats.length} projects)`);
      report.push('='.repeat(80));
      report.push('');
      analysis.extractedStats.forEach(({ name, stats }) => {
        report.push(`  ${name}:`);
        stats.forEach(stat => report.push(`    • ${stat}`));
      });
      report.push('');
    }

    // Needs work
    if (analysis.needsDescription.length > 0) {
      report.push('='.repeat(80));
      report.push(`📝 NEED DESCRIPTION (${analysis.needsDescription.length})`);
      report.push('='.repeat(80));
      report.push('');
      analysis.needsDescription.forEach(name => report.push(`  ❌ ${name}`));
      report.push('');
    }

    if (analysis.needsImages.length > 0) {
      report.push('='.repeat(80));
      report.push(`📸 NEED IMAGES (${analysis.needsImages.length})`);
      report.push('='.repeat(80));
      report.push('');
      analysis.needsImages.forEach(name => report.push(`  ❌ ${name}`));
      report.push('');
    }

    // Recommendations
    report.push('='.repeat(80));
    report.push('💡 RECOMMENDATIONS');
    report.push('='.repeat(80));
    report.push('');
    report.push('To improve your showcase:');
    report.push('');
    report.push('1. Add Descriptions to Missing Projects');
    report.push('   Include numbers: "50 people", "12 locations", "85% success"');
    report.push('   Include keywords: "challenge", "approach", "impact"');
    report.push('   Include quotes: "Changed my life!" - Person Name');
    report.push('');
    report.push('2. Upload Gallery Images (3-5 per project)');
    report.push('   Priority projects: ' + analysis.needsImages.slice(0, 3).join(', '));
    report.push('');
    report.push('3. Add Location Field');
    report.push('   For map visualization (e.g., "Canberra", "Sydney")');
    report.push('');
    report.push('4. Review Auto-Extracted Stats');
    report.push('   The system found stats in ' + analysis.extractedStats.length + ' projects');
    report.push('   Add more numbers to descriptions for better extraction');
    report.push('');

    report.push('='.repeat(80));
    report.push('');

    // Write to file
    const reportText = report.join('\n');
    const filename = 'PROJECT_DATA_ANALYSIS.txt';
    fs.writeFileSync(filename, reportText);

    // Also print to console
    console.log(reportText);
    console.log(`\n✅ Report saved to: ${filename}`);
    console.log('\nNext steps:');
    console.log('1. Read the report above');
    console.log('2. Go to Notion and add missing data');
    console.log('3. Run this script again to see progress');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

generateReport();
