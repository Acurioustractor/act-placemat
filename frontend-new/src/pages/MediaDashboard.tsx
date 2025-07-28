import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MediaUpload from '../components/MediaUpload';
import MediaGallery from '../components/MediaGallery';

interface Collection {
  id: string;
  name: string;
  description?: string;
  type: string;
  featured: boolean;
  public_visible: boolean;
  cover_media?: {
    file_url: string;
    thumbnail_url?: string;
    alt_text?: string;
  };
  media_count: number;
  created_at: string;
}

const MediaDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery' | 'collections'>('gallery');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch collections
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch('/api/media/collections');
        const data = await response.json();
        setCollections(data || []);
      } catch (error) {
        console.error('Error fetching collections:', error);
      }
    };

    fetchCollections();
  }, []);

  const CreateCollectionModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      description: '',
      type: 'gallery',
      featured: false
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      
      try {
        const response = await fetch('/api/media/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          const data = await response.json();
          setCollections(prev => [data.collection, ...prev]);
          setShowCreateCollection(false);
          setFormData({ name: '', description: '', type: 'gallery', featured: false });
        }
      } catch (error) {
        console.error('Error creating collection:', error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={() => setShowCreateCollection(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Collection</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Collection Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                placeholder="e.g., Goods Project Gallery"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                rows={3}
                placeholder="Brief description of this collection..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Collection Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              >
                <option value="gallery">Photo Gallery</option>
                <option value="slideshow">Slideshow</option>
                <option value="story-collection">Story Collection</option>
                <option value="project-showcase">Project Showcase</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="featured"
                checked={formData.featured}
                onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="featured" className="ml-2 block text-sm text-gray-700">
                Feature this collection on homepage
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateCollection(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Collection'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    );
  };

  const CollectionsGrid = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Media Collections</h2>
          <p className="text-gray-600">Organize your photos and videos into beautiful galleries</p>
        </div>
        <button
          onClick={() => setShowCreateCollection(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          + New Collection
        </button>
      </div>

      {/* Collections Grid */}
      {collections.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No collections yet</h3>
          <p className="text-gray-600 mb-4">Create your first collection to organize your media</p>
          <button
            onClick={() => setShowCreateCollection(true)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Create Collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <motion.div
              key={collection.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
              onClick={() => {
                setSelectedCollection(collection.id);
                setActiveTab('gallery');
              }}
            >
              {/* Cover Image */}
              <div className="aspect-video bg-gradient-to-br from-green-50 to-blue-50 relative overflow-hidden">
                {collection.cover_media ? (
                  <img 
                    src={collection.cover_media.thumbnail_url || collection.cover_media.file_url}
                    alt={collection.cover_media.alt_text || collection.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                
                {/* Collection type badge */}
                <div className="absolute top-3 left-3">
                  <span className="bg-white bg-opacity-90 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                    {collection.type.replace('-', ' ')}
                  </span>
                </div>
                
                {/* Featured badge */}
                {collection.featured && (
                  <div className="absolute top-3 right-3">
                    <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      ⭐ Featured
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-2">{collection.name}</h3>
                
                {collection.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {collection.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {collection.media_count} {collection.media_count === 1 ? 'item' : 'items'}
                  </span>
                  <span className="text-gray-500">
                    {new Date(collection.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Media Management</h1>
              <p className="text-gray-600 mt-2">
                Upload, organize, and showcase your community's visual stories
              </p>
            </div>
            
            <div className="bg-green-50 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2 text-green-700">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">AI-Powered Tagging Ready</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { id: 'gallery', label: 'Media Gallery', icon: '🖼️' },
              { id: 'upload', label: 'Upload Media', icon: '📤' },
              { id: 'collections', label: 'Collections', icon: '📁' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-colors
                  ${activeTab === tab.id 
                    ? 'bg-white text-green-700 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'gallery' && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {selectedCollection && (
                <div className="mb-6">
                  <button
                    onClick={() => setSelectedCollection(null)}
                    className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium mb-4"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Back to all media</span>
                  </button>
                </div>
              )}
              
              <MediaGallery 
                collectionId={selectedCollection || undefined}
                layout="grid"
                showFilters={true}
              />
            </motion.div>
          )}

          {activeTab === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="max-w-4xl">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Media</h2>
                  <p className="text-gray-600">
                    Upload photos and videos to build your community's visual story library
                  </p>
                </div>
                
                <MediaUpload 
                  onUploadComplete={(files) => {
                    console.log('Upload completed:', files);
                    // Refresh gallery or show success message
                  }}
                  maxFiles={20}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'collections' && (
            <motion.div
              key="collections"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CollectionsGrid />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Collection Modal */}
      <AnimatePresence>
        {showCreateCollection && <CreateCollectionModal />}
      </AnimatePresence>
    </div>
  );
};

export default MediaDashboard;