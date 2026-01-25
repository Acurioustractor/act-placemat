/**
 * Unified Semantic Search Service
 *
 * Provides hybrid search (semantic + keyword) across all ACT data sources:
 * - Notion (projects, actions, organizations)
 * - Supabase (contacts, stories)
 * - Local content (indexed documents)
 *
 * Uses HuggingFace BGE embeddings (384D) for semantic search
 * and BM25-style text matching for keyword search.
 * Results are combined using Reciprocal Rank Fusion (RRF).
 */

import { logger } from '../utils/logger.js';
import { supabase } from '../lib/database.js';
import huggingfaceEmbeddingService from './huggingfaceEmbeddingService.js';

class UnifiedSearchService {
  constructor() {
    this.embeddingService = huggingfaceEmbeddingService;
    this.indexCache = new Map(); // In-memory cache for embeddings
    this.lastIndexUpdate = null;

    // Search configuration
    this.config = {
      defaultLimit: 20,
      maxLimit: 100,
      semanticWeight: 0.6, // Weight for semantic search in hybrid mode
      keywordWeight: 0.4, // Weight for keyword search in hybrid mode
      rrfK: 60, // RRF constant (standard value)
      minSimilarity: 0.3, // Minimum similarity threshold for semantic results
    };

    // Data source configurations
    this.sources = {
      contacts: {
        table: 'linkedin_contacts',
        searchFields: ['full_name', 'current_position', 'current_company', 'bio', 'location'],
        embeddingField: 'profile_embedding', // If exists
        idField: 'id',
      },
      projects: {
        table: 'notion_projects_cache',
        searchFields: ['name', 'description', 'status'],
        embeddingField: null, // Will use generated embeddings
        idField: 'id',
      },
      stories: {
        table: 'stories',
        searchFields: ['title', 'content', 'summary'],
        embeddingField: 'content_embedding',
        idField: 'id',
      },
    };
  }

  /**
   * Main search endpoint - hybrid search across all sources
   *
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results with scores
   */
  async search(query, options = {}) {
    const startTime = Date.now();
    const {
      sources = ['contacts', 'projects', 'stories'],
      mode = 'hybrid', // 'hybrid', 'semantic', 'keyword'
      limit = this.config.defaultLimit,
      filters = {},
    } = options;

    logger.info(`Unified search: "${query}" across ${sources.join(', ')} (mode: ${mode})`);

    try {
      const results = {
        query,
        mode,
        sources: {},
        combined: [],
        meta: {
          searchTime: 0,
          totalResults: 0,
        },
      };

      // Generate query embedding for semantic search
      let queryEmbedding = null;
      if (mode === 'hybrid' || mode === 'semantic') {
        try {
          queryEmbedding = await this.embeddingService.generateEmbedding(query);
        } catch (error) {
          logger.warn('Failed to generate query embedding, falling back to keyword search', error);
          if (mode === 'semantic') {
            throw new Error('Semantic search unavailable: ' + error.message);
          }
        }
      }

      // Search each source
      const sourcePromises = sources.map(async source => {
        try {
          const sourceResults = await this.searchSource(source, query, queryEmbedding, {
            mode,
            limit,
            filters: filters[source] || {},
          });
          return { source, results: sourceResults };
        } catch (error) {
          logger.error(`Search failed for source ${source}:`, error);
          return { source, results: [], error: error.message };
        }
      });

      const sourceResults = await Promise.all(sourcePromises);

      // Organize results by source
      sourceResults.forEach(({ source, results: sourceData, error }) => {
        results.sources[source] = {
          results: sourceData,
          count: sourceData.length,
          error,
        };
      });

      // Combine results using RRF
      results.combined = this.combineWithRRF(sourceResults, limit);
      results.meta.totalResults = results.combined.length;
      results.meta.searchTime = Date.now() - startTime;

      logger.info(
        `Unified search complete: ${results.meta.totalResults} results in ${results.meta.searchTime}ms`
      );

      return results;
    } catch (error) {
      logger.error('Unified search failed:', error);
      throw error;
    }
  }

