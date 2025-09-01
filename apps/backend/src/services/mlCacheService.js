/**
 * ML Model Result Caching Service
 * Specialized caching for AI/ML inference results, embeddings, and model outputs
 */

import crypto from 'crypto';
import { cacheService } from './cacheService.js';

class MLCacheService {
  constructor() {
    this.cacheService = cacheService;
    this.modelConfigs = new Map();
    this.inferenceStats = {
      cache_hits: 0,
      cache_misses: 0,
      total_inferences: 0,
      cache_size_mb: 0,
      models_cached: new Set()
    };
    
    // Model-specific cache configurations
    this.initializeModelConfigs();
  }

  initializeModelConfigs() {
    // OpenAI embeddings
    this.modelConfigs.set('text-embedding-3-small', {
      ttl: 86400, // 24 hours
      max_size: 1536, // embedding dimensions
      compression: true
    });
    
    this.modelConfigs.set('text-embedding-3-large', {
      ttl: 86400,
      max_size: 3072,
      compression: true
    });
    
    // Claude model results
    this.modelConfigs.set('claude-3-sonnet', {
      ttl: 3600, // 1 hour
      max_size: 10000, // characters
      compression: false
    });
    
    // GPT model results
    this.modelConfigs.set('gpt-4o', {
      ttl: 3600,
      max_size: 8000,
      compression: false
    });
    
    // Custom analysis models
    this.modelConfigs.set('theme-extraction', {
      ttl: 7200, // 2 hours
      max_size: 500,
      compression: false
    });
    
    this.modelConfigs.set('sentiment-analysis', {
      ttl: 7200,
      max_size: 100,
      compression: false
    });
  }

  /**
   * Generate a deterministic hash for input data
   */
  generateInputHash(input, modelId) {
    const normalizedInput = typeof input === 'object' ? JSON.stringify(input) : String(input);
    const hashInput = `${modelId}:${normalizedInput}`;
    return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
  }

  /**
   * Cache embedding results
   */
  async cacheEmbedding(text, modelId, embedding) {
    const inputHash = this.generateInputHash(text, modelId);
    const config = this.modelConfigs.get(modelId) || { ttl: 3600, compression: true };
    
    const cacheData = {
      text,
      embedding,
      model_id: modelId,
      dimensions: embedding.length,
      created_at: new Date().toISOString(),
      text_hash: crypto.createHash('md5').update(text).digest('hex')
    };
    
    await this.cacheService.setCachedMLResult(
      modelId, 
      inputHash, 
      cacheData, 
      'embedding', 
      config.ttl
    );
    
    this.updateStats(modelId, 'cache_set');
    console.log(`🧠 Cached embedding for model ${modelId} (${embedding.length}d)`);
  }

  /**
   * Retrieve cached embedding
   */
  async getCachedEmbedding(text, modelId) {
    const inputHash = this.generateInputHash(text, modelId);
    const cached = await this.cacheService.getCachedMLResult(modelId, inputHash, 'embedding');
    
    if (cached) {
      this.updateStats(modelId, 'cache_hit');
      console.log(`🎯 Embedding cache hit for model ${modelId}`);
      return cached.embedding;
    }
    
    this.updateStats(modelId, 'cache_miss');
    return null;
  }

  /**
   * Cache AI model inference results
   */
  async cacheInference(prompt, modelId, response, metadata = {}) {
    const inputHash = this.generateInputHash(prompt, modelId);
    const config = this.modelConfigs.get(modelId) || { ttl: 3600, compression: false };
    
    const cacheData = {
      prompt,
      response,
      model_id: modelId,
      metadata: {
        ...metadata,
        response_length: response.length,
        created_at: new Date().toISOString(),
        prompt_hash: crypto.createHash('md5').update(prompt).digest('hex')
      }
    };
    
    // Don't cache very large responses to avoid memory issues
    if (response.length > (config.max_size || 10000)) {
      console.log(`⚠️ Response too large to cache for model ${modelId} (${response.length} chars)`);
      return;
    }
    
    await this.cacheService.setCachedMLResult(
      modelId, 
      inputHash, 
      cacheData, 
      'inference', 
      config.ttl
    );
    
    this.updateStats(modelId, 'cache_set');
    console.log(`🤖 Cached inference for model ${modelId} (${response.length} chars)`);
  }

  /**
   * Retrieve cached inference result
   */
  async getCachedInference(prompt, modelId) {
    const inputHash = this.generateInputHash(prompt, modelId);
    const cached = await this.cacheService.getCachedMLResult(modelId, inputHash, 'inference');
    
    if (cached) {
      this.updateStats(modelId, 'cache_hit');
      console.log(`🎯 Inference cache hit for model ${modelId}`);
      return cached.response;
    }
    
    this.updateStats(modelId, 'cache_miss');
    return null;
  }

  /**
   * Cache analysis results (themes, sentiment, etc.)
   */
  async cacheAnalysis(input, analysisType, result) {
    const modelId = `analysis-${analysisType}`;
    const inputHash = this.generateInputHash(input, modelId);
    
    const cacheData = {
      input,
      analysis_type: analysisType,
      result,
      created_at: new Date().toISOString(),
      confidence: result.confidence || null
    };
    
    await this.cacheService.setCachedMLResult(
      modelId, 
      inputHash, 
      cacheData, 
      'analysis', 
      7200 // 2 hours for analysis results
    );
    
    this.updateStats(modelId, 'cache_set');
    console.log(`📊 Cached ${analysisType} analysis result`);
  }

