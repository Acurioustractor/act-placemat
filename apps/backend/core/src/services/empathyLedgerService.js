/**
 * Empathy Ledger Service
 * Bridges existing Empathy Ledger data with new ACT Public Dashboard
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from '../utils/loadEnv.js';

loadEnv();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get homepage content combining existing Empathy Ledger data 
 * with new public dashboard tables
 */
export async function getHomepageContent() {
  try {
    // Get featured stories from existing Empathy Ledger
    const { data: featuredStories } = await supabase
      .from('public_stories')
      .select('*')
      .eq('featured', true)
      .order('published_at', { ascending: false })
      .limit(3);

    // Get metrics (combines real data from Empathy Ledger)
    const { data: keyMetrics } = await supabase
      .from('metrics')
      .select('*')
      .eq('featured', true)
      .order('display_order');

    // Get active projects
    const { data: activeProjects } = await supabase
      .from('projects')
      .select('*')
      .in('status', ['sprouting', 'growing'])
      .eq('public_visible', true)
      .order('updated_at', { ascending: false })
      .limit(4);

    // Get featured partners (from existing organizations)
    const { data: featuredPartners } = await supabase
      .from('partners')
      .select('*')
      .eq('featured', true)
      .eq('public_visible', true)
      .order('relationship_strength')
      .limit(6);

    return {
      featured_stories: featuredStories || [],
      key_metrics: keyMetrics || [],
      active_projects: activeProjects || [],
      featured_partners: featuredPartners || []
    };
  } catch (error) {
    console.error('Error fetching homepage content:', error);
    throw new Error('Failed to load homepage content');
  }
}

/**
 * Get stories from existing Empathy Ledger with public dashboard formatting
 */
export async function getStories(options = {}) {
  try {
    let query = supabase
      .from('public_stories')
      .select('*', { count: 'exact' })
      .order('published_at', { ascending: false });

    if (options.featured) {
      query = query.eq('featured', true);
    }

    if (options.tags && options.tags.length > 0) {
      query = query.overlaps('tags', options.tags);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      stories: data || [],
      total: count || 0
    };
  } catch (error) {
    console.error('Error fetching stories:', error);
    throw new Error('Failed to load stories');
  }
}

/**
 * Get existing themes from Empathy Ledger
 */
export async function getThemes() {
  try {
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching themes:', error);
    throw new Error('Failed to load themes');
  }
}

/**
 * Get AI insights from existing quotes
 */
export async function getAIInsights(options = {}) {
  try {
    let query = supabase
      .from('quotes')
      .select('*')
      .gte('ai_confidence_score', 0.7)
      .order('ai_confidence_score', { ascending: false });

    if (options.theme) {
      query = query.eq('theme', options.theme);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    throw new Error('Failed to load AI insights');
  }
}

/**
 * Get statistics about existing Empathy Ledger data
 */
export async function getEmpathyLedgerStats() {
  try {
    const stats = await Promise.all([
      // Total stories (non-private)
      supabase
        .from('stories')
        .select('*', { count: 'exact', head: true })
        .neq('privacy_level', 'private'),
      
      // AI quotes with high confidence
      supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .gte('ai_confidence_score', 0.7),
      
      // Active themes
      supabase
        .from('themes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      
      // All organizations
      supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true }),
      
      // Storytellers with consent
      supabase
        .from('storytellers')
        .select('*', { count: 'exact', head: true })
        .eq('consent_given', true)
    ]);

    return {
      total_stories: stats[0].count || 0,
      ai_insights: stats[1].count || 0,
      active_themes: stats[2].count || 0,
      partner_organizations: stats[3].count || 0,
      storytellers_with_consent: stats[4].count || 0
    };
  } catch (error) {
    console.error('Error fetching Empathy Ledger stats:', error);
    throw new Error('Failed to load statistics');
  }
}

/**
 * Search across existing Empathy Ledger content
 */
