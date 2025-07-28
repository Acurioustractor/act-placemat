import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MediaFile {
  file: File;
  id: string;
  preview: string;
  type: 'photo' | 'video';
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
    photographer?: string;
    captureDate?: string;
  };
}

interface MediaUploadProps {
  onUploadComplete?: (files: MediaFile[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  className?: string;
}

const MediaUpload: React.FC<MediaUploadProps> = ({
  onUploadComplete,
  maxFiles = 10,
  acceptedTypes = ['image/*', 'video/*'],
  className = ''
}) => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showMetadataForm, setShowMetadataForm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const createFilePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        // For videos, we'll show a video icon for now
        // In production, you'd generate a thumbnail
        resolve('video-placeholder');
      } else {
        resolve('file-placeholder');
      }
    });
  };

  const processFiles = async (fileList: FileList) => {
    const newFiles = Array.from(fileList).slice(0, maxFiles - files.length);
    
    const processedFiles = await Promise.all(
      newFiles.map(async (file) => {
        const preview = await createFilePreview(file);
        return {
          file,
          id: generateId(),
          preview,
          type: file.type.startsWith('image/') ? 'photo' as const : 'video' as const,
          status: 'pending' as const,
          progress: 0,
          metadata: {
            title: file.name.replace(/\.[^/.]+$/, ''),
            captureDate: new Date().toISOString().split('T')[0]
          }
        };
      })
    );

    setFiles(prev => [...prev, ...processedFiles]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [files.length, maxFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      processFiles(selectedFiles);
    }
  };

  const updateFileMetadata = (fileId: string, metadata: Partial<MediaFile['metadata']>) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, metadata: { ...file.metadata, ...metadata } }
        : file
    ));
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const uploadFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    for (const mediaFile of pendingFiles) {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === mediaFile.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      try {
        const formData = new FormData();
        formData.append('file', mediaFile.file);
        
        // Add metadata
        if (mediaFile.metadata?.title) formData.append('title', mediaFile.metadata.title);
        if (mediaFile.metadata?.description) formData.append('description', mediaFile.metadata.description);
        if (mediaFile.metadata?.photographer) formData.append('photographer', mediaFile.metadata.photographer);
        if (mediaFile.metadata?.captureDate) formData.append('capture_date', mediaFile.metadata.captureDate);
        if (mediaFile.metadata?.tags) formData.append('manual_tags', mediaFile.metadata.tags.join(','));

        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          setFiles(prev => prev.map(f => 
            f.id === mediaFile.id ? { ...f, progress } : f
          ));
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Make actual API call
        const response = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          setFiles(prev => prev.map(f => 
            f.id === mediaFile.id ? { ...f, status: 'success', progress: 100 } : f
          ));
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === mediaFile.id ? { ...f, status: 'error', progress: 0 } : f
        ));
      }
    }

    // Call completion callback
    const completedFiles = files.filter(f => f.status === 'success');
    onUploadComplete?.(completedFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
          ${isDragActive 
            ? 'border-green-500 bg-green-50' 
            : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="space-y-4">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-colors ${
            isDragActive ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
          }`}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isDragActive ? 'Drop your files here' : 'Upload Photos & Videos'}
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Drag and drop your media files or click to browse
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Choose Files
            </button>
          </div>

          <div className="text-xs text-gray-500">
            Supports: Images (JPG, PNG, GIF) and Videos (MP4, MOV) • Max {maxFiles} files
          </div>
        </div>
      </div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">
                Uploaded Files ({files.length})
              </h4>
              {files.some(f => f.status === 'pending') && (
                <button
                  onClick={uploadFiles}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Upload All ({files.filter(f => f.status === 'pending').length})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {files.map((mediaFile) => (
                <motion.div
                  key={mediaFile.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-4">
                    {/* Preview */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {mediaFile.type === 'photo' && mediaFile.preview !== 'file-placeholder' ? (
                        <img 
                          src={mediaFile.preview} 
                          alt={mediaFile.metadata?.title || 'Preview'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {mediaFile.type === 'video' ? (
                            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900 truncate">
                          {mediaFile.metadata?.title || mediaFile.file.name}
                        </h5>
                        <button
                          onClick={() => removeFile(mediaFile.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                          </svg>
                        </button>
                      </div>

                      <div className="text-sm text-gray-600 mb-2">
                        {formatFileSize(mediaFile.file.size)} • {mediaFile.type}
                      </div>

                      {/* Status */}
                      <div className="flex items-center space-x-2 mb-3">
                        {mediaFile.status === 'pending' && (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                            Ready to upload
                          </span>
                        )}
                        {mediaFile.status === 'uploading' && (
                          <div className="flex items-center space-x-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${mediaFile.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{mediaFile.progress}%</span>
                          </div>
                        )}
                        {mediaFile.status === 'success' && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                            Uploaded
                          </span>
                        )}
                        {mediaFile.status === 'error' && (
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                            Upload failed
                          </span>
                        )}
                      </div>

                      {/* Quick metadata form */}
                      {showMetadataForm === mediaFile.id ? (
                        <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                          <input
                            type="text"
                            placeholder="Title"
                            value={mediaFile.metadata?.title || ''}
                            onChange={(e) => updateFileMetadata(mediaFile.id, { title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                          />
                          <textarea
                            placeholder="Description"
                            value={mediaFile.metadata?.description || ''}
                            onChange={(e) => updateFileMetadata(mediaFile.id, { description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                            rows={2}
                          />
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              placeholder="Photographer"
                              value={mediaFile.metadata?.photographer || ''}
                              onChange={(e) => updateFileMetadata(mediaFile.id, { photographer: e.target.value })}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                            />
                            <input
                              type="date"
                              value={mediaFile.metadata?.captureDate || ''}
                              onChange={(e) => updateFileMetadata(mediaFile.id, { captureDate: e.target.value })}
                              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setShowMetadataForm(null)}
                              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowMetadataForm(mediaFile.id)}
                          className="text-sm text-green-600 hover:text-green-700 font-medium"
                        >
                          Add details →
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MediaUpload;