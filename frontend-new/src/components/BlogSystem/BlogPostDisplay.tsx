import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Users, Heart, Share2, Eye } from 'lucide-react';

interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'quote' | 'community-voice' | 'divider';
  content: any;
  order: number;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content_blocks: ContentBlock[];
  featured_image_url?: string;
  blog_category: string;
  tags: string[];
  published_at: string;
  featured: boolean;
  author_name: string;
  author_role: string;
  community_contributors: string[];
  acknowledgements?: string;
  reading_time_minutes: number;
  view_count: number;
}

interface BlogPostDisplayProps {
  post: BlogPost;
  onShare?: () => void;
  onViewCountUpdate?: () => void;
}

const BlogPostDisplay: React.FC<BlogPostDisplayProps> = ({ 
  post, 
  onShare, 
  onViewCountUpdate 
}) => {
  React.useEffect(() => {
    // Track view when component mounts
    onViewCountUpdate?.();
  }, [onViewCountUpdate]);

  const getCategoryTheme = (category: string) => {
    const themes: Record<string, { bg: string; text: string; border: string }> = {
      'empathy-ledger': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
      'community-voices': { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
      'case-studies': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
      'platform-updates': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
      'reflections': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' }
    };
    return themes[category] || themes['empathy-ledger'];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderContentBlock = (block: ContentBlock) => {
    switch (block.type) {
      case 'text':
        const { text, format } = block.content;
        const textClasses = {
          'paragraph': 'text-lg leading-relaxed text-gray-700 mb-6',
          'heading-1': 'text-4xl font-bold text-gray-900 mb-8 mt-12',
          'heading-2': 'text-3xl font-bold text-gray-900 mb-6 mt-10',
          'heading-3': 'text-2xl font-bold text-gray-900 mb-4 mt-8',
          'bullet-list': 'text-lg leading-relaxed text-gray-700 mb-6'
        };

        if (format === 'bullet-list') {
          const items = text.split('\n').filter((item: string) => item.trim());
          return (
            <ul key={block.id} className="list-disc list-inside space-y-2 mb-6">
              {items.map((item: string, index: number) => (
                <li key={index} className="text-lg leading-relaxed text-gray-700">
                  {item.replace(/^[-*]\s*/, '')}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <div key={block.id} className={textClasses[format as keyof typeof textClasses] || textClasses.paragraph}>
            {text}
          </div>
        );

      case 'image':
        const { url, alt_text, caption, credit } = block.content;
        return (
          <figure key={block.id} className="my-8">
            <img 
              src={url} 
              alt={alt_text || ''} 
              className="w-full rounded-2xl shadow-lg"
            />
            {(caption || credit) && (
              <figcaption className="mt-4 text-center">
                {caption && <div className="text-gray-600 text-sm mb-1">{caption}</div>}
                {credit && <div className="text-gray-500 text-xs">Photo: {credit}</div>}
              </figcaption>
            )}
          </figure>
        );

      case 'video':
        const { url: videoUrl, caption: videoCaption, credit: videoCredit } = block.content;
        return (
          <figure key={block.id} className="my-8">
            <div className="relative rounded-2xl overflow-hidden shadow-lg bg-gray-100 aspect-video">
              {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                <iframe
                  src={videoUrl.replace('watch?v=', 'embed/')}
                  className="w-full h-full"
                  frameBorder="0"
                  allowFullScreen
                />
              ) : (
                <video 
                  src={videoUrl} 
                  controls 
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            {(videoCaption || videoCredit) && (
              <figcaption className="mt-4 text-center">
                {videoCaption && <div className="text-gray-600 text-sm mb-1">{videoCaption}</div>}
                {videoCredit && <div className="text-gray-500 text-xs">Video: {videoCredit}</div>}
              </figcaption>
            )}
          </figure>
        );

      case 'quote':
        const { text: quoteText, attribution, context } = block.content;
        return (
          <blockquote key={block.id} className="my-8 border-l-4 border-emerald-500 bg-emerald-50 pl-8 pr-6 py-6 rounded-r-2xl">
            <div className="text-xl italic text-gray-800 leading-relaxed mb-4">
              "{quoteText}"
            </div>
            {attribution && (
              <cite className="text-emerald-700 font-medium not-italic">
                — {attribution}
                {context && <span className="text-emerald-600 font-normal">, {context}</span>}
              </cite>
            )}
          </blockquote>
        );

      case 'community-voice':
        const { speaker_name, speaker_role, text: voiceText, context: voiceContext } = block.content;
        return (
          <div key={block.id} className="my-8 bg-teal-50 border border-teal-200 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-teal-900">{speaker_name}</div>
                <div className="text-sm text-teal-700">{speaker_role}</div>
              </div>
            </div>
            <div className="text-lg italic text-teal-800 leading-relaxed mb-4">
              "{voiceText}"
            </div>
            {voiceContext && (
              <div className="text-sm text-teal-600 border-t border-teal-200 pt-4">
                {voiceContext}
              </div>
            )}
          </div>
        );

      case 'divider':
        return (
          <div key={block.id} className="my-12 flex justify-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-px bg-gradient-to-r from-transparent to-emerald-300"></div>
              <Heart className="w-6 h-6 text-emerald-500" />
              <div className="w-12 h-px bg-gradient-to-l from-transparent to-emerald-300"></div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const theme = getCategoryTheme(post.blog_category);

  return (
    <article className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-12">
        {post.featured_image_url && (
          <div className="mb-8">
            <img 
              src={post.featured_image_url} 
              alt={post.title}
              className="w-full h-96 object-cover rounded-3xl shadow-lg"
            />
          </div>
        )}

        <div className="space-y-6">
          {/* Category Badge */}
          <div className="flex items-center gap-4">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${theme.bg} ${theme.text} ${theme.border} border`}>
              {post.blog_category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
            {post.featured && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">
                Featured
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-xl text-gray-600 leading-relaxed">
              {post.excerpt}
            </p>
          )}

          {/* Meta information */}
          <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4" />
              <span className="text-sm">
                {post.author_name}
                {post.author_role && <span className="text-gray-500"> · {post.author_role}</span>}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <time className="text-sm" dateTime={post.published_at}>
                {formatDate(post.published_at)}
              </time>
            </div>
            
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{post.reading_time_minutes} min read</span>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <Eye className="w-4 h-4" />
              <span className="text-sm">{post.view_count} views</span>
            </div>

            <button
              onClick={onShare}
              className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colours"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-sm">Share</span>
            </button>
          </div>

          {/* Community Contributors */}
          {post.community_contributors.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Community Contributors</span>
              </div>
              <div className="text-blue-800">
                Special thanks to {post.community_contributors.join(', ')} for their wisdom and contributions to this story.
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="prose-lg max-w-none">
        {post.content_blocks
          .sort((a, b) => a.order - b.order)
          .map(renderContentBlock)}
      </div>

      {/* Acknowledgements */}
      {post.acknowledgements && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <h3 className="font-semibold text-amber-900 mb-3">Acknowledgements</h3>
            <div className="text-amber-800">{post.acknowledgements}</div>
          </div>
        </div>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colours cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 pt-8 border-t border-gray-200">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-emerald-600 mb-4">
            <Heart className="w-5 h-5" />
            <span className="font-medium">Published on the Empathy Ledger Platform</span>
          </div>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto">
            This story is part of our commitment to community-centred technology and authentic relationship building. 
            Every voice matters, every story creates change.
          </p>
        </div>
      </footer>
    </article>
  );
};

export default BlogPostDisplay;