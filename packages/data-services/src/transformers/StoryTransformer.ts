/**
 * Story Data Transformer for ACT Placemat
 * Mobile-optimized story data transformation with Australian compliance
 */

import { z } from 'zod';
import type { TransformationConfig } from './BaseTransformer';
import { BaseTransformer } from './BaseTransformer';
import type { ComplianceMetadata } from '../types';
import { Story, Storyteller } from '../types';

// Mobile-optimized story schema for Australian community platform
const MobileStorySchema = z.object({
  id: z.string(),
  title: z.string().max(200), // Shorter titles for mobile
  content: z.string().max(5000), // Mobile-optimized content length
  impact: z.string().max(1000).optional(),
  themes: z.array(z.string()).max(10), // Limit themes for mobile UI
  storyteller_id: z.string(),
  storyteller: z.object({
    id: z.string(),
    full_name: z.string().max(100),
    location_id: z.string().optional(),
    bio: z.string().max(500).optional(), // Shorter bio for mobile
    consent_given: z.boolean()
  }).optional(),
  is_public: z.boolean(),
  consent_status: z.enum(['given', 'pending', 'revoked']),
  created_at: z.string(),
  location_id: z.string().optional(),
  // Mobile-specific fields
  preview: z.string().max(150).optional(), // Story preview for lists
  reading_time: z.number().optional(), // Estimated reading time in minutes
  mobile_optimized: z.boolean().optional(),
  australian_location: z.boolean().optional() // Flag for Australian content
});

// Raw story data from Supabase (potentially larger/unoptimized)
interface RawStoryData {
  id: string;
  title: string;
  content: string;
  impact?: string;
  themes: string[];
  storyteller_id: string;
  storyteller?: {
    id: string;
    full_name: string;
    location_id?: string;
    bio?: string;
    consent_given: boolean;
    contact_preferences?: any;
  };
  is_public: boolean;
  consent_status: 'given' | 'pending' | 'revoked';
  created_at: string;
  location_id?: string;
  compliance?: ComplianceMetadata;
  [key: string]: any; // May contain additional fields from API
}

type MobileStory = z.infer<typeof MobileStorySchema>;

export class StoryTransformer extends BaseTransformer<RawStoryData, MobileStory> {
  private australianLocations = new Set([
    'nsw', 'vic', 'qld', 'wa', 'sa', 'tas', 'act', 'nt',
    'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 
    'hobart', 'darwin', 'canberra', 'australia'
  ]);

  private australianThemes = new Set([
    'indigenous', 'aboriginal', 'torres strait', 'first nations',
    'rural australia', 'bush', 'outback', 'regional',
    'anzac', 'aussie', 'multicultural australia', 'fair dinkum'
  ]);

  constructor(config: Partial<TransformationConfig> = {}) {
    super(MobileStorySchema, {
      compression: {
        enabled: true,
        threshold: 512, // Compress stories > 512 bytes for mobile
        algorithm: 'lz-string'
      },
      validation: {
        strict: true,
        stripUnknown: true,
        maxFieldLength: 5000 // Stories can be longer
      },
      mobile: {
        minimizePayload: true,
        removeNullFields: true,
        optimizeImages: true,
        maxImageSize: 300 // Smaller images for story content
      },
      compliance: {
        redactSensitiveData: true,
        auditTransformations: true,
        australianDataOnly: false
      },
      ...config
    });
  }

  /**
   * Transform raw story data to mobile-optimized format
   */
  protected async doTransform(input: RawStoryData): Promise<MobileStory> {
    // Calculate reading time for mobile UX
    const readingTime = this.calculateReadingTime(input.content, input.impact);

    // Generate mobile preview
    const preview = this.generatePreview(input.content);

    // Determine if this is Australian content
    const australianLocation = this.isAustralianContent(input);

    // Optimize storyteller data for mobile
    const optimizedStoryteller = input.storyteller ? {
      id: input.storyteller.id,
      full_name: this.sanitizeDisplayName(input.storyteller.full_name),
      location_id: input.storyteller.location_id,
      bio: this.truncateBio(input.storyteller.bio),
      consent_given: input.storyteller.consent_given
    } : undefined;

    // Filter and optimize themes for mobile display
    const optimizedThemes = this.optimizeThemes(input.themes);

    // Create mobile-optimized story
    const mobileStory: MobileStory = {
      id: input.id,
      title: this.optimizeTitle(input.title),
      content: this.optimizeContent(input.content),
      impact: this.optimizeImpact(input.impact),
      themes: optimizedThemes,
      storyteller_id: input.storyteller_id,
      storyteller: optimizedStoryteller,
      is_public: input.is_public,
      consent_status: input.consent_status,
      created_at: input.created_at,
      location_id: input.location_id,
      preview,
      reading_time: readingTime,
      mobile_optimized: true,
      australian_location: australianLocation
    };

    return mobileStory;
  }

