/**
 * GOODS. PROJECT CONTACT MATCHING
 *
 * Finds and scores contacts for the Goods. project based on:
 * - Manufacturing & product design expertise
 * - Social enterprise & community business
 * - Indigenous community development
 * - Health sector knowledge
 * - Circular economy & recycling
 * - Business/funding connections
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '../../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Goods. project tags and keywords
const GOODS_TAGS = {
  // Core expertise (highest priority)
  manufacturing: 20,
  product: 20,
  social_enterprise: 15,

  // Community & Indigenous (high priority)
  indigenous: 15,
  community: 10,

  // Business & funding
  business: 10,
  funding: 10,
  social_impact: 10,

  // Health & environment
  health: 10,
  environment: 10,
  regenerative: 10,

  // Supporting skills
  leader: 5,
  practitioner: 5,
  mentoring: 5,
  technology: 5
};

const GOODS_KEYWORDS = {
  // Manufacturing & product
  manufacturing: 20,
  'product design': 20,
  'product development': 20,
  manufacturing: 20,

  // Social enterprise
  'social enterprise': 15,
  'community business': 15,
  'community owned': 15,
  'community manufacturing': 20,

  // Circular economy
  recycling: 15,
  'circular economy': 15,
  'waste to resource': 20,
  sustainability: 10,

  // Health
  'rheumatic heart disease': 20,
  hygiene: 15,
  'public health': 10,
  wellbeing: 10,

  // Indigenous
  'first nations': 15,
  aboriginal: 15,
  'torres strait': 15,
  'indigenous business': 20,

  // Specific to Goods.
  mattress: 15,
  'washing machine': 15,
  plastic: 10,
  'essential goods': 20
};

interface ContactScore {
  id: string;
  full_name: string;
  current_position: string;
  current_company: string;
  email_address?: string;
  linkedin_url?: string;
  strategic_value: string;
  alignment_tags: string[];
  bio?: string;
  score: number;
  match_reasons: string[];
  tag_matches: string[];
  keyword_matches: string[];
}

async function matchGoodsContacts() {
  console.log('🏭 GOODS. PROJECT CONTACT MATCHING\n');
  console.log('='.repeat(80));
  console.log('\nProject: Essential goods manufacturing (mattresses, washing machines)');
  console.log('Focus: Community-owned, recycled plastic, First Nations communities\n');
  console.log('='.repeat(80));

  try {
    // Fetch all enriched contacts (with tags OR bio)
    const { data: contacts, error: contactsError } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .or('bio.not.is.null,alignment_tags.neq.{}');

    if (contactsError) {
      console.error('❌ Error fetching contacts:', contactsError);
      return;
    }

    if (!contacts || contacts.length === 0) {
      console.log('⚠️  No enriched contacts found');
      return;
    }

    console.log(`\n✅ Loaded ${contacts.length} enriched contacts\n`);
    console.log('='.repeat(80));
    console.log('\n🔍 Scoring contacts for Goods. project...\n');

    // Score each contact
    const scoredContacts: ContactScore[] = contacts.map(contact => {
      let score = 0;
      const matchReasons: string[] = [];
      const tagMatches: string[] = [];
      const keywordMatches: string[] = [];

      // Check alignment tags
      if (contact.alignment_tags) {
        Object.entries(GOODS_TAGS).forEach(([tag, points]) => {
          if (contact.alignment_tags.includes(tag)) {
            score += points;
            tagMatches.push(tag);
          }
        });
      }

      // Check bio for keywords
      if (contact.bio) {
        const bioLower = contact.bio.toLowerCase();
        Object.entries(GOODS_KEYWORDS).forEach(([keyword, points]) => {
          if (bioLower.includes(keyword.toLowerCase())) {
            score += points;
            keywordMatches.push(keyword);
          }
        });
      }

      // Strategic value bonus
      if (contact.strategic_value === 'high') {
        score += 30;
        matchReasons.push('High strategic value');
      } else if (contact.strategic_value === 'medium') {
        score += 15;
      }

      // Build match reasons
      if (tagMatches.length > 0) {
        matchReasons.push(`Tags: ${tagMatches.join(', ')}`);
      }
      if (keywordMatches.length > 0) {
        matchReasons.push(`Keywords: ${keywordMatches.slice(0, 3).join(', ')}${keywordMatches.length > 3 ? '...' : ''}`);
      }

      return {
        id: contact.id,
        full_name: contact.full_name,
        current_position: contact.current_position,
        current_company: contact.current_company,
        email_address: contact.email_address,
        linkedin_url: contact.linkedin_url,
        strategic_value: contact.strategic_value,
        alignment_tags: contact.alignment_tags,
        bio: contact.bio,
        score,
        match_reasons: matchReasons,
        tag_matches: tagMatches,
        keyword_matches: keywordMatches
      };
    });

    // Filter for minimum score and sort
    const topMatches = scoredContacts
      .filter(c => c.score >= 15) // At least one good tag/keyword match
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    console.log(`✅ Found ${topMatches.length} potential matches\n`);
    console.log('='.repeat(80));

    // Display results by tier
    const topPriority = topMatches.filter(c => c.score >= 60);
    const highValue = topMatches.filter(c => c.score >= 40 && c.score < 60);
    const potential = topMatches.filter(c => c.score >= 15 && c.score < 40);

    if (topPriority.length > 0) {
      console.log('\n🎯 TOP PRIORITY MATCHES (Score ≥60)\n');
      topPriority.forEach((contact, index) => {
        console.log(`${index + 1}. ${contact.full_name} (${contact.score} points)`);
        console.log(`   Position: ${contact.current_position}`);
        if (contact.current_company) {
          console.log(`   Company: ${contact.current_company}`);
        }
        console.log(`   Tags (${contact.tag_matches.length}): ${contact.tag_matches.join(', ')}`);
        if (contact.keyword_matches.length > 0) {
          console.log(`   Keywords (${contact.keyword_matches.length}): ${contact.keyword_matches.slice(0, 5).join(', ')}${contact.keyword_matches.length > 5 ? '...' : ''}`);
        }
        if (contact.email_address) {
          console.log(`   ✅ Email: ${contact.email_address}`);
        }
        console.log(`   Strategic Value: ${contact.strategic_value}`);
        console.log('');
      });
    }

    if (highValue.length > 0) {
      console.log('='.repeat(80));
      console.log('\n✅ HIGH VALUE MATCHES (Score 40-59)\n');
      highValue.forEach((contact, index) => {
        console.log(`${index + 1}. ${contact.full_name} (${contact.score} points)`);
        console.log(`   Position: ${contact.current_position}`);
        console.log(`   Tags: ${contact.tag_matches.join(', ')}`);
        if (contact.email_address) {
          console.log(`   ✅ Email: ${contact.email_address}`);
        }
        console.log('');
      });
    }

    if (potential.length > 0) {
      console.log('='.repeat(80));
      console.log('\n💡 POTENTIAL MATCHES (Score 15-39)\n');
      console.log(`Found ${potential.length} potential matches\n`);
      potential.slice(0, 10).forEach((contact, index) => {
        console.log(`${index + 1}. ${contact.full_name} (${contact.score} points) - ${contact.current_position}`);
      });
      if (potential.length > 10) {
        console.log(`\n... and ${potential.length - 10} more\n`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 MATCHING SUMMARY\n');
    console.log(`Total contacts analyzed: ${contacts.length}`);
    console.log(`Contacts with matches: ${topMatches.length}`);
    console.log(`  🎯 TOP PRIORITY (≥60): ${topPriority.length}`);
    console.log(`  ✅ HIGH VALUE (40-59): ${highValue.length}`);
    console.log(`  💡 POTENTIAL (15-39): ${potential.length}`);

    // Save matches to database
    if (topMatches.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('\n💾 Saving matches to database...\n');

      // Get Goods. project ID
      const { data: goodsProject } = await supabase
        .from('notion_projects_cache')
        .select('notion_project_id, project_name')
        .ilike('project_name', '%Goods%')
        .single();

      if (goodsProject) {
        const matchesToSave = topMatches.map(contact => ({
          contact_id: contact.id,
          project_notion_id: goodsProject.notion_project_id,
          project_name: goodsProject.project_name,
          project_source: 'notion',
          alignment_score: contact.score,
          matched_keywords: contact.tag_matches.concat(contact.keyword_matches),
          match_reason: contact.match_reasons.join('; '),
          engagement_status: 'potential'
        }));

        const { error: saveError } = await supabase
          .from('project_contact_matches')
          .upsert(matchesToSave, {
            onConflict: 'contact_id,project_notion_id',
            ignoreDuplicates: false
          });

        if (saveError) {
          console.error('❌ Error saving matches:', saveError);
        } else {
          console.log(`✅ Saved ${matchesToSave.length} matches to database`);
        }
      }
    }

    // Next steps
    console.log('\n' + '='.repeat(80));
    console.log('\n🚀 NEXT STEPS\n');
    console.log('1. Review TOP PRIORITY contacts for immediate outreach');
    console.log('2. Update Goods. project with relevant tags (manufacturing, product, health)');
    console.log('3. Enrich top matches with detailed LinkedIn/Exa data');
    console.log('4. Draft outreach emails for manufacturing/product experts');
    console.log('5. Connect Indigenous business leaders (Sara, Duncan, Tom) to Goods.\n');

    // Top 3 recommendations
    if (topMatches.length >= 3) {
      console.log('='.repeat(80));
      console.log('\n⭐ TOP 3 IMMEDIATE OUTREACH RECOMMENDATIONS\n');
      topMatches.slice(0, 3).forEach((contact, index) => {
        console.log(`${index + 1}. ${contact.full_name} (${contact.score} points)`);
        console.log(`   Why: ${contact.match_reasons.join(', ')}`);
        console.log(`   Contact: ${contact.email_address || 'No email available'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Matching failed:', error);
    throw error;
  }
}

// ============================================================================
// RUN
// ============================================================================

matchGoodsContacts()
  .then(() => {
    console.log('🎉 Goods. matching complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Matching failed:', error);
    process.exit(1);
  });
