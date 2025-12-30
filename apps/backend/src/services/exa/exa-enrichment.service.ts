/**
 * Exa.ai People Enrichment Service
 *
 * Purpose: Automated people intelligence enrichment using Exa.ai neural search
 * Focus: Goods on Country & JusticeHub campaigns
 * Free tier: 1,000 requests/month
 *
 * Features:
 * - LinkedIn profile enrichment
 * - Company intelligence gathering
 * - Media mentions discovery
 * - Network discovery (find similar people)
 * - Campaign-specific prioritization
 * - Manual sync triggers
 * - Free tier usage tracking
 */

import Exa from 'exa-js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types

export interface ExaEnrichmentRequest {
  person_id: string;
  full_name: string;
  email?: string;
  linkedin_url?: string;
  current_company?: string;
  current_position?: string;
  campaign_type?: 'goods-on-country' | 'justice-hub' | 'general';
}

export interface ExaLinkedInProfile {
  linkedin_url?: string;
  headline?: string;
  summary?: string;
  current_position?: string;
  current_company?: string;
  location?: string;
  experience: Array<{
    company: string;
    title: string;
    duration?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
  }>;
  education: Array<{
    school: string;
    degree?: string;
    field?: string;
    start_year?: number;
    end_year?: number;
  }>;
  skills: string[];
  confidence_score: number;
  source_url?: string;
  exa_raw_data?: any;
}

export interface ExaCompanyIntel {
  company_name: string;
  industry?: string;
  company_size?: string;
  headquarters_location?: string;
  founded_year?: number;
  description?: string;
  website?: string;
  leadership: Array<{
    name: string;
    title: string;
    linkedin_url?: string;
  }>;
  recent_news: Array<{
    title: string;
    url: string;
    published_date?: string;
    excerpt?: string;
  }>;
  funding_info?: {
    total_funding?: string;
    last_round?: string;
    investors?: string[];
  };
  twitter_handle?: string;
  linkedin_company_url?: string;
  confidence_score: number;
  exa_raw_data?: any;
}

export interface ExaMediaMention {
  title: string;
  url: string;
  published_date?: string;
  source_domain?: string;
  excerpt?: string;
  full_text?: string;
  mention_type?: 'article' | 'interview' | 'quote' | 'mention' | 'byline';
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
  relevance_score: number;
  topics?: string[];
}

export interface ExaEnrichmentResult {
  person_id: string;
  linkedin_profile?: ExaLinkedInProfile;
  company_intel?: ExaCompanyIntel;
  media_mentions: ExaMediaMention[];
  network_suggestions?: string[]; // LinkedIn URLs of similar people
  overall_confidence: number;
  exa_requests_used: number;
}

// Service

export class ExaEnrichmentService {
  private exa: Exa;
  private supabase: SupabaseClient;
  private freeTestLimit = 1000; // Free tier monthly limit

