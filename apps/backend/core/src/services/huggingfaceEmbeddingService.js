/**
 * Hugging Face Embedding Service
 * Provides 384-dimensional embeddings using BAAI/bge-small-en-v1.5 model
 * Compatible with existing CRM system embeddings
 */

import { logger } from '../utils/logger.js';

class HuggingFaceEmbeddingService {
  constructor() {
    this.model = 'BAAI/bge-small-en-v1.5';
    this.dimensions = 384;
    this.apiUrl = `https://api-inference.huggingface.co/models/${this.model}`;
    this.apiKey = process.env.HUGGINGFACE_API_KEY;

    if (!this.apiKey) {
      logger.warn('HUGGINGFACE_API_KEY not found, embeddings will not work');
    }

    // Rate limiting
    this.requestQueue = [];
    this.processing = false;
    this.lastRequest = 0;
    this.minInterval = 1000; // 1 second between requests
  }

  /**
   * Generate embeddings for a single text
   */
  async generateEmbedding(text, options = {}) {
    if (!this.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Text input is required and must be a string');
    }

    try {
      // Truncate text to prevent context length issues
      const truncatedText = text.slice(0, 8000); // Conservative limit

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: truncatedText,
          options: {
            wait_for_model: true,
            use_cache: options.useCache !== false,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
      }

      const embedding = await response.json();

      // Hugging Face returns the embedding directly as an array
      if (!Array.isArray(embedding) || embedding.length !== this.dimensions) {
        throw new Error(
          `Invalid embedding response: expected array of length ${this.dimensions}`
        );
      }

      logger.info(
        `Generated ${this.dimensions}D embedding for text: ${text.slice(0, 100)}...`
      );
      return embedding;
    } catch (error) {
      logger.error('Failed to generate Hugging Face embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts with rate limiting
   */
  async generateEmbeddings(texts, options = {}) {
    if (!Array.isArray(texts)) {
      throw new Error('Texts must be an array');
    }

    const results = [];
    const batchSize = options.batchSize || 1; // Process one at a time for rate limiting

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      for (const text of batch) {
        try {
          // Rate limiting
          const now = Date.now();
          const timeSinceLastRequest = now - this.lastRequest;
          if (timeSinceLastRequest < this.minInterval) {
            await new Promise(resolve =>
              setTimeout(resolve, this.minInterval - timeSinceLastRequest)
            );
          }

          const embedding = await this.generateEmbedding(text, options);
          results.push({
            text,
            embedding,
            success: true,
          });

          this.lastRequest = Date.now();
        } catch (error) {
          logger.warn(
            `Failed to generate embedding for text: ${text.slice(0, 50)}...`,
            error.message
          );
          results.push({
            text,
            embedding: null,
            success: false,
            error: error.message,
          });
        }
      }

      // Progress logging for large batches
      if (texts.length > 10 && i % 10 === 0) {
        logger.info(`Processed ${i + batch.length}/${texts.length} embeddings`);
      }
    }

    return results;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(embeddingA, embeddingB) {
    if (!embeddingA || !embeddingB) return 0;
    if (embeddingA.length !== embeddingB.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < embeddingA.length; i++) {
      dotProduct += embeddingA[i] * embeddingB[i];
      magnitudeA += embeddingA[i] * embeddingA[i];
      magnitudeB += embeddingB[i] * embeddingB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Find most similar embeddings using cosine similarity
   */
  findSimilar(queryEmbedding, candidateEmbeddings, limit = 10, threshold = 0.5) {
    const similarities = candidateEmbeddings
      .map((candidate, index) => ({
        index,
        similarity: this.cosineSimilarity(queryEmbedding, candidate.embedding),
        ...candidate,
      }))
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities;
  }

  /**
   * Generate profile text for embedding (matches CRM format)
   */
  generateProfileText(contact) {
    const parts = [];

    if (contact.full_name) parts.push(contact.full_name);
    if (contact.current_position) parts.push(contact.current_position);
    if (contact.current_company) parts.push(contact.current_company);
    if (contact.location) parts.push(contact.location);
    if (contact.bio) parts.push(contact.bio);
    if (contact.expertise_areas) {
      parts.push(
        Array.isArray(contact.expertise_areas)
          ? contact.expertise_areas.join(', ')
          : contact.expertise_areas
      );
    }
    if (contact.interests) parts.push(contact.interests);
    if (contact.impact_tags) parts.push(contact.impact_tags);

    return parts.filter(Boolean).join(' | ');
  }

  /**
   * Health check for the embedding service
   */
  async healthCheck() {
    try {
      if (!this.apiKey) {
        return {
          status: 'error',
          message: 'API key not configured',
          model: this.model,
          dimensions: this.dimensions,
        };
      }

      // Test with simple text
      const testEmbedding = await this.generateEmbedding('Health check test', {
        useCache: false,
      });

      return {
        status: 'healthy',
        model: this.model,
        dimensions: this.dimensions,
        testEmbeddingLength: testEmbedding.length,
        apiKeyConfigured: true,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        model: this.model,
        dimensions: this.dimensions,
        apiKeyConfigured: !!this.apiKey,
      };
    }
  }
}

// Export singleton instance
export default new HuggingFaceEmbeddingService();