  /**
   * Reverse transform mobile story back to raw format
   */
  protected async doReverseTransform(output: MobileStory): Promise<RawStoryData> {
    // Reconstruct raw story data from mobile format
    const rawStory: RawStoryData = {
      id: output.id,
      title: output.title,
      content: output.content,
      impact: output.impact,
      themes: output.themes,
      storyteller_id: output.storyteller_id,
      storyteller: output.storyteller ? {
        id: output.storyteller.id,
        full_name: output.storyteller.full_name,
        location_id: output.storyteller.location_id,
        bio: output.storyteller.bio,
        consent_given: output.storyteller.consent_given
      } : undefined,
      is_public: output.is_public,
      consent_status: output.consent_status,
      created_at: output.created_at,
      location_id: output.location_id,
      compliance: {
        dataResidency: output.australian_location ? 'australia' : 'global',
        privacyLevel: output.is_public ? 'public' : 'community',
        consentRequired: true,
        retentionPeriod: 365 * 7, // 7 years for stories
        auditTrail: true
      }
    };

    return rawStory;
  }

  /**
   * Calculate reading time for mobile UX
   */
  private calculateReadingTime(content: string, impact?: string): number {
    const wordsPerMinute = 200; // Average reading speed
    const text = `${content} ${impact || ''}`;
    const wordCount = text.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return Math.max(1, minutes); // Minimum 1 minute
  }