  constructor(exaApiKey: string, supabaseUrl: string, supabaseServiceKey: string) {
    this.exa = new Exa(exaApiKey);
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Main enrichment method - processes one person
   */
  async enrichPerson(request: ExaEnrichmentRequest): Promise<ExaEnrichmentResult> {
    console.log(`[Exa] Enriching: ${request.full_name} (${request.person_id})`);

    let requestsUsed = 0;
    const result: ExaEnrichmentResult = {
      person_id: request.person_id,
      media_mentions: [],
      overall_confidence: 0,
      exa_requests_used: 0,
    };

    // Check free tier limit
    const canProceed = await this.checkFreeTierLimit(3); // Estimate 3 requests
    if (!canProceed) {
      throw new Error('Exa free tier limit reached for this month');
    }

    try {
      // 1. Enrich LinkedIn profile
      const linkedinProfile = await this.enrichLinkedInProfile(request);
      if (linkedinProfile) {
        result.linkedin_profile = linkedinProfile;
        requestsUsed++;
        await this.trackAPIUsage(1, 'linkedin');
      }

      // 2. Enrich company intelligence (if has company)
      if (request.current_company) {
        const companyIntel = await this.enrichCompanyIntelligence(request.current_company);
        if (companyIntel) {
          result.company_intel = companyIntel;
          requestsUsed++;
          await this.trackAPIUsage(1, 'company');
        }
      }

      // 3. Find media mentions
      const mediaMentions = await this.findMediaMentions(request);
      if (mediaMentions.length > 0) {
        result.media_mentions = mediaMentions;
        requestsUsed++;
        await this.trackAPIUsage(1, 'media');
      }

      // 4. Calculate overall confidence
      result.overall_confidence = this.calculateOverallConfidence(result);
      result.exa_requests_used = requestsUsed;

      // 5. Save to database
      await this.saveEnrichmentResults(request.person_id, result);

      console.log(`[Exa] Enrichment complete: ${request.full_name} (confidence: ${result.overall_confidence.toFixed(2)}, requests: ${requestsUsed})`);

      return result;
    } catch (error) {
      console.error(`[Exa] Enrichment failed for ${request.full_name}:`, error);
      throw error;
    }
  }

  /**
   * Enrich LinkedIn profile using Exa search
   */
  private async enrichLinkedInProfile(request: ExaEnrichmentRequest): Promise<ExaLinkedInProfile | null> {
    try {
      // Build search query
      const query = request.linkedin_url
        ? request.linkedin_url
        : `${request.full_name} ${request.current_company || ''} LinkedIn profile`.trim();

      console.log(`[Exa] Searching LinkedIn: "${query}"`);

      const searchResults = await this.exa.searchAndContents(query, {
        type: 'neural',
        useAutoprompt: true,
        numResults: 5,
        contents: {
          text: true,
          highlights: true,
        },
        category: 'linkedin profile',
      });

      // Find best LinkedIn result
      const linkedinResult = searchResults.results.find((r: any) =>
        r.url.includes('linkedin.com/in/')
      );

      if (!linkedinResult) {
        console.log(`[Exa] No LinkedIn profile found for ${request.full_name}`);
        return null;
      }

      console.log(`[Exa] Found LinkedIn profile: ${linkedinResult.url}`);

      // Parse LinkedIn content (basic extraction from text)
      const profile = this.parseLinkedInContent(linkedinResult);

      return {
        linkedin_url: linkedinResult.url,
        headline: profile.headline || request.current_position,
        summary: profile.summary,
        current_position: profile.current_position || request.current_position,
        current_company: profile.current_company || request.current_company,
        location: profile.location,
        experience: profile.experience || [],
        education: profile.education || [],
        skills: profile.skills || [],
        confidence_score: linkedinResult.score || 0.7,
        source_url: linkedinResult.url,
        exa_raw_data: {
          text: linkedinResult.text?.substring(0, 2000), // Store first 2000 chars
          highlights: linkedinResult.highlights,
          published_date: linkedinResult.publishedDate,
        },
      };
    } catch (error) {
      console.error(`[Exa] LinkedIn enrichment failed:`, error);
      return null;
    }
  }

  /**
   * Enrich company intelligence
   */
  private async enrichCompanyIntelligence(companyName: string): Promise<ExaCompanyIntel | null> {
    try {
      // Check if company already enriched
      const { data: existing } = await this.supabase
        .from('exa_company_intelligence')
        .select('*')
        .eq('company_name', companyName)
        .single();

      if (existing && this.isRecentEnrichment(existing.enriched_at, 30)) {
        console.log(`[Exa] Using cached company intel for: ${companyName}`);
        return existing;
      }

      console.log(`[Exa] Searching company intel: "${companyName}"`);

      const searchResults = await this.exa.searchAndContents(
        `${companyName} company information leadership news about`,
        {
          type: 'neural',
          useAutoprompt: true,
          numResults: 10,
          contents: {
            text: true,
          },
        }
      );

      if (searchResults.results.length === 0) {
        return null;
      }

      // Parse company data from results
      const companyData = this.parseCompanyData(searchResults.results, companyName);

      return {
        company_name: companyName,
        ...companyData,
        confidence_score: searchResults.results[0]?.score || 0.6,
        exa_raw_data: {
          results_count: searchResults.results.length,
          top_urls: searchResults.results.slice(0, 3).map((r: any) => r.url),
        },
      };
    } catch (error) {
      console.error(`[Exa] Company enrichment failed:`, error);
      return null;
    }
  }

  /**
   * Find media mentions
   */
  private async findMediaMentions(request: ExaEnrichmentRequest): Promise<ExaMediaMention[]> {
    try {
      const query = request.current_company
        ? `"${request.full_name}" ${request.current_company} news articles interview`
        : `"${request.full_name}" news articles interview`;

      console.log(`[Exa] Searching media mentions: "${query}"`);

      const searchResults = await this.exa.searchAndContents(query, {
        type: 'neural',
        useAutoprompt: true,
        numResults: 10,
        contents: {
          text: true,
          highlights: true,
        },
        startPublishedDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // Last year
      });

      if (searchResults.results.length === 0) {
        console.log(`[Exa] No media mentions found for ${request.full_name}`);
        return [];
      }

      console.log(`[Exa] Found ${searchResults.results.length} media mentions`);

      return searchResults.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        published_date: r.publishedDate,
        source_domain: new URL(r.url).hostname,
        excerpt: r.highlights?.[0] || r.text?.substring(0, 300),
        full_text: r.text?.substring(0, 5000), // Store first 5000 chars
        mention_type: this.classifyMentionType(r.title, r.text),
        sentiment: 'neutral', // TODO: Add sentiment analysis
        relevance_score: r.score || 0.5,
        topics: this.extractTopics(r.text),
      }));
    } catch (error) {
      console.error(`[Exa] Media mention search failed:`, error);
      return [];
    }
  }

  /**
   * Find similar people (network discovery) - uses more requests!
   */
  async findSimilarPeople(request: ExaEnrichmentRequest, limit = 10): Promise<string[]> {
    const query = [
      `People similar to ${request.full_name}`,
      request.current_company ? `who work at ${request.current_company} or related organizations` : '',
      request.current_position ? `in ${request.current_position} roles` : '',
    ]
      .filter(Boolean)
      .join(' ');

    console.log(`[Exa] Finding similar people: "${query}"`);

    const searchResults = await this.exa.searchAndContents(query, {
      type: 'neural',
      useAutoprompt: true,
      numResults: limit,
      category: 'linkedin profile',
    });

    await this.trackAPIUsage(1, 'network');

    return searchResults.results
      .filter((r: any) => r.url.includes('linkedin.com/in/'))
      .map((r: any) => r.url);
  }

  /**
   * Parse LinkedIn content from Exa text result
   */
  private parseLinkedInContent(result: any): Partial<ExaLinkedInProfile> {
    const text = result.text || '';

    // Simple text parsing - in production, use Claude AI for better extraction
    return {
      headline: this.extractHeadline(text),
      summary: this.extractSummary(text),
      current_position: this.extractCurrentPosition(text),
      current_company: this.extractCurrentCompany(text),
      location: this.extractLocation(text),
      experience: this.extractExperience(text),
      education: this.extractEducation(text),
      skills: this.extractSkills(text),
    };
  }

  /**
   * Parse company data from search results
   */
  private parseCompanyData(results: any[], companyName: string): Partial<ExaCompanyIntel> {
    // Combine text from all results
    const allText = results.map((r) => r.text || '').join('\n');

    return {
      industry: this.extractIndustry(allText),
      company_size: this.extractCompanySize(allText),
      headquarters_location: this.extractLocation(allText),
      description: this.extractCompanyDescription(allText, companyName),
      website: this.findCompanyWebsite(results),
      leadership: this.extractLeadership(allText),
      recent_news: results.slice(0, 5).map((r) => ({
        title: r.title,
        url: r.url,
        published_date: r.publishedDate,
        excerpt: r.highlights?.[0] || r.text?.substring(0, 200),
      })),
    };
  }

  // Extraction helpers (simple regex-based - upgrade to AI in production)

  private extractHeadline(text: string): string {
    // Look for common headline patterns
    const match = text.match(/^(.{20,100}?)(?:\n|$)/);
    return match?.[1]?.trim() || '';
  }

  private extractSummary(text: string): string {
    // Extract first 500 chars as summary
    return text.substring(0, 500).trim();
  }

  private extractCurrentPosition(text: string): string {
    const patterns = [
      /(?:Current position|Currently|Role):\s*(.+)/i,
      /^([A-Z][a-z]+(?: [A-Z][a-z]+)*)\s+at\s+/,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractCurrentCompany(text: string): string {
    const match = text.match(/at\s+([A-Z][a-zA-Z\s&,]+?)(?:\n|\.|\s{2,})/);
    return match?.[1]?.trim() || '';
  }

  private extractLocation(text: string): string {
    const match = text.match(/(?:Location|Based in|Living in):\s*(.+?)(?:\n|$)/i);
    return match?.[1]?.trim() || '';
  }

  private extractExperience(text: string): ExaLinkedInProfile['experience'] {
    // Simplified - in production, use structured extraction
    return [];
  }

  private extractEducation(text: string): ExaLinkedInProfile['education'] {
    // Simplified - in production, use structured extraction
    return [];
  }

  private extractSkills(text: string): string[] {
    const match = text.match(/(?:Skills|Technologies|Expertise):\s*(.+?)(?:\n{2,}|$)/is);
    if (!match) return [];
    return match[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean).slice(0, 20);
  }

  private extractIndustry(text: string): string {
    const match = text.match(/(?:Industry|Sector):\s*(.+?)(?:\n|$)/i);
    return match?.[1]?.trim() || '';
  }

  private extractCompanySize(text: string): string {
    const patterns = [
      /(\d+(?:,\d+)?(?:-\d+(?:,\d+)?)?\s+employees)/i,
      /(small|medium|large|enterprise)(?:\s+company|\s+organization)?/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractCompanyDescription(text: string, companyName: string): string {
    // Find paragraph mentioning company name
    const paragraphs = text.split('\n\n');
    const relevantPara = paragraphs.find((p) => p.includes(companyName));
    return relevantPara?.substring(0, 500) || text.substring(0, 500);
  }

  private findCompanyWebsite(results: any[]): string {
    // Look for official website URL
    const websiteResult = results.find(
      (r) => !r.url.includes('linkedin') && !r.url.includes('facebook') && !r.url.includes('twitter')
    );
    return websiteResult?.url || '';
  }

  private extractLeadership(text: string): ExaCompanyIntel['leadership'] {
    // Simplified - in production, use NER or Claude
    return [];
  }

  private classifyMentionType(title: string, text: string): ExaMediaMention['mention_type'] {
    const lower = (title + ' ' + text).toLowerCase();
    if (lower.includes('interview with') || lower.includes('in conversation')) return 'interview';
    if (lower.includes('by ' + text.split(' ')[0])) return 'byline';
    if (lower.includes('"') && lower.includes('said')) return 'quote';
    return 'mention';
  }

  private extractTopics(text: string): string[] {
    // Simple keyword extraction - upgrade to NLP
    const keywords = [
      'youth justice',
      'indigenous',
      'sustainability',
      'circular economy',
      'social enterprise',
      'government',
      'policy',
      'funding',
      'innovation',
    ];
    return keywords.filter((k) => text.toLowerCase().includes(k));
  }

  /**
   * Calculate overall enrichment confidence
   */
  private calculateOverallConfidence(result: ExaEnrichmentResult): number {
    let score = 0;
    let weight = 0;

    if (result.linkedin_profile) {
      score += result.linkedin_profile.confidence_score * 0.5;
      weight += 0.5;
    }

    if (result.company_intel) {
      score += result.company_intel.confidence_score * 0.3;
      weight += 0.3;
    }

    if (result.media_mentions.length > 0) {
      const avgMentionScore =
        result.media_mentions.reduce((sum, m) => sum + m.relevance_score, 0) / result.media_mentions.length;
      score += avgMentionScore * 0.2;
      weight += 0.2;
    }

    return weight > 0 ? score / weight : 0;
  }

  /**
   * Save enrichment results to Supabase
   */
  private async saveEnrichmentResults(person_id: string, result: ExaEnrichmentResult): Promise<void> {
    // 1. Update person_identity_map
    await this.supabase
      .from('person_identity_map')
      .update({
        exa_enriched: true,
        exa_enriched_at: new Date().toISOString(),
        exa_enrichment_confidence: result.overall_confidence,
        exa_last_refresh_at: new Date().toISOString(),
        exa_refresh_needed: false,
      })
      .eq('person_id', person_id);

    // 2. Save LinkedIn profile
    if (result.linkedin_profile) {
      await this.supabase.from('exa_linkedin_profiles').upsert({
        person_id,
        ...result.linkedin_profile,
        enriched_at: new Date().toISOString(),
      });
    }

    // 3. Save company intel
    if (result.company_intel) {
      await this.supabase.from('exa_company_intelligence').upsert(
        {
          company_name: result.company_intel.company_name,
          ...result.company_intel,
          enriched_at: new Date().toISOString(),
        },
        { onConflict: 'company_name' }
      );
    }

    // 4. Save media mentions
    if (result.media_mentions.length > 0) {
      for (const mention of result.media_mentions) {
        await this.supabase
          .from('exa_media_mentions')
          .upsert(
            {
              person_id,
              ...mention,
              discovered_at: new Date().toISOString(),
            },
            { onConflict: 'person_id,url' }
          )
          .catch((err) => console.error('Failed to insert media mention:', err));
      }
    }

    // 5. Log enrichment to contact_research_log
    await this.supabase.from('contact_research_log').insert({
      person_id,
      research_type: 'web_search',
      research_query: `Exa enrichment`,
      research_data: {
        linkedin_found: !!result.linkedin_profile,
        company_found: !!result.company_intel,
        media_mentions: result.media_mentions.length,
        confidence: result.overall_confidence,
      },
      confidence_score: result.overall_confidence,
      ai_provider: 'exa',
      success: true,
      processing_time_ms: 0, // Not tracking this yet
    });
  }

  /**
   * Check if we have free tier requests remaining
   */
  private async checkFreeTierLimit(requestsNeeded: number): Promise<boolean> {
    const currentMonth = new Date().toISOString().substring(0, 7) + '-01';

    const { data } = await this.supabase
      .from('exa_api_usage')
      .select('free_tier_remaining, free_tier_exceeded')
      .eq('period_month', currentMonth)
      .single();

    if (!data) {
      // No usage yet this month - initialize
      await this.supabase.from('exa_api_usage').insert({
        period_month: currentMonth,
        free_tier_limit: 1000,
        free_tier_remaining: 1000,
      });
      return true;
    }

    if (data.free_tier_exceeded) {
      console.warn('[Exa] Free tier limit exceeded for this month');
      return false;
    }

    if (data.free_tier_remaining < requestsNeeded) {
      console.warn(`[Exa] Insufficient free tier requests (need ${requestsNeeded}, have ${data.free_tier_remaining})`);
      return false;
    }

    return true;
  }

  /**
   * Track API usage
   */
  private async trackAPIUsage(requests: number, type: string): Promise<void> {
    const currentMonth = new Date().toISOString().substring(0, 7) + '-01';

    await this.supabase.rpc('track_exa_api_usage', {
      p_requests_used: requests,
      p_request_type: type,
    });
  }

  /**
   * Check if enrichment is recent (within N days)
   */
  private isRecentEnrichment(enrichedAt: string, days: number): boolean {
    const enrichedDate = new Date(enrichedAt);
    const now = new Date();
    const daysDiff = (now.getTime() - enrichedDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff < days;
  }

  /**
   * Get current month's usage stats
   */
  async getUsageStats(): Promise<any> {
    const currentMonth = new Date().toISOString().substring(0, 7) + '-01';

    const { data } = await this.supabase
      .from('exa_api_usage')
      .select('*')
      .eq('period_month', currentMonth)
      .single();

    return data;
  }
}

export default ExaEnrichmentService;
