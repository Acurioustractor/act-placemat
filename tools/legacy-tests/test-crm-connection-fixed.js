/**
 * Test CRM Database Connection - Fixed Version
 * Verifies connection to LinkedIn CRM system with 20K profiles
 */

import { createClient } from '@supabase/supabase-js';
import huggingfaceEmbeddingService from './apps/backend/src/services/huggingfaceEmbeddingService.js';
import dotenv from 'dotenv';

dotenv.config();

async function testCRMConnection() {
  console.log('🔍 Testing CRM Database Connection...\n');

  // Test environment variables
  console.log('Environment Variables:');
  console.log(
    'CRM_SUPABASE_URL:',
    process.env.CRM_SUPABASE_URL ? '✅ Configured' : '❌ Missing'
  );
  console.log(
    'CRM_SERVICE_KEY:',
    process.env.CRM_SERVICE_KEY ? '✅ Configured' : '❌ Missing'
  );
  console.log(
    'HUGGINGFACE_API_KEY:',
    process.env.HUGGINGFACE_API_KEY ? '✅ Configured' : '❌ Missing'
  );
  console.log('');

  if (!process.env.CRM_SUPABASE_URL || !process.env.CRM_SERVICE_KEY) {
    console.log('❌ Missing CRM database credentials. Please check your .env file.');
    return;
  }

  let embeddedCount = 0;
  let totalContacts = 0;
  let totalOpportunities = 0;

  try {
    // Initialize CRM Supabase client
    const crmSupabase = createClient(
      process.env.CRM_SUPABASE_URL,
      process.env.CRM_SERVICE_KEY
    );

    console.log('📊 Testing CRM Database Tables...\n');

    // Test linkedin_contacts table
    console.log('1. LinkedIn Contacts Table:');
    const {
      data: contactsData,
      error: contactsError,
      count: contactsTotal,
    } = await crmSupabase
      .from('linkedin_contacts')
      .select('id, full_name, current_position, current_company, profile_embedding', {
        count: 'exact',
      })
      .limit(5);

    if (contactsError) {
      console.log('❌ Error accessing linkedin_contacts:', contactsError.message);
    } else {
      totalContacts = contactsTotal || contactsData?.length || 0;
      console.log(`✅ Total contacts: ${totalContacts}`);

      // Count contacts with embeddings
      const { count: embeddedTotal } = await crmSupabase
        .from('linkedin_contacts')
        .select('id', { count: 'exact', head: true })
        .not('profile_embedding', 'is', null);

      embeddedCount = embeddedTotal || 0;
      console.log(`✅ Contacts with embeddings: ${embeddedCount}`);

      if (contactsData && contactsData.length > 0) {
        console.log('Sample contacts:');
        contactsData.forEach((contact, i) => {
          console.log(
            `   ${i + 1}. ${contact.full_name || '[No name]'} - ${contact.current_position || '[No position]'} at ${contact.current_company || '[No company]'}`
          );
          console.log(
            `      Has embedding: ${contact.profile_embedding ? '✅' : '❌'}`
          );
        });
      }
    }
    console.log('');

    // Test Hugging Face embedding service
    console.log('2. Hugging Face Embedding Service:');
    const embeddingHealth = await huggingfaceEmbeddingService.healthCheck();
    console.log(
      `Status: ${embeddingHealth.status === 'healthy' ? '✅' : '❌'} ${embeddingHealth.status}`
    );
    console.log(`Model: ${embeddingHealth.model}`);
    console.log(`Dimensions: ${embeddingHealth.dimensions}`);
    console.log(
      `API Key: ${embeddingHealth.apiKeyConfigured ? '✅ Configured' : '❌ Missing'}`
    );

    if (embeddingHealth.status === 'healthy') {
      console.log(`Test embedding length: ${embeddingHealth.testEmbeddingLength}`);
    } else if (embeddingHealth.message) {
      console.log(`Error: ${embeddingHealth.message}`);
    }
    console.log('');

    // Test semantic search capabilities
    if (
      contactsData &&
      contactsData.length > 0 &&
      embeddingHealth.status === 'healthy'
    ) {
      console.log('3. Testing Semantic Search Integration:');

      // Find a contact with an embedding
      const contactWithEmbedding = contactsData.find(c => c.profile_embedding);

      if (contactWithEmbedding) {
        console.log(
          `✅ Found contact with embedding: ${contactWithEmbedding.full_name || '[No name]'}`
        );

        try {
          // Test generating a new embedding for comparison
          const testText = `${contactWithEmbedding.current_position || 'Professional'} at ${contactWithEmbedding.current_company || 'Company'}`;
          const newEmbedding =
            await huggingfaceEmbeddingService.generateEmbedding(testText);

          // Calculate similarity with existing embedding
          const similarity = huggingfaceEmbeddingService.cosineSimilarity(
            contactWithEmbedding.profile_embedding,
            newEmbedding
          );

          console.log(
            `✅ Generated matching embedding with ${Math.round(similarity * 100)}% similarity`
          );
        } catch (error) {
          console.log(`❌ Error testing semantic search: ${error.message}`);
        }
      } else {
        console.log('⚠️ No contacts with embeddings found for testing semantic search');
      }
    }

    console.log('\n🎉 CRM Connection Test Complete!');

    // Summary
    console.log('\n📋 Integration Summary:');
    console.log(`• LinkedIn CRM: ${totalContacts} total profiles`);
    console.log(
      `• Embedded profiles: ${embeddedCount} with AI embeddings (${Math.round((embeddedCount / totalContacts) * 100)}%)`
    );
    console.log(
      `• Embedding model: ${embeddingHealth.model} (${embeddingHealth.dimensions}D)`
    );
    console.log(
      `• API Status: ${embeddingHealth.apiKeyConfigured ? '✅ Ready' : '❌ API key missing'}`
    );
    console.log(
      `• Ready for semantic matching: ${embeddingHealth.status === 'healthy' && embeddedCount > 0 ? '✅ YES' : '⚠️ Need API key'}`
    );
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
  }
}

// Run the test
testCRMConnection().catch(console.error);
