import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  User, 
  Eye, 
  ArrowLeft,
  Share2,
  Heart,
  Users,
  Quote
} from 'lucide-react';
import { localBlogService, blogCategories, BlogPost, ContentBlock } from '../data/blogPosts';

const BlogPostDisplay: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      const foundPost = localBlogService.getPost(slug);
      setPost(foundPost);
      if (foundPost) {
        localBlogService.incrementViewCount(slug);
      }
      setLoading(false);
    }
  }, [slug]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCategoryLabel = (category: string) => {
    return blogCategories.find(c => c.value === category)?.label || category;
  };

  const renderContentBlock = (block: ContentBlock) => {
    switch (block.type) {
      case 'text':
        const textContent = block.content.text || '';
        const format = block.content.format || 'paragraph';
        
        if (format === 'heading-1') {
          return <h1 className="text-3xl font-bold text-gray-900 mb-6">{textContent}</h1>;
        } else if (format === 'heading-2') {
          return <h2 className="text-2xl font-bold text-gray-900 mb-4">{textContent}</h2>;
        } else if (format === 'heading-3') {
          return <h3 className="text-xl font-bold text-gray-900 mb-3">{textContent}</h3>;
        } else {
          return <p className="text-gray-700 leading-relaxed mb-6">{textContent}</p>;
        }
        
      case 'quote':
        return (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-6 my-8">
            <div className="flex items-start gap-3">
              <Quote className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" />
              <div>
                <blockquote className="text-lg text-gray-900 font-medium mb-2">
                  "{block.content.text}"
                </blockquote>
                {block.content.attribution && (
                  <cite className="text-emerald-700 font-medium">
                    — {block.content.attribution}
                    {block.content.context && (
                      <span className="text-emerald-600 font-normal">, {block.content.context}</span>
                    )}
                  </cite>
                )}
              </div>
            </div>
          </div>
        );
        
      case 'community-voice':
        return (
          <div className="bg-teal-50 rounded-lg p-6 my-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-teal-200 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-teal-700" />
              </div>
              <div className="flex-1">
                <div className="mb-3">
                  <h4 className="font-semibold text-gray-900">{block.content.speaker_name}</h4>
                  <p className="text-sm text-teal-700">
                    {block.content.speaker_role}
                    {block.content.speaker_location && ` • ${block.content.speaker_location}`}
                  </p>
                </div>
                <blockquote className="text-gray-700 mb-3 italic">
                  "{block.content.text}"
                </blockquote>
                {block.content.context && (
                  <p className="text-sm text-gray-600 mb-2">{block.content.context}</p>
                )}
                {block.content.cultural_protocols && (
                  <p className="text-xs text-teal-600">{block.content.cultural_protocols}</p>
                )}
              </div>
            </div>
          </div>
        );
        
      case 'image':
        return (
          <div className="my-8">
            <img 
              src={block.content.url} 
              alt={block.content.alt_text || ''} 
              className="w-full rounded-lg"
            />
            {(block.content.caption || block.content.credit) && (
              <div className="mt-3 text-sm text-gray-600">
                {block.content.caption && <p>{block.content.caption}</p>}
                {block.content.credit && <p className="text-xs">Credit: {block.content.credit}</p>}
                {block.content.cultural_protocols && (
                  <p className="text-xs text-gray-500 mt-1">{block.content.cultural_protocols}</p>
                )}
              </div>
            )}
          </div>
        );
        
      case 'divider':
        return (
          <div className="my-8 flex justify-center">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-emerald-500" />
              <div className="w-12 h-px bg-emerald-300"></div>
              <Heart className="w-4 h-4 text-emerald-500" />
              <div className="w-12 h-px bg-emerald-300"></div>
              <Heart className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Story not found</h1>
          <p className="text-gray-600 mb-4">The story you're looking for doesn't exist.</p>
          <Link 
            to="/stories" 
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Back to Stories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate('/stories')}
            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Stories
          </button>
          
          {/* Category */}
          {post.blog_category && (
            <div className="mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
                {getCategoryLabel(post.blog_category)}
              </span>
            </div>
          )}
          
          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>
          
          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-xl text-gray-600 mb-6 leading-relaxed">
              {post.excerpt}
            </p>
          )}
          
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{post.author_name}</span>
              {post.author_role && <span>• {post.author_role}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(post.created_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{post.reading_time_minutes} min read</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>{post.view_count} views</span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Image */}
      {post.featured_image_url && (
        <div className="aspect-video bg-gray-200 overflow-hidden">
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <article className="prose prose-lg max-w-none">
          {/* Render content blocks if they exist */}
          {post.content_blocks && post.content_blocks.length > 0 ? (
            <div className="space-y-6">
              {post.content_blocks
                .sort((a, b) => a.order - b.order)
                .map((block) => (
                  <motion.div
                    key={block.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                  >
                    {renderContentBlock(block)}
                  </motion.div>
                ))}
            </div>
          ) : (
            /* Fallback to main content */
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br/>') }}
            />
          )}
        </article>

        {/* Community Contributors */}
        {post.community_contributors && post.community_contributors.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Community Contributors</h3>
            <p className="text-gray-600">
              {post.community_contributors.join(', ')}
            </p>
          </div>
        )}

        {/* Acknowledgements */}
        {post.acknowledgements && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Acknowledgements</h3>
            <p className="text-gray-600">{post.acknowledgements}</p>
          </div>
        )}

        {/* Share and Actions */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
                <Heart className="w-5 h-5" />
                <span>Support this story</span>
              </button>
              <button className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
                <Share2 className="w-5 h-5" />
                <span>Share</span>
              </button>
            </div>
            
            <Link
              to="/stories/new"
              className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Write Your Story
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPostDisplay;