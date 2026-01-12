/**
 * Populate Alignment Tags for Existing Contacts
 *
 * Analyzes contact bio, position, and other fields to auto-tag with relevant keywords
 * Tags are used by the Unified Alignment Scoring Engine
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '../../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// TAG DETECTION RULES
// ============================================================================

interface TagRule {
  tag: string;
  keywords: string[];
  description: string;
}

const TAG_RULES: TagRule[] = [
  // Indigenous & Cultural
  {
    tag: 'indigenous',
    keywords: [
      'indigenous', 'aboriginal', 'torres strait', 'first nations',
      'first peoples', 'native', 'tribal', 'traditional owner',
      'elder', 'cultural heritage'
    ],
    description: 'Indigenous Australian background or expertise'
  },
  {
    tag: 'cultural',
    keywords: [
      'cultural', 'culture', 'heritage', 'traditional knowledge',
      'cultural practice', 'cultural protocols', 'cultural authority'
    ],
    description: 'Cultural expertise and knowledge'
  },

  // Justice & Youth
  {
    tag: 'youth_justice',
    keywords: [
      'youth justice', 'juvenile justice', 'youth detention',
      'youth offender', 'young offender', 'restorative justice',
      'diversion program', 'youth crime', 'youth rehabilitation'
    ],
    description: 'Youth justice domain expertise'
  },
  {
    tag: 'justice',
    keywords: [
      'justice', 'legal', 'law', 'court', 'magistrate', 'judge',
      'legal aid', 'human rights', 'civil rights', 'criminal justice'
    ],
    description: 'Justice and legal expertise'
  },
  {
    tag: 'youth',
    keywords: [
      'youth', 'young people', 'adolescent', 'teenager', 'child',
      'youth work', 'youth development', 'youth engagement'
    ],
    description: 'Youth-focused work'
  },

  // Community & Social
  {
    tag: 'community',
    keywords: [
      'community', 'grassroots', 'local', 'neighbourhood',
      'community development', 'community engagement',
      'community organizing', 'community-led'
    ],
    description: 'Community engagement and development'
  },
  {
    tag: 'social_impact',
    keywords: [
      'social impact', 'social change', 'social justice',
      'social enterprise', 'social innovation', 'impact',
      'social good', 'social benefit'
    ],
    description: 'Social impact focus'
  },
  {
    tag: 'nfp',
    keywords: [
      'non-profit', 'nonprofit', 'nfp', 'ngo', 'charity',
      'foundation', 'community organization', 'social sector'
    ],
    description: 'Non-profit sector experience'
  },

  // Professional Roles
  {
    tag: 'practitioner',
    keywords: [
      'practitioner', 'coordinator', 'officer', 'worker',
      'program manager', 'project manager', 'facilitator',
      'practitioner', 'implementer'
    ],
    description: 'Hands-on implementation experience'
  },
  {
    tag: 'researcher',
    keywords: [
      'research', 'researcher', 'academic', 'professor', 'phd',
      'scholar', 'research fellow', 'research associate',
      'data analyst', 'evaluation'
    ],
    description: 'Research and academic expertise'
  },
  {
    tag: 'educator',
    keywords: [
      'teacher', 'educator', 'education', 'training', 'lecturer',
      'instructor', 'tutor', 'education officer'
    ],
    description: 'Education and training background'
  },
  {
    tag: 'leader',
    keywords: [
      'director', 'ceo', 'executive', 'founder', 'leader',
      'head of', 'chief', 'president', 'chairperson'
    ],
    description: 'Leadership position'
  },

  // Specific Domains
  {
    tag: 'health',
    keywords: [
      'health', 'healthcare', 'medical', 'clinical', 'hospital',
      'mental health', 'wellbeing', 'wellness', 'telehealth',
      'primary care', 'health service'
    ],
    description: 'Health and healthcare expertise'
  },
  {
    tag: 'mental_health',
    keywords: [
      'mental health', 'psychology', 'psychologist', 'psychiatry',
      'counselling', 'therapy', 'wellbeing', 'trauma'
    ],
    description: 'Mental health specialization'
  },
  {
    tag: 'mentoring',
    keywords: [
      'mentor', 'mentoring', 'mentorship', 'coach', 'coaching',
      'guidance', 'support worker'
    ],
    description: 'Mentoring and coaching experience'
  },
  {
    tag: 'storytelling',
    keywords: [
      'storytelling', 'story', 'narrative', 'documentary',
      'journalism', 'writer', 'filmmaker', 'media',
      'communications', 'creative'
    ],
    description: 'Storytelling and media expertise'
  },
  {
    tag: 'technology',
    keywords: [
      'technology', 'tech', 'digital', 'software', 'platform',
      'developer', 'engineer', 'it', 'data', 'innovation'
    ],
    description: 'Technology and digital expertise'
  },
  {
    tag: 'business',
    keywords: [
      'business', 'entrepreneur', 'enterprise', 'startup',
      'commerce', 'commercial', 'business development',
      'strategy', 'management consulting'
    ],
    description: 'Business and entrepreneurship'
  },
  {
    tag: 'regenerative',
    keywords: [
      'regenerative', 'sustainable', 'sustainability', 'environment',
      'ecological', 'circular economy', 'regenerative agriculture',
      'permaculture', 'food sovereignty'
    ],
    description: 'Regenerative and sustainability focus'
  },
  {
    tag: 'advocacy',
    keywords: [
      'advocate', 'advocacy', 'activist', 'campaign', 'lobbying',
      'policy', 'reform', 'change agent'
    ],
    description: 'Advocacy and policy work'
  },
  {
    tag: 'arts',
    keywords: [
      'artist', 'arts', 'creative', 'art', 'culture', 'cultural production',
      'exhibition', 'gallery', 'museum', 'performance'
    ],
    description: 'Arts and creative practice'
  },
  {
    tag: 'government',
    keywords: [
      'government', 'public service', 'public sector', 'council',
      'department', 'ministry', 'bureau', 'agency'
    ],
    description: 'Government and public sector'
  },
  {
    tag: 'funding',
    keywords: [
      'funding', 'grant', 'donor', 'philanthropy', 'foundation',
      'funder', 'investment', 'fundraising'
    ],
    description: 'Funding and philanthropy'
  },
];

// ============================================================================
// TAG DETECTION FUNCTION
// ============================================================================

function detectTags(contact: any): string[] {
  const tags = new Set<string>();

  // Combine all text fields for analysis
  const textFields = [
    contact.bio || '',
    contact.current_position || '',
    contact.current_company || '',
    contact.location || '',
    contact.full_name || ''
  ].join(' ').toLowerCase();

  // Apply each tag rule
  for (const rule of TAG_RULES) {
    for (const keyword of rule.keywords) {
      if (textFields.includes(keyword.toLowerCase())) {
        tags.add(rule.tag);
        break; // One match per rule is enough
      }
    }
  }

  return Array.from(tags).sort();
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function populateAlignmentTags() {
  console.log('🏷️  POPULATING ALIGNMENT TAGS FOR CONTACTS\n');
  console.log('=' .repeat(80));

  try {
    // =========================================================================
    // 1. Fetch all contacts with bio
    // =========================================================================
    console.log('\n📊 Step 1: Fetching contacts from Supabase...\n');

    const { data: contacts, error: fetchError } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .not('bio', 'is', null);

    if (fetchError) {
      console.error('❌ Error fetching contacts:', fetchError);
      return;
    }

    console.log(`✅ Fetched ${contacts?.length || 0} contacts with bio\n`);

    if (!contacts || contacts.length === 0) {
      console.log('⚠️  No contacts found. Run enrichment first.');
      return;
    }

    // =========================================================================
    // 2. Analyze and tag each contact
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n🔍 Step 2: Analyzing contacts and detecting tags...\n');

    let updated = 0;
    let skipped = 0;
    const tagStats = new Map<string, number>();

    for (const contact of contacts) {
      // Detect tags
      const detectedTags = detectTags(contact);

      // Count tag frequency
      detectedTags.forEach(tag => {
        tagStats.set(tag, (tagStats.get(tag) || 0) + 1);
      });

      // Skip if no tags detected
      if (detectedTags.length === 0) {
        skipped++;
        continue;
      }

      // Update contact
      const { error: updateError } = await supabase
        .from('linkedin_contacts')
        .update({ alignment_tags: detectedTags })
        .eq('id', contact.id);

      if (updateError) {
        console.error(`❌ Error updating ${contact.full_name}:`, updateError.message);
      } else {
        updated++;
        console.log(`✅ ${contact.full_name}: [${detectedTags.join(', ')}]`);
      }
    }

    // =========================================================================
    // 3. Summary statistics
    // =========================================================================
    console.log('\n' + '=' .repeat(80));
    console.log('\n📈 SUMMARY\n');

    console.log(`Total contacts processed: ${contacts.length}`);
    console.log(`Contacts updated: ${updated}`);
    console.log(`Contacts skipped (no tags): ${skipped}`);
    console.log(`Update rate: ${Math.round((updated / contacts.length) * 100)}%\n`);

    // =========================================================================
    // 4. Tag frequency analysis
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n🏷️  TAG FREQUENCY ANALYSIS\n');

    // Sort tags by frequency
    const sortedTags = Array.from(tagStats.entries())
      .sort((a, b) => b[1] - a[1]);

    console.log('Top 20 most common tags:\n');
    sortedTags.slice(0, 20).forEach(([tag, count], index) => {
      const rule = TAG_RULES.find(r => r.tag === tag);
      const percentage = Math.round((count / contacts.length) * 100);
      console.log(`${(index + 1).toString().padStart(2)}. ${tag.padEnd(20)} ${count.toString().padStart(3)} contacts (${percentage}%)`);
      if (rule) {
        console.log(`    ${rule.description}`);
      }
    });

    // =========================================================================
    // 5. High-value contact highlights
    // =========================================================================
    console.log('\n' + '=' .repeat(80));
    console.log('\n⭐ HIGH-VALUE CONTACTS (Multiple Tags)\n');

    const { data: taggedContacts } = await supabase
      .from('linkedin_contacts')
      .select('full_name, alignment_tags, strategic_value, current_position')
      .not('alignment_tags', 'is', null)
      .order('strategic_value', { ascending: false });

    const highValueContacts = (taggedContacts || [])
      .filter((c: any) => c.alignment_tags && c.alignment_tags.length >= 3)
      .slice(0, 10);

    highValueContacts.forEach((contact: any, index: number) => {
      console.log(`${index + 1}. ${contact.full_name}`);
      console.log(`   Position: ${contact.current_position || 'Unknown'}`);
      console.log(`   Strategic Value: ${contact.strategic_value || 'unknown'}`);
      console.log(`   Tags (${contact.alignment_tags.length}): ${contact.alignment_tags.join(', ')}`);
      console.log('');
    });

    // =========================================================================
    // 6. Indigenous + Youth Justice contacts (ALMA priority)
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n⚖️  ALMA PRIORITY CONTACTS (Indigenous + Youth Justice)\n');

    const { data: almaContacts } = await supabase
      .from('linkedin_contacts')
      .select('full_name, alignment_tags, current_position')
      .contains('alignment_tags', ['indigenous'])
      .not('alignment_tags', 'is', null);

    const youthJusticeContacts = (almaContacts || [])
      .filter((c: any) => c.alignment_tags?.includes('youth_justice'));

    console.log(`Found ${youthJusticeContacts.length} contacts with Indigenous + Youth Justice tags\n`);

    youthJusticeContacts.slice(0, 10).forEach((contact: any, index: number) => {
      console.log(`${index + 1}. ${contact.full_name}`);
      console.log(`   Position: ${contact.current_position || 'Unknown'}`);
      console.log(`   Tags: ${contact.alignment_tags.join(', ')}`);
      console.log('');
    });

    // =========================================================================
    // SUCCESS
    // =========================================================================
    console.log('=' .repeat(80));
    console.log('\n✅ ALIGNMENT TAG POPULATION COMPLETE!\n');
    console.log('NEXT STEPS:');
    console.log('  1. Review tag frequency above');
    console.log('  2. Run alignment scoring test to see improved results');
    console.log('  3. Sync Notion projects to Supabase');
    console.log('  4. Run batch matching for PICC project\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// ============================================================================
// RUN
// ============================================================================

populateAlignmentTags()
  .then(() => {
    console.log('🎉 Tag population complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Tag population failed:', error);
    process.exit(1);
  });