export async function searchEmpathyLedger(query, options = {}) {
  try {
    const searchResults = {};

    // Search stories
    if (!options.contentTypes || options.contentTypes.includes('stories')) {
      const { data: stories } = await supabase
        .from('public_stories')
        .select('*')
        .or(`title.ilike.%${query}%,body_md.ilike.%${query}%`)
        .limit(10);
      
      searchResults.stories = stories || [];
    }

    // Search quotes/insights
    if (!options.contentTypes || options.contentTypes.includes('insights')) {
      const { data: insights } = await supabase
        .from('quotes')
        .select('*')
        .ilike('content', `%${query}%`)
        .gte('ai_confidence_score', 0.7)
        .limit(10);
      
      searchResults.insights = insights || [];
    }

    // Search themes
    if (!options.contentTypes || options.contentTypes.includes('themes')) {
      const { data: themes } = await supabase
        .from('themes')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('active', true)
        .limit(10);
      
      searchResults.themes = themes || [];
    }

    return searchResults;
  } catch (error) {
    console.error('Error searching Empathy Ledger:', error);
    throw new Error('Search failed');
  }
}

/**
 * Update metrics based on current Empathy Ledger data
 * Call this to refresh public dashboard metrics
 */
export async function refreshMetricsFromEmpathyLedger() {
  try {
    const stats = await getEmpathyLedgerStats();
    
    // Update metrics table with fresh data
    const updates = [
      {
        label: 'Community Stories Published',
        value: stats.total_stories,
        method_note: `Updated from Empathy Ledger: ${new Date().toISOString()}`
      },
      {
        label: 'AI-Extracted Community Insights', 
        value: stats.ai_insights,
        method_note: `High-confidence AI insights: ${new Date().toISOString()}`
      },
      {
        label: 'Structured Impact Themes',
        value: stats.active_themes,
        method_note: `Active themes in database: ${new Date().toISOString()}`
      },
      {
        label: 'Partner Organizations in Network',
        value: stats.partner_organizations,
        method_note: `Active partner organizations: ${new Date().toISOString()}`
      }
    ];

    for (const update of updates) {
      await supabase
        .from('metrics')
        .update({ 
          value: update.value, 
          method_note: update.method_note 
        })
        .eq('label', update.label);
    }

    console.log('✅ Metrics refreshed from Empathy Ledger data');
    return stats;
  } catch (error) {
    console.error('Error refreshing metrics:', error);
    throw new Error('Failed to refresh metrics');
  }
}

/**
 * Store processed community emails coming from Gmail intelligence
 */
