/**
 * Search Optimization Service for ACT Placemat
 * Implements advanced search indexing and optimization to reduce search time from 6s to <2s
 */

const { cacheService } = require('./cacheService');

class SearchOptimizationService {
  constructor() {
    this.searchIndex = new Map(); // In-memory search index
    this.fieldWeights = {
      // Higher weights for more important fields
      'Name': 10,
      'Title': 10,
      'Description': 5,
      'Tags': 7,
      'Area': 8,
      'Status': 6,
      'Type': 6,
      'Organization': 4,
      'Person': 4
    };
    
    this.indexLastUpdated = new Map();
    this.indexTTL = 600000; // 10 minutes
  }

  /**
   * Build searchable index from database results
   */
  buildSearchIndex(databaseId, data) {
    const index = new Map();
    
    if (!data || !data.results) {
      console.warn(`No data provided for indexing database ${databaseId}`);
      return index;
    }

    console.log(`🔍 Building search index for ${databaseId.substring(0, 8)}... (${data.results.length} items)`);
    
    data.results.forEach((item, idx) => {
      const searchableText = this.extractSearchableText(item);
      const searchTerms = this.tokenizeText(searchableText);
      
      // Create reverse index: term -> [item indices]
      searchTerms.forEach(term => {
        if (!index.has(term)) {
          index.set(term, []);
        }
        index.get(term).push({
          index: idx,
          item: item,
          relevance: this.calculateRelevance(term, item)
        });
      });
    });

    this.searchIndex.set(databaseId, index);
    this.indexLastUpdated.set(databaseId, Date.now());
    
    console.log(`✅ Search index built: ${index.size} unique terms`);
    return index;
  }

  /**
   * Extract all searchable text from a Notion item
   */
  extractSearchableText(item) {
    const textParts = [];
    
    if (!item.properties) return '';

    Object.entries(item.properties).forEach(([fieldName, fieldValue]) => {
      const weight = this.fieldWeights[fieldName] || 1;
      const text = this.extractFieldText(fieldValue);
      
      if (text) {
        // Repeat high-importance fields to boost their weight in search
        for (let i = 0; i < weight; i++) {
          textParts.push(text);
        }
      }
    });

    return textParts.join(' ').toLowerCase();
  }

  /**
   * Extract text from various Notion field types
   */
  extractFieldText(fieldValue) {
    if (!fieldValue) return '';

    switch (fieldValue.type || 'unknown') {
      case 'title':
        return fieldValue.title?.map(t => t.plain_text).join(' ') || '';
      
      case 'rich_text':
        return fieldValue.rich_text?.map(t => t.plain_text).join(' ') || '';
      
      case 'select':
        return fieldValue.select?.name || '';
      
      case 'multi_select':
        return fieldValue.multi_select?.map(s => s.name).join(' ') || '';
      
      case 'number':
        return fieldValue.number?.toString() || '';
      
      case 'date':
        return fieldValue.date?.start || '';
      
      case 'people':
        return fieldValue.people?.map(p => p.name).join(' ') || '';
      
      case 'relation':
        return ''; // Relations don't have directly searchable text
      
      case 'formula':
        return fieldValue.formula?.string || fieldValue.formula?.number?.toString() || '';
      
      case 'rollup':
        return this.extractRollupText(fieldValue.rollup);
      
      default:
        // Handle cases where fieldValue might be the content directly
        if (fieldValue.title) return fieldValue.title.map(t => t.plain_text).join(' ');
        if (fieldValue.rich_text) return fieldValue.rich_text.map(t => t.plain_text).join(' ');
        if (fieldValue.select) return fieldValue.select.name;
        if (fieldValue.multi_select) return fieldValue.multi_select.map(s => s.name).join(' ');
        return '';
    }
  }

  extractRollupText(rollup) {
    if (!rollup || !rollup.array) return '';
    
    return rollup.array.map(item => {
      if (item.title) return item.title.map(t => t.plain_text).join(' ');
      if (item.rich_text) return item.rich_text.map(t => t.plain_text).join(' ');
      if (item.select) return item.select.name;
      if (typeof item === 'string') return item;
      if (typeof item === 'number') return item.toString();
      return '';
    }).join(' ');
  }

  /**
   * Tokenize text into searchable terms
   */
  tokenizeText(text) {
    if (!text) return [];
    
    // Remove special characters and split on whitespace
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2); // Ignore very short terms

    // Include partial matches for important terms
    const expandedTokens = [...tokens];
    tokens.forEach(token => {
      if (token.length > 4) {
        // Add prefixes for partial matching
        for (let i = 3; i < token.length; i++) {
          expandedTokens.push(token.substring(0, i));
        }
      }
    });

    return [...new Set(expandedTokens)]; // Remove duplicates
  }

  /**
   * Calculate relevance score for a search term in an item
   */
  calculateRelevance(term, item) {
    let relevance = 1;
    
    if (!item.properties) return relevance;

    Object.entries(item.properties).forEach(([fieldName, fieldValue]) => {
      const fieldText = this.extractFieldText(fieldValue).toLowerCase();
      const weight = this.fieldWeights[fieldName] || 1;
      
      if (fieldText.includes(term)) {
        // Exact matches get higher relevance
        if (fieldText === term) {
          relevance += weight * 10;
        } else if (fieldText.startsWith(term)) {
          relevance += weight * 5;
        } else {
          relevance += weight * 2;
        }
      }
    });

    return relevance;
  }

  /**
   * Perform optimized search using the built index
   */
  async optimizedSearch(databaseId, searchTerm, originalData, maxResults = 50) {
    const startTime = Date.now();
    
    if (!searchTerm || searchTerm.length < 2) {
      return {
        results: originalData.results || [],
        searchTime: Date.now() - startTime,
        fromIndex: false
      };
    }

    // Check if we need to rebuild the index
    const lastUpdated = this.indexLastUpdated.get(databaseId);
    if (!lastUpdated || Date.now() - lastUpdated > this.indexTTL) {
      this.buildSearchIndex(databaseId, originalData);
    }

    const index = this.searchIndex.get(databaseId);
    if (!index) {
      console.warn(`No search index available for ${databaseId}, falling back to basic search`);
      return this.basicSearch(searchTerm, originalData, maxResults);
    }

    // Tokenize search query
    const searchTerms = this.tokenizeText(searchTerm);
    const matchingItems = new Map(); // item index -> total relevance

    // Find matches for each search term
    searchTerms.forEach(term => {
      const matches = index.get(term) || [];
      matches.forEach(match => {
        const currentRelevance = matchingItems.get(match.index) || 0;
        matchingItems.set(match.index, currentRelevance + match.relevance);
      });
    });

    // Sort by relevance and return top results
    const sortedMatches = Array.from(matchingItems.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by relevance desc
      .slice(0, maxResults)
      .map(([itemIndex]) => originalData.results[itemIndex]);

    const searchTime = Date.now() - startTime;
    
    console.log(`🔍 Optimized search completed: ${sortedMatches.length} results in ${searchTime}ms`);

    return {
      results: sortedMatches,
      searchTime: searchTime,
      fromIndex: true,
      totalMatches: matchingItems.size,
      searchTerms: searchTerms
    };
  }

  /**
   * Fallback basic search when index is not available
   */
  basicSearch(searchTerm, originalData, maxResults = 50) {
    const startTime = Date.now();
    const searchLower = searchTerm.toLowerCase();
    
    if (!originalData.results) {
      return {
        results: [],
        searchTime: Date.now() - startTime,
        fromIndex: false
      };
    }

    const matches = originalData.results.filter(item => {
      const searchableText = this.extractSearchableText(item);
      return searchableText.includes(searchLower);
    }).slice(0, maxResults);

    const searchTime = Date.now() - startTime;
    
    console.log(`🔍 Basic search completed: ${matches.length} results in ${searchTime}ms`);

    return {
      results: matches,
      searchTime: searchTime,
      fromIndex: false
    };
  }

  /**
   * Get search performance statistics
   */
  getSearchStats() {
    const stats = {
      indexedDatabases: Array.from(this.searchIndex.keys()).map(id => ({
        id: id.substring(0, 8) + '...',
        terms: this.searchIndex.get(id)?.size || 0,
        lastUpdated: this.indexLastUpdated.get(id)
      })),
      totalIndexes: this.searchIndex.size,
      fieldWeights: this.fieldWeights
    };

    return stats;
  }

  /**
   * Clear search indexes for a specific database
   */
  clearSearchIndex(databaseId) {
    this.searchIndex.delete(databaseId);
    this.indexLastUpdated.delete(databaseId);
    console.log(`🗑️ Cleared search index for ${databaseId.substring(0, 8)}...`);
  }

  /**
   * Clear all search indexes
   */
  clearAllIndexes() {
    this.searchIndex.clear();
    this.indexLastUpdated.clear();
    console.log('🗑️ Cleared all search indexes');
  }

  /**
   * Preload search indexes for common databases
   */
  async preloadSearchIndexes(databases) {
    console.log('🔄 Preloading search indexes...');
    
    for (const [databaseId, data] of databases) {
      try {
        this.buildSearchIndex(databaseId, data);
      } catch (error) {
        console.error(`❌ Error building search index for ${databaseId}:`, error.message);
      }
    }
    
    console.log('✅ Search index preloading complete');
  }
}

// Create singleton instance
const searchOptimizationService = new SearchOptimizationService();

module.exports = {
  SearchOptimizationService,
  searchOptimizationService
};