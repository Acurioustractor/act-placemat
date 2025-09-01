#!/usr/bin/env node

/**
 * Comprehensive scan of ALL possible tables
 */

const SUPABASE_URL = 'https://tednluwflfhxyucgwigh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM0NjIyOSwiZXhwIjoyMDY3OTIyMjI5fQ.wyizbOWRxMULUp6WBojJPfey1ta8-Al1OlZqDDIPIHo';

// Comprehensive list of possible table names
const ALL_POSSIBLE_TABLES = [
  // Stories and content
  'stories', 'empathy_ledger', 'empathy_stories', 'ledger_stories', 'community_stories',
  'impact_stories', 'client_stories', 'case_studies', 'testimonials', 'feedback',
  'reviews', 'experiences', 'narratives', 'accounts', 'entries', 'records',
  'data', 'content', 'posts', 'items', 'notes', 'submissions', 'responses',
  
  // People and relationships  
  'people', 'persons', 'clients', 'users', 'storytellers', 'participants',
  'community_members', 'residents', 'individuals', 'contacts', 'stakeholders',
  
  // Organizations and projects
  'organizations', 'orgs', 'projects', 'initiatives', 'programs', 'services',
  'opportunities', 'grants', 'funding', 'partnerships', 'collaborations',
  
  // Location and geography
  'locations', 'addresses', 'areas', 'regions', 'communities', 'places',
  'postcodes', 'suburbs', 'towns', 'cities',
  
  // Media and files
  'media', 'files', 'documents', 'images', 'videos', 'audio', 'attachments',
  'uploads', 'resources', 'assets',
  
  // Categories and tags
  'categories', 'tags', 'themes', 'topics', 'subjects', 'classifications',
  'types', 'groups', 'segments',
  
  // Events and activities
  'events', 'activities', 'actions', 'meetings', 'sessions', 'workshops',
  'appointments', 'bookings', 'schedule',
  
  // System tables
  'audit_log', 'logs', 'history', 'changes', 'versions', 'backups',
  'settings', 'config', 'preferences', 'permissions', 'roles',
  
  // Common database tables
  'user', 'profile', 'account', 'session', 'token', 'auth',
  'notification', 'message', 'email', 'sms', 'communication',
  
  // Analytics and reporting
  'analytics', 'metrics', 'stats', 'reports', 'dashboard', 'summary',
  'kpi', 'performance', 'tracking',
  
  // Specific to ACT/Empathy Ledger
  'act_data', 'empathy_data', 'social_impact', 'community_impact',
  'outcomes', 'results', 'measures', 'indicators', 'goals',
  'interventions', 'support', 'assistance', 'help'
];

async function checkTable(tableName) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=0`, {
      method: 'HEAD',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'count=exact'
      }
    });
    
    if (response.ok) {
      const countHeader = response.headers.get('content-range');
      const count = countHeader ? parseInt(countHeader.split('/')[1]) : 0;
      return { name: tableName, count };
    }
  } catch (error) {
    // Skip silently
  }
  return null;
}

async function comprehensiveScan() {
  console.log('🔍 Comprehensive scan of ALL possible tables...\n');
  
  const foundTables = [];
  const batchSize = 10;
  
  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < ALL_POSSIBLE_TABLES.length; i += batchSize) {
    const batch = ALL_POSSIBLE_TABLES.slice(i, i + batchSize);
    
    console.log(`Checking batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(ALL_POSSIBLE_TABLES.length/batchSize)}...`);
    
    const promises = batch.map(tableName => checkTable(tableName));
    const results = await Promise.all(promises);
    
    results.forEach(result => {
      if (result) {
        foundTables.push(result);
        console.log(`✅ ${result.name}: ${result.count} records`);
      }
    });
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 TOTAL FOUND: ${foundTables.length} accessible tables`);
  
  // Sort by record count (biggest first)
  foundTables.sort((a, b) => b.count - a.count);
  
  console.log('\n🎯 Tables with data (sorted by size):');
  foundTables.filter(t => t.count > 0).forEach(table => {
    console.log(`   ${table.name}: ${table.count} records`);
  });
  
  console.log('\n📝 Empty tables:');
  foundTables.filter(t => t.count === 0).forEach(table => {
    console.log(`   ${table.name}: empty`);
  });
  
  // Get sample data from the biggest tables
  console.log('\n🔍 Getting sample data from largest tables...');
  const topTables = foundTables.filter(t => t.count > 0).slice(0, 5);
  
  for (const table of topTables) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table.name}?select=*&limit=1`, {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          console.log(`\n📋 ${table.name} structure:`);
          Object.keys(data[0]).forEach(key => {
            const value = data[0][key];
            const type = value === null ? 'null' : typeof value;
            const preview = String(value || '').substring(0, 50);
            console.log(`   ${key}: ${type} - "${preview}"`);
          });
        }
      }
    } catch (e) {
      // Skip
    }
  }
}

comprehensiveScan();