export async function storeCommunityEmail(emailRecord) {
  try {
    const payload = {
      ...emailRecord,
      received_date: emailRecord.received_date instanceof Date
        ? emailRecord.received_date.toISOString()
        : emailRecord.received_date,
      processed_at: emailRecord.processed_at instanceof Date
        ? emailRecord.processed_at.toISOString()
        : emailRecord.processed_at,
      detected_contexts: emailRecord.detected_contexts || [],
      mentioned_projects: emailRecord.mentioned_projects || []
    };

    const { data, error } = await supabase
      .from('community_emails')
      .upsert(payload, { onConflict: 'message_id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error storing community email:', error);
    throw new Error('Failed to store community email');
  }
}

/**
 * Create a new person/contact in the REAL Notion People database
 * Used by Gmail intelligence for contact extraction
 */
export async function createPerson(contactData) {
  try {
    console.log(`📝 Creating person in NOTION database: ${contactData.email}`);
    
    // Use the Notion API directly to create a person in your People database
    const notionResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: {
          database_id: process.env.NOTION_PEOPLE_DB
        },
        properties: {
          'Name': {
            title: [
              {
                text: {
                  content: contactData.name || contactData.email.split('@')[0]
                }
              }
            ]
          },
          'Email': {
            email: contactData.email
          },
          'Organization': contactData.organization ? {
            rich_text: [
              {
                text: {
                  content: contactData.organization
                }
              }
            ]
          } : { rich_text: [] },
          'Relationship Type': contactData.relationshipType ? {
            select: {
              name: contactData.relationshipType
            }
          } : null,
          'Relationship Strength': contactData.relationshipStrength ? {
            select: {
              name: contactData.relationshipStrength
            }
          } : null,
          'Source': {
            rich_text: [
              {
                text: {
                  content: contactData.source || 'Gmail Intelligence'
                }
              }
            ]
          },
          'Contact Frequency': {
            number: contactData.frequency || 1
          },
          'Last Contact': contactData.lastContact ? {
            date: {
              start: contactData.lastContact.split('T')[0]
            }
          } : null,
          'Notes': contactData.notes ? {
            rich_text: [
              {
                text: {
                  content: contactData.notes
                }
              }
            ]
          } : { rich_text: [] }
        }
      })
    });

    if (!notionResponse.ok) {
      const errorData = await notionResponse.json();
      console.error('❌ Notion API error:', errorData);
      
      // Check if it's a database/property structure issue
      if (errorData.code === 'validation_error') {
        console.log('⚠️ Trying simplified Notion contact creation...');
        
        // Try with minimal required fields
        const simpleResponse = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          },
          body: JSON.stringify({
            parent: {
              database_id: process.env.NOTION_PEOPLE_DB
            },
            properties: {
              'Name': {
                title: [
                  {
                    text: {
                      content: contactData.name || contactData.email.split('@')[0]
                    }
                  }
                ]
              },
              'Email': {
                email: contactData.email
              }
            }
          })
        });

        if (simpleResponse.ok) {
          const simpleData = await simpleResponse.json();
          console.log(`✅ Simplified Notion contact created: ${simpleData.id}`);
          return simpleData;
        }
      }
      
      throw new Error(`Notion API error: ${errorData.message || 'Unknown error'}`);
    }

    const notionData = await notionResponse.json();
    console.log(`✅ Notion contact created with ID: ${notionData.id}`);
    return notionData;
    
  } catch (error) {
    console.error(`❌ Failed to create Notion contact for ${contactData.email}:`, error);
    
    // If Notion fails, try Supabase as backup
    try {
      console.log('🔄 Trying Supabase backup...');
      const { data, error: supabaseError } = await supabase
        .from('gmail_contacts') // Use a dedicated table for Gmail contacts
        .insert([{
          name: contactData.name,
          email: contactData.email,
          organization: contactData.organization,
          source: contactData.source || 'Gmail Intelligence',
          relationship_type: contactData.relationshipType || 'Contact',
          relationship_strength: contactData.relationshipStrength || 'Medium',
          contact_frequency: contactData.frequency || 1,
          last_contact: contactData.lastContact || new Date().toISOString(),
          notes: contactData.notes || '',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (supabaseError) throw supabaseError;
      
      console.log(`✅ Contact saved to Supabase backup: ${data.id}`);
      return { ...data, method: 'supabase_backup' };
      
    } catch (backupError) {
      console.error('❌ Backup storage also failed:', backupError);
      
      // Last resort: return meaningful error
      throw new Error(`Failed to create contact: Notion failed (${error.message}), Supabase backup failed (${backupError.message})`);
    }
  }
}

/**
 * Get all storytellers from Empathy Ledger
 */
export async function getAllStorytellers() {
  try {
    const { data, error } = await supabase
      .from('storytellers')
      .select('*')
      .eq('consent_given', true)
      .order('full_name');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.warn('Failed to fetch storytellers:', error.message);
    return [];
  }
}

/**
 * Get all stories from Empathy Ledger
 */
export async function getAllStories() {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select(`
        *,
        storyteller:storyteller_id(
          full_name,
          location_id,
          bio,
          consent_given
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.warn('Failed to fetch stories:', error.message);
    return [];
  }
}

export default {
  getHomepageContent,
  getStories,
  getThemes,
  getAIInsights,
  getEmpathyLedgerStats,
  searchEmpathyLedger,
  refreshMetricsFromEmpathyLedger,
  createPerson,
  getAllStorytellers,
  getAllStories
};
