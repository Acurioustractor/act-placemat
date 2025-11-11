/**
 * Smart data mapper - Derives showcase data from existing Notion fields
 * No need to add new Notion properties!
 */

import type { Project } from '../types/models';

/**
 * Extracts showcase-ready data from existing project fields
 * Uses AI summaries, descriptions, and other existing data
 */
export const deriveShowcaseData = (project: Project) => {
  // Use AI summary if available, otherwise description
  const primaryText = project.aiSummary || project.description;

  return {
    // Hero content - use what's available
    heroText: primaryText,
    heroImage: project.heroImageUrl || project.galleryImages?.[0] || getDefaultHeroImage(project),

    // Storytelling - derive from description/AI summary
    challenge: extractChallenge(primaryText),
    approach: extractApproach(primaryText),
    impact: extractImpact(primaryText),

    // Impact stats - use existing numeric fields
    stats: deriveImpactStats(project),

    // SEO - auto-generate from existing data
    metaDescription: generateMetaDescription(project),
    socialImage: project.heroImageUrl || project.galleryImages?.[0] || getDefaultSocialImage(),
    slug: generateSlug(project.name),

    // CTA - intelligent defaults based on project
    ctaType: suggestCTAType(project),
    ctaLink: generateCTALink(project),
    ctaText: generateCTAText(project),
  };
};

/**
 * Extract "The Challenge" from description
 * Looks for keywords like "challenge", "problem", "issue"
 */
function extractChallenge(text: string): string {
  if (!text) return '';

  // Look for challenge indicators
  const challengePatterns = [
    /(?:challenge|problem|issue|concern)[:\s]+([^.]+\.)/i,
    /^([^.]+\.)/  // First sentence as fallback
  ];

  for (const pattern of challengePatterns) {
    const match = text.match(pattern);
    if (match) return match[1] || match[0];
  }

  // Fallback: first 200 chars
  return text.substring(0, 200) + (text.length > 200 ? '...' : '');
}

/**
 * Extract "Our Approach" from description
 * Looks for keywords like "approach", "solution", "we"
 */
function extractApproach(text: string): string {
  if (!text) return '';

  // Look for approach indicators
  const approachPatterns = [
    /(?:approach|solution|method|strategy|we)[:\s]+([^.]+\.)/i,
    /(?:we|our|this project)\s+([^.]+\.)/i
  ];

  for (const pattern of approachPatterns) {
    const match = text.match(pattern);
    if (match) return match[1] || match[0];
  }

  // Fallback: middle portion
  const sentences = text.split('.').filter(s => s.trim());
  if (sentences.length > 1) {
    return sentences[1].trim() + '.';
  }

  return '';
}

/**
 * Extract "Impact" from description
 * Looks for keywords like "impact", "result", "outcome"
 */
function extractImpact(text: string): string {
  if (!text) return '';

  // Look for impact indicators
  const impactPatterns = [
    /(?:impact|result|outcome|achieved|reached)[:\s]+([^.]+\.)/i,
    /(\d+\s+(?:people|participants|locations|hours|workshops)[^.]*\.)/i
  ];

  for (const pattern of impactPatterns) {
    const match = text.match(pattern);
    if (match) return match[1] || match[0];
  }

  // Fallback: last sentence
  const sentences = text.split('.').filter(s => s.trim());
  if (sentences.length > 0) {
    return sentences[sentences.length - 1].trim() + '.';
  }

  return '';
}

/**
 * Derive impact statistics from existing project fields
 */
function deriveImpactStats(project: Project) {
  const stats: any = {};

  // Use existing numeric fields
  if (project.revenueActual && project.revenueActual > 0) {
    stats.fundingRaised = Math.round(project.revenueActual);
  }

  // Parse numbers from description
  const text = project.aiSummary || project.description;
  if (text) {
    // Look for "X people" or "X participants"
    const peopleMatch = text.match(/(\d+)\s+(?:people|participants|youth|students|individuals)/i);
    if (peopleMatch) {
      stats.peopleServed = parseInt(peopleMatch[1]);
    }

    // Look for "X locations" or "X communities"
    const locationMatch = text.match(/(\d+)\s+(?:locations?|communities|sites|regions)/i);
    if (locationMatch) {
      stats.locationsReached = parseInt(locationMatch[1]);
    }

    // Look for "X hours" or "X sessions"
    const hoursMatch = text.match(/(\d+)\s+(?:hours?|sessions?|workshops?|programs?)/i);
    if (hoursMatch) {
      stats.hoursDelivered = parseInt(hoursMatch[1]);
    }

    // Look for "X partners" or "X organizations"
    const partnersMatch = text.match(/(\d+)\s+(?:partners?|organizations?|agencies)/i);
    if (partnersMatch) {
      stats.partnersInvolved = parseInt(partnersMatch[1]);
    }

    // Look for success rate "X% success" or "X percent"
    const successMatch = text.match(/(\d+)%?\s*(?:success|completion|graduation)/i);
    if (successMatch) {
      stats.successRate = parseInt(successMatch[1]);
    }
  }

  // Count partner organizations
  if (project.partnerOrganizations && project.partnerOrganizations.length > 0) {
    stats.partnersInvolved = stats.partnersInvolved || project.partnerOrganizations.length;
  }

  return Object.keys(stats).length > 0 ? stats : null;
}

