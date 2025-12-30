/**
 * Auto-tag contacts using AI analysis
 *
 * Analyzes contact data (name, company, position, sector, notes)
 * and automatically adds relevant campaign tags
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

const CAMPAIGN_TAGS = {
  'goods-on-country': {
    keywords: ['indigenous', 'aboriginal', 'first nations', 'circular economy', 'sustainable products', 'retail', 'manufacturing', 'goods', 'products', 'supply chain'],
    description: 'Indigenous-led businesses, circular economy, sustainable products'
  },
  'justice-hub': {
    keywords: ['youth justice', 'juvenile justice', 'restorative justice', 'indigenous youth', 'youth services', 'family support', 'legal', 'law', 'justice'],
    description: 'Youth justice, restorative justice, family support services'
  },
  'circular-economy': {
    keywords: ['circular economy', 'sustainability', 'recycling', 'waste', 'regenerative', 'closed loop'],
    description: 'Circular economy and sustainability initiatives'
  },
  'indigenous-business': {
    keywords: ['indigenous', 'aboriginal', 'torres strait', 'first nations', 'native', 'mob'],
    description: 'Indigenous-owned or focused businesses'
  },
  'sustainable-products': {
    keywords: ['sustainable', 'eco', 'green', 'organic', 'ethical', 'fair trade'],
    description: 'Sustainable and ethical product companies'
  }
};

console.log('🏷️  Auto-tagging contacts using AI analysis...\n');

async function analyzeContactWithAI(contact) {
  const prompt = `Analyze this contact and determine which tags are relevant:

Contact Information:
- Name: ${contact.full_name || 'Unknown'}
- Company: ${contact.current_company || 'Unknown'}
- Position: ${contact.current_position || 'Unknown'}
- Sector: ${contact.sector || 'Unknown'}
- Email: ${contact.email || 'Unknown'}
- Current Tags: ${contact.tags ? contact.tags.join(', ') : 'None'}

Available Campaign Tags:
${Object.entries(CAMPAIGN_TAGS).map(([tag, info]) =>
  `- ${tag}: ${info.description}`
).join('\n')}

Based on this information, which tags should be applied? Consider:
1. Their role and company focus
2. Industry sector alignment
3. Relevance to indigenous businesses or youth justice

Respond with ONLY a JSON array of tag names, e.g.: ["goods-on-country", "indigenous-business"]
If no tags are relevant, respond with: []`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const response = message.content[0].text.trim();
    const tags = JSON.parse(response);
    return tags;

  } catch (error) {
    console.error(`  ⚠️  AI analysis failed for ${contact.full_name}: ${error.message}`);
    return null;
  }
}

async function simpleKeywordTagging(contact) {
  const tags = new Set(contact.tags || []);
  const text = [
    contact.full_name,
    contact.current_company,
    contact.current_position,
    contact.sector
  ].filter(Boolean).join(' ').toLowerCase();

  for (const [tag, config] of Object.entries(CAMPAIGN_TAGS)) {
    const matches = config.keywords.some(keyword =>
      text.includes(keyword.toLowerCase())
    );

    if (matches) {
      tags.add(tag);
    }
  }

  return Array.from(tags);
}

async function autoTagContacts(options = {}) {
  const {
    useAI = false,
    limit = 100,
    dryRun = false
  } = options;

  try {
    // Get untagged or partially tagged contacts
    console.log(`📊 Fetching up to ${limit} contacts...\n`);

    const { data: contacts, error } = await supabase
      .from('person_identity_map')
      .select('person_id, full_name, email, current_company, current_position, sector, tags')
      .not('email', 'is', null)
      .limit(limit);

    if (error) throw error;

    console.log(`Found ${contacts.length} contacts\n`);
    console.log(`Mode: ${useAI ? '🤖 AI Analysis' : '🔍 Keyword Matching'}\n`);

    let tagged = 0;
    let skipped = 0;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];

      process.stdout.write(`[${i+1}/${contacts.length}] ${contact.full_name || 'Unknown'}... `);

      let suggestedTags;

      if (useAI) {
        suggestedTags = await analyzeContactWithAI(contact);
        if (!suggestedTags) {
          skipped++;
          continue;
        }
      } else {
        suggestedTags = await simpleKeywordTagging(contact);
      }

      // Merge with existing tags
      const existingTags = new Set(contact.tags || []);
      const newTags = suggestedTags.filter(tag => !existingTags.has(tag));

      if (newTags.length === 0) {
        console.log('✓ (no new tags)');
        skipped++;
        continue;
      }

      const finalTags = [...new Set([...existingTags, ...newTags])];

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('person_identity_map')
          .update({ tags: finalTags })
          .eq('person_id', contact.person_id);

        if (updateError) {
          console.log(`❌ Update failed: ${updateError.message}`);
          continue;
        }
      }

      console.log(`✅ Added: ${newTags.join(', ')}`);
      tagged++;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Auto-tagging ${dryRun ? 'simulation ' : ''}complete!`);
    console.log('='.repeat(60));
    console.log(`Tagged: ${tagged}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total: ${contacts.length}\n`);

    if (dryRun) {
      console.log('⚠️  This was a DRY RUN - no changes were made');
      console.log('Run without --dry-run to apply tags\n');
    }

    // Show new candidate counts
    console.log('📊 Checking candidate counts...\n');

    const { count: goodsCount } = await supabase
      .from('vw_goods_enrichment_candidates')
      .select('*', { count: 'exact', head: true });

    const { count: justiceCount } = await supabase
      .from('vw_justice_enrichment_candidates')
      .select('*', { count: 'exact', head: true });

    console.log(`Goods on Country candidates: ${goodsCount || 0}`);
    console.log(`JusticeHub candidates: ${justiceCount || 0}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Parse command line args
const args = process.argv.slice(2);
const useAI = args.includes('--ai');
const dryRun = args.includes('--dry-run');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;

console.log('Options:');
console.log(`  AI Analysis: ${useAI ? 'Yes (uses Claude API)' : 'No (keyword matching only)'}`);
console.log(`  Dry Run: ${dryRun ? 'Yes (no changes)' : 'No (will update database)'}`);
console.log(`  Limit: ${limit} contacts\n`);

autoTagContacts({ useAI, limit, dryRun });
