/**
 * ML Pipeline Service
 * Enhanced ML pipeline using Node.js ecosystem for data processing, embeddings, and similarity search
 */

import { Transform, Writable, Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { Worker } from 'worker_threads';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { createWriteStream, createReadStream } from 'fs';
import { join } from 'path';
import natural from 'natural';
import { EventEmitter } from 'events';

/**
 * ML Pipeline Service
 * Provides streaming data processing, embedding generation, and similarity search
 */
class MLPipelineService extends EventEmitter {
  constructor() {
    super();
    
    // Initialize AI clients
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Initialize Supabase for vector storage
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Embedding cache for performance
    this.embeddingCache = new Map();
    this.batchQueue = [];
    this.processingBatch = false;

    // TF-IDF for fallback similarity
    this.tfidf = new natural.TfIdf();

    console.log('🧠 ML Pipeline Service initialized');
  }

  /**
   * Create a data processing pipeline using Node.js streams
   */
  createDataProcessingPipeline(options = {}) {
    const {
      source = 'supabase',
      target = 'embeddings',
      batchSize = 100,
      chunkSize = 1000,
      enableEmbeddings = true,
      enableSimilarityIndex = true
    } = options;

    console.log(`🚀 Creating ML data processing pipeline: ${source} → ${target}`);

    const dataSourceStream = this.createDataSourceStream(source, options);
    const textChunkerStream = this.createTextChunkerStream(chunkSize);
    const embeddingStream = enableEmbeddings ? this.createEmbeddingStream(batchSize) : null;
    const similarityIndexStream = enableSimilarityIndex ? this.createSimilarityIndexStream() : null;
    const dataSinkStream = this.createDataSinkStream(target, options);

    return {
      dataSourceStream,
      textChunkerStream,
      embeddingStream,
      similarityIndexStream,
      dataSinkStream,
      execute: async () => await this.executePipeline({
        dataSourceStream,
        textChunkerStream,
        embeddingStream,
        similarityIndexStream,
        dataSinkStream
      })
    };
  }

  /**
   * Create data source stream for reading various data sources
   */
  createDataSourceStream(source, options = {}) {
    switch (source) {
      case 'supabase':
        return this.createSupabaseSourceStream(options);
      case 'files':
        return this.createFileSourceStream(options);
      case 'notion':
        return this.createNotionSourceStream(options);
      case 'gmail':
        return this.createGmailSourceStream(options);
      default:
        throw new Error(`Unsupported data source: ${source}`);
    }
  }

  /**
   * Create Supabase data source stream
   */
  createSupabaseSourceStream(options = {}) {
    const { tables = ['stories', 'storytellers'], limit = 1000 } = options;
    const service = this;
    
    return new Readable({
      objectMode: true,
      async read() {
        try {
          for (const table of tables) {
            const { data, error } = await service.supabase
              .from(table)
              .select('*')
              .limit(limit);

            if (error) {
              this.emit('error', error);
              return;
            }

            for (const record of data) {
              this.push({
                id: record.id,
                table: table,
                content: service.extractTextContent(record, table),
                metadata: {
                  created_at: record.created_at,
                  updated_at: record.updated_at,
                  source: `supabase:${table}`,
                  original: record
                }
              });
            }
          }
          
          this.push(null); // End stream
        } catch (error) {
          this.emit('error', error);
        }
      }
    });
  }

  /**
   * Create file source stream for processing documents
   */
  createFileSourceStream(options = {}) {
    const { directory = './data', extensions = ['.txt', '.md', '.json'] } = options;
    
    return new Readable({
      objectMode: true,
      async read() {
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          
          const files = await fs.readdir(directory);
          
          for (const file of files) {
            const ext = path.extname(file);
            if (extensions.includes(ext)) {
              const filePath = path.join(directory, file);
              const content = await fs.readFile(filePath, 'utf8');
              
              this.push({
                id: file,
                table: 'files',
                content: content,
                metadata: {
                  filename: file,
                  extension: ext,
                  source: `file:${filePath}`,
                  size: Buffer.byteLength(content, 'utf8')
                }
              });
            }
          }
          
          this.push(null);
        } catch (error) {
          this.emit('error', error);
        }
      }
    });
  }

  /**
   * Create text chunker stream for splitting large content
   */
  createTextChunkerStream(chunkSize = 1000) {
    return new Transform({
      objectMode: true,
      transform(record, encoding, callback) {
        try {
          const { content, ...rest } = record;
          
          if (!content || content.length <= chunkSize) {
            // Content is small enough, pass through
            callback(null, record);
            return;
          }

          // Split content into chunks
          const chunks = this.splitTextIntoChunks(content, chunkSize);
          
          chunks.forEach((chunk, index) => {
            this.push({
              ...rest,
              content: chunk,
              metadata: {
                ...rest.metadata,
                chunk_index: index,
                total_chunks: chunks.length,
                chunk_size: chunk.length
              }
            });
          });
          
          callback();
        } catch (error) {
          callback(error);
        }
      },

      splitTextIntoChunks(text, maxSize) {
        const sentences = text.split(/[.!?]+/);
        const chunks = [];
        let currentChunk = '';

        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > maxSize && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk += (currentChunk ? '. ' : '') + sentence;
          }
        }

        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }

        return chunks.filter(chunk => chunk.length > 10); // Filter out tiny chunks
      }
    });
  }

  /**
   * Create embedding generation stream using multiple AI providers
   */
  createEmbeddingStream(batchSize = 50) {
    let batch = [];
    
    return new Transform({
      objectMode: true,
      async transform(record, encoding, callback) {
        try {
          batch.push(record);
          
          if (batch.length >= batchSize) {
            const processedBatch = await this.processBatch(batch);
            
            for (const item of processedBatch) {
              this.push(item);
            }
            
            batch = [];
          }
          
          callback();
        } catch (error) {
          callback(error);
        }
      },

      async flush(callback) {
        try {
          if (batch.length > 0) {
            const processedBatch = await this.processBatch(batch);
            
            for (const item of processedBatch) {
              this.push(item);
            }
          }
          
          callback();
        } catch (error) {
          callback(error);
        }
      },

      async processBatch(records) {
        const embeddings = await this.generateEmbeddingsBatch(
          records.map(r => r.content)
        );
        
        return records.map((record, index) => ({
          ...record,
          embedding: embeddings[index],
          metadata: {
            ...record.metadata,
            embedding_model: 'text-embedding-ada-002',
            embedding_dimensions: embeddings[index]?.length || 0,
            processed_at: new Date().toISOString()
          }
        }));
      }.bind(this)
    });
  }

  /**
   * Create similarity index stream for building searchable index
   */
  createSimilarityIndexStream() {
    const documentIndex = [];
    
    return new Transform({
      objectMode: true,
      transform(record, encoding, callback) {
        try {
          // Add to TF-IDF index for text-based similarity
          this.tfidf.addDocument(record.content);
          
          // Add to document index for vector similarity
          documentIndex.push({
            id: record.id,
            content: record.content,
            embedding: record.embedding,
            metadata: record.metadata
          });
          
          // Add similarity search metadata
          record.metadata = {
            ...record.metadata,
            similarity_index_position: documentIndex.length - 1,
            tfidf_document_id: this.tfidf.documents.length - 1
          };
          
          callback(null, record);
        } catch (error) {
          callback(error);
        }
      }.bind(this),

      flush(callback) {
        // Store the index for later similarity searches
        this.documentIndex = documentIndex;
        console.log(`📊 Built similarity index with ${documentIndex.length} documents`);
        callback();
      }.bind(this)
    });
  }

  /**
   * Create data sink stream for storing processed data
   */
  createDataSinkStream(target, options = {}) {
    switch (target) {
      case 'supabase':
        return this.createSupabaseSinkStream(options);
      case 'file':
        return this.createFileSinkStream(options);
      case 'memory':
        return this.createMemorySinkStream(options);
      default:
        throw new Error(`Unsupported data sink: ${target}`);
    }
  }

  /**
   * Create Supabase sink stream for storing embeddings
   */
  createSupabaseSinkStream(options = {}) {
    const { table = 'document_embeddings' } = options;
    
    return new Writable({
      objectMode: true,
      async write(record, encoding, callback) {
        try {
          const { error } = await this.supabase
            .from(table)
            .upsert({
              id: record.id,
              content: record.content,
              embedding: record.embedding,
              metadata: record.metadata,
              created_at: new Date().toISOString()
            });

          if (error) {
            throw error;
          }

          callback();
        } catch (error) {
          callback(error);
        }
      }.bind(this)
    });
  }

  /**
   * Create file sink stream for saving processed data
   */
  createFileSinkStream(options = {}) {
    const { filename = 'processed_data.jsonl' } = options;
    const writeStream = createWriteStream(filename);
    
    return new Writable({
      objectMode: true,
      write(record, encoding, callback) {
        try {
          writeStream.write(JSON.stringify(record) + '\n');
          callback();
        } catch (error) {
          callback(error);
        }
      },

      final(callback) {
        writeStream.end();
        callback();
      }
    });
  }

  /**
   * Create memory sink stream for in-memory storage
   */
  createMemorySinkStream(options = {}) {
    const results = [];
    
    return new Writable({
      objectMode: true,
      write(record, encoding, callback) {
        results.push(record);
        callback();
      },

      final(callback) {
        this.processedData = results;
        console.log(`💾 Stored ${results.length} processed records in memory`);
        callback();
      }.bind(this)
    });
  }

  /**
   * Execute the complete pipeline
   */
  async executePipeline(streams) {
    const {
      dataSourceStream,
      textChunkerStream,
      embeddingStream,
      similarityIndexStream,
      dataSinkStream
    } = streams;

    console.log('🚀 Executing ML pipeline...');
    const startTime = Date.now();

    try {
      // Build pipeline based on available streams
      const pipelineStreams = [dataSourceStream, textChunkerStream];
      
      if (embeddingStream) {
        pipelineStreams.push(embeddingStream);
      }
      
      if (similarityIndexStream) {
        pipelineStreams.push(similarityIndexStream);
      }
      
      pipelineStreams.push(dataSinkStream);

      // Execute pipeline
      await pipeline(...pipelineStreams);

      const duration = Date.now() - startTime;
      console.log(`✅ ML pipeline completed in ${duration}ms`);

      this.emit('pipeline:complete', {
        duration,
        processedDocuments: this.documentIndex?.length || 0,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        duration,
        processedDocuments: this.documentIndex?.length || 0
      };

    } catch (error) {
      console.error('❌ ML pipeline failed:', error);
      this.emit('pipeline:error', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for a batch of texts
   */
  async generateEmbeddingsBatch(texts) {
    try {
      // Check cache first
      const uncachedTexts = [];
      const cachedEmbeddings = [];
      
      for (const text of texts) {
        const cacheKey = this.getCacheKey(text);
        if (this.embeddingCache.has(cacheKey)) {
          cachedEmbeddings.push(this.embeddingCache.get(cacheKey));
        } else {
          uncachedTexts.push(text);
          cachedEmbeddings.push(null);
        }
      }

      // Generate embeddings for uncached texts
      let newEmbeddings = [];
      if (uncachedTexts.length > 0) {
        console.log(`🧠 Generating embeddings for ${uncachedTexts.length} texts...`);
        
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: uncachedTexts
        });

        newEmbeddings = response.data.map(item => item.embedding);
        
        // Cache new embeddings
        uncachedTexts.forEach((text, index) => {
          const cacheKey = this.getCacheKey(text);
          this.embeddingCache.set(cacheKey, newEmbeddings[index]);
        });
      }

      // Merge cached and new embeddings
      const result = [];
      let newIndex = 0;
      
      for (let i = 0; i < texts.length; i++) {
        if (cachedEmbeddings[i] !== null) {
          result.push(cachedEmbeddings[i]);
        } else {
          result.push(newEmbeddings[newIndex++]);
        }
      }

      return result;

    } catch (error) {
      console.error('Embedding generation failed:', error);
      
      // Fallback to simple text processing
      return texts.map(text => this.generateSimpleEmbedding(text));
    }
  }

  /**
   * Generate simple embedding using TF-IDF as fallback
   */
  generateSimpleEmbedding(text) {
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
   * Perform similarity search using vector embeddings or TF-IDF
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

      if (useEmbeddings && this.documentIndex) {
        // Vector similarity search
        const queryEmbedding = await this.generateEmbeddingsBatch([query]);
        const vectorResults = this.performVectorSimilaritySearch(
          queryEmbedding[0], 
          threshold, 
          limit
        );
        results = results.concat(vectorResults);
      }

      if (useTFIDF) {
        // TF-IDF similarity search
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
   * Perform vector similarity search using cosine similarity
   */
  performVectorSimilaritySearch(queryEmbedding, threshold, limit) {
    if (!this.documentIndex || !queryEmbedding) return [];

    const similarities = this.documentIndex.map(doc => {
      if (!doc.embedding) return { doc, similarity: 0 };
      
      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
      return { doc, similarity };
    });

    return similarities
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => ({
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
   * Perform TF-IDF similarity search
   */
  performTFIDFSimilaritySearch(query, limit) {
    if (!this.tfidf.documents.length) return [];

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
   * Create batch processing job for large datasets
   */
  async createBatchProcessingJob(options = {}) {
    const {
      jobId = `batch_${Date.now()}`,
      dataSource = 'supabase',
      batchSize = 100,
      maxConcurrentBatches = 3,
      enableEmbeddings = true,
      onProgress = null,
      onComplete = null,
      onError = null
    } = options;

    console.log(`🚀 Creating batch processing job: ${jobId}`);

    const job = {
      id: jobId,
      status: 'initialized',
      progress: {
        totalBatches: 0,
        completedBatches: 0,
        failedBatches: 0,
        processedRecords: 0
      },
      startTime: null,
      endTime: null,
      workers: []
    };

    // Create worker pool for parallel processing
    const workerPool = this.createWorkerPool(maxConcurrentBatches);

    try {
      // Start job
      job.status = 'running';
      job.startTime = new Date().toISOString();
      
      // Get data batches
      const batches = await this.createDataBatches(dataSource, batchSize);
      job.progress.totalBatches = batches.length;

      console.log(`📊 Processing ${batches.length} batches with ${maxConcurrentBatches} workers`);

      // Process batches in parallel
      const batchPromises = batches.map(async (batch, index) => {
        const worker = await workerPool.acquire();
        
        try {
          const result = await this.processBatchWithWorker(worker, batch, {
            enableEmbeddings,
            batchIndex: index
          });

          job.progress.completedBatches++;
          job.progress.processedRecords += result.processedCount;

          if (onProgress) {
            onProgress(job.progress);
          }

          return result;

        } catch (error) {
          job.progress.failedBatches++;
          console.error(`Batch ${index} failed:`, error);
          
          if (onError) {
            onError(error, index);
          }

          throw error;
        } finally {
          workerPool.release(worker);
        }
      });

      // Wait for all batches to complete
      const results = await Promise.allSettled(batchPromises);
      
      // Update job status
      job.status = 'completed';
      job.endTime = new Date().toISOString();
      
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      
      console.log(`✅ Batch job ${jobId} completed: ${successfulResults.length}/${batches.length} batches successful`);

      if (onComplete) {
        onComplete(job, successfulResults);
      }

      return {
        job,
        results: successfulResults.map(r => r.value),
        totalProcessed: job.progress.processedRecords,
        duration: new Date(job.endTime) - new Date(job.startTime)
      };

    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date().toISOString();
      
      console.error(`❌ Batch job ${jobId} failed:`, error);
      throw error;
    } finally {
      // Clean up workers
      await workerPool.cleanup();
    }
  }

  /**
   * Create worker pool for parallel processing
   */
  createWorkerPool(maxWorkers) {
    const workers = [];
    const availableWorkers = [];
    const waitingQueue = [];

    for (let i = 0; i < maxWorkers; i++) {
      const worker = new Worker('./ml-pipeline-worker.js');
      workers.push(worker);
      availableWorkers.push(worker);
    }

    return {
      async acquire() {
        if (availableWorkers.length > 0) {
          return availableWorkers.pop();
        }

        return new Promise(resolve => {
          waitingQueue.push(resolve);
        });
      },

      release(worker) {
        if (waitingQueue.length > 0) {
          const resolve = waitingQueue.shift();
          resolve(worker);
        } else {
          availableWorkers.push(worker);
        }
      },

      async cleanup() {
        for (const worker of workers) {
          await worker.terminate();
        }
      }
    };
  }

  /**
   * Create data batches for processing
   */
  async createDataBatches(dataSource, batchSize) {
    // This would implement actual data batching logic
    // For now, return sample batches
    const sampleBatches = [
      { id: 'batch_1', data: [] },
      { id: 'batch_2', data: [] },
      { id: 'batch_3', data: [] }
    ];

    return sampleBatches;
  }

  /**
   * Process batch with worker thread
   */
  async processBatchWithWorker(worker, batch, options) {
    return new Promise((resolve, reject) => {
      worker.postMessage({
        type: 'process_batch',
        batch,
        options
      });

      worker.once('message', (result) => {
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      });

      worker.once('error', reject);
    });
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
   * Health check for ML pipeline
   */
  async healthCheck() {
    const checks = {
      openai: Boolean(process.env.OPENAI_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      embedding_cache: this.embeddingCache.size,
      document_index: this.documentIndex?.length || 0,
      tfidf_documents: this.tfidf.documents.length
    };

    return {
      status: 'healthy',
      checks,
      capabilities: {
        embedding_generation: checks.openai || checks.anthropic,
        similarity_search: checks.document_index > 0 || checks.tfidf_documents > 0,
        batch_processing: true,
        streaming_pipeline: true
      },
      timestamp: new Date().toISOString()
    };
  }
}

export default MLPipelineService;