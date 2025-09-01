/**
 * Enhanced Media Gallery Service for ACT Placemat
 * Provides advanced media management, search, and organization capabilities
 */

const { logger } = require('../../utils/logger');
const { cacheService } = require('./cacheService');
const { searchOptimizationService } = require('./searchOptimizationService');

class MediaGalleryService {
  constructor() {
    this.supportedFormats = {
      images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
      videos: ['mp4', 'webm', 'ogg', 'mov', 'avi'],
      documents: ['pdf', 'doc', 'docx', 'txt', 'md']
    };
    
    this.thumbnailSizes = {
      small: { width: 150, height: 150 },
      medium: { width: 300, height: 300 },
      large: { width: 600, height: 600 }
    };

    this.mediaCache = new Map();
    this.searchIndex = new Map();
  }

  /**
   * Get media gallery with advanced filtering and search
   */
  async getMediaGallery(options = {}) {
    try {
      const {
        search = '',
        tags = [],
        type = 'all', // 'images', 'videos', 'documents', 'all'
        sortBy = 'created_at',
        sortOrder = 'desc',
        page = 1,
        limit = 50,
        featured = null,
        category = null,
        dateRange = null
      } = options;

      const cacheKey = `media_gallery:${JSON.stringify(options)}`;
      
      // Check cache first
      const cached = cacheService.getCachedQuery('media_gallery', options, []);
      if (cached.fromCache) {
        return this.enhanceMediaResponse(cached.data, options);
      }

      // Mock media data (in real implementation, would fetch from database/storage)
      let mediaItems = await this.getMockMediaData();

      // Apply filters
      if (search) {
        mediaItems = await this.searchMedia(mediaItems, search);
      }

      if (tags.length > 0) {
        mediaItems = mediaItems.filter(item => 
          tags.some(tag => item.tags?.includes(tag))
        );
      }

      if (type !== 'all') {
        mediaItems = mediaItems.filter(item => item.type === type);
      }

      if (featured !== null) {
        mediaItems = mediaItems.filter(item => item.featured === featured);
      }

      if (category) {
        mediaItems = mediaItems.filter(item => item.category === category);
      }

      if (dateRange) {
        const { start, end } = dateRange;
        mediaItems = mediaItems.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate >= new Date(start) && itemDate <= new Date(end);
        });
      }