  /**
   * Retrieve cached analysis result
   */
  async getCachedAnalysis(input, analysisType) {
    const modelId = `analysis-${analysisType}`;
    const inputHash = this.generateInputHash(input, modelId);
    const cached = await this.cacheService.getCachedMLResult(modelId, inputHash, 'analysis');
    
    if (cached) {
      this.updateStats(modelId, 'cache_hit');
      console.log(`🎯 Analysis cache hit for ${analysisType}`);
      return cached.result;
    }
    
    this.updateStats(modelId, 'cache_miss');
    return null;
  }

  /**
   * Batch cache embeddings for multiple texts
   */
  async batchCacheEmbeddings(texts, embeddings, modelId) {
    if (texts.length !== embeddings.length) {
      throw new Error('Texts and embeddings arrays must have the same length');
    }
    
    const promises = texts.map((text, index) => 
      this.cacheEmbedding(text, modelId, embeddings[index])
    );
    
    await Promise.all(promises);
    console.log(`🚀 Batch cached ${texts.length} embeddings for model ${modelId}`);
  }

  /**
   * Check if similar embeddings exist (semantic similarity)
   */
  async findSimilarEmbeddings(text, modelId, threshold = 0.9) {
    // This would require vector similarity search - simplified for now
    const inputHash = this.generateInputHash(text, modelId);
    
    // For now, just check exact match
    const cached = await this.getCachedEmbedding(text, modelId);
    return cached ? [{ text, embedding: cached, similarity: 1.0 }] : [];
  }

  /**
   * Clear cache for specific model
   */
  async clearModelCache(modelId) {
    await this.cacheService.invalidateCachePattern(`ml:${modelId}:`);
    console.log(`🗑️ Cleared cache for model ${modelId}`);
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache() {
    // This would be handled by the underlying cache service TTL
    console.log('🧹 Expired ML cache entries cleared automatically by TTL');
  }

  /**
   * Update statistics
   */
  updateStats(modelId, operation) {
    switch (operation) {
      case 'cache_hit':
        this.inferenceStats.cache_hits++;
        this.inferenceStats.total_inferences++;
        break;
      case 'cache_miss':
        this.inferenceStats.cache_misses++;
        this.inferenceStats.total_inferences++;
        break;
      case 'cache_set':
        this.inferenceStats.models_cached.add(modelId);
        break;
    }
  }

  /**
   * Get cache statistics
   */
  getMLCacheStats() {
    const hitRate = this.inferenceStats.total_inferences > 0 
      ? (this.inferenceStats.cache_hits / this.inferenceStats.total_inferences * 100).toFixed(2)
      : 0;

    return {
      ...this.inferenceStats,
      hit_rate: `${hitRate}%`,
      models_cached: Array.from(this.inferenceStats.models_cached),
      cache_efficiency: {
        saves_compute: this.inferenceStats.cache_hits,
        reduces_api_calls: this.inferenceStats.cache_hits,
        estimated_cost_savings: this.estimateCostSavings()
      },
      supported_models: Array.from(this.modelConfigs.keys()),
      cache_operations: [
        'embeddings',
        'inference_results', 
        'analysis_outputs',
        'batch_operations'
      ]
    };
  }

  /**
   * Estimate cost savings from caching
   */
  estimateCostSavings() {
    // Rough estimates based on typical API costs
    const estimatedSavings = {
      embedding_calls_saved: 0,
      inference_calls_saved: 0,
      estimated_dollar_savings: 0
    };

    this.inferenceStats.models_cached.forEach(modelId => {
      if (modelId.includes('embedding')) {
        estimatedSavings.embedding_calls_saved += Math.floor(this.inferenceStats.cache_hits * 0.3);
        estimatedSavings.estimated_dollar_savings += estimatedSavings.embedding_calls_saved * 0.0001;
      } else {
        estimatedSavings.inference_calls_saved += Math.floor(this.inferenceStats.cache_hits * 0.7);
        estimatedSavings.estimated_dollar_savings += estimatedSavings.inference_calls_saved * 0.002;
      }
    });

    return estimatedSavings;
  }

  /**
   * Health check for ML cache service
   */
  async healthCheck() {
    try {
      const testInput = 'health check test';
      const testHash = this.generateInputHash(testInput, 'health-check');
      
      // Test cache set/get
      await this.cacheService.setCachedMLResult('health-check', testHash, { test: true }, 'test', 60);
      const result = await this.cacheService.getCachedMLResult('health-check', testHash, 'test');
      
      return {
        status: 'healthy',
        cache_accessible: Boolean(result),
        models_supported: this.modelConfigs.size,
        cache_layers_active: this.cacheService.redisEnabled ? 2 : 1,
        last_check: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'degraded',
        error: error.message,
        last_check: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const mlCacheService = new MLCacheService();

export { MLCacheService, mlCacheService };