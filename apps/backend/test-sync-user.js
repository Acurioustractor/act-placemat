#!/usr/bin/env node

/**
 * Create test user for sync testing
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '../../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestUser() {
  console.log('🧪 Creating test user for knowledge graph sync...\n');

  // Create a test user profile
  const testUserId = randomUUID();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testUser = {
    user_id: testUserId,
    email: `testuser-${timestamp}@example.com`,
    display_name: `Test User ${timestamp}`,
    bio: 'A test user for knowledge graph sync testing',
    interests: ['climate_action', 'community_development'],
    expertise_areas: ['project_management', 'data_analysis'],
    account_status: 'active',
    onboarding_completed: true
  };

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert(testUser)
      .select();
      
    if (error) {
      console.error('❌ Error creating test user:', error.message);
      process.exit(1);
    } else {
      console.log('✅ Test user created successfully');
      console.log('User ID:', testUserId);
      console.log('User data:', JSON.stringify(data[0], null, 2));
    }
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
  }
}

createTestUser();