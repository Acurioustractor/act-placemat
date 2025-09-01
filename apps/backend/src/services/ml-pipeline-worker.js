/**
 * ML Pipeline Worker Thread
 * Handles batch processing tasks in parallel for the ML pipeline
 */

import { parentPort } from 'worker_threads';
import OpenAI from 'openai';
import natural from 'natural';

class MLPipelineWorker {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.tfidf = new natural.TfIdf();
    
    console.log('🔧 ML Pipeline Worker initialized');
  }

  /**
   * Process a batch of data
   */
  async processBatch(batch, options = {}) {
    const { enableEmbeddings = true, batchIndex = 0 } = options;
    
    try {
      console.log(`⚙️  Worker processing batch ${batchIndex} with ${batch.data.length} items`);
      
      const startTime = Date.now();
      const processedItems = [];

      for (const item of batch.data) {
        const processedItem = await this.processItem(item, { enableEmbeddings });
        processedItems.push(processedItem);
      }

      const duration = Date.now() - startTime;
      
      return {
        batchId: batch.id,
        processedCount: processedItems.length,
        processedItems,
        duration,
        workerStats: {
          embeddingsGenerated: processedItems.filter(item => item.embedding).length,
          textProcessed: processedItems.reduce((sum, item) => sum + (item.content?.length || 0), 0),
          avgProcessingTime: duration / processedItems.length
        }
      };

    } catch (error) {
      console.error(`❌ Worker batch processing failed:`, error);
      throw error;
    }
  }

  /**
   * Process individual item
   */
  async processItem(item, options = {}) {
    const { enableEmbeddings = true } = options;
    
    try {
      const processedItem = {
        id: item.id,
        content: item.content,
        metadata: {
          ...item.metadata,
          processed_by: 'ml-pipeline-worker',
          processed_at: new Date().toISOString()
        }
      };

      // Generate text features
      if (item.content) {
        processedItem.textFeatures = this.extractTextFeatures(item.content);
        
        // Add to TF-IDF for this worker
        this.tfidf.addDocument(item.content);
        processedItem.metadata.tfidf_doc_id = this.tfidf.documents.length - 1;
      }

      // Generate embeddings if enabled
      if (enableEmbeddings && item.content) {
        try {
          processedItem.embedding = await this.generateEmbedding(item.content);
          processedItem.metadata.embedding_model = 'text-embedding-ada-002';
          processedItem.metadata.embedding_dimensions = processedItem.embedding.length;
        } catch (embeddingError) {
          console.warn('Embedding generation failed, using text features:', embeddingError.message);
          processedItem.embedding = this.generateTextFeaturesVector(item.content);
          processedItem.metadata.embedding_model = 'text-features-fallback';
        }
      }

      return processedItem;

    } catch (error) {
      console.error('Item processing failed:', error);
      return {
        id: item.id,
        content: item.content,
        error: error.message,
        metadata: {
          ...item.metadata,
          processing_failed: true,
          error_message: error.message
        }
      };
    }
  }

  /**
   * Generate embedding for text using OpenAI
   */
  async generateEmbedding(text) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not available');
    }

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000) // Limit text length
    });

    return response.data[0].embedding;
  }

  /**
   * Extract text features for analysis
   */
  extractTextFeatures(text) {
    const features = {
      length: text.length,
      wordCount: 0,
      sentenceCount: 0,
      avgWordsPerSentence: 0,
      readabilityScore: 0,
      keyPhrases: [],
      entities: [],
      sentiment: {},
      topTerms: []
    };

    try {
      // Basic text statistics
      const words = natural.WordTokenizer().tokenize(text.toLowerCase());
      const sentences = natural.SentenceTokenizer().tokenize(text);
      
      features.wordCount = words.length;
      features.sentenceCount = sentences.length;
      features.avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;

      // Sentiment analysis
      const sentiment = natural.SentimentAnalyzer('English', 
        natural.PorterStemmer, ['negation']);
      const stemmedWords = words.map(word => natural.PorterStemmer.stem(word));
      features.sentiment = {
        score: sentiment.getSentiment(stemmedWords),
        comparative: words.length > 0 ? sentiment.getSentiment(stemmedWords) / words.length : 0
      };

      // Extract key terms using TF-IDF
      const termFreq = {};
      stemmedWords.forEach(word => {
        termFreq[word] = (termFreq[word] || 0) + 1;
      });

      features.topTerms = Object.entries(termFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([term, freq]) => ({ term, frequency: freq }));

      // Simple readability score (Flesch Reading Ease approximation)
      const avgSentenceLength = features.avgWordsPerSentence;
      const avgSyllablesPerWord = this.estimateAvgSyllables(words);
      features.readabilityScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);

      // Extract potential entities (simple pattern matching)
      features.entities = this.extractSimpleEntities(text);

      // Extract key phrases (noun phrases)
      features.keyPhrases = this.extractKeyPhrases(text);

    } catch (error) {
      console.warn('Text feature extraction failed:', error.message);
    }

    return features;
  }

  /**
   * Generate a vector representation from text features
   */
  generateTextFeaturesVector(text) {
    const features = this.extractTextFeatures(text);
    
    // Create a feature vector from numerical features
    const vector = [
      Math.log(features.length + 1) / 10, // Normalized log length
      Math.log(features.wordCount + 1) / 8, // Normalized log word count
      Math.min(features.avgWordsPerSentence / 20, 1), // Normalized avg sentence length
      (features.sentiment.score + 1) / 2, // Normalized sentiment (-1 to 1 → 0 to 1)
      Math.max(0, Math.min(features.readabilityScore / 100, 1)), // Normalized readability
      features.topTerms.length / 10 // Normalized term diversity
    ];

    // Extend vector with top terms (simplified TF-IDF)
    const termVector = new Array(100).fill(0);
    features.topTerms.slice(0, 100).forEach((term, index) => {
      termVector[index] = term.frequency / features.wordCount;
    });

    return vector.concat(termVector);
  }

  /**
   * Estimate average syllables per word
   */
  estimateAvgSyllables(words) {
    const syllableCounts = words.map(word => {
      // Simple syllable counting heuristic
      return Math.max(1, word.replace(/[^aeiouAEIOU]/g, '').length);
    });
    
    return syllableCounts.length > 0 
      ? syllableCounts.reduce((sum, count) => sum + count, 0) / syllableCounts.length 
      : 1;
  }

  /**
   * Extract simple entities using pattern matching
   */
  extractSimpleEntities(text) {
    const entities = [];
    
    // Simple patterns for common entity types
    const patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      url: /https?:\/\/[^\s]+/g,
      currency: /\$[\d,]+\.?\d*/g,
      date: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      capitalized: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        entities.push({ type, value: match });
      });
    }

    return entities.slice(0, 20); // Limit entities
  }

  /**
   * Extract key phrases using simple noun phrase patterns
   */
  extractKeyPhrases(text) {
    // Simple noun phrase extraction using POS tagging patterns
    const phrases = [];
    
    try {
      // Split into sentences and extract potential noun phrases
      const sentences = natural.SentenceTokenizer().tokenize(text);
      
      sentences.forEach(sentence => {
        // Simple pattern: adjective? + noun + noun?
        const words = natural.WordTokenizer().tokenize(sentence);
        
        for (let i = 0; i < words.length - 1; i++) {
          const phrase = words.slice(i, Math.min(i + 3, words.length));
          
          // Filter for potential noun phrases (simple heuristic)
          if (phrase.length >= 2 && 
              phrase.every(word => /^[A-Za-z]+$/.test(word)) &&
              phrase[phrase.length - 1].length > 3) {
            phrases.push(phrase.join(' '));
          }
        }
      });

      // Return unique phrases, sorted by frequency
      const phraseFreq = {};
      phrases.forEach(phrase => {
        phraseFreq[phrase] = (phraseFreq[phrase] || 0) + 1;
      });

      return Object.entries(phraseFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([phrase, freq]) => ({ phrase, frequency: freq }));

    } catch (error) {
      console.warn('Key phrase extraction failed:', error.message);
      return [];
    }
  }

  /**
   * Calculate similarity between two text feature vectors
   */
  calculateSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
      return 0;
    }

    const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

// Initialize worker
const worker = new MLPipelineWorker();

// Handle messages from main thread
parentPort.on('message', async (message) => {
  const { type, batch, options } = message;
  
  try {
    switch (type) {
      case 'process_batch':
        const result = await worker.processBatch(batch, options);
        parentPort.postMessage(result);
        break;
      
      default:
        parentPort.postMessage({ 
          error: `Unknown message type: ${type}` 
        });
    }
  } catch (error) {
    parentPort.postMessage({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

console.log('🔧 ML Pipeline Worker ready for messages');