/**
 * Simple ML Pipeline Service
 * Simplified version focusing on core embedding and similarity functionality
 */

import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import natural from 'natural';

/**
 * Simple ML Pipeline Service
 * Provides embedding generation and similarity search without complex streaming
 */
class SimpleMlPipelineService {
  constructor() {
    // Initialize AI clients
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Initialize Supabase for data access
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // In-memory storage for processed data
    this.documentIndex = [];
    this.embeddingCache = new Map();
    
    // TF-IDF for fallback similarity
    this.tfidf = new natural.TfIdf();

    console.log('🧠 Simple ML Pipeline Service initialized');
  }

  /**
   * Process data from Supabase and generate embeddings
   */
  async processSupabaseData(options = {}) {
    const { 
      tables = ['stories', 'storytellers'], 
      limit = 100,
      enableEmbeddings = true 
    } = options;

    console.log(`🚀 Processing Supabase data from tables: ${tables.join(', ')}`);
    
    const startTime = Date.now();
    let processedCount = 0;

    try {
      for (const table of tables) {
        console.log(`📊 Processing table: ${table}`);
        
        const { data, error } = await this.supabase
          .from(table)
          .select('*')
          .limit(limit);

        if (error) {
          console.error(`Error fetching ${table}:`, error);
          continue;
        }

        for (const record of data) {
          const content = this.extractTextContent(record, table);
          
          if (content && content.length > 10) {
            const document = {
              id: record.id,
              table: table,
              content: content,
              metadata: {
                created_at: record.created_at,
                updated_at: record.updated_at,
                source: `supabase:${table}`,
                original: record
              }
            };

            // Generate embedding if enabled
            if (enableEmbeddings) {
              try {
                document.embedding = await this.generateEmbedding(content);
              } catch (embeddingError) {
                console.warn(`Embedding generation failed for ${record.id}:`, embeddingError.message);
                document.embedding = this.generateSimpleTextVector(content);
              }
            }

            // Add to TF-IDF index
            this.tfidf.addDocument(content);
            
            // Store in document index
            this.documentIndex.push(document);
            processedCount++;
          }
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Processed ${processedCount} documents in ${duration}ms`);

      return {
        success: true,
        processedCount,
        duration,
        documentsIndexed: this.documentIndex.length,
        tfidfDocuments: this.tfidf.documents.length
      };

    } catch (error) {
      console.error('❌ Data processing failed:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text) {
    // Check cache first
    const cacheKey = this.getCacheKey(text);
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey);
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000) // Limit text length
      });

      const embedding = response.data[0].embedding;
      this.embeddingCache.set(cacheKey, embedding);
      
      return embedding;

    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddingsBatch(texts) {
    console.log(`🧠 Generating embeddings for ${texts.length} texts...`);
    
    const embeddings = [];
    
    for (const text of texts) {
      try {
        const embedding = await this.generateEmbedding(text);
        embeddings.push(embedding);
      } catch (error) {
        console.warn('Individual embedding failed, using fallback:', error.message);
        embeddings.push(this.generateSimpleTextVector(text));
      }
    }

    return embeddings;
  }

  /**
   * Perform similarity search
   */
  async performSimilaritySearch(query, options = {}) {
    const {
      limit = 10,
      threshold = 0.7,
      useEmbeddings = true,
      useTFIDF = true
    } = options;

    console.log(`🔍 Performing similarity search for: "${query}"`);

    try {
      let results = [];

      // Vector similarity search
      if (useEmbeddings && this.documentIndex.length > 0) {
        const queryEmbedding = await this.generateEmbedding(query);
        const vectorResults = this.performVectorSimilaritySearch(
          queryEmbedding, 
          threshold, 
          limit
        );
        results = results.concat(vectorResults);
      }

      // TF-IDF similarity search
      if (useTFIDF && this.tfidf.documents.length > 0) {
        const tfidfResults = this.performTFIDFSimilaritySearch(query, limit);
        results = results.concat(tfidfResults);
      }

      // Merge and deduplicate results
      const mergedResults = this.mergeSearchResults(results, limit);

      console.log(`📊 Found ${mergedResults.length} similar documents`);
      return mergedResults;

    } catch (error) {
      console.error('Similarity search failed:', error);
      return [];
    }
  }

  /**
   * Vector similarity search using cosine similarity
   */
  performVectorSimilaritySearch(queryEmbedding, threshold, limit) {
    const similarities = this.documentIndex
      .filter(doc => doc.embedding)
      .map(doc => {
        const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
        return { doc, similarity };
      })
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities.map(item => ({
      id: item.doc.id,
      content: item.doc.content,
      similarity: item.similarity,
      metadata: {
        ...item.doc.metadata,
        search_type: 'vector_embedding'
      }
    }));
  }

  /**
   * TF-IDF similarity search
   */
  performTFIDFSimilaritySearch(query, limit) {
    const similarities = [];
    
    this.tfidf.tfidfs(query, (docIndex, score) => {
      if (score > 0 && this.documentIndex[docIndex]) {
        similarities.push({
          id: this.documentIndex[docIndex].id,
          content: this.documentIndex[docIndex].content,
          similarity: score,
          metadata: {
            ...this.documentIndex[docIndex].metadata,
            search_type: 'tfidf'
          }
        });
      }
    });

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
      return 0;
    }

    const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Merge and deduplicate search results
   */
  mergeSearchResults(results, limit) {
    const seenIds = new Set();
    const merged = [];

    // Sort all results by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    for (const result of results) {
      if (!seenIds.has(result.id) && merged.length < limit) {
        seenIds.add(result.id);
        merged.push(result);
      }
    }

    return merged;
  }

  /**
   * Generate simple text vector as fallback
   */
  generateSimpleTextVector(text) {
    const words = natural.WordTokenizer().tokenize(text.toLowerCase());
    const stemmed = words.map(word => natural.PorterStemmer.stem(word));
    
    // Create a simple frequency-based vector
    const vocabulary = [...new Set(stemmed)];
    const vector = new Array(Math.min(vocabulary.length, 100)).fill(0);
    
    vocabulary.slice(0, 100).forEach((word, index) => {
      const count = stemmed.filter(w => w === word).length;
      vector[index] = count / stemmed.length;
    });

    return vector;
  }

  /**
   * Extract text content from various record types
   */
  extractTextContent(record, table) {
    switch (table) {
      case 'stories':
        return [
          record.title,
          record.content,
          record.summary,
          record.themes?.join(' ')
        ].filter(Boolean).join(' ');
      
      case 'storytellers':
        return [
          record.full_name,
          record.bio,
          record.transcript,
          record.key_insights?.join(' '),
          record.expertise_areas?.join(' ')
        ].filter(Boolean).join(' ');
      
      default:
        return JSON.stringify(record);
    }
  }

  /**
   * Generate cache key for embeddings
   */
  getCacheKey(text) {
    return Buffer.from(text).toString('base64').substring(0, 32);
  }

  /**
   * Get pipeline statistics
   */
  getStats() {
    return {
      documentsIndexed: this.documentIndex.length,
      embeddingsCached: this.embeddingCache.size,
      tfidfDocuments: this.tfidf.documents.length,
      capabilities: {
        embedding_generation: Boolean(process.env.OPENAI_API_KEY),
        vector_similarity: this.documentIndex.some(doc => doc.embedding),
        text_similarity: this.tfidf.documents.length > 0
      }
    };
  }

  /**
   * Health check for ML pipeline
   */
  async healthCheck() {
    const checks = {
      openai: Boolean(process.env.OPENAI_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      embedding_cache: this.embeddingCache.size,
      document_index: this.documentIndex.length,
      tfidf_documents: this.tfidf.documents.length
    };

    return {
      status: 'healthy',
      checks,
      capabilities: {
        embedding_generation: checks.openai,
        similarity_search: checks.document_index > 0 || checks.tfidf_documents > 0,
        data_processing: checks.supabase
      },
      timestamp: new Date().toISOString()
    };
  }
}

export default SimpleMlPipelineService;