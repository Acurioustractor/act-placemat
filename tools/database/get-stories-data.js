#!/usr/bin/env node

/**
 * Get Empathy Ledger stories data
 */

const SUPABASE_URL = 'https://tednluwflfhxyucgwigh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0NjIyOSwiZXhwIjoyMDY3OTIyMjI5fQ.wyizbOWRxMULUp6WBojJPfey1ta8-Al1OlZqDDIPIHo';

async function getStoriesData() {
  console.log('📖 Fetching Empathy Ledger Stories...\n');
  
  try {
    // Get stories with count
    const storiesResponse = await fetch(`${SUPABASE_URL}/rest/v1/stories?select=*`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'count=exact'
      }
    });
    
    const stories = await storiesResponse.json();
    const storiesCount = storiesResponse.headers.get('content-range')?.split('/')[1] || stories.length;
    
    console.log(`✅ Stories table: ${storiesCount} records`);
    console.log('   Sample stories:');
    stories.slice(0, 3).forEach((story, i) => {
      console.log(`   ${i+1}. "${story.title}" (${story.privacy_level})`);
      console.log(`      Content: ${(story.content || '').substring(0, 100)}...`);
      if (story.themes) console.log(`      Themes: ${story.themes}`);
    });
    
    // Get impact stories
    const impactResponse = await fetch(`${SUPABASE_URL}/rest/v1/impact_stories?select=*`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'count=exact'
      }
    });
    
    if (impactResponse.ok) {
      const impactStories = await impactResponse.json();
      const impactCount = impactResponse.headers.get('content-range')?.split('/')[1] || impactStories.length;
      
      console.log(`\n✅ Impact Stories table: ${impactCount} records`);
      if (impactStories.length > 0) {
        console.log('   Columns:', Object.keys(impactStories[0]).join(', '));
      }
    }
    
    console.log(`\n📊 Total Empathy Ledger Data: ${parseInt(storiesCount) + (impactResponse.ok ? parseInt(impactResponse.headers.get('content-range')?.split('/')[1] || '0') : 0)} stories`);
    
    return {
      stories: stories,
      storiesCount: parseInt(storiesCount),
      impactStories: impactResponse.ok ? await impactResponse.json() : [],
      impactCount: impactResponse.ok ? parseInt(impactResponse.headers.get('content-range')?.split('/')[1] || '0') : 0
    };
    
  } catch (error) {
    console.error('❌ Error fetching stories:', error.message);
  }
}

getStoriesData();