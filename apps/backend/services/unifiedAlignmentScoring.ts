/**
 * Unified Alignment Scoring Engine
 *
 * Works across ALL ACT systems: Placemat, JusticeHub, Farm, Empathy Ledger
 * ALMA-aware: Boosts scoring for youth justice domain expertise
 *
 * Integration: Intelligence Hub + ALMA architecture aligned
 * Database: Uses project_contact_matches table (supabase/migrations/20260101000002)
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface Contact {
  id: string;
  person_id?: string; // From person_identity_map
  full_name: string;
  email_address?: string;
  linkedin_url?: string;
  bio?: string;
  current_company?: string;
  current_position?: string;
  location?: string;
  strategic_value?: 'high' | 'medium' | 'low';
  alignment_tags?: string[]; // ['indigenous', 'youth_justice', 'practitioner', etc.]
  exa_confidence?: number; // 0-1
}

export interface Project {
  notion_project_id: string;
  project_name: string;
  project_source: 'placemat' | 'justicehub' | 'farm' | 'empathy_ledger' | 'intelligence_hub';
  tags?: string[]; // Project keywords
  location?: string;
  required_expertise?: string[];
  alma_intervention_id?: string; // If project is ALMA intervention
}

export interface ALMAIntervention {
  id: string;
  intervention_type: string;
  consent_level: 'Extractive' | 'Participatory' | 'Community Controlled';
  cultural_authority?: string;
  community_authority_score?: number; // 0-100
  evidence_strength_score?: number; // 0-100
  implementation_capability_score?: number; // 0-100
  harm_risk_score?: number; // 0-100 (inverse: lower is better)
  option_value_score?: number; // 0-100
}

export interface AlignmentResult {
  contact_id: string;
  person_id?: string;
  project_notion_id: string;
  project_name: string;
  project_source: string;
  alignment_score: number; // 0-100
  matched_keywords: string[];
  match_reason: string;
  alma_intervention_id?: string;
  alma_signal_boost?: number;
  breakdown: {
    keyword_score: number;
    strategic_value_score: number;
    location_score: number;
    expertise_score: number;
    exa_confidence_score: number;
    alma_boost?: number;
  };
  recommendations: string[];
}

export interface AlignmentOptions {
  useALMA?: boolean; // Enable ALMA signal boosting
  minScore?: number; // Minimum score threshold (default: 40)
  includeBreakdown?: boolean; // Include detailed scoring breakdown
  supabase: SupabaseClient;
}

// ============================================================================
// MAIN ALIGNMENT SCORING ENGINE
// ============================================================================

/**
 * Calculate unified project-contact alignment score
 * Works across ALL ACT systems with ALMA domain intelligence boosting
 */