  /**
   * Search a specific data source
   */
  async searchSource(source, query, queryEmbedding, options) {
    const sourceConfig = this.sources[source];
    if (!sourceConfig) {
      throw new Error(`Unknown source: ${source}`);
    }

    const { mode, limit, filters } = options;
    let keywordResults = [];
    let semanticResults = [];

    // Keyword search (always available)
    if (mode === 'hybrid' || mode === 'keyword') {
      keywordResults = await this.keywordSearch(sourceConfig, query, limit * 2, filters);
    }

    // Semantic search (if embeddings available)
    if ((mode === 'hybrid' || mode === 'semantic') && queryEmbedding) {
      semanticResults = await this.semanticSearch(
        sourceConfig,
        source,
        queryEmbedding,
        limit * 2,
        filters
      );
    }

    // Combine results based on mode
    if (mode === 'keyword') {
      return keywordResults.slice(0, limit);
    }
    if (mode === 'semantic') {
      return semanticResults.slice(0, limit);
    }

    // Hybrid: combine with RRF
    return this.fuseResults(keywordResults, semanticResults, limit);
  }

  /**
   * Keyword search using PostgreSQL ILIKE
   */
  async keywordSearch(sourceConfig, query, limit, filters) {
    const { table, searchFields, idField } = sourceConfig;
    const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

    try {
      // Build OR conditions for each field and term
      const orConditions = searchFields
        .map(field => searchTerms.map(term => `${field}.ilike.%${term}%`).join(','))
        .join(',');

      let queryBuilder = supabase
        .from(table)
        .select('*')
        .or(orConditions)
        .limit(limit);

      // Apply additional filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryBuilder = queryBuilder.eq(key, value);
        }
      });

      const { data, error } = await queryBuilder;

      if (error) {
        logger.error(`Keyword search error for ${table}:`, error);
        return [];
      }

      // Score results by term frequency
      return (data || []).map(item => {
        const text = searchFields
          .map(f => item[f] || '')
          .join(' ')
          .toLowerCase();
        const termMatches = searchTerms.filter(term => text.includes(term)).length;
        const score = termMatches / searchTerms.length;

        return {
          ...item,
          _source: table,
          _searchType: 'keyword',
          _score: score,
        };
      }).sort((a, b) => b._score - a._score);
    } catch (error) {
      logger.error(`Keyword search failed for ${table}:`, error);
      return [];
    }
  }

  /**
   * Semantic search using embeddings
   * Uses in-memory similarity if pgvector not available
   */
  async semanticSearch(sourceConfig, sourceName, queryEmbedding, limit, filters) {
    const { table, embeddingField, searchFields } = sourceConfig;

    try {
      // Check if we have cached embeddings for this source
      const cacheKey = `${sourceName}_embeddings`;
      let candidateEmbeddings = this.indexCache.get(cacheKey);

      if (!candidateEmbeddings) {
        // Fetch items and generate embeddings on-demand
        candidateEmbeddings = await this.buildSourceEmbeddings(sourceConfig, sourceName, filters);
        this.indexCache.set(cacheKey, candidateEmbeddings);
      }

      // Find similar items
      const similar = this.embeddingService.findSimilar(
        queryEmbedding,
        candidateEmbeddings,
        limit,
        this.config.minSimilarity
      );

      return similar.map(item => ({
        ...item.data,
        _source: sourceName,
        _searchType: 'semantic',
        _score: item.similarity,
      }));
    } catch (error) {
      logger.error(`Semantic search failed for ${sourceName}:`, error);
      return [];
    }
  }

  /**
   * Build embeddings for a data source (lazy loading)
   */
  async buildSourceEmbeddings(sourceConfig, sourceName, filters) {
    const { table, searchFields, embeddingField } = sourceConfig;

    try {
      // Fetch items from source
      let queryBuilder = supabase.from(table).select('*').limit(500); // Limit for performance

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryBuilder = queryBuilder.eq(key, value);
        }
      });

      const { data, error } = await queryBuilder;

      if (error || !data) {
        logger.error(`Failed to fetch ${sourceName} for embedding:`, error);
        return [];
      }

      // Check if items already have embeddings
      if (embeddingField && data.some(item => item[embeddingField])) {
        return data
          .filter(item => item[embeddingField])
          .map(item => ({
            embedding: item[embeddingField],
            data: item,
          }));
      }

      // Generate embeddings for items without them
      logger.info(`Generating embeddings for ${data.length} ${sourceName} items...`);

      const embeddings = [];
      for (const item of data.slice(0, 100)) {
        // Limit to 100 for performance
        const text = searchFields
          .map(f => item[f] || '')
          .filter(Boolean)
          .join(' | ');

        if (text.length < 10) continue;

        try {
          const embedding = await this.embeddingService.generateEmbedding(text);
          embeddings.push({ embedding, data: item });
        } catch (err) {
          // Skip items that fail to embed
          continue;
        }
      }

      logger.info(`Generated ${embeddings.length} embeddings for ${sourceName}`);
      return embeddings;
    } catch (error) {
      logger.error(`Failed to build embeddings for ${sourceName}:`, error);
      return [];
    }
  }

  /**
   * Fuse keyword and semantic results using Reciprocal Rank Fusion
   */
  fuseResults(keywordResults, semanticResults, limit) {
    const rrfScores = new Map();
    const itemsById = new Map();
    const k = this.config.rrfK;

    // Add keyword results to RRF
    keywordResults.forEach((item, rank) => {
      const id = item.id || JSON.stringify(item);
      const score = this.config.keywordWeight / (k + rank + 1);
      rrfScores.set(id, (rrfScores.get(id) || 0) + score);
      itemsById.set(id, item);
    });

    // Add semantic results to RRF
    semanticResults.forEach((item, rank) => {
      const id = item.id || JSON.stringify(item);
      const score = this.config.semanticWeight / (k + rank + 1);
      rrfScores.set(id, (rrfScores.get(id) || 0) + score);
      if (!itemsById.has(id)) {
        itemsById.set(id, item);
      }
    });

    // Sort by RRF score
    const sortedIds = [...rrfScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    return sortedIds.map(id => ({
      ...itemsById.get(id),
      _rrfScore: rrfScores.get(id),
    }));
  }

  /**
   * Combine results from multiple sources using RRF
   */
  combineWithRRF(sourceResults, limit) {
    const allResults = sourceResults.flatMap(sr => sr.results || []);
    const rrfScores = new Map();
    const itemsById = new Map();
    const k = this.config.rrfK;

    // Group by source first
    sourceResults.forEach(({ source, results }) => {
      (results || []).forEach((item, rank) => {
        const id = `${source}:${item.id || rank}`;
        const score = 1 / (k + rank + 1);
        rrfScores.set(id, score);
        itemsById.set(id, { ...item, _sourceType: source });
      });
    });

    // Sort by RRF score
    const sortedIds = [...rrfScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    return sortedIds.map(id => ({
      ...itemsById.get(id),
      _combinedScore: rrfScores.get(id),
    }));
  }

  /**
   * Clear embedding cache (e.g., after data updates)
   */
  clearCache(source = null) {
    if (source) {
      this.indexCache.delete(`${source}_embeddings`);
      logger.info(`Cleared embedding cache for ${source}`);
    } else {
      this.indexCache.clear();
      logger.info('Cleared all embedding caches');
    }
  }

  /**
   * Health check for search service
   */
  async healthCheck() {
    const status = {
      service: 'unified-search',
      status: 'healthy',
      embeddingService: null,
      cacheStatus: {
        sources: [...this.indexCache.keys()],
        totalCached: this.indexCache.size,
      },
      sources: Object.keys(this.sources),
    };

    try {
      status.embeddingService = await this.embeddingService.healthCheck();
    } catch (error) {
      status.embeddingService = { status: 'error', message: error.message };
      status.status = 'degraded';
    }

    return status;
  }
}

// Export singleton instance
export default new UnifiedSearchService();
