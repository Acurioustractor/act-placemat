import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MediaItem {
  id: string;
  file_url: string;
  file_type: 'photo' | 'video';
  title: string;
  description?: string;
  alt_text?: string;
  thumbnail_url?: string;
  manual_tags?: string[];
  impact_themes?: string[];
  photographer?: string;
  capture_date?: string;
  collections?: Array<{
    collection_id: string;
    collection_name: string;
    collection_type: string;
  }>;
}

interface MediaGalleryProps {
  collectionId?: string;
  tags?: string[];
  type?: 'photo' | 'video' | 'all';
  layout?: 'grid' | 'masonry' | 'slideshow';
  showFilters?: boolean;
  limit?: number;
  className?: string;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({
  collectionId,
  tags,
  type = 'all',
  layout = 'grid',
  showFilters = true,
  limit,
  className = ''
}) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [filters, setFilters] = useState({
    type: type,
    tags: tags || [],
    search: ''
  });

  // Fetch media from API
  useEffect(() => {
    const fetchMedia = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        
        if (collectionId) params.append('collection_id', collectionId);
        if (filters.type !== 'all') params.append('type', filters.type);
        if (filters.tags.length > 0) params.append('tags', filters.tags.join(','));
        if (limit) params.append('limit', limit.toString());

        const response = await fetch(`/api/media/items?${params}`);
        const data = await response.json();
        
        setMedia(data.media || []);
      } catch (error) {
        console.error('Error fetching media:', error);
        setMedia([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [collectionId, filters, limit]);

  // Filter media based on search
  const filteredMedia = media.filter(item => 
    filters.search === '' || 
    item.title.toLowerCase().includes(filters.search.toLowerCase()) ||
    item.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
    item.manual_tags?.some(tag => tag.toLowerCase().includes(filters.search.toLowerCase()))
  );

  const updateFilter = (key: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const MediaModal = ({ media, onClose }: { media: MediaItem; onClose: () => void }) => (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Media Display */}
          <div className="relative">
            {media.file_type === 'photo' ? (
              <img 
                src={media.file_url}
                alt={media.alt_text || media.title}
                className="w-full max-h-[60vh] object-contain bg-gray-100"
              />
            ) : (
              <video 
                src={media.file_url}
                controls
                className="w-full max-h-[60vh] object-contain bg-gray-100"
              />
            )}
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-opacity-70 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Media Info */}
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{media.title}</h3>
            
            {media.description && (
              <p className="text-gray-600 mb-4">{media.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              {media.photographer && (
                <div>
                  <span className="font-medium text-gray-700">Photographer:</span>
                  <span className="text-gray-600 ml-2">{media.photographer}</span>
                </div>
              )}
              
              {media.capture_date && (
                <div>
                  <span className="font-medium text-gray-700">Date:</span>
                  <span className="text-gray-600 ml-2">
                    {new Date(media.capture_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Tags */}
            {media.manual_tags && media.manual_tags.length > 0 && (
              <div className="mt-4">
                <span className="font-medium text-gray-700 text-sm block mb-2">Tags:</span>
                <div className="flex flex-wrap gap-2">
                  {media.manual_tags.map((tag) => (
                    <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Impact Themes */}
            {media.impact_themes && media.impact_themes.length > 0 && (
              <div className="mt-4">
                <span className="font-medium text-gray-700 text-sm block mb-2">Impact Areas:</span>
                <div className="flex flex-wrap gap-2">
                  {media.impact_themes.map((theme) => (
                    <span key={theme} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {showFilters && (
          <div className="animate-pulse bg-gray-200 h-12 rounded-lg"></div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 aspect-video rounded-lg mb-3"></div>
              <div className="bg-gray-200 h-4 rounded mb-2"></div>
              <div className="bg-gray-200 h-3 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search media..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filters.type}
              onChange={(e) => updateFilter('type', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Media</option>
              <option value="photo">Photos</option>
              <option value="video">Videos</option>
            </select>

            {/* Results count */}
            <div className="text-sm text-gray-600">
              {filteredMedia.length} {filteredMedia.length === 1 ? 'item' : 'items'}
            </div>
          </div>
        </div>
      )}

      {/* Gallery */}
      {filteredMedia.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No media found</h3>
          <p className="text-gray-600">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className={`
          ${layout === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : layout === 'masonry'
            ? 'columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6'
            : 'space-y-6'
          }
        `}>
          {filteredMedia.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`
                bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group
                ${layout === 'masonry' ? 'break-inside-avoid' : ''}
              `}
              onClick={() => setSelectedMedia(item)}
            >
              {/* Media Preview */}
              <div className="relative aspect-video overflow-hidden">
                {item.file_type === 'photo' ? (
                  <img 
                    src={item.thumbnail_url || item.file_url}
                    alt={item.alt_text || item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-900 flex items-center justify-center group-hover:bg-gray-800 transition-colors">
                    <div className="text-white">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      <div className="text-xs font-medium">Play Video</div>
                    </div>
                  </div>
                )}
                
                {/* Type indicator */}
                <div className="absolute top-3 left-3">
                  <span className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${item.file_type === 'photo' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-purple-100 text-purple-700'
                    }
                  `}>
                    {item.file_type === 'photo' ? '📷 Photo' : '🎥 Video'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 leading-tight">
                  {item.title}
                </h3>
                
                {item.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {item.description}
                  </p>
                )}

                {/* Tags */}
                {item.manual_tags && item.manual_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.manual_tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-1 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                    {item.manual_tags.length > 3 && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 text-xs rounded">
                        +{item.manual_tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  {item.photographer && (
                    <span>📸 {item.photographer}</span>
                  )}
                  {item.capture_date && (
                    <span>
                      {new Date(item.capture_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedMedia && (
        <MediaModal 
          media={selectedMedia} 
          onClose={() => setSelectedMedia(null)} 
        />
      )}
    </div>
  );
};

export default MediaGallery;