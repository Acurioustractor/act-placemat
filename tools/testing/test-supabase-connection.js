// Test Supabase connection with real credentials
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tednluwflfhxyucgwigh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEzNjY2MjksImV4cCI6MjAzNjk0MjYyOX0.jNE5fGFXKMLK6CQE3cSCHOQ8ZrfGj3ZaHXBhbvXFvX8';

console.log('🔗 Testing Supabase connection...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test basic connection
    console.log('📡 Testing basic connection...');
    const { data, error } = await supabase
      .from('stories')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('📊 Stories count:', data?.length || 'Unknown');
    
    // Test RPC function
    console.log('🔧 Testing RPC functions...');
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_homepage_content');
    
    if (rpcError) {
      console.error('⚠️ RPC function failed (this may be expected):', rpcError.message);
    } else {
      console.log('✅ RPC function successful!');
    }
    
    // List available tables
    console.log('📋 Testing table access...');
    const tables = ['stories', 'projects', 'opportunities', 'organizations', 'people'];
    
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true });
        
        if (tableError) {
          console.log(`❌ Table '${table}' not accessible:`, tableError.message);
        } else {
          console.log(`✅ Table '${table}' accessible`);
        }
      } catch (e) {
        console.log(`❌ Table '${table}' error:`, e.message);
      }
    }
    
  } catch (error) {
    console.error('💥 Connection test failed:', error);
  }
}

testConnection();