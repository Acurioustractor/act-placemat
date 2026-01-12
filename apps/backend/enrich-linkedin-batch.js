import { createClient } from '@supabase/supabase-js';
import Exa from 'exa-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const exa = new Exa(process.env.EXA_API_KEY);

async function enrichLinkedInContacts(limit = 20) {
  console.log(`🚀 Enriching ${limit} LinkedIn contacts with high potential...\n`);

  // Get LinkedIn contacts with email and company info
  const { data: contacts } = await supabase
    .from('linkedin_contacts')
    .select('id, full_name, email_address, current_company, current_position, location')
    .not('email_address', 'is', null)
    .not('current_company', 'is', null)
    .limit(limit);

  if (!contacts || contacts.length === 0) {
    console.log('❌ No LinkedIn contacts found with email and company');
    return;
  }

  console.log(`Found ${contacts.length} contacts to enrich\n`);

  let enriched = 0;
  let failed = 0;

  for (const contact of contacts) {
    try {
      console.log(`\n📧 Enriching: ${contact.full_name} (${contact.current_company})`);

      // Search for person and company info
      const query = `${contact.full_name} ${contact.current_company} ${contact.current_position || ''}`;

      const searchResults = await exa.searchAndContents(query, {
        type: 'neural',
        useAutoprompt: true,
        numResults: 3,
        text: true
      });

      if (searchResults.results && searchResults.results.length > 0) {
        // Extract LinkedIn URL if found
        const linkedinResult = searchResults.results.find(r =>
          r.url.includes('linkedin.com/in/') || r.url.includes('linkedin.com/company/')
        );

        const enrichmentData = {
          linkedin_url: linkedinResult?.url || null,
          bio: searchResults.results[0]?.text?.substring(0, 500) || null,
          exa_enriched: true,
          exa_last_enriched: new Date().toISOString(),
          exa_confidence_score: linkedinResult ? 0.8 : 0.4
        };

        // Update contact
        await supabase
          .from('linkedin_contacts')
          .update(enrichmentData)
          .eq('id', contact.id);

        console.log(`  ✅ Enriched with ${searchResults.results.length} results`);
        if (linkedinResult) {
          console.log(`  🔗 LinkedIn: ${linkedinResult.url}`);
        }

        enriched++;
      } else {
        console.log(`  ⚠️  No results found`);
        failed++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`  ❌ Error enriching ${contact.full_name}:`, error.message);
      failed++;
    }
  }

  console.log(`\n\n📊 Summary:`);
  console.log(`  ✅ Successfully enriched: ${enriched}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Success rate: ${Math.round((enriched / contacts.length) * 100)}%`);
}

// Get limit from command line args
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 20;

enrichLinkedInContacts(limit).catch(console.error);