export async function calculateUnifiedProjectAlignment(
  contact: Contact,
  project: Project,
  options: AlignmentOptions
): Promise<AlignmentResult> {
  const { useALMA = true, supabase } = options;

  let score = 0;
  const breakdown: AlignmentResult['breakdown'] = {
    keyword_score: 0,
    strategic_value_score: 0,
    location_score: 0,
    expertise_score: 0,
    exa_confidence_score: 0,
  };
  const matchedKeywords: string[] = [];
  const recommendations: string[] = [];

  // =========================================================================
  // 1. KEYWORD MATCHING (Bio + Tags) - Max 50 points
  // =========================================================================
  // PRIORITY 1: alignment_tags array matching (15 points per match, max 45)
  // PRIORITY 2: bio text matching (10 points per match, max 30)
  // Combined max: 50 points (allows overlap for strong matches)

  let tagMatchScore = 0;
  let bioMatchScore = 0;
  const tagMatches: string[] = [];
  const bioMatches: string[] = [];

  if (project.tags && project.tags.length > 0) {
    const contactTagsLower = (contact.alignment_tags || []).map(t => t.toLowerCase());
    const bioLower = (contact.bio || '').toLowerCase();
    const positionLower = (contact.current_position || '').toLowerCase();

    for (const tag of project.tags) {
      const tagLower = tag.toLowerCase();

      // Priority 1: Exact match in contact alignment tags (15 points)
      if (contactTagsLower.includes(tagLower)) {
        tagMatches.push(tag);
        matchedKeywords.push(tag);
      }
      // Priority 2: Partial match in contact alignment tags (e.g., "youth" matches "youth_justice")
      else if (contactTagsLower.some(contactTag =>
        tagLower.includes(contactTag) || contactTag.includes(tagLower.replace(/_/g, ' '))
      )) {
        tagMatches.push(tag);
        matchedKeywords.push(tag);
      }
      // Priority 3: Check bio text (fuzzy match - lower weight)
      // Handle both underscore and space versions (e.g., "youth_justice" and "youth justice")
      else if (bioLower) {
        const tagWithSpaces = tagLower.replace(/_/g, ' ');
        if (bioLower.includes(tagLower) || bioLower.includes(tagWithSpaces)) {
          bioMatches.push(tag);
          matchedKeywords.push(tag);
        }
      }
      // Priority 4: Check current position (e.g., "youth" in position title)
      else if (positionLower && positionLower.includes(tagLower.replace(/_/g, ' '))) {
        bioMatches.push(tag);
        matchedKeywords.push(tag);
      }
    }

    // Score alignment tag matches higher (15 points each, max 45)
    tagMatchScore = Math.min(tagMatches.length * 15, 45);

    // Score bio text matches lower (10 points each, max 30)
    bioMatchScore = Math.min(bioMatches.length * 10, 30);

    // Combined scoring with cap at 50 points
    breakdown.keyword_score = Math.min(tagMatchScore + bioMatchScore, 50);
    score += breakdown.keyword_score;
  }

  // =========================================================================
  // 2. STRATEGIC VALUE BOOST - Max 30 points
  // =========================================================================
  if (contact.strategic_value === 'high') {
    breakdown.strategic_value_score = 30;
    score += 30;
  } else if (contact.strategic_value === 'medium') {
    breakdown.strategic_value_score = 15;
    score += 15;
  }

  // =========================================================================
  // 3. LOCATION MATCHING - 10 points
  // =========================================================================
  if (contact.location && project.location) {
    const contactLoc = contact.location.toLowerCase();
    const projectLoc = project.location.toLowerCase();

    // Exact match or contains
    if (contactLoc === projectLoc || contactLoc.includes(projectLoc) || projectLoc.includes(contactLoc)) {
      breakdown.location_score = 10;
      score += 10;
      recommendations.push(`Local presence: ${contact.location}`);
    }
  }

  // =========================================================================
  // 4. EXPERTISE MATCHING (Role + Required Expertise) - Max 15 points
  // =========================================================================
  if (contact.current_position && project.required_expertise) {
    const positionLower = contact.current_position.toLowerCase();
    let expertiseMatches = 0;

    for (const expertise of project.required_expertise) {
      if (positionLower.includes(expertise.toLowerCase())) {
        expertiseMatches++;
      }
    }

    breakdown.expertise_score = Math.min(expertiseMatches * 5, 15);
    score += breakdown.expertise_score;

    if (expertiseMatches > 0) {
      recommendations.push(`Relevant expertise: ${contact.current_position}`);
    }
  }

  // =========================================================================
  // 5. EXA CONFIDENCE BOOST - Max 5 points
  // =========================================================================
  if (contact.exa_confidence !== undefined && contact.exa_confidence > 0) {
    breakdown.exa_confidence_score = Math.round(contact.exa_confidence * 5);
    score += breakdown.exa_confidence_score;
  }

  // =========================================================================
  // 6. ALMA SIGNAL BOOSTING (Youth Justice Domain Intelligence)
  // =========================================================================
  let almaBoost = 0;

  if (useALMA && project.alma_intervention_id) {
    // Fetch ALMA intervention details
    const { data: intervention } = await supabase
      .from('alma_interventions')
      .select('*')
      .eq('id', project.alma_intervention_id)
      .single();

    if (intervention) {
      const almaIntervention = intervention as ALMAIntervention;

      // 6a. Community Authority Alignment (+20 if Indigenous)
      if (contact.alignment_tags?.includes('indigenous') && almaIntervention.cultural_authority) {
        almaBoost += 20;
        recommendations.push('🌟 Indigenous cultural authority alignment (ALMA boost +20)');
      }

      // 6b. Evidence Strength Alignment (+15 if research/academic background)
      if (contact.current_position?.toLowerCase().includes('research') ||
          contact.current_position?.toLowerCase().includes('academic') ||
          contact.current_position?.toLowerCase().includes('professor')) {
        almaBoost += 15;
        recommendations.push('📊 Research/academic expertise (ALMA boost +15)');
      }

      // 6c. Implementation Capability (+10 if practitioner/program manager)
      if (contact.alignment_tags?.includes('practitioner') ||
          contact.current_position?.toLowerCase().includes('program') ||
          contact.current_position?.toLowerCase().includes('manager')) {
        almaBoost += 10;
        recommendations.push('⚙️ Implementation capability (ALMA boost +10)');
      }

      // 6d. Youth Justice Specific (+30 if direct youth justice experience)
      if (contact.alignment_tags?.includes('youth_justice') ||
          contact.bio?.toLowerCase().includes('youth justice') ||
          contact.bio?.toLowerCase().includes('juvenile justice') ||
          contact.bio?.toLowerCase().includes('youth detention')) {
        almaBoost += 30;
        recommendations.push('⚖️ Youth justice domain expertise (ALMA boost +30)');
      }

      // 6e. Community-Controlled Intervention Bonus (+10 if high consent level)
      if (almaIntervention.consent_level === 'Community Controlled' &&
          contact.alignment_tags?.includes('indigenous')) {
        almaBoost += 10;
        recommendations.push('🤝 Community-controlled intervention alignment (ALMA boost +10)');
      }

      breakdown.alma_boost = almaBoost;
      score += almaBoost;
    }
  }

  // =========================================================================
  // 7. ENGAGEMENT RECOMMENDATIONS
  // =========================================================================

  // Add context-specific recommendations based on score
  if (score >= 80) {
    recommendations.push('🎯 TOP PRIORITY: Immediate outreach recommended');
  } else if (score >= 60) {
    recommendations.push('✅ HIGH VALUE: Schedule intro call');
  } else if (score >= 40) {
    recommendations.push('💡 POTENTIAL: Monitor for future opportunities');
  }

  // Add project-specific recommendations
  if (project.project_source === 'justicehub' && score >= 60) {
    recommendations.push('⚖️ JusticeHub match: Consider for funder intelligence pack');
  }

  if (project.project_source === 'farm' && score >= 60) {
    recommendations.push('🌾 Farm incubation potential: Evaluate for mentorship role');
  }

  if (project.project_source === 'empathy_ledger' && score >= 60) {
    recommendations.push('📖 Storytelling opportunity: Potential contributor or subject');
  }

  // =========================================================================
  // 8. GENERATE MATCH REASON (Human-readable explanation)
  // =========================================================================

  const matchReason = generateMatchReason(
    contact,
    project,
    matchedKeywords,
    breakdown,
    almaBoost
  );

  // =========================================================================
  // FINAL RESULT
  // =========================================================================

  return {
    contact_id: contact.id,
    person_id: contact.person_id,
    project_notion_id: project.notion_project_id,
    project_name: project.project_name,
    project_source: project.project_source,
    alignment_score: Math.min(Math.round(score), 100), // Cap at 100
    matched_keywords: [...new Set(matchedKeywords)], // Deduplicated
    match_reason: matchReason,
    alma_intervention_id: project.alma_intervention_id,
    alma_signal_boost: almaBoost > 0 ? almaBoost : undefined,
    breakdown,
    recommendations,
  };
}