/**
 * Generate SEO-friendly meta description (155 chars max)
 */
function generateMetaDescription(project: Project): string {
  const text = project.aiSummary || project.description;
  if (!text) return `Discover ${project.name} - an ACT Placemat project creating community impact.`;

  // Clean and truncate
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 155) return cleaned;

  // Truncate at word boundary
  const truncated = cleaned.substring(0, 152);
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.substring(0, lastSpace) + '...';
}

/**
 * Generate URL-friendly slug from project name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with dashes
    .replace(/^-+|-+$/g, '')      // Remove leading/trailing dashes
    .substring(0, 60);             // Limit length
}

/**
 * Suggest appropriate CTA type based on project
 */
function suggestCTAType(project: Project): 'donate' | 'partner' | 'volunteer' | 'learn' | 'contact' {
  const text = (project.aiSummary || project.description || '').toLowerCase();

  // Check for funding needs
  if (project.revenueTarget && project.revenueActual < project.revenueTarget) {
    return 'donate';
  }

  // Check for keywords
  if (text.includes('volunteer') || text.includes('join us')) {
    return 'volunteer';
  }

  if (text.includes('partner') || text.includes('collaborate')) {
    return 'partner';
  }

  // Default based on status
  if (project.status === 'Active') {
    return 'partner';
  }

  return 'learn';
}

/**
 * Generate CTA link based on project
 */
function generateCTALink(project: Project): string {
  // If website exists, use it
  if (project.websiteLinks) {
    return project.websiteLinks;
  }

  // Otherwise, link to contact with pre-filled subject
  const subject = encodeURIComponent(`Interested in ${project.name}`);
  return `mailto:contact@act.org?subject=${subject}`;
}

/**
 * Generate CTA button text based on project
 */
function generateCTAText(project: Project): string {
  const ctaType = suggestCTAType(project);

  const templates = {
    donate: `Support ${project.name}`,
    partner: `Partner With Us`,
    volunteer: `Get Involved`,
    learn: `Learn More About This Project`,
    contact: `Contact Us About ${project.name}`
  };

  return templates[ctaType];
}

/**
 * Get default hero image based on project area
 */
function getDefaultHeroImage(project: Project): string {
  // Map project areas to default images
  const defaults: Record<string, string> = {
    'Story Matter': '/images/defaults/story-matter.jpg',
    'Economic Freedom': '/images/defaults/economic-freedom.jpg',
    'Healing Justice': '/images/defaults/healing-justice.jpg',
    'Environmental Justice': '/images/defaults/environmental-justice.jpg',
    'Political Power': '/images/defaults/political-power.jpg',
  };

  return defaults[project.area] || '/images/defaults/project-hero.jpg';
}

/**
 * Get default social sharing image
 */
function getDefaultSocialImage(): string {
  return '/images/og-default.jpg';
}

/**
 * Extract testimonials from description if available
 * Looks for quoted text
 */
export function extractTestimonials(text: string): Array<{ quote: string; authorName: string }> {
  if (!text) return [];

  const testimonials: Array<{ quote: string; authorName: string }> = [];

  // Look for quoted text with attribution
  const quotePattern = /"([^"]+)"\s*[-–—]\s*([^,\n]+)/g;
  let match;

  while ((match = quotePattern.exec(text)) !== null) {
    testimonials.push({
      quote: match[1].trim(),
      authorName: match[2].trim()
    });
  }

  return testimonials;
}

/**
 * Smart gallery builder - uses available images
 */
export function buildGallery(project: Project): string[] {
  const images: string[] = [];

  // Add gallery images if available
  if (project.galleryImages && project.galleryImages.length > 0) {
    images.push(...project.galleryImages);
  }

  // Add hero image if different
  if (project.heroImageUrl && !images.includes(project.heroImageUrl)) {
    images.unshift(project.heroImageUrl);
  }

  return images;
}

/**
 * Generate complete showcase-ready project data
 * This is the main function to use!
 */
export function prepareProjectForShowcase(project: Project) {
  const derived = deriveShowcaseData(project);
  const testimonials = extractTestimonials(project.aiSummary || project.description);
  const gallery = buildGallery(project);

  return {
    // Original project data
    ...project,

    // Derived showcase data
    heroImageUrl: derived.heroImage,
    challengeDescription: derived.challenge,
    solutionDescription: derived.approach,
    processDescription: derived.impact,
    impactStats: derived.stats,
    testimonials: testimonials.length > 0 ? testimonials : undefined,
    galleryImages: gallery.length > 0 ? gallery : undefined,
    metaDescription: derived.metaDescription,
    socialImageUrl: derived.socialImage,
    slug: derived.slug,
    ctaType: derived.ctaType,
    ctaLink: derived.ctaLink,
    ctaText: derived.ctaText,
  };
}
