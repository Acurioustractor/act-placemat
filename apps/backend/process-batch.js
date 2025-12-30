/**
 * Process Exa Enrichment Queue
 *
 * Pulls contacts from the enrichment queue and enriches them with Exa.ai data:
 * - LinkedIn profiles
 * - Company intelligence
 * - Media mentions
 *
 * Usage:
 *   node process-batch.js                    # Process 10 contacts
 *   node process-batch.js --limit=25         # Process 25 contacts
 *   node process-batch.js --campaign=goods   # Only Goods on Country
 *   node process-batch.js --dry-run          # Test without using API credits
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Exa from 'exa-js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const exa = new Exa(process.env.EXA_API_KEY);

console.log('🔍 Exa Enrichment Processor\n');

/**
 * Search for LinkedIn profile using Exa
 */
async function findLinkedInProfile(contact) {
  const name = contact.person_name || contact.full_name || 'Unknown';
  const query = `${name} ${contact.current_company || ''} LinkedIn profile`.trim();

  try {
    const results = await exa.searchAndContents(query, {
      type: 'neural',
      useAutoprompt: true,
      numResults: 3,
      includeDomains: ['linkedin.com'],
      text: { maxCharacters: 2000 }
    });

    if (results.results && results.results.length > 0) {
      const profile = results.results[0];

      // Parse LinkedIn data from text content
      const text = profile.text || '';

      return {
        linkedin_url: profile.url,
        headline: extractHeadline(text),
        summary: extractSummary(text),
        experience: extractExperience(text),
        education: extractEducation(text),
        skills: extractSkills(text),
        confidence_score: profile.score || 0.5
      };
    }

    return null;

  } catch (error) {
    console.error(`  ⚠️  LinkedIn search failed: ${error.message}`);
    return null;
  }
}

/**
 * Search for company intelligence using Exa
 */
async function findCompanyIntelligence(contact) {
  if (!contact.current_company) return null;

  const query = `${contact.current_company} company information funding sustainability indigenous`;

  try {
    const results = await exa.searchAndContents(query, {
      type: 'neural',
      useAutoprompt: true,
      numResults: 5,
      text: { maxCharacters: 1000 }
    });

    if (results.results && results.results.length > 0) {
      const companyData = results.results[0];

      const text = companyData.text || '';
      const sustainability = checkSustainabilityFocus(text);
      const indigenous = checkIndigenousLed(text);

      // Store custom flags in exa_raw_data JSONB field
      return {
        company_name: contact.current_company,
        website: companyData.url,
        description: text.substring(0, 1000),
        industry: extractIndustry(text),
        company_size: extractCompanySize(text),
        confidence_score: companyData.score || 0.5,
        exa_raw_data: {
          sustainability_focus: sustainability,
          indigenous_owned: indigenous,
          full_url: companyData.url,
          search_score: companyData.score
        }
      };
    }

    return null;

  } catch (error) {
    console.error(`  ⚠️  Company search failed: ${error.message}`);
    return null;
  }
}

/**
 * Search for media mentions using Exa
 */
async function findMediaMentions(contact) {
  const name = contact.person_name || contact.full_name || 'Unknown';
  const query = `${name} ${contact.current_company || ''} news article interview`;

  try {
    const results = await exa.searchAndContents(query, {
      type: 'neural',
      useAutoprompt: true,
      numResults: 10,
      excludeDomains: ['linkedin.com', 'facebook.com', 'twitter.com'],
      text: { maxCharacters: 500 }
    });

    if (results.results && results.results.length > 0) {
      return results.results.map(result => ({
        url: result.url,
        title: result.title || '',
        published_date: result.publishedDate || null,
        excerpt: result.text?.substring(0, 500) || '',
        relevance_score: result.score || 0.5,
        source_domain: new URL(result.url).hostname
      }));
    }

    return [];

  } catch (error) {
    console.error(`  ⚠️  Media search failed: ${error.message}`);
    return [];
  }
}