  /**
   * Generate mobile-friendly preview
   */
  private generatePreview(content: string): string {
    // Clean content of markdown and extra whitespace
    const cleaned = content
      .replace(/[#*_`]/g, '') // Remove markdown
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Find natural break point near 120 characters
    if (cleaned.length <= 120) {
      return cleaned;
    }

    // Look for sentence end near the limit
    const sentences = cleaned.split(/[.!?]+/);
    let preview = '';
    
    for (const sentence of sentences) {
      if ((preview + sentence).length > 100) {
        break;
      }
      preview += sentence + '.';
    }

    // Fallback to hard truncation with ellipsis
    if (!preview || preview.length < 50) {
      preview = cleaned.substring(0, 120);
      const lastSpace = preview.lastIndexOf(' ');
      if (lastSpace > 100) {
        preview = preview.substring(0, lastSpace);
      }
    }

    return preview.trim() + (preview.length < cleaned.length ? '...' : '');
  }

  /**
   * Check if content is Australian-focused
   */
  private isAustralianContent(story: RawStoryData): boolean {
    const textToCheck = `
      ${story.title} 
      ${story.content} 
      ${story.impact || ''} 
      ${story.themes.join(' ')} 
      ${story.storyteller?.location_id || ''}
      ${story.location_id || ''}
    `.toLowerCase();

    // Check for Australian locations
    for (const location of this.australianLocations) {
      if (textToCheck.includes(location)) {
        return true;
      }
    }

    // Check for Australian themes
    for (const theme of this.australianThemes) {
      if (textToCheck.includes(theme)) {
        return true;
      }
    }

    // Check for Australian indicators in storyteller location
    if (story.storyteller?.location_id) {
      const locationLower = story.storyteller.location_id.toLowerCase();
      if (this.australianLocations.has(locationLower)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Optimize themes for mobile display
   */
  private optimizeThemes(themes: string[]): string[] {
    // Limit to 8 themes for mobile UI
    const maxThemes = 8;
    
    // Prioritize Australian themes
    const australianThemes = themes.filter(theme => 
      this.australianThemes.has(theme.toLowerCase())
    );
    
    const otherThemes = themes.filter(theme => 
      !this.australianThemes.has(theme.toLowerCase())
    );

    // Combine with Australian themes first
    const optimized = [...australianThemes, ...otherThemes]
      .slice(0, maxThemes)
      .map(theme => theme.toLowerCase()) // Normalize for consistency
      .filter((theme, index, array) => array.indexOf(theme) === index); // Remove duplicates

    return optimized;
  }

  /**
   * Optimize title for mobile display
   */
  private optimizeTitle(title: string): string {
    // Trim title to mobile-friendly length
    if (title.length <= 150) {
      return title.trim();
    }

    // Try to break at natural word boundary
    const truncated = title.substring(0, 147);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > 100) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  /**
   * Optimize content for mobile reading
   */
  private optimizeContent(content: string): string {
    // Clean up excessive whitespace and normalize line breaks
    const cleaned = content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks
      .replace(/[ \t]+/g, ' ') // Normalize spaces
      .trim();

    // If content is very long, ensure it's under mobile limit
    if (cleaned.length > 4500) {
      console.warn('Story content exceeds mobile optimization length');
      // Could implement smart truncation here if needed
    }

    return cleaned;
  }

  /**
   * Optimize impact statement for mobile
   */
  private optimizeImpact(impact?: string): string | undefined {
    if (!impact) return undefined;

    const cleaned = impact.trim();
    
    // Truncate if too long for mobile
    if (cleaned.length <= 800) {
      return cleaned;
    }

    // Find natural break point
    const sentences = cleaned.split(/[.!?]+/);
    let optimized = '';
    
    for (const sentence of sentences) {
      if ((optimized + sentence).length > 750) {
        break;
      }
      optimized += sentence + '.';
    }

    return optimized.trim() + (optimized.length < cleaned.length ? '...' : '');
  }

  /**
   * Sanitize display name for mobile UI
   */
  private sanitizeDisplayName(name: string): string {
    // Basic sanitization for mobile display
    return name
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML
      .substring(0, 50); // Mobile-friendly length
  }

  /**
   * Truncate bio for mobile display
   */
  private truncateBio(bio?: string): string | undefined {
    if (!bio) return undefined;

    const cleaned = bio.trim();
    
    if (cleaned.length <= 300) {
      return cleaned;
    }

    // Truncate at sentence boundary if possible
    const sentences = cleaned.split(/[.!?]+/);
    let truncated = '';
    
    for (const sentence of sentences) {
      if ((truncated + sentence).length > 250) {
        break;
      }
      truncated += sentence + '.';
    }

    return truncated.trim() + (truncated.length < cleaned.length ? '...' : '');
  }

  /**
   * Batch transform multiple stories for mobile efficiency
   */
  public async transformBatch(stories: RawStoryData[]): Promise<MobileStory[]> {
    const batchSize = 10; // Process in small batches for mobile memory management
    const results: MobileStory[] = [];

    for (let i = 0; i < stories.length; i += batchSize) {
      const batch = stories.slice(i, i + batchSize);
      const transformedBatch = await Promise.all(
        batch.map(story => this.transform(story))
      );
      
      results.push(...transformedBatch.map(result => result.data));
      
      // Small delay to prevent blocking UI on mobile
      if (i + batchSize < stories.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return results;
  }

  /**
   * Get transformation statistics for mobile performance monitoring
   */
  public getTransformationStats(): {
    averageCompressionRatio: number;
    averageTransformTime: number;
    mobileOptimizationRate: number;
    australianContentRate: number;
  } {
    const metrics = this.getTransformationMetrics();
    
    if (metrics.length === 0) {
      return {
        averageCompressionRatio: 1,
        averageTransformTime: 0,
        mobileOptimizationRate: 0,
        australianContentRate: 0
      };
    }

    const compressionRatios = metrics
      .filter(m => m.compressionRatio)
      .map(m => m.compressionRatio);
    
    const avgCompressionRatio = compressionRatios.length > 0
      ? compressionRatios.reduce((sum, ratio) => sum + ratio, 0) / compressionRatios.length
      : 1;

    const avgTransformTime = metrics
      .reduce((sum, m) => sum + m.transformationTime, 0) / metrics.length;

    return {
      averageCompressionRatio: avgCompressionRatio,
      averageTransformTime: avgTransformTime,
      mobileOptimizationRate: 100, // All stories are mobile-optimized
      australianContentRate: 0 // Would need to track this in metrics
    };
  }
}