// ============================================================================
// BATCH MATCHING
// ============================================================================

/**
 * Match multiple contacts against a single project
 * Returns sorted by alignment score (highest first)
 */
export async function batchMatchContactsToProject(
  contacts: Contact[],
  project: Project,
  options: AlignmentOptions
): Promise<AlignmentResult[]> {
  const results: AlignmentResult[] = [];

  for (const contact of contacts) {
    try {
      const result = await calculateUnifiedProjectAlignment(contact, project, options);

      // Apply minimum score threshold
      const minScore = options.minScore || 40;
      if (result.alignment_score >= minScore) {
        results.push(result);
      }
    } catch (error) {
      console.error(`Error matching contact ${contact.id} to project ${project.project_name}:`, error);
    }
  }

  // Sort by alignment score (descending)
  return results.sort((a, b) => b.alignment_score - a.alignment_score);
}

/**
 * Match single contact against multiple projects
 * Returns sorted by alignment score (highest first)
 */
export async function matchContactToProjects(
  contact: Contact,
  projects: Project[],
  options: AlignmentOptions
): Promise<AlignmentResult[]> {
  const results: AlignmentResult[] = [];

  for (const project of projects) {
    try {
      const result = await calculateUnifiedProjectAlignment(contact, project, options);

      // Apply minimum score threshold
      const minScore = options.minScore || 40;
      if (result.alignment_score >= minScore) {
        results.push(result);
      }
    } catch (error) {
      console.error(`Error matching contact ${contact.id} to project ${project.project_name}:`, error);
    }
  }

  // Sort by alignment score (descending)
  return results.sort((a, b) => b.alignment_score - a.alignment_score);
}

