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
  CheckCircle,
  BookOpen,
  MessageCircle
} from 'lucide-react';
import { unifiedStoryService, Story, ContentBlock } from '../../services/unifiedStoryService';

interface UnifiedStoryEditorProps {
  existingStory?: Story;
  onSave?: (story: Story) => void;
  onCancel?: () => void;
  defaultType?: 'story' | 'blog' | 'case-study' | 'update';
}

const UnifiedStoryEditor: React.FC<UnifiedStoryEditorProps> = ({ 
  existingStory, 
  onSave, 
  onCancel,
  defaultType = 'story'
}) => {
  const [story, setStory] = useState<Partial<Story>>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    content_blocks: [],
    story_type: defaultType,
    blog_category: defaultType === 'blog' ? 'empathy-ledger' : undefined,
    tags: [],
    featured: false,
    author_name: '',
    author_role: '',
    community_contributors: [],
    acknowledgements: '',
    ...existingStory
  });

  const [isPreview, setIsPreview] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storyTypes = [
    { value: 'story', label: 'Community Story', description: 'Personal or community narrative', icon: <Heart className="w-4 h-4" /> },
    { value: 'blog', label: 'Blog Post', description: 'Structured article or update', icon: <BookOpen className="w-4 h-4" /> },
    { value: 'case-study', label: 'Case Study', description: 'Detailed project analysis', icon: <FileText className="w-4 h-4" /> },
    { value: 'update', label: 'Platform Update', description: 'News or feature announcement', icon: <MessageCircle className="w-4 h-4" /> }
  ];

  const blogCategories = [
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
    return unifiedStoryService.generateSlug(title);
  };

  const updateTitle = (title: string) => {
    setStory(prev => ({
      ...prev,
      title,
      slug: story.story_type !== 'story' ? generateSlug(title) : undefined
    }));
  };

  const updateStoryType = (type: 'story' | 'blog' | 'case-study' | 'update') => {
    setStory(prev => ({
      ...prev,
      story_type: type,
      slug: type !== 'story' ? generateSlug(prev.title || '') : undefined,
      blog_category: type === 'blog' ? 'empathy-ledger' : type === 'case-study' ? 'case-studies' : type === 'update' ? 'platform-updates' : undefined
    }));
  };

  const addContentBlock = (type: string) => {
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}`,
      type: type as ContentBlock['type'],
      content: getDefaultContent(type),
      order: (story.content_blocks || []).length
    };

    setStory(prev => ({
      ...prev,
      content_blocks: [...(prev.content_blocks || []), newBlock]
    }));
  };

  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'text':
        return { text: '', format: 'paragraph' };
      case 'image':
        return { url: '', alt_text: '', caption: '', credit: '', cultural_protocols: '' };
      case 'video':
        return { url: '', caption: '', credit: '', cultural_protocols: '' };
      case 'quote':
        return { text: '', attribution: '', context: '' };
      case 'community-voice':
        return { speaker_name: '', speaker_role: '', speaker_location: '', text: '', context: '', cultural_protocols: '' };
      case 'divider':
        return { style: 'empathy' };
      default:
        return {};
    }
  };

  const updateContentBlock = (blockId: string, content: any) => {
    setStory(prev => ({
      ...prev,
      content_blocks: (prev.content_blocks || []).map(block =>
        block.id === blockId ? { ...block, content } : block
      )
    }));
  };

  const removeContentBlock = (blockId: string) => {
    setStory(prev => ({
      ...prev,
      content_blocks: (prev.content_blocks || []).filter(block => block.id !== blockId)
    }));
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    setStory(prev => {
      const blocks = [...(prev.content_blocks || [])];
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
    if (!story.id) {
      // For new stories, we'll handle this after saving
      if (blockId) {
        updateContentBlock(blockId, {
          url: URL.createObjectURL(file), // Temporary preview
          alt_text: '',
          caption: '',
          credit: '',
          _tempFile: file // Store file for later upload
        });
      }
      return;
    }

    setUploadingMedia(true);
    
    try {
      const mediaAsset = await unifiedStoryService.uploadMedia(story.id, file, {
        content_block_id: blockId
      });
      
      if (blockId && mediaAsset) {
        updateContentBlock(blockId, {
          url: mediaAsset.file_url,
          alt_text: mediaAsset.alt_text || '',
          caption: mediaAsset.caption || '',
          credit: mediaAsset.credit || ''
        });
      }
      
    } catch (error) {
      console.error('Media upload failed:', error);
    } finally {
      setUploadingMedia(false);
    }
  };

  const saveStory = async () => {
    setSaveStatus('saving');
    
    try {
      // Combine content blocks into main content for search/fallback
      const combinedContent = [
        story.content || '',
        ...(story.content_blocks || []).map(block => {
          if (block.type === 'text') return block.content.text || '';
          if (block.type === 'quote') return `"${block.content.text}" - ${block.content.attribution}`;
          if (block.type === 'community-voice') return `${block.content.speaker_name}: "${block.content.text}"`;
          return '';
        }).filter(Boolean)
      ].join('\n\n');

      const storyData = {
        ...story,
        content: combinedContent,
        reading_time_minutes: unifiedStoryService.estimateReadingTime(combinedContent)
      };
      
      let savedStory: Story;
      
      if (existingStory?.id) {
        savedStory = await unifiedStoryService.updateStory(existingStory.id, storyData) as Story;
      } else {
        savedStory = await unifiedStoryService.createStory(storyData) as Story;
      }
      
      // Handle any pending media uploads
      if (savedStory.id && story.content_blocks) {
        for (const block of story.content_blocks) {
          if (block.content._tempFile) {
            await handleMediaUpload(block.content._tempFile, block.id);
          }
        }
      }
      
      setStory(savedStory);
      setSaveStatus('saved');
      
      setTimeout(() => setSaveStatus(null), 3000);
      
      if (onSave) {
        onSave(savedStory);
      }
      
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
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
            <textarea
              placeholder="Cultural protocols or considerations"
              value={block.content.cultural_protocols || ''}
              onChange={(e) => updateContentBlock(block.id, { ...block.content, cultural_protocols: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none h-16"
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
            <input
              type="text"
              placeholder="Location (optional)"
              value={block.content.speaker_location || ''}
              onChange={(e) => updateContentBlock(block.id, { ...block.content, speaker_location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
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
            <textarea
              placeholder="Cultural protocols or considerations"
              value={block.content.cultural_protocols || ''}
              onChange={(e) => updateContentBlock(block.id, { ...block.content, cultural_protocols: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none h-16"
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
            <input
              type="text"
              placeholder="Context (optional)"
              value={block.content.context || ''}
              onChange={(e) => updateContentBlock(block.id, { ...block.content, context: e.target.value })}
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
          <h1 className="text-3xl font-bold text-gray-900">Story Editor</h1>
          <p className="text-gray-600">Create empathy-driven content for the community</p>
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
            onClick={saveStory}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <Save className="w-4 h-4" />
            Save
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {!isPreview ? (
        <div className="space-y-8">
          {/* Story Type and Basic Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Story Details</h2>
            
            {/* Story Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Story Type</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {storyTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => updateStoryType(type.value as any)}
                    className={`flex items-center gap-3 p-4 border rounded-lg text-left transition-all ${
                      story.story_type === type.value
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-emerald-600">{type.icon}</div>
                    <div>
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-gray-600">{type.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={story.title || ''}
                  onChange={(e) => updateTitle(e.target.value)}
                  placeholder="Enter your story title..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {story.story_type !== 'story' && (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={story.blog_category || ''}
                      onChange={(e) => setStory(prev => ({ ...prev, blog_category: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      {blogCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <input
                        type="checkbox"
                        checked={story.featured || false}
                        onChange={(e) => setStory(prev => ({ ...prev, featured: e.target.checked }))}
                        className="mr-2"
                      />
                      Featured Story
                    </label>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt/Summary</label>
                <textarea
                  value={story.excerpt || ''}
                  onChange={(e) => setStory(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Brief summary for previews and social sharing..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none h-20 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Author Name</label>
                  <input
                    type="text"
                    value={story.author_name || ''}
                    onChange={(e) => setStory(prev => ({ ...prev, author_name: e.target.value }))}
                    placeholder="Your name or organisation"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Author Role</label>
                  <input
                    type="text"
                    value={story.author_role || ''}
                    onChange={(e) => setStory(prev => ({ ...prev, author_role: e.target.value }))}
                    placeholder="Your role or title"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Content Blocks */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Story Content</h2>
            </div>

            {(story.content_blocks || []).map((block, index) => (
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
                      disabled={index === (story.content_blocks || []).length - 1}
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
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Preview Mode</h2>
          <div className="prose max-w-none">
            <h1>{story.title}</h1>
            {story.excerpt && <p className="lead">{story.excerpt}</p>}
            {/* Content blocks preview would go here */}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedStoryEditor;