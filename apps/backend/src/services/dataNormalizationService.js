/**
 * Data Normalization Service
 * Provides data transformation, validation, and normalization for ML pipeline integration
 */

import Joi from 'joi';
import { createClient } from '@supabase/supabase-js';
import natural from 'natural';
import { v4 as uuidv4 } from 'uuid';

/**
 * Data Normalization Service
 * Handles transformation, validation, and storage of normalized data
 */
class DataNormalizationService {
  constructor() {
    // Initialize Supabase for normalized data storage
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Define data schemas for validation
    this.schemas = this.initializeSchemas();
    
    // Data quality metrics
    this.qualityMetrics = {
      totalProcessed: 0,
      validRecords: 0,
      invalidRecords: 0,
      transformationErrors: 0,
      qualityScore: 0
    };

    console.log('📊 Data Normalization Service initialized');
  }

  /**
   * Initialize validation schemas for different data types
   */
  initializeSchemas() {
    return {
      story: Joi.object({
        id: Joi.string().uuid(),
        title: Joi.string().min(1).max(500).required(),
        content: Joi.string().min(10).required(),
        summary: Joi.string().max(1000),
        themes: Joi.array().items(Joi.string().max(100)),
        metadata: Joi.object({
          word_count: Joi.number().integer().min(0),
          reading_time: Joi.number().min(0),
          complexity_score: Joi.number().min(0).max(100),
          sentiment_score: Joi.number().min(-1).max(1),
          quality_score: Joi.number().min(0).max(100)
        }),
        embedding: Joi.array().items(Joi.number()),
        created_at: Joi.date().iso(),
        updated_at: Joi.date().iso()
      }),

      storyteller: Joi.object({
        id: Joi.string().uuid(),
        full_name: Joi.string().min(1).max(200).required(),
        bio: Joi.string().max(2000),
        transcript: Joi.string(),
        key_insights: Joi.array().items(Joi.string().max(500)),
        expertise_areas: Joi.array().items(Joi.string().max(100)),
        metadata: Joi.object({
          total_stories: Joi.number().integer().min(0),
          avg_story_length: Joi.number().min(0),
          engagement_score: Joi.number().min(0).max(100),
          expertise_diversity: Joi.number().min(0).max(100)
        }),
        embedding: Joi.array().items(Joi.number()),
        created_at: Joi.date().iso(),
        updated_at: Joi.date().iso()
      }),

      document: Joi.object({
        id: Joi.string().uuid(),
        source_type: Joi.string().valid('story', 'storyteller', 'document', 'research'),
        source_id: Joi.string().uuid(),
        content: Joi.string().required(),
        title: Joi.string().max(500),
        chunk_index: Joi.number().integer().min(0),
        total_chunks: Joi.number().integer().min(1),
        metadata: Joi.object(),
        embedding: Joi.array().items(Joi.number()),
        quality_metrics: Joi.object({
          completeness: Joi.number().min(0).max(100),
          accuracy: Joi.number().min(0).max(100),
          consistency: Joi.number().min(0).max(100),
          validity: Joi.number().min(0).max(100)
        }),
        normalized_at: Joi.date().iso()
      })
    };
  }

  /**
   * Create data transformation pipeline for various formats
   */
  createTransformationPipeline(sourceType, targetSchema = 'document') {
    const transformers = {
      'supabase:stories': this.createStoryTransformer(),
      'supabase:storytellers': this.createStorytellerTransformer(),
      'file:text': this.createTextFileTransformer(),
      'notion:pages': this.createNotionTransformer(),
      'research:web': this.createResearchTransformer()
    };

    return {
      sourceType,
      targetSchema,
      transformer: transformers[sourceType] || this.createGenericTransformer(),
      validator: this.schemas[targetSchema] || this.schemas.document,
      execute: async (data) => await this.executeTransformation(data, transformers[sourceType], targetSchema)
    };
  }

  /**
   * Create story-specific transformer
   */
  createStoryTransformer() {
    return async (rawData) => {
      const transformed = {
        id: rawData.id || uuidv4(),
        title: this.cleanText(rawData.title || 'Untitled Story'),
        content: this.cleanText(rawData.content || ''),
        summary: this.cleanText(rawData.summary || ''),
        themes: this.normalizeThemes(rawData.themes),
        metadata: {
          word_count: this.countWords(rawData.content || ''),
          reading_time: this.calculateReadingTime(rawData.content || ''),
          complexity_score: this.calculateComplexityScore(rawData.content || ''),
          sentiment_score: this.calculateSentimentScore(rawData.content || ''),
          quality_score: 0, // Will be calculated by quality checker
          source_table: 'stories',
          original_id: rawData.id
        },
        embedding: rawData.embedding || null,
        created_at: this.normalizeDate(rawData.created_at),
        updated_at: new Date().toISOString()
      };

      // Calculate quality score
      transformed.metadata.quality_score = this.calculateQualityScore(transformed);

      return transformed;
    };
  }

  /**
   * Create storyteller-specific transformer
   */
  createStorytellerTransformer() {
    return async (rawData) => {
      const transformed = {
        id: rawData.id || uuidv4(),
        full_name: this.cleanText(rawData.full_name || 'Anonymous'),
        bio: this.cleanText(rawData.bio || ''),
        transcript: this.cleanText(rawData.transcript || ''),
        key_insights: this.normalizeInsights(rawData.key_insights),
        expertise_areas: this.normalizeExpertiseAreas(rawData.expertise_areas),
        metadata: {
          total_stories: rawData.total_stories || 0,
          avg_story_length: rawData.avg_story_length || 0,
          engagement_score: this.calculateEngagementScore(rawData),
          expertise_diversity: this.calculateExpertiseDiversity(rawData.expertise_areas),
          source_table: 'storytellers',
          original_id: rawData.id
        },
        embedding: rawData.embedding || null,
        created_at: this.normalizeDate(rawData.created_at),
        updated_at: new Date().toISOString()
      };

      return transformed;
    };
  }

  /**
   * Create text file transformer
   */
  createTextFileTransformer() {
    return async (rawData) => {
      const content = rawData.content || '';
      const chunks = this.chunkLargeContent(content);

      return chunks.map((chunk, index) => ({
        id: uuidv4(),
        source_type: 'document',
        source_id: rawData.id || uuidv4(),
        content: this.cleanText(chunk),
        title: rawData.filename || `Document ${index + 1}`,
        chunk_index: index,
        total_chunks: chunks.length,
        metadata: {
          filename: rawData.filename,
          file_size: rawData.size,
          file_extension: rawData.extension,
          chunk_size: chunk.length,
          source_type: 'file'
        },
        embedding: null,
        quality_metrics: this.calculateQualityMetrics(chunk),
        normalized_at: new Date().toISOString()
      }));
    };
  }

  /**
   * Create Notion transformer
   */
  createNotionTransformer() {
    return async (rawData) => {
      return {
        id: rawData.id || uuidv4(),
        source_type: 'document',
        source_id: rawData.page_id || uuidv4(),
        content: this.cleanText(rawData.content || rawData.plain_text || ''),
        title: this.cleanText(rawData.title || rawData.name || 'Notion Page'),
        chunk_index: 0,
        total_chunks: 1,
        metadata: {
          notion_page_id: rawData.id,
          notion_database_id: rawData.parent?.database_id,
          source_type: 'notion',
          url: rawData.url,
          last_edited_time: rawData.last_edited_time
        },
        embedding: null,
        quality_metrics: this.calculateQualityMetrics(rawData.content || rawData.plain_text || ''),
        normalized_at: new Date().toISOString()
      };
    };
  }

  /**
   * Create research web data transformer
   */
  createResearchTransformer() {
    return async (rawData) => {
      return {
        id: uuidv4(),
        source_type: 'research',
        source_id: rawData.url || uuidv4(),
        content: this.cleanText(rawData.content || rawData.text || ''),
        title: this.cleanText(rawData.title || rawData.headline || 'Research Document'),
        chunk_index: 0,
        total_chunks: 1,
        metadata: {
          url: rawData.url,
          domain: rawData.domain,
          scraped_at: rawData.scraped_at,
          source_type: 'web_research',
          authority_score: rawData.authority_score || 0
        },
        embedding: null,
        quality_metrics: this.calculateQualityMetrics(rawData.content || rawData.text || ''),
        normalized_at: new Date().toISOString()
      };
    };
  }

  /**
   * Create generic transformer for unknown formats
   */
  createGenericTransformer() {
    return async (rawData) => {
      return {
        id: rawData.id || uuidv4(),
        source_type: 'document',
        source_id: rawData.source_id || uuidv4(),
        content: this.cleanText(JSON.stringify(rawData)),
        title: rawData.title || 'Generic Document',
        chunk_index: 0,
        total_chunks: 1,
        metadata: {
          source_type: 'generic',
          raw_keys: Object.keys(rawData)
        },
        embedding: null,
        quality_metrics: this.calculateQualityMetrics(JSON.stringify(rawData)),
        normalized_at: new Date().toISOString()
      };
    };
  }

  /**
   * Execute data transformation with validation
   */
  async executeTransformation(data, transformer, targetSchema) {
    this.qualityMetrics.totalProcessed++;

    try {
      // Transform data
      const transformed = await transformer(data);
      
      // Handle array of transformed data (e.g., from chunking)
      const transformedArray = Array.isArray(transformed) ? transformed : [transformed];
      const validatedResults = [];

      for (const item of transformedArray) {
        try {
          // Validate against schema
          const { error, value } = this.schemas[targetSchema].validate(item, { 
            allowUnknown: true,
            stripUnknown: true 
          });

          if (error) {
            console.warn('Validation failed:', error.details);
            this.qualityMetrics.invalidRecords++;
            continue;
          }

          // Additional quality checks
          const qualityChecks = this.performQualityChecks(value);
          if (qualityChecks.passed) {
            validatedResults.push({
              ...value,
              quality_metrics: qualityChecks.metrics
            });
            this.qualityMetrics.validRecords++;
          } else {
            console.warn('Quality checks failed:', qualityChecks.issues);
            this.qualityMetrics.invalidRecords++;
          }

        } catch (validationError) {
          console.error('Validation error:', validationError);
          this.qualityMetrics.invalidRecords++;
        }
      }

      return validatedResults;

    } catch (transformationError) {
      console.error('Transformation error:', transformationError);
      this.qualityMetrics.transformationErrors++;
      throw transformationError;
    }
  }

  /**
   * Perform comprehensive quality checks
   */
  performQualityChecks(data) {
    const checks = {
      completeness: this.checkCompleteness(data),
      accuracy: this.checkAccuracy(data),
      consistency: this.checkConsistency(data),
      validity: this.checkValidity(data)
    };

    const overallScore = (checks.completeness + checks.accuracy + checks.consistency + checks.validity) / 4;
    const passed = overallScore >= 70; // Minimum quality threshold

    return {
      passed,
      score: overallScore,
      metrics: checks,
      issues: Object.entries(checks)
        .filter(([, score]) => score < 70)
        .map(([check]) => `Low ${check} score`)
    };
  }

  /**
   * Check data completeness
   */
  checkCompleteness(data) {
    const requiredFields = {
      story: ['title', 'content'],
      storyteller: ['full_name'],
      document: ['content', 'source_type']
    };

    const schema = data.full_name ? 'storyteller' : data.title ? 'story' : 'document';
    const required = requiredFields[schema] || ['content'];
    
    const missingFields = required.filter(field => !data[field] || data[field].trim() === '');
    const completeness = ((required.length - missingFields.length) / required.length) * 100;

    return Math.max(0, completeness);
  }

  /**
   * Check data accuracy (content quality indicators)
   */
  checkAccuracy(data) {
    let score = 100;
    const content = data.content || '';

    // Check for minimum content length
    if (content.length < 10) score -= 30;
    
    // Check for repetitive content
    const words = content.split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const repetitionRatio = uniqueWords.size / words.length;
    if (repetitionRatio < 0.3) score -= 20;

    // Check for meaningful sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 5);
    if (sentences.length === 0) score -= 25;

    // Check for excessive special characters
    const specialCharRatio = (content.match(/[^a-zA-Z0-9\s]/g) || []).length / content.length;
    if (specialCharRatio > 0.3) score -= 15;

    return Math.max(0, score);
  }

