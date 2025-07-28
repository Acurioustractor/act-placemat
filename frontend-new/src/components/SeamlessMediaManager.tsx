import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, Video, FileText, X, Plus, Eye, Edit3, Trash2 } from 'lucide-react';

interface MediaItem {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  file_type: 'photo' | 'video' | 'document';
  title: string;
  description?: string;
  manual_tags: string[];
  photographer?: string;
  created_at: string;
  community_owned: boolean;
  consent_status: 'granted' | 'pending' | 'private';
}

interface SeamlessMediaManagerProps {
  projectTags?: string[];
  onMediaUpdate?: (media: MediaItem[]) => void;
  showUploader?: boolean;
  maxItems?: number;
  layout?: 'grid' | 'carousel' | 'masonry';
}

export default function SeamlessMediaManager({ 
  projectTags = [], 
  onMediaUpdate,
  showUploader = true,
  maxItems = 12,
  layout = 'grid'
}: SeamlessMediaManagerProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);

  // File upload handling
  const handleFiles = useCallback(async (files: FileList) => {
    setIsUploading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tags', JSON.stringify([...projectTags, 'community-media']));
        formData.append('community_owned', 'true');
        formData.append('consent_status', 'pending');

        const response = await fetch('http://localhost:4000/api/platform/act/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const newMedia = await response.json();
          setMediaItems(prev => [...prev, newMedia]);
          onMediaUpdate?.(mediaItems);
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  }, [projectTags, mediaItems, onMediaUpdate]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  // Update media item metadata
  const updateMediaItem = async (id: string, updates: Partial<MediaItem>) => {
    try {
      const response = await fetch(`http://localhost:4000/api/platform/act/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setMediaItems(prev => prev.map(item => item.id === id ? updatedItem : item));
        onMediaUpdate?.(mediaItems);
      }
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  // Delete media item
  const deleteMediaItem = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/platform/act/items/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMediaItems(prev => prev.filter(item => item.id !== id));
        onMediaUpdate?.(mediaItems);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'photo': return <Camera className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getConsentColor = (status: string) => {
    switch (status) {
      case 'granted': return 'bg-green-100 text-green-800 border-green-300';
      case 'pending': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'private': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {showUploader && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
            dragActive 
              ? 'border-green-400 bg-green-50' 
              : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept="image/*,video/*,application/pdf"
            onChange={handleInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              ) : (
                <Upload className="w-8 h-8 text-green-600" />
              )}
            </div>
            
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {isUploading ? 'Uploading community media...' : 'Drop files here or click to upload'}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Photos, videos, and documents welcome • Community ownership tracked • Consent managed
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              {projectTags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  #{tag}
                </span>
              ))}
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                #community-media
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Media Grid */}
      <div className={`grid gap-6 ${
        layout === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' :
        layout === 'carousel' ? 'grid-flow-col auto-cols-max overflow-x-auto' :
        'columns-1 md:columns-2 lg:columns-3'
      }`}>
        {mediaItems.slice(0, maxItems).map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
          >
            {/* Media Preview */}
            <div className="relative aspect-video bg-gray-100">
              {item.file_type === 'photo' ? (
                <img 
                  src={item.thumbnail_url || item.file_url} 
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : item.file_type === 'video' ? (
                <video 
                  src={item.file_url}
                  className="w-full h-full object-cover"
                  controls={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileText className="w-12 h-12 text-gray-400" />
                </div>
              )}
              
              {/* Overlay with Actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="p-1.5 bg-white/90 rounded-lg hover:bg-white"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-1.5 bg-white/90 rounded-lg hover:bg-white"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteMediaItem(item.id)}
                      className="p-1.5 bg-red-100 rounded-lg hover:bg-red-200"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Media Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                  {item.title || `Untitled ${item.file_type}`}
                </h3>
                <div className="flex items-center text-gray-500">
                  {getFileTypeIcon(item.file_type)}
                </div>
              </div>
              
              {item.description && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                  {item.description}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {item.community_owned && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                      Community Owned
                    </span>
                  )}
                  <span className={`px-2 py-0.5 text-xs rounded-full border ${getConsentColor(item.consent_status)}`}>
                    {item.consent_status}
                  </span>
                </div>
                
                {item.photographer && (
                  <p className="text-xs text-gray-500">
                    📸 {item.photographer}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Full Screen Media Viewer */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300"
              >
                <X className="w-8 h-8" />
              </button>
              
              {selectedItem.file_type === 'photo' ? (
                <img 
                  src={selectedItem.file_url} 
                  alt={selectedItem.title}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : selectedItem.file_type === 'video' ? (
                <video 
                  src={selectedItem.file_url}
                  controls
                  className="max-w-full max-h-full rounded-lg"
                />
              ) : (
                <div className="bg-white p-8 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">{selectedItem.title}</h3>
                  <p className="text-gray-600 mb-4">{selectedItem.description}</p>
                  <a 
                    href={selectedItem.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Open Document
                  </a>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Media Modal */}
      <AnimatePresence>
        {editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Edit Media Details</h3>
                <button
                  onClick={() => setEditingItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({...editingItem, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editingItem.description || ''}
                    onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photographer/Creator</label>
                  <input
                    type="text"
                    value={editingItem.photographer || ''}
                    onChange={(e) => setEditingItem({...editingItem, photographer: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consent Status</label>
                  <select
                    value={editingItem.consent_status}
                    onChange={(e) => setEditingItem({...editingItem, consent_status: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="granted">Granted</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateMediaItem(editingItem.id, {
                      title: editingItem.title,
                      description: editingItem.description,
                      photographer: editingItem.photographer,
                      consent_status: editingItem.consent_status
                    });
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}