/**
 * Enrich a single contact with all Exa data
 */
async function enrichContact(contact, dryRun = false) {
  const name = contact.person_name || contact.full_name || 'Unknown';
  const email = contact.person_email || contact.email || 'Unknown';

  console.log(`\n📊 Enriching: ${name} (${email})`);
  console.log(`   Company: ${contact.current_company || 'Unknown'}`);
  console.log(`   Campaign: ${contact.campaign_type}`);
  console.log(`   Priority: ${contact.priority}`);

  if (dryRun) {
    console.log('   🧪 DRY RUN - Skipping API calls\n');
    return { success: true, dryRun: true };
  }

  const startTime = Date.now();
  let apiCallCount = 0;
  let linkedinData = null;
  let companyData = null;
  let mentions = [];

  try {
    // 1. LinkedIn profile (1 API call)
    console.log('   🔍 Searching LinkedIn...');
    linkedinData = await findLinkedInProfile(contact);
    apiCallCount++;

    if (linkedinData) {
      const { error: linkedinError } = await supabase
        .from('exa_linkedin_profiles')
        .upsert({
          person_id: contact.person_id,
          ...linkedinData,
          updated_at: new Date().toISOString()
        });

      if (linkedinError) {
        console.error(`   ❌ Failed to save LinkedIn data: ${linkedinError.message}`);
      } else {
        console.log(`   ✅ LinkedIn profile saved (${linkedinData.confidence_score.toFixed(2)} confidence)`);
      }
    } else {
      console.log('   ⚠️  No LinkedIn profile found');
    }

    // 2. Company intelligence (1 API call)
    if (contact.current_company) {
      console.log('   🏢 Searching company data...');
      companyData = await findCompanyIntelligence(contact);
      apiCallCount++;

      if (companyData) {
        // Company intelligence is stored by company_name, not person_id
        // Multiple people can work at the same company
        const { error: companyError } = await supabase
          .from('exa_company_intelligence')
          .upsert({
            ...companyData,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'company_name'  // Update if company already exists
          });

        if (companyError) {
          console.error(`   ❌ Failed to save company data: ${companyError.message}`);
        } else {
          const indigenous = companyData.exa_raw_data?.indigenous_owned;
          const sustainability = companyData.exa_raw_data?.sustainability_focus;
          let flags = '';
          if (indigenous) flags += ' (Indigenous-owned!)';
          if (sustainability) flags += ' (Sustainable!)';
          console.log(`   ✅ Company data saved${flags}`);
        }
      } else {
        console.log('   ⚠️  No company data found');
      }
    }

    // 3. Media mentions (1 API call)
    console.log('   📰 Searching media mentions...');
    mentions = await findMediaMentions(contact);
    apiCallCount++;

    if (mentions.length > 0) {
      // Save each mention
      for (const mention of mentions) {
        const { error: mentionError } = await supabase
          .from('exa_media_mentions')
          .insert({
            person_id: contact.person_id,
            ...mention
          });

        if (mentionError && !mentionError.message.includes('duplicate')) {
          console.error(`   ⚠️  Failed to save mention: ${mentionError.message}`);
        }
      }
      console.log(`   ✅ Saved ${mentions.length} media mentions`);
    } else {
      console.log('   ⚠️  No media mentions found');
    }

    // 4. Update person_identity_map
    const { error: updateError } = await supabase
      .from('person_identity_map')
      .update({
        exa_enriched: true,
        exa_enriched_at: new Date().toISOString()
      })
      .eq('person_id', contact.person_id);

    if (updateError) {
      console.error(`   ⚠️  Failed to mark as enriched: ${updateError.message}`);
    }

    // 5. Update queue status
    const { error: queueError } = await supabase
      .from('exa_enrichment_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        exa_requests_used: apiCallCount
      })
      .eq('id', contact.queue_id);

    if (queueError) {
      console.error(`   ⚠️  Failed to update queue: ${queueError.message}`);
    }

    // 6. Log API usage
    const durationMs = Date.now() - startTime;
    await supabase
      .from('exa_api_usage')
      .insert({
        endpoint: 'searchAndContents',
        request_count: apiCallCount,
        cost_estimate: apiCallCount * 0.001, // $0.001 per request (estimate)
        person_id: contact.person_id,
        campaign_type: contact.campaign_type,
        duration_ms: durationMs
      });

    console.log(`   ⏱️  Completed in ${(durationMs / 1000).toFixed(1)}s (${apiCallCount} API calls)\n`);

    return {
      success: true,
      apiCallCount,
      durationMs,
      hasLinkedIn: !!linkedinData,
      hasCompany: !!companyData,
      mentionCount: mentions.length
    };

  } catch (error) {
    console.error(`   ❌ Enrichment failed: ${error.message}\n`);

    // Mark as failed in queue
    await supabase
      .from('exa_enrichment_queue')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
        retry_count: contact.retry_count ? contact.retry_count + 1 : 1
      })
      .eq('id', contact.queue_id);

    return { success: false, error: error.message };
  }
}

