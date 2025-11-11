/**
 * Utility to analyze Notion project data and show what's available
 * Run with: npx tsx scripts/analyzeProjects.ts
 */

import { projectService } from '../src/services';

interface FieldAnalysis {
  fieldName: string;
  populated: number;
  empty: number;
  examples: string[];
}

async function analyzeProjects() {
  console.log('🔍 Fetching all projects from Notion...\n');

  const projects = await projectService.getProjects();

  console.log(`📊 Total Projects: ${projects.length}\n`);
  console.log('=' .repeat(80));

  // Analyze each project
  projects.forEach((project, index) => {
    console.log(`\n${index + 1}. ${project.name}`);
    console.log('-'.repeat(80));

    // Core fields
    console.log(`   Status: ${project.status}`);
    console.log(`   Area: ${project.area}`);
    console.log(`   Place: ${project.place}`);
    console.log(`   Location: ${project.location || 'Not set'}`);
    console.log(`   State: ${project.state || 'Not set'}`);

    // Financial
    console.log(`   Revenue: ${project.revenueActual ? `$${project.revenueActual.toLocaleString()}` : 'Not set'}`);
    console.log(`   Target: ${project.revenueTarget ? `$${project.revenueTarget.toLocaleString()}` : 'Not set'}`);

    // Content
    console.log(`   Description: ${project.description ? `${project.description.substring(0, 100)}...` : 'Not set'}`);
    console.log(`   AI Summary: ${project.aiSummary ? `${project.aiSummary.substring(0, 100)}...` : 'Not set'}`);

    // Showcase fields (if they exist)
    console.log(`   Hero Video: ${project.heroVideoUrl || 'Not set'}`);
    console.log(`   Hero Image: ${project.heroImageUrl || 'Not set'}`);
    console.log(`   Gallery Images: ${project.galleryImages?.length || 0} images`);
    console.log(`   Testimonials: ${project.testimonials?.length || 0} testimonials`);
    console.log(`   Impact Stats: ${project.impactStats ? 'Yes' : 'Not set'}`);

    // Links
    console.log(`   Website: ${project.websiteLinks || 'Not set'}`);

    // Partners
    console.log(`   Partners: ${project.partnerOrganizations?.length || 0} organizations`);

    // Dates
    console.log(`   Start Date: ${project.startDate || 'Not set'}`);
    console.log(`   End Date: ${project.endDate || 'Not set'}`);

    // Tags
    console.log(`   Themes: ${project.themes?.join(', ') || 'None'}`);
    console.log(`   Tags: ${project.tags?.join(', ') || 'None'}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n📈 FIELD ANALYSIS\n');

  // Analyze which fields are populated
  const fieldStats: Record<string, FieldAnalysis> = {
    description: { fieldName: 'Description', populated: 0, empty: 0, examples: [] },
    aiSummary: { fieldName: 'AI Summary', populated: 0, empty: 0, examples: [] },
    heroVideoUrl: { fieldName: 'Hero Video URL', populated: 0, empty: 0, examples: [] },
    heroImageUrl: { fieldName: 'Hero Image URL', populated: 0, empty: 0, examples: [] },
    galleryImages: { fieldName: 'Gallery Images', populated: 0, empty: 0, examples: [] },
    websiteLinks: { fieldName: 'Website Links', populated: 0, empty: 0, examples: [] },
    location: { fieldName: 'Location', populated: 0, empty: 0, examples: [] },
    state: { fieldName: 'State', populated: 0, empty: 0, examples: [] },
    revenueActual: { fieldName: 'Revenue Actual', populated: 0, empty: 0, examples: [] },
    partnerOrganizations: { fieldName: 'Partner Organizations', populated: 0, empty: 0, examples: [] },
    themes: { fieldName: 'Themes', populated: 0, empty: 0, examples: [] },
  };

  projects.forEach(project => {
    Object.keys(fieldStats).forEach(key => {
      const value = (project as any)[key];
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        fieldStats[key].populated++;
        if (fieldStats[key].examples.length < 2) {
          if (typeof value === 'string') {
            fieldStats[key].examples.push(value.substring(0, 50));
          } else if (Array.isArray(value)) {
            fieldStats[key].examples.push(`${value.length} items`);
          } else if (typeof value === 'number') {
            fieldStats[key].examples.push(value.toString());
          }
        }
      } else {
        fieldStats[key].empty++;
      }
    });
  });

  // Display field stats
  Object.values(fieldStats).forEach(stat => {
    const percentage = ((stat.populated / projects.length) * 100).toFixed(0);
    const bar = '█'.repeat(Math.floor(stat.populated / projects.length * 20));
    console.log(`${stat.fieldName.padEnd(25)} ${bar.padEnd(20)} ${percentage}% (${stat.populated}/${projects.length})`);
    if (stat.examples.length > 0) {
      console.log(`   Examples: ${stat.examples.join(', ')}`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n💡 RECOMMENDATIONS\n');

  // Give specific recommendations
  const activeProjects = projects.filter(p => p.status === 'Active');
  const projectsWithDescriptions = projects.filter(p => p.description || p.aiSummary);
  const projectsWithImages = projects.filter(p => p.heroImageUrl || (p.galleryImages && p.galleryImages.length > 0));
  const projectsWithLocation = projects.filter(p => p.location);

  console.log(`✅ Active Projects: ${activeProjects.length} (ready for showcase)`);
  console.log(`📝 With Descriptions: ${projectsWithDescriptions.length} (${((projectsWithDescriptions.length / projects.length) * 100).toFixed(0)}%)`);
  console.log(`📸 With Images: ${projectsWithImages.length} (${((projectsWithImages.length / projects.length) * 100).toFixed(0)}%)`);
  console.log(`📍 With Location: ${projectsWithLocation.length} (${((projectsWithLocation.length / projects.length) * 100).toFixed(0)}%)`);

  console.log('\n🎯 TOP PRIORITY ADDITIONS:\n');

  // Find projects that would benefit most from improvements
  const showcaseReady = activeProjects.filter(p =>
    (p.description || p.aiSummary) &&
    (p.heroImageUrl || (p.galleryImages && p.galleryImages.length > 0))
  );

  const needsDescription = activeProjects.filter(p => !p.description && !p.aiSummary);
  const needsImages = activeProjects.filter(p => !p.heroImageUrl && (!p.galleryImages || p.galleryImages.length === 0));
  const needsLocation = activeProjects.filter(p => !p.location);

  console.log(`✅ Showcase Ready (${showcaseReady.length} projects):`);
  showcaseReady.slice(0, 5).forEach(p => console.log(`   - ${p.name}`));

  if (needsDescription.length > 0) {
    console.log(`\n📝 Need Description (${needsDescription.length} projects):`);
    needsDescription.slice(0, 5).forEach(p => console.log(`   - ${p.name}`));
  }

  if (needsImages.length > 0) {
    console.log(`\n📸 Need Images (${needsImages.length} projects):`);
    needsImages.slice(0, 5).forEach(p => console.log(`   - ${p.name}`));
  }

  if (needsLocation.length > 0) {
    console.log(`\n📍 Need Location (${needsLocation.length} projects):`);
    needsLocation.slice(0, 5).forEach(p => console.log(`   - ${p.name}`));
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📋 QUICK WINS FOR SHOWCASE:\n');
  console.log('1. Add descriptions to projects missing them (enables auto-extraction)');
  console.log('2. Upload 3-5 photos to Gallery Images for top projects');
  console.log('3. Add Location field for map visualization');
  console.log('4. Include numbers in descriptions: "50 people", "12 locations", etc.');
  console.log('5. Add quotes for testimonials: "Great program!" - Person Name');
  console.log('\n');
}

analyzeProjects().catch(console.error);
