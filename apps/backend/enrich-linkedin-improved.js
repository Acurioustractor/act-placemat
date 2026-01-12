import { createClient } from '@supabase/supabase-js';
import Exa from 'exa-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const exa = new Exa(process.env.EXA_API_KEY);

/**
 * Enhanced LinkedIn contact enrichment with better URL extraction
 * and validation
 */
async function enrichLinkedInContactsImproved(limit = 20) {
  console.log(`🚀 Enhanced enrichment for ${limit} LinkedIn contacts...\n`);

  // Get LinkedIn contacts with email and company info that haven't been enriched yet
  const { data: contacts } = await supabase
    .from('linkedin_contacts')
    .select('id, full_name, email_address, current_company, current_position, location, industry')
    .not('email_address', 'is', null)
    .not('current_company', 'is', null)
    .is('exa_enriched', null)
    .limit(limit);

  if (!contacts || contacts.length === 0) {
    console.log('❌ No unenriched LinkedIn contacts found');
    return;
  }

  console.log(`Found ${contacts.length} contacts to enrich\n`);

  let enriched = 0;
  let failed = 0;
  let linkedinFound = 0;

  for (const contact of contacts) {
    try {
      console.log(`\n📧 Enriching: ${contact.full_name} (${contact.current_company})`);

      // Strategy 1: Direct LinkedIn profile search
      const linkedinQuery = `site:linkedin.com/in/ "${contact.full_name}" ${contact.current_company}`;

      const linkedinResults = await exa.searchAndContents(linkedinQuery, {
        type: 'keyword',
        numResults: 5,
        text: true,
        livecrawl: 'always' // Get fresh content
      });

      // Filter out login/signup pages
      const validLinkedInUrls = linkedinResults.results
        ?.filter(r =>
          r.url.includes('linkedin.com/in/') &&
          !r.url.includes('login') &&
          !r.url.includes('signup') &&
          !r.url.includes('authwall')
        )
        .map(r => r.url) || [];

      const linkedinUrl = validLinkedInUrls[0] || null;

      // Strategy 2: General web search for bio/background
      const bioQuery = `${contact.full_name} ${contact.current_company} ${contact.current_position || ''} biography background`;

      const bioResults = await exa.searchAndContents(bioQuery, {
        type: 'neural',
        useAutoprompt: true,
        numResults: 3,
        text: { maxCharacters: 1000 }
      });

      // Extract best bio content (avoid login pages)
      const validBioResults = bioResults.results?.filter(r =>
        r.text &&
        r.text.length > 50 &&
        !r.text.toLowerCase().includes('sign in') &&
        !r.text.toLowerCase().includes('log in') &&
        !r.text.toLowerCase().includes('create account')
      ) || [];

      const bio = validBioResults[0]?.text?.substring(0, 500) || null;

      // Calculate confidence score
      let confidence = 0.3; // Base score
      if (linkedinUrl) confidence += 0.3;
      if (bio && bio.length > 200) confidence += 0.2;
      if (validLinkedInUrls.length > 1) confidence += 0.1; // Multiple sources confirm
      if (bioResults.results && bioResults.results.length >= 3) confidence += 0.1;

      const enrichmentData = {
        linkedin_url: linkedinUrl,
        bio: bio,
        exa_enriched: true,
        exa_last_enriched: new Date().toISOString(),
        exa_confidence_score: Math.min(confidence, 1.0)
      };

      // Update contact
      await supabase
        .from('linkedin_contacts')
        .update(enrichmentData)
        .eq('id', contact.id);

      console.log(`  ✅ Enriched | Confidence: ${(confidence * 100).toFixed(0)}%`);
      if (linkedinUrl) {
        console.log(`  🔗 LinkedIn: ${linkedinUrl}`);
        linkedinFound++;
      } else {
        console.log(`  ⚠️  No LinkedIn URL found`);
      }
      if (bio) {
        console.log(`  📝 Bio: ${bio.substring(0, 80)}...`);
      }

      enriched++;

      // Rate limiting - be extra careful
      await new Promise(resolve => setTimeout(resolve, 1500));

    } catch (error) {
      console.error(`  ❌ Error enriching ${contact.full_name}:`, error.message);

      // Still mark as attempted to avoid retry loops
      await supabase
        .from('linkedin_contacts')
        .update({
          exa_enriched: true,
          exa_last_enriched: new Date().toISOString(),
          exa_confidence_score: 0.1
        })
        .eq('id', contact.id);

      failed++;
    }
  }

  console.log(`\n\n📊 Summary:`);
  console.log(`  ✅ Successfully enriched: ${enriched}`);
  console.log(`  🔗 LinkedIn URLs found: ${linkedinFound} (${((linkedinFound / enriched) * 100).toFixed(0)}%)`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Success rate: ${Math.round((enriched / contacts.length) * 100)}%`);
  console.log(`  📊 LinkedIn discovery rate: ${((linkedinFound / contacts.length) * 100).toFixed(0)}%`);
}

// Get limit from command line args
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 20;

enrichLinkedInContactsImproved(limit).catch(console.error);
