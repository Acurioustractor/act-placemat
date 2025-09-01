#!/usr/bin/env node

/**
 * Metabase Authentication and Database Setup Script
 * Authenticates with Metabase admin credentials and sets up ACT Community database
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../apps/backend/.env' });

const METABASE_URL = process.env.METABASE_URL || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.MB_ADMIN_EMAIL || 'admin@act.place';
const ADMIN_PASSWORD = process.env.MB_ADMIN_PASSWORD;

async function authenticateWithMetabase() {
  console.log('🔐 Authenticating with Metabase...');
  
  try {
    const response = await fetch(`${METABASE_URL}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Authentication failed: ${response.status} - ${error}`);
    }

    const session = await response.json();
    console.log('✅ Successfully authenticated with Metabase');
    return session.id; // Session token
    
  } catch (error) {
    console.error('❌ Failed to authenticate with Metabase:', error.message);
    throw error;
  }
}

async function addACTDatabase(sessionToken) {
  console.log('🗄️  Adding ACT Community database to Metabase...');
  
  const databaseConfig = {
    name: 'ACT Community Database',
    engine: 'postgres',
    details: {
      host: 'tednluwflfhxyucgwigh.supabase.co',
      port: 5432,
      dbname: 'postgres', 
      user: 'postgres',
      password: process.env.SUPABASE_SERVICE_ROLE_KEY,
      ssl: true,
      'additional-options': 'sslmode=require'
    }
  };

  try {
    const response = await fetch(`${METABASE_URL}/api/database`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Metabase-Session': sessionToken
      },
      body: JSON.stringify(databaseConfig)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to add database: ${response.status} - ${error}`);
    }

    const database = await response.json();
    console.log('✅ Successfully added ACT Community database:', database.name);
    return database;
    
  } catch (error) {
    console.error('❌ Failed to add database:', error.message);
    throw error;
  }
}

async function createCollection(sessionToken, name, description, color = '#509EE3') {
  console.log(`📁 Creating collection: ${name}...`);
  
  try {
    const response = await fetch(`${METABASE_URL}/api/collection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Metabase-Session': sessionToken
      },
      body: JSON.stringify({
        name,
        description,
        color
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create collection: ${response.status} - ${error}`);
    }

    const collection = await response.json();
    console.log('✅ Successfully created collection:', collection.name);
    return collection;
    
  } catch (error) {
    console.error('❌ Failed to create collection:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting Metabase setup for ACT Community Analytics...');
  
  if (!ADMIN_PASSWORD) {
    console.error('❌ Missing MB_ADMIN_PASSWORD environment variable');
    process.exit(1);
  }
  
  try {
    // Authenticate with Metabase
    const sessionToken = await authenticateWithMetabase();
    
    // Add ACT database
    const database = await addACTDatabase(sessionToken);
    
    // Create collections for organizing dashboards
    const collections = [
      {
        name: 'ACT Community Analytics',
        description: 'Core analytics for the ACT community platform',
        color: '#1E88E5'
      },
      {
        name: 'Project Impact & Outcomes', 
        description: 'Tracking project progress and community outcomes',
        color: '#43A047'
      },
      {
        name: 'Engagement & Behavior',
        description: 'User engagement patterns and behavioral analytics',
        color: '#FB8C00'
      }
    ];
    
    for (const collectionConfig of collections) {
      await createCollection(sessionToken, collectionConfig.name, collectionConfig.description, collectionConfig.color);
    }
    
    console.log('🎉 Metabase setup completed successfully!');
    console.log(`📊 Access Metabase at: ${METABASE_URL}`);
    console.log(`🗄️  Database: ${database.name} (ID: ${database.id})`);
    
  } catch (error) {
    console.error('💥 Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();