  /**
   * Check data consistency
   */
  checkConsistency(data) {
    let score = 100;

    // Check metadata consistency
    if (data.metadata) {
      const content = data.content || '';
      const expectedWordCount = this.countWords(content);
      const metadataWordCount = data.metadata.word_count;

      if (metadataWordCount && Math.abs(expectedWordCount - metadataWordCount) > expectedWordCount * 0.1) {
        score -= 20;
      }
    }

    // Check embedding consistency
    if (data.embedding) {
      if (!Array.isArray(data.embedding) || data.embedding.length !== 1536) {
        score -= 25;
      }
    }

    // Check date consistency
    if (data.created_at && data.updated_at) {
      const created = new Date(data.created_at);
      const updated = new Date(data.updated_at);
      if (updated < created) score -= 15;
    }

    return Math.max(0, score);
  }

  /**
   * Check data validity
   */
  checkValidity(data) {
    let score = 100;

    // Check for valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (data.id && !uuidRegex.test(data.id)) score -= 20;

    // Check for valid dates
    if (data.created_at && isNaN(new Date(data.created_at).getTime())) score -= 15;
    if (data.updated_at && isNaN(new Date(data.updated_at).getTime())) score -= 15;

    // Check content encoding
    const content = data.content || '';
    try {
      // Test for valid UTF-8 encoding
      encodeURIComponent(content);
    } catch (error) {
      score -= 25;
    }

    // Check for suspicious patterns
    if (content.includes('\x00') || content.includes('\uFFFD')) score -= 20;

    return Math.max(0, score);
  }