/**
 * Process a batch of contacts from the queue
 */
async function processBatch(options = {}) {
  const {
    limit = 10,
    campaignType = null,
    dryRun = false
  } = options;

  try {
    console.log(`📋 Fetching up to ${limit} contacts from queue...`);
    if (campaignType) {
      console.log(`   Campaign filter: ${campaignType}`);
    }
    console.log('');

    // Get next batch using the database function
    const { data: batch, error: batchError } = await supabase
      .rpc('get_next_exa_batch', {
        p_batch_size: limit,
        p_campaign_type: campaignType
      });

    if (batchError) throw batchError;

    if (!batch || batch.length === 0) {
      console.log('✅ Queue is empty - no contacts to enrich\n');
      return;
    }

    console.log(`Found ${batch.length} contacts to enrich\n`);
    console.log('='.repeat(60));

    // Process each contact
    const results = [];
    for (let i = 0; i < batch.length; i++) {
      const contact = batch[i];
      console.log(`\n[${i + 1}/${batch.length}]`);

      const result = await enrichContact(contact, dryRun);
      results.push(result);

      // Rate limiting: wait 1 second between contacts to avoid overwhelming API
      if (i < batch.length - 1 && !dryRun) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`${dryRun ? '🧪 DRY RUN COMPLETE' : '✅ BATCH PROCESSING COMPLETE'}`);
    console.log('='.repeat(60));

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalApiCalls = results.reduce((sum, r) => sum + (r.apiCallCount || 0), 0);
    const totalDuration = results.reduce((sum, r) => sum + (r.durationMs || 0), 0);

    console.log(`Processed: ${batch.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);

    if (!dryRun) {
      console.log(`Total API calls: ${totalApiCalls}`);
      console.log(`Estimated cost: $${(totalApiCalls * 0.001).toFixed(3)}`);
      console.log(`Total time: ${(totalDuration / 1000).toFixed(1)}s`);
      console.log(`Avg time per contact: ${(totalDuration / batch.length / 1000).toFixed(1)}s`);

      // Check remaining free tier quota
      const { data: usage } = await supabase
        .from('vw_exa_usage_summary')
        .select('*')
        .single();

      if (usage) {
        const remaining = 1000 - (usage.total_requests || 0);
        console.log(`\nFree tier remaining: ${remaining}/1000 requests`);
        if (remaining < 100) {
          console.log('⚠️  WARNING: Less than 100 requests remaining!');
        }
      }
    }

    console.log('');

  } catch (error) {
    console.error('❌ Batch processing failed:', error.message);
    process.exit(1);
  }
}

// Parse command line args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10;

const campaignArg = args.find(arg => arg.startsWith('--campaign='));
let campaignType = null;
if (campaignArg) {
  const campaign = campaignArg.split('=')[1];
  campaignType = campaign === 'goods' ? 'goods-on-country' :
                 campaign === 'justice' ? 'justice-hub' :
                 campaign;
}

console.log('Options:');
console.log(`  Limit: ${limit} contacts`);
console.log(`  Campaign: ${campaignType || 'All'}`);
console.log(`  Dry Run: ${dryRun ? 'Yes (no API calls)' : 'No (will use API credits)'}\n`);

processBatch({ limit, campaignType, dryRun });

// Helper functions for parsing text content

function extractHeadline(text) {
  // LinkedIn headlines are usually in the first few lines
  const lines = text.split('\n').filter(l => l.trim());
  return lines[1] || lines[0] || '';
}

function extractSummary(text) {
  // Look for "About" or "Summary" section
  const aboutMatch = text.match(/About[:\s]+([\s\S]{100,500})/i);
  return aboutMatch ? aboutMatch[1].trim() : text.substring(0, 500);
}

function extractExperience(text) {
  // Parse experience as JSON array (simplified)
  const expMatch = text.match(/Experience[:\s]+([\s\S]{100,1000})/i);
  if (!expMatch) return [];

  // This is a simple parser - would need AI for accurate parsing
  const expText = expMatch[1];
  const jobs = expText.split(/\n\n/).slice(0, 5);

  return jobs.map(job => ({
    title: job.split('\n')[0] || 'Unknown',
    company: job.split('\n')[1] || 'Unknown',
    description: job
  }));
}

function extractEducation(text) {
  const eduMatch = text.match(/Education[:\s]+([\s\S]{50,500})/i);
  if (!eduMatch) return [];

  const eduText = eduMatch[1];
  const schools = eduText.split(/\n\n/).slice(0, 3);

  return schools.map(school => ({
    school: school.split('\n')[0] || 'Unknown',
    degree: school.split('\n')[1] || '',
    description: school
  }));
}

function extractSkills(text) {
  const skillsMatch = text.match(/Skills?[:\s]+([\s\S]{20,300})/i);
  if (!skillsMatch) return [];

  return skillsMatch[1]
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 2 && s.length < 50)
    .slice(0, 20);
}

function extractIndustry(text) {
  const industryKeywords = [
    'retail', 'manufacturing', 'technology', 'healthcare',
    'education', 'finance', 'government', 'nonprofit',
    'consulting', 'legal', 'media', 'hospitality'
  ];

  const lowerText = text.toLowerCase();
  for (const keyword of industryKeywords) {
    if (lowerText.includes(keyword)) {
      return keyword.charAt(0).toUpperCase() + keyword.slice(1);
    }
  }

  return 'Unknown';
}

function extractCompanySize(text) {
  const sizePatterns = [
    { pattern: /(\d+[\-\+]\d*)\s*employees/i, type: 'range' },
    { pattern: /small business/i, type: 'small' },
    { pattern: /startup/i, type: 'startup' },
    { pattern: /enterprise/i, type: 'large' }
  ];

  for (const { pattern, type } of sizePatterns) {
    if (pattern.test(text)) {
      return type === 'range' ? text.match(pattern)[1] : type;
    }
  }

  return null;
}

function checkSustainabilityFocus(text) {
  const sustainabilityKeywords = [
    'sustainable', 'sustainability', 'circular economy', 'regenerative',
    'eco-friendly', 'carbon neutral', 'renewable', 'conservation'
  ];

  const lowerText = text.toLowerCase();
  return sustainabilityKeywords.some(keyword => lowerText.includes(keyword));
}

function checkIndigenousLed(text) {
  const indigenousKeywords = [
    'indigenous', 'aboriginal', 'first nations', 'torres strait',
    'native', 'indigenous-owned', 'indigenous-led'
  ];

  const lowerText = text.toLowerCase();
  return indigenousKeywords.some(keyword => lowerText.includes(keyword));
}
