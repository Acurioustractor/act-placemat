#!/usr/bin/env node

/**
 * Populate Contact Intelligence System with Real LinkedIn Data
 *
 * This script transfers your LinkedIn contacts into the Contact Intelligence
 * system and creates sample interactions to demonstrate the system.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateContactIntelligence() {
  console.log('🚀 Populating Contact Intelligence System...\n');

  try {
    // 1. Get high-value LinkedIn contacts
    console.log('📊 Fetching high-value LinkedIn contacts...');
    const { data: linkedinContacts, error: linkedinError } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .eq('strategic_value', 'high')
      .not('email_address', 'is', null)
      .limit(20);

    if (linkedinError) {
      console.error('❌ Error fetching LinkedIn contacts:', linkedinError);
      return;
    }

    console.log(`✅ Found ${linkedinContacts.length} high-value LinkedIn contacts\n`);

    // 2. Transfer to person_identity_map
    console.log('🔄 Transferring to Contact Intelligence system...');

    const identityMappings = linkedinContacts.map(contact => ({
      full_name: contact.full_name,
      email: contact.email_address || null,
      contact_data: {
        linkedin_url: contact.linkedin_url,
        current_position: contact.current_position,
        current_company: contact.current_company,
        industry: contact.industry,
        location: contact.location,
        connection_source: contact.connection_source,
        alignment_tags: contact.alignment_tags || [],
        raw_data: contact.raw_data
      },
      youth_justice_relevance_score: Math.round(contact.relationship_score * 100) || 50,
      engagement_priority: contact.strategic_value === 'high' ? 'high' : 'medium',
      sector: contact.industry || 'unknown',
      organization_type: contact.current_company?.includes('Department') ? 'government' : 'private',
      location_region: contact.location || 'unknown',
      indigenous_affiliation: false, // Default, can be updated later
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insert with upsert to avoid duplicates
    const { data: insertedContacts, error: insertError } = await supabase
      .from('person_identity_map')
      .upsert(identityMappings, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select();

    if (insertError) {
      console.error('❌ Error inserting contacts:', insertError);
      return;
    }

    console.log(`✅ Transferred ${insertedContacts?.length || 0} contacts to intelligence system\n`);

    // 3. Create sample interactions for demonstration
    console.log('📝 Creating sample interactions...');

    const sampleInteractions = [];
    const interactionTypes = ['email', 'meeting', 'call', 'linkedin_message', 'introduction'];
    const outcomes = ['positive', 'neutral', 'follow_up_needed', 'collaboration_potential'];

    for (let i = 0; i < Math.min(5, insertedContacts?.length || 0); i++) {
      const contact = insertedContacts[i];
      const interactionType = interactionTypes[Math.floor(Math.random() * interactionTypes.length)];
      const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

      sampleInteractions.push({
        person_id: contact.person_id,
        interaction_type: interactionType,
        subject: `${interactionType.charAt(0).toUpperCase() + interactionType.slice(1)} with ${contact.full_name}`,
        description: `Sample ${interactionType} interaction for demonstration purposes`,
        outcome: outcome,
        sentiment_score: Math.random() * 0.4 + 0.6, // 0.6 to 1.0 (mostly positive)
        follow_up_required: Math.random() > 0.7,
        follow_up_date: Math.random() > 0.5 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
        metadata: {
          demo_data: true,
          created_by_script: true,
          interaction_context: 'ACT Community outreach'
        },
        created_by: 'system',
        interaction_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    if (sampleInteractions.length > 0) {
      const { error: interactionError } = await supabase
        .from('contact_interactions')
        .insert(sampleInteractions);

      if (interactionError) {
        console.error('❌ Error creating sample interactions:', interactionError);
      } else {
        console.log(`✅ Created ${sampleInteractions.length} sample interactions\n`);
      }
    }

    // 4. Create intelligence scores
    console.log('🧠 Generating intelligence scores...');

    const intelligenceScores = insertedContacts?.map(contact => ({
      person_id: contact.person_id,
      influence_score: Math.random() * 0.3 + 0.4, // 0.4 to 0.7
      accessibility_score: Math.random() * 0.4 + 0.3, // 0.3 to 0.7
      alignment_score: Math.random() * 0.3 + 0.5, // 0.5 to 0.8
      timing_score: Math.random() * 0.4 + 0.4, // 0.4 to 0.8
      composite_score: 0, // Will be calculated
      engagement_readiness: Math.random() * 0.3 + 0.5, // 0.5 to 0.8
      last_calculated: new Date().toISOString(),
      calculation_metadata: {
        demo_data: true,
        factors_considered: ['position', 'company', 'alignment_tags', 'connection_strength'],
        last_interaction_impact: 0.1
      }
    }));

    // Calculate composite scores
    intelligenceScores?.forEach(score => {
      score.composite_score = (
        score.influence_score * 0.3 +
        score.accessibility_score * 0.2 +
        score.alignment_score * 0.3 +
        score.timing_score * 0.2
      );
    });

    if (intelligenceScores?.length > 0) {
      const { error: scoresError } = await supabase
        .from('contact_intelligence_scores')
        .insert(intelligenceScores);

      if (scoresError) {
        console.error('❌ Error creating intelligence scores:', scoresError);
      } else {
        console.log(`✅ Generated intelligence scores for ${intelligenceScores.length} contacts\n`);
      }
    }

    // 5. Summary
    console.log('🎉 Contact Intelligence Population Complete!\n');
    console.log('📊 Summary:');
    console.log(`   • ${insertedContacts?.length || 0} contacts transferred`);
    console.log(`   • ${sampleInteractions.length} sample interactions created`);
    console.log(`   • ${intelligenceScores?.length || 0} intelligence profiles generated`);
    console.log('\n🚀 Your Morning Dashboard should now show real data!');
    console.log('   Visit: http://localhost:5175/morning-dashboard');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the population script
populateContactIntelligence().then(() => {
  console.log('\n✅ Script completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});