  /**
   * Clean and normalize text content
   */
  cleanText(text) {
    if (!text) return '';

    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF]/g, '') // Remove invalid chars
      .replace(/(.)\1{4,}/g, '$1$1$1') // Limit character repetition
      .substring(0, 10000); // Limit length
  }

  /**
   * Normalize themes array
   */
  normalizeThemes(themes) {
    if (!Array.isArray(themes)) return [];

    return themes
      .filter(theme => typeof theme === 'string' && theme.trim())
      .map(theme => theme.trim().toLowerCase())
      .filter((theme, index, arr) => arr.indexOf(theme) === index) // Remove duplicates
      .slice(0, 10); // Limit to 10 themes
  }

  /**
   * Normalize insights array
   */
  normalizeInsights(insights) {
    if (!Array.isArray(insights)) return [];

    return insights
      .filter(insight => typeof insight === 'string' && insight.trim().length > 10)
      .map(insight => this.cleanText(insight))
      .slice(0, 20); // Limit to 20 insights
  }

  /**
   * Normalize expertise areas
   */
  normalizeExpertiseAreas(areas) {
    if (!Array.isArray(areas)) return [];

    return areas
      .filter(area => typeof area === 'string' && area.trim())
      .map(area => area.trim().toLowerCase())
      .filter((area, index, arr) => arr.indexOf(area) === index) // Remove duplicates
      .slice(0, 15); // Limit to 15 areas
  }

  /**
   * Normalize date string
   */
  normalizeDate(dateString) {
    if (!dateString) return new Date().toISOString();

    const date = new Date(dateString);
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }

  /**
   * Chunk large content into manageable pieces
   */
  chunkLargeContent(content, maxChunkSize = 1000) {
    if (content.length <= maxChunkSize) return [content];

    const sentences = content.split(/[.!?]+/);
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 10);
  }

  /**
   * Calculate various metrics
   */
  countWords(text) {
    return (text.match(/\b\w+\b/g) || []).length;
  }

  calculateReadingTime(text) {
    const wordsPerMinute = 200;
    const wordCount = this.countWords(text);
    return Math.ceil(wordCount / wordsPerMinute);
  }

  calculateComplexityScore(text) {
    const wordTokenizer = new natural.WordTokenizer();
    const sentenceTokenizer = new natural.SentenceTokenizer();
    const words = wordTokenizer.tokenize(text.toLowerCase());
    const sentences = sentenceTokenizer.tokenize(text);
    
    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = this.estimateAvgSyllables(words);
    
    // Flesch Reading Ease formula
    const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    // Convert to 0-100 scale (higher = more complex)
    return Math.max(0, Math.min(100, 100 - fleschScore));
  }

  calculateSentimentScore(text) {
    try {
      const sentiment = new natural.SentimentAnalyzer('English', natural.PorterStemmer, ['negation']);
      const wordTokenizer = new natural.WordTokenizer();
      const words = wordTokenizer.tokenize(text.toLowerCase());
      const stemmed = words.map(word => natural.PorterStemmer.stem(word));
      
      const score = sentiment.getSentiment(stemmed);
      return Math.max(-1, Math.min(1, score));
    } catch (error) {
      // Fallback to simpler sentiment calculation
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'positive', 'happy', 'success'];
      const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'negative', 'sad', 'failure', 'problem'];
      
      const words = text.toLowerCase().split(/\s+/);
      const positiveCount = words.filter(word => positiveWords.includes(word)).length;
      const negativeCount = words.filter(word => negativeWords.includes(word)).length;
      
      if (positiveCount === 0 && negativeCount === 0) return 0;
      return (positiveCount - negativeCount) / (positiveCount + negativeCount);
    }
  }

  calculateQualityScore(data) {
    const content = data.content || '';
    let score = 100;

    // Content length check
    if (content.length < 50) score -= 30;
    else if (content.length < 200) score -= 15;

    // Title quality check
    if (!data.title || data.title.length < 5) score -= 20;

    // Metadata completeness
    if (!data.metadata || Object.keys(data.metadata).length < 3) score -= 15;

    // Content quality indicators
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 5);
    if (sentences.length < 2) score -= 20;

    return Math.max(0, score);
  }

  calculateEngagementScore(data) {
    let score = 50; // Base score

    if (data.total_stories > 5) score += 20;
    if (data.avg_story_length > 500) score += 15;
    if (data.key_insights && data.key_insights.length > 3) score += 15;

    return Math.min(100, score);
  }

  calculateExpertiseDiversity(areas) {
    if (!Array.isArray(areas)) return 0;
    return Math.min(100, areas.length * 10);
  }

  estimateAvgSyllables(words) {
    const syllableCounts = words.map(word => {
      return Math.max(1, word.replace(/[^aeiouAEIOU]/g, '').length);
    });
    
    return syllableCounts.length > 0 
      ? syllableCounts.reduce((sum, count) => sum + count, 0) / syllableCounts.length 
      : 1;
  }

  calculateQualityMetrics(content) {
    return {
      completeness: content.length > 10 ? 100 : (content.length / 10) * 100,
      accuracy: content.includes('error') ? 50 : 100,
      consistency: 100,
      validity: /^[\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF\s]*$/.test(content) ? 100 : 50
    };
  }

  /**
   * Store normalized data to Supabase
   */
  async storeNormalizedData(data, table = 'normalized_documents') {
    try {
      const { error } = await this.supabase
        .from(table)
        .upsert(data, { onConflict: 'id' });

      if (error) {
        console.error('Storage error:', error);
        throw error;
      }

      console.log(`✅ Stored ${Array.isArray(data) ? data.length : 1} normalized records`);
      return { success: true };

    } catch (error) {
      console.error('Failed to store normalized data:', error);
      throw error;
    }
  }

  /**
   * Get quality metrics summary
   */
  getQualityMetrics() {
    const totalProcessed = this.qualityMetrics.totalProcessed;
    
    return {
      ...this.qualityMetrics,
      qualityScore: totalProcessed > 0 
        ? (this.qualityMetrics.validRecords / totalProcessed) * 100 
        : 0,
      successRate: totalProcessed > 0 
        ? ((totalProcessed - this.qualityMetrics.transformationErrors) / totalProcessed) * 100 
        : 0
    };
  }

  /**
   * Reset quality metrics
   */
  resetQualityMetrics() {
    this.qualityMetrics = {
      totalProcessed: 0,
      validRecords: 0,
      invalidRecords: 0,
      transformationErrors: 0,
      qualityScore: 0
    };
  }
}

export default DataNormalizationService;