// ============================================================================
// SAVE MATCHES TO DATABASE
// ============================================================================

/**
 * Save alignment results to project_contact_matches table
 */
export async function saveProjectContactMatches(
  matches: AlignmentResult[],
  supabase: SupabaseClient
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const match of matches) {
    try {
      const { error } = await supabase.from('project_contact_matches').insert({
        contact_id: match.contact_id,
        person_id: match.person_id,
        project_notion_id: match.project_notion_id,
        project_name: match.project_name,
        project_source: match.project_source,
        alignment_score: match.alignment_score,
        matched_keywords: match.matched_keywords,
        match_reason: match.match_reason,
        alma_intervention_id: match.alma_intervention_id,
        alma_signal_boost: match.alma_signal_boost || 0,
        engagement_status: 'potential', // Default status
      });

      if (error) {
        console.error(`Failed to save match for contact ${match.contact_id}:`, error);
        failed++;
      } else {
        success++;
      }
    } catch (error) {
      console.error(`Error saving match for contact ${match.contact_id}:`, error);
      failed++;
    }
  }

  return { success, failed };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate human-readable match reason
 */
function generateMatchReason(
  contact: Contact,
  project: Project,
  matchedKeywords: string[],
  breakdown: AlignmentResult['breakdown'],
  almaBoost: number
): string {
  const reasons: string[] = [];

  // Keyword matches
  if (matchedKeywords.length > 0) {
    reasons.push(`Keyword matches: ${matchedKeywords.slice(0, 3).join(', ')}${matchedKeywords.length > 3 ? '...' : ''}`);
  }

  // Strategic value
  if (contact.strategic_value === 'high') {
    reasons.push('High strategic value contact');
  }

  // Location match
  if (breakdown.location_score > 0) {
    reasons.push(`Local presence in ${contact.location}`);
  }

  // Expertise match
  if (breakdown.expertise_score > 0) {
    reasons.push(`Relevant expertise: ${contact.current_position}`);
  }

  // ALMA boost
  if (almaBoost > 0) {
    reasons.push(`ALMA domain intelligence boost (+${almaBoost} points)`);
  }

  // System-specific context
  if (project.project_source === 'justicehub') {
    reasons.push('JusticeHub project alignment');
  } else if (project.project_source === 'farm') {
    reasons.push('Farm incubation potential');
  } else if (project.project_source === 'empathy_ledger') {
    reasons.push('Storytelling opportunity');
  }

  return reasons.join(' • ');
}

/**
 * Get alignment score tier label
 */
export function getAlignmentTier(score: number): string {
  if (score >= 80) return 'TOP PRIORITY';
  if (score >= 60) return 'HIGH VALUE';
  if (score >= 40) return 'POTENTIAL';
  return 'LOW MATCH';
}

/**
 * Get alignment score color for UI
 */
export function getAlignmentColor(score: number): string {
  if (score >= 80) return '#10b981'; // green
  if (score >= 60) return '#3b82f6'; // blue
  if (score >= 40) return '#f59e0b'; // amber
  return '#6b7280'; // gray
}