      // Sort results
      mediaItems.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        
        if (sortOrder === 'desc') {
          return bVal > aVal ? 1 : -1;
        } else {
          return aVal > bVal ? 1 : -1;
        }
      });

      // Paginate
      const offset = (page - 1) * limit;
      const paginatedItems = mediaItems.slice(offset, offset + limit);

      const response = {
        items: paginatedItems,
        total: mediaItems.length,
        page,
        limit,
        totalPages: Math.ceil(mediaItems.length / limit),
        filters: {
          search,
          tags,
          type,
          sortBy,
          sortOrder,
          featured,
          category,
          dateRange
        }
      };

      // Cache the response
      cacheService.setCachedQuery('media_gallery', options, [], response);

      return this.enhanceMediaResponse(response, options);

    } catch (error) {
      logger.error('Error fetching media gallery:', error);
      throw error;
    }
  }

  /**
   * Search media using intelligent indexing
   */
  async searchMedia(mediaItems, searchTerm) {
    if (!searchTerm || searchTerm.length < 2) {
      return mediaItems;
    }

    // Use search optimization service for better results
    const searchResults = await searchOptimizationService.optimizedSearch(
      'media_gallery',
      searchTerm,
      { results: mediaItems }
    );

    return searchResults.results || mediaItems.filter(item =>
      this.matchesSearchTerm(item, searchTerm)
    );
  }

  /**
   * Check if media item matches search term
   */
  matchesSearchTerm(item, searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    const searchableFields = [
      item.title,
      item.description,
      item.alt_text,
      item.caption,
      item.photographer,
      ...(item.tags || []),
      item.category,
      item.story_title
    ].filter(Boolean);

    return searchableFields.some(field =>
      field.toString().toLowerCase().includes(searchLower)
    );
  }

  /**
   * Get media categories with counts
   */
  async getMediaCategories() {
    try {
      const mediaItems = await this.getMockMediaData();
      const categories = {};

      mediaItems.forEach(item => {
        const category = item.category || 'uncategorized';
        categories[category] = (categories[category] || 0) + 1;
      });

      return Object.entries(categories)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    } catch (error) {
      logger.error('Error fetching media categories:', error);
      return [];
    }
  }

  /**
   * Get all unique tags
   */
  async getMediaTags() {
    try {
      const mediaItems = await this.getMockMediaData();
      const tagSet = new Set();

      mediaItems.forEach(item => {
        if (item.tags) {
          item.tags.forEach(tag => tagSet.add(tag));
        }
      });

      return Array.from(tagSet).sort();

    } catch (error) {
      logger.error('Error fetching media tags:', error);
      return [];
    }
  }

  /**
   * Get media statistics
   */
  async getMediaStats() {
    try {
      const mediaItems = await this.getMockMediaData();
      
      const stats = {
        total: mediaItems.length,
        images: mediaItems.filter(item => item.type === 'image').length,
        videos: mediaItems.filter(item => item.type === 'video').length,
        documents: mediaItems.filter(item => item.type === 'document').length,
        featured: mediaItems.filter(item => item.featured).length,
        recent: mediaItems.filter(item => {
          const itemDate = new Date(item.created_at);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return itemDate >= weekAgo;
        }).length,
        totalSize: mediaItems.reduce((sum, item) => sum + (item.file_size || 0), 0),
        categories: await this.getMediaCategories()
      };

      return stats;

    } catch (error) {
      logger.error('Error calculating media stats:', error);
      return { total: 0, images: 0, videos: 0, documents: 0 };
    }
  }

  /**
   * Get related media items
   */
  async getRelatedMedia(mediaId, limit = 6) {
    try {
      const mediaItems = await this.getMockMediaData();
      const targetItem = mediaItems.find(item => item.id === mediaId);
      
      if (!targetItem) {
        return [];
      }

      // Find related items based on tags, category, and story
      const related = mediaItems
        .filter(item => item.id !== mediaId)
        .map(item => ({
          ...item,
          relevanceScore: this.calculateRelevanceScore(targetItem, item)
        }))
        .filter(item => item.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

      return related;

    } catch (error) {
      logger.error('Error fetching related media:', error);
      return [];
    }
  }

  /**
   * Calculate relevance score between two media items
   */
  calculateRelevanceScore(item1, item2) {
    let score = 0;

    // Same story
    if (item1.story_id && item1.story_id === item2.story_id) {
      score += 0.5;
    }

    // Same category
    if (item1.category === item2.category) {
      score += 0.2;
    }

    // Shared tags
    const commonTags = (item1.tags || []).filter(tag => 
      (item2.tags || []).includes(tag)
    );
    score += commonTags.length * 0.1;

    // Same photographer
    if (item1.photographer && item1.photographer === item2.photographer) {
      score += 0.1;
    }

    // Similar creation time (within 30 days)
    const timeDiff = Math.abs(
      new Date(item1.created_at).getTime() - new Date(item2.created_at).getTime()
    );
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    if (daysDiff <= 30) {
      score += 0.1 * (1 - daysDiff / 30);
    }

    return score;
  }

  /**
   * Enhance media response with additional metadata
   */
  enhanceMediaResponse(response, options) {
    // Add thumbnail URLs, file size formatting, etc.
    if (response.items) {
      response.items = response.items.map(item => ({
        ...item,
        thumbnail_url: this.generateThumbnailUrl(item),
        file_size_formatted: this.formatFileSize(item.file_size),
        created_at_formatted: this.formatDate(item.created_at),
        is_recent: this.isRecent(item.created_at)
      }));
    }

    return response;
  }

  /**
   * Generate thumbnail URL
   */
  generateThumbnailUrl(item, size = 'medium') {
    if (item.type === 'image') {
      return `${item.file_url}?w=${this.thumbnailSizes[size].width}&h=${this.thumbnailSizes[size].height}&fit=crop`;
    } else if (item.type === 'video') {
      return item.thumbnail_url || `/api/media/video-thumbnail/${item.id}`;
    } else {
      return `/api/media/document-icon/${item.file_extension}`;
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (!bytes) return 'Unknown size';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Check if item is recent (within 7 days)
   */
  isRecent(dateString) {
    const date = new Date(dateString);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return date >= weekAgo;
  }

  /**
   * Mock media data (replace with actual database queries)
   */
  async getMockMediaData() {
    return [
      {
        id: '1',
        title: 'Community Gardens Project Launch',
        description: 'Launch event for the new community gardens initiative in Fortitude Valley',
        file_url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800',
        file_type: 'image/jpeg',
        file_size: 245760,
        file_extension: 'jpg',
        type: 'image',
        category: 'community',
        tags: ['community', 'gardens', 'launch', 'fortitude-valley'],
        alt_text: 'People gathering at community garden opening ceremony',
        caption: 'Local residents celebrating the opening of the new community garden',
        photographer: 'Sarah Chen',
        credit: 'ACT Photography Team',
        featured: true,
        story_id: 'story-1',
        story_title: 'Growing Together: Community Gardens Transform Neighborhoods',
        cultural_protocols: 'Standard photography protocols followed',
        consent_verified: true,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        title: 'Youth Justice Workshop Video',
        description: 'Recording of youth justice reform workshop with community leaders',
        file_url: 'https://example.com/videos/youth-justice-workshop.mp4',
        thumbnail_url: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800',
        file_type: 'video/mp4',
        file_size: 52428800,
        file_extension: 'mp4',
        type: 'video',
        category: 'justice',
        tags: ['youth', 'justice', 'workshop', 'community-leaders'],
        caption: 'Community workshop on youth justice reform strategies',
        photographer: 'Michael Torres',
        credit: 'ACT Media Team',
        duration: 1800, // 30 minutes
        featured: false,
        story_id: 'story-2',
        story_title: 'Voices for Change: Youth Justice Reform',
        cultural_protocols: 'All participants provided consent for recording',
        consent_verified: true,
        created_at: '2024-01-12T14:20:00Z',
        updated_at: '2024-01-12T14:20:00Z'
      },
      {
        id: '3',
        title: 'Economic Freedom Impact Report',
        description: 'Comprehensive analysis of economic freedom initiatives and their community impact',
        file_url: 'https://example.com/documents/economic-freedom-report-2024.pdf',
        file_type: 'application/pdf',
        file_size: 2097152,
        file_extension: 'pdf',
        type: 'document',
        category: 'research',
        tags: ['economic-freedom', 'report', 'impact', 'analysis'],
        caption: 'Annual impact report on economic freedom programs',
        author: 'Dr. Emma Wilson',
        credit: 'ACT Research Team',
        pages: 45,
        featured: true,
        story_id: 'story-3',
        story_title: 'Breaking Barriers: Economic Freedom Success Stories',
        created_at: '2024-01-10T09:00:00Z',
        updated_at: '2024-01-10T09:00:00Z'
      },
      {
        id: '4',
        title: 'Indigenous Art Workshop',
        description: 'Traditional art workshop led by Aboriginal artists in the community',
        file_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
        file_type: 'image/jpeg',
        file_size: 189440,
        file_extension: 'jpg',
        type: 'image',
        category: 'culture',
        tags: ['indigenous', 'art', 'workshop', 'traditional', 'community'],
        alt_text: 'Aboriginal artist teaching traditional painting techniques',
        caption: 'Elder Mary Johnson teaching traditional dot painting',
        photographer: 'James Mitchell',
        credit: 'Community Photography Collective',
        featured: false,
        story_id: 'story-4',
        story_title: 'Preserving Culture: Traditional Art in Modern Times',
        cultural_protocols: 'Created with full permission and cultural oversight from traditional owners',
        consent_verified: true,
        created_at: '2024-01-08T16:45:00Z',
        updated_at: '2024-01-08T16:45:00Z'
      },
      {
        id: '5',
        title: 'Technology Access Program Launch',
        description: 'Launch of digital inclusion program providing technology access to underserved communities',
        file_url: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800',
        file_type: 'image/jpeg',
        file_size: 167936,
        file_extension: 'jpg',
        type: 'image',
        category: 'technology',
        tags: ['technology', 'digital-inclusion', 'access', 'community', 'education'],
        alt_text: 'People using computers in community technology center',
        caption: 'Community members accessing digital resources at the new tech hub',
        photographer: 'Lisa Park',
        credit: 'ACT Digital Team',
        featured: false,
        story_id: 'story-5',
        story_title: 'Bridging the Digital Divide: Technology for All',
        cultural_protocols: 'Standard protocols followed',
        consent_verified: true,
        created_at: '2024-01-05T11:15:00Z',
        updated_at: '2024-01-05T11:15:00Z'
      },
      {
        id: '6',
        title: 'Community Voices Documentary',
        description: 'Short documentary featuring diverse community perspectives on social change',
        file_url: 'https://example.com/videos/community-voices-doc.mp4',
        thumbnail_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        file_type: 'video/mp4',
        file_size: 104857600,
        file_extension: 'mp4',
        type: 'video',
        category: 'stories',
        tags: ['documentary', 'community', 'voices', 'social-change', 'perspectives'],
        caption: 'Community members sharing their stories of resilience and hope',
        photographer: 'Documentary Collective',
        credit: 'ACT Media Team',
        duration: 1200, // 20 minutes
        featured: true,
        story_id: 'story-6',
        story_title: 'Unheard Voices: Stories of Community Resilience',
        cultural_protocols: 'All storytellers provided informed consent and reviewed final content',
        consent_verified: true,
        created_at: '2024-01-03T13:30:00Z',
        updated_at: '2024-01-03T13:30:00Z'
      }
    ];
  }

  /**
   * Upload new media (mock implementation)
   */
  async uploadMedia(file, metadata = {}) {
    try {
      // Mock upload process
      const fileId = `media-${Date.now()}`;
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      // Determine media type
      let mediaType = 'document';
      if (this.supportedFormats.images.includes(fileExtension)) {
        mediaType = 'image';
      } else if (this.supportedFormats.videos.includes(fileExtension)) {
        mediaType = 'video';
      }

      const mediaItem = {
        id: fileId,
        title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
        description: metadata.description || '',
        file_url: `https://example.com/media/${fileId}.${fileExtension}`,
        file_type: file.type,
        file_size: file.size,
        file_extension: fileExtension,
        type: mediaType,
        category: metadata.category || 'uncategorized',
        tags: metadata.tags || [],
        alt_text: metadata.alt_text || '',
        caption: metadata.caption || '',
        photographer: metadata.photographer || '',
        credit: metadata.credit || '',
        featured: false,
        cultural_protocols: metadata.cultural_protocols || '',
        consent_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // In real implementation, would save to database and upload to storage
      logger.info(`Mock upload successful: ${mediaItem.title} (${mediaItem.type})`);
      
      return mediaItem;

    } catch (error) {
      logger.error('Media upload error:', error);
      throw error;
    }
  }

  /**
   * Delete media item
   */
  async deleteMedia(mediaId) {
    try {
      // Mock deletion
      logger.info(`Mock deletion of media: ${mediaId}`);
      
      // Clear cache
      cacheService.invalidateDatabaseCache('media_gallery');
      
      return { success: true, message: 'Media item deleted successfully' };

    } catch (error) {
      logger.error('Media deletion error:', error);
      throw error;
    }
  }

  /**
   * Update media metadata
   */
  async updateMedia(mediaId, updates) {
    try {
      // Mock update
      logger.info(`Mock update of media ${mediaId}:`, updates);
      
      // Clear cache
      cacheService.invalidateDatabaseCache('media_gallery');
      
      return { success: true, message: 'Media item updated successfully' };

    } catch (error) {
      logger.error('Media update error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const mediaGalleryService = new MediaGalleryService();

module.exports = {
  MediaGalleryService,
  mediaGalleryService
};