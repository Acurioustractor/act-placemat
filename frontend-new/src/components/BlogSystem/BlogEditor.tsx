import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Image, 
  Video, 
  FileText, 
  Quote, 
  Users, 
  Heart,
  Save,
  Eye,
  Upload,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'quote' | 'community-voice' | 'divider';
  content: any;
  order: number;
}

interface BlogPost {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content_blocks: ContentBlock[];
  featured_image_url?: string;
  blog_category: string;
  tags: string[];
  status: 'draft' | 'review' | 'published';
  author_name: string;
  author_role: string;
  community_contributors: string[];
  acknowledgements?: string;
  reading_time_minutes: number;
}

const BlogEditor: React.FC = () => {
  const [blogPost, setBlogPost] = useState<BlogPost>({
    title: '',
    slug: '',
    excerpt: '',
    content_blocks: [],
    blog_category: 'empathy-ledger',
    tags: [],
    status: 'draft',
    author_name: 'A Curious Tractor',
    author_role: 'Empathy Ledger Team',
    community_contributors: [],
    reading_time_minutes: 5
  });

  const [isPreview, setIsPreview] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { value: 'empathy-ledger', label: 'The Empathy Ledger', color: 'emerald' },
    { value: 'community-voices', label: 'Community Voices', color: 'teal' },
    { value: 'case-studies', label: 'Case Studies', color: 'blue' },
    { value: 'platform-updates', label: 'Platform Updates', color: 'purple' },
    { value: 'reflections', label: 'Reflections', color: 'green' }
  ];

  const blockTypes = [
    { type: 'text', label: 'Text Block', icon: <FileText className="w-4 h-4" />, description: 'Rich text content' },
    { type: 'image', label: 'Image', icon: <Image className="w-4 h-4" />, description: 'Photos and visuals' },
    { type: 'video', label: 'Video', icon: <Video className="w-4 h-4" />, description: 'Video content' },
    { type: 'quote', label: 'Quote', icon: <Quote className="w-4 h-4" />, description: 'Highlighted quotes' },
    { type: 'community-voice', label: 'Community Voice', icon: <Users className="w-4 h-4" />, description: 'Community member stories' },
    { type: 'divider', label: 'Divider', icon: <Heart className="w-4 h-4" />, description: 'Section break' }
  ];

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const updateTitle = (title: string) => {
    setBlogPost(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }));
  };

  const addContentBlock = (type: string) => {
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}`,
      type: type as ContentBlock['type'],
      content: getDefaultContent(type),
      order: blogPost.content_blocks.length
    };

    setBlogPost(prev => ({
      ...prev,
      content_blocks: [...prev.content_blocks, newBlock]
    }));
  };

  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'text':
        return { text: '', format: 'paragraph' };
      case 'image':
        return { url: '', alt_text: '', caption: '', credit: '' };
      case 'video':
        return { url: '', caption: '', credit: '' };
      case 'quote':
        return { text: '', attribution: '', context: '' };
      case 'community-voice':
        return { speaker_name: '', speaker_role: '', text: '', context: '' };
      case 'divider':
        return { style: 'empathy' };
      default:
        return {};
    }
  };

  const updateContentBlock = (blockId: string, content: any) => {
    setBlogPost(prev => ({
      ...prev,
      content_blocks: prev.content_blocks.map(block =>
        block.id === blockId ? { ...block, content } : block
      )
    }));
  };

  const removeContentBlock = (blockId: string) => {
    setBlogPost(prev => ({
      ...prev,
      content_blocks: prev.content_blocks.filter(block => block.id !== blockId)
    }));
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    setBlogPost(prev => {
      const blocks = [...prev.content_blocks];
      const index = blocks.findIndex(b => b.id === blockId);
      
      if (direction === 'up' && index > 0) {
        [blocks[index], blocks[index - 1]] = [blocks[index - 1], blocks[index]];
      } else if (direction === 'down' && index < blocks.length - 1) {
        [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
      }
      
      return { ...prev, content_blocks: blocks };
    });
  };

  const handleMediaUpload = async (file: File, blockId?: string) => {
    setUploadingMedia(true);
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('blog_post_id', blogPost.id || 'draft');
      formData.append('file_type', file.type.startsWith('image') ? 'image' : 'video');
      
      // Upload to your backend endpoint
      const response = await fetch('/api/blog/upload-media', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const mediaData = await response.json();
      
      // Update the relevant content block
      if (blockId) {
        updateContentBlock(blockId, {
          url: mediaData.file_url,
          alt_text: '',
          caption: '',
          credit: ''
        });
      }
      
    } catch (error) {
      console.error('Media upload failed:', error);
      // Handle error
    } finally {
      setUploadingMedia(false);
    }
  };

  const saveBlogPost = async (status: 'draft' | 'review' | 'published' = 'draft') => {
    setSaveStatus('saving');
    
    try {
      const payload = {
        ...blogPost,
        status,
        reading_time_minutes: estimateReadingTime()
      };
      
      const response = await fetch('/api/blog/posts', {
        method: blogPost.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Save failed');
      
      const savedPost = await response.json();
      setBlogPost(savedPost);
      setSaveStatus('saved');
      
      setTimeout(() => setSaveStatus(null), 3000);
      
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const estimateReadingTime = () => {
    const wordCount = blogPost.content_blocks.reduce((count, block) => {
      if (block.type === 'text') {
        return count + (block.content.text || '').split(' ').length;
      }
      return count;
    }, 0);
    
    return Math.max(1, Math.ceil(wordCount / 200)); // 200 words per minute
  };

  const renderContentBlockEditor = (block: ContentBlock) => {
    switch (block.type) {
      case 'text':
        return (
          <div className="space-y-4">
            <select
              value={block.content.format || 'paragraph'}
              onChange={(e) => updateContentBlock(block.id, { ...block.content, format: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="paragraph">Paragraph</option>
              <option value="heading-1">Heading 1</option>
              <option value="heading-2">Heading 2</option>
              <option value="heading-3">Heading 3</option>
              <option value="bullet-list">Bullet List</option>
            </select>
            <textarea
              value={block.content.text || ''}
              onChange={(e) => updateContentBlock(block.id, { ...block.content, text: e.target.value })}
              placeholder="Write your content here..."
              className="w-full p-4 border border-gray-300 rounded-lg resize-none min-h-[120px] focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              {block.content.url ? (
                <div className="space-y-4">
                  <img 
                    src={block.content.url} 
                    alt={block.content.alt_text || ''} 
                    className="max-w-full h-auto mx-auto rounded-lg"
                  />
                  <button
                    onClick={() => updateContentBlock(block.id, { ...block.content, url: '' })}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove Image
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Image className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleMediaUpload(file, block.id);
                      }}
                      className="hidden"
                      ref={fileInputRef}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingMedia}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {uploadingMedia ? 'Uploading...' : 'Upload Image'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Alt text (accessibility)"
                value={block.content.alt_text || ''}
                onChange={(e) => updateContentBlock(block.id, { ...block.content, alt_text: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="text"
                placeholder="Photo credit"
                value={block.content.credit || ''}
                onChange={(e) => updateContentBlock(block.id, { ...block.content, credit: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <input
              type="text"
              placeholder="Caption"
              value={block.content.caption || ''}
              onChange={(e) => updateContentBlock(block.id, { ...block.content, caption: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        );

      case 'community-voice':
        return (
          <div className="bg-teal-50 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 text-teal-700 font-medium">
              <Users className="w-5 h-5" />
              Community Voice
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Speaker name"
                value={block.content.speaker_name || ''}
                onChange={(e) => updateContentBlock(block.id, { ...block.content, speaker_name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="text"
                placeholder="Role/Organisation"
                value={block.content.speaker_role || ''}
                onChange={(e) => updateContentBlock(block.id, { ...block.content, speaker_role: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <textarea
              placeholder="What they said..."
              value={block.content.text || ''}
              onChange={(e) => updateContentBlock(block.id, { ...block.content, text: e.target.value })}
              className="w-full p-4 border border-gray-300 rounded-lg resize-none min-h-[100px]"
            />
            <input
              type="text"
              placeholder="Context (optional)"
              value={block.content.context || ''}
              onChange={(e) => updateContentBlock(block.id, { ...block.content, context: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        );

      case 'quote':
        return (
          <div className="bg-emerald-50 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 font-medium">
              <Quote className="w-5 h-5" />
              Quote Block
            </div>
            <textarea
              placeholder="Quote text..."
              value={block.content.text || ''}
              onChange={(e) => updateContentBlock(block.id, { ...block.content, text: e.target.value })}
              className="w-full p-4 border border-gray-300 rounded-lg resize-none min-h-[100px]"
            />
            <input
              type="text"
              placeholder="Attribution"
              value={block.content.attribution || ''}
              onChange={(e) => updateContentBlock(block.id, { ...block.content, attribution: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        );

      default:
        return <div className="p-4 bg-gray-50 rounded-lg text-gray-500">Block type not implemented</div>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blog Editor</h1>
          <p className="text-gray-600">Create empathy-driven stories for the community</p>
        </div>
        
        <div className="flex items-center gap-4">
          {saveStatus && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              saveStatus === 'saved' ? 'bg-green-100 text-green-700' :
              saveStatus === 'saving' ? 'bg-blue-100 text-blue-700' :
              'bg-red-100 text-red-700'
            }`}>
              {saveStatus === 'saved' && <CheckCircle className="w-4 h-4" />}
              {saveStatus === 'saving' && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
              {saveStatus === 'error' && <AlertCircle className="w-4 h-4" />}
              {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Error saving'}
            </div>
          )}
          
          <button
            onClick={() => setIsPreview(!isPreview)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Eye className="w-4 h-4" />
            {isPreview ? 'Edit' : 'Preview'}
          </button>
          
          <button
            onClick={() => saveBlogPost('draft')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
        </div>
      </div>

      {!isPreview ? (
        <div className="space-y-8">
          {/* Meta Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Post Details</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={blogPost.title}
                  onChange={(e) => updateTitle(e.target.value)}
                  placeholder="Enter your blog post title..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={blogPost.blog_category}
                  onChange={(e) => setBlogPost(prev => ({ ...prev, blog_category: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={blogPost.status}
                  onChange={(e) => setBlogPost(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="review">Ready for Review</option>
                  <option value="published">Published</option>
                </select>
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
                <textarea
                  value={blogPost.excerpt}
                  onChange={(e) => setBlogPost(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Brief summary for previews and social sharing..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none h-20 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Content Blocks */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Content</h2>
              <div className="text-sm text-gray-600">
                Estimated reading time: {estimateReadingTime()} min
              </div>
            </div>

            {blogPost.content_blocks.map((block, index) => (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">Block {index + 1}</span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs capitalize">
                      {block.type.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveBlock(block.id, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveBlock(block.id, 'down')}
                      disabled={index === blogPost.content_blocks.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeContentBlock(block.id)}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {renderContentBlockEditor(block)}
              </motion.div>
            ))}

            {/* Add Block */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Content Block</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {blockTypes.map((blockType) => (
                  <button
                    key={blockType.type}
                    onClick={() => addContentBlock(blockType.type)}
                    className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                  >
                    <div className="text-emerald-600">{blockType.icon}</div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 text-sm">{blockType.label}</div>
                      <div className="text-xs text-gray-600">{blockType.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Publishing Options */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Publishing</h2>
            <div className="flex gap-4">
              <button
                onClick={() => saveBlogPost('draft')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Save as Draft
              </button>
              <button
                onClick={() => saveBlogPost('review')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Submit for Review
              </button>
              <button
                onClick={() => saveBlogPost('published')}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Publish Now
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Preview Mode</h2>
          {/* Blog preview would go here */}
          <div className="prose max-w-none">
            <h1>{blogPost.title}</h1>
            <p className="lead">{blogPost.excerpt}</p>
            {/* Render content blocks in preview format */}
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogEditor;