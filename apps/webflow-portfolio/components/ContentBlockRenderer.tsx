'use client';

import { useState } from 'react';
import { VideoEmbed } from './VideoEmbed';
import type { ContentBlock, VideoPlatform } from '../types/yearInReview';

interface ContentBlockRendererProps {
  blocks: ContentBlock[];
  className?: string;
}

/**
 * Renders an array of content blocks with appropriate styling
 */
export function ContentBlockRenderer({ blocks, className = '' }: ContentBlockRendererProps) {
  return (
    <div className={`space-y-8 ${className}`}>
      {blocks.map((block, index) => (
        <BlockRenderer key={block.id || index} block={block} />
      ))}
    </div>
  );
}

interface BlockRendererProps {
  block: ContentBlock;
}

function BlockRenderer({ block }: BlockRendererProps) {
  // Support both nested (block.data) and flat (block.content) structures
  const data = block.data || normalizeBlockData(block);

  switch (block.type) {
    case 'paragraph':
      return <ParagraphBlock data={data} />;
    case 'heading':
      return <HeadingBlock data={data} />;
    case 'image':
      return <ImageBlock data={data} />;
    case 'gallery':
      return <GalleryBlock data={data} />;
    case 'video':
      return <VideoBlock data={data} />;
    case 'quote':
      return <QuoteBlock data={data} />;
    case 'callout':
      return <CalloutBlock data={data} />;
    case 'stats':
      return <StatsBlock data={data} />;
    case 'divider':
      return <DividerBlock />;
    default:
      return null;
  }
}

// Normalize flat block structure to nested data structure
function normalizeBlockData(block: any): ContentBlock['data'] {
  const content = block.content || '';

  switch (block.type) {
    case 'paragraph':
      return { text: content };
    case 'heading':
      return { text: content, level: block.level || 2 };
    case 'quote':
      return { quoteText: content, quoteAuthor: block.attribution };
    case 'callout':
      return { text: content, calloutType: block.style || 'info', calloutTitle: block.title };
    case 'stats':
      return { text: content };
    case 'image':
      return { mediaUrl: block.url, caption: block.caption, altText: block.alt };
    case 'video':
      return { videoUrl: block.url, platform: block.platform, caption: block.caption };
    default:
      return { text: content };
  }
}

// Paragraph Block
function ParagraphBlock({ data }: { data: ContentBlock['data'] }) {
  if (!data.text) return null;

  const alignmentClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    full: 'text-justify'
  }[data.alignment || 'left'];

  // Render markdown-style bold text (**text**)
  const renderText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <p className={`text-slate-200 leading-relaxed text-lg ${alignmentClass}`}>
      {renderText(data.text)}
    </p>
  );
}

// Heading Block
function HeadingBlock({ data }: { data: ContentBlock['data'] }) {
  if (!data.text) return null;

  const level = data.level || 2;
  const alignmentClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    full: 'text-left'
  }[data.alignment || 'left'];

  const styles = {
    1: 'text-4xl md:text-5xl font-bold text-white drop-shadow-lg',
    2: 'text-3xl md:text-4xl font-bold text-white drop-shadow',
    3: 'text-2xl md:text-3xl font-semibold text-white'
  }[level];

  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <Tag className={`${styles} ${alignmentClass} mt-12 mb-6`}>
      {data.text}
    </Tag>
  );
}

// Image Block
function ImageBlock({ data }: { data: ContentBlock['data'] }) {
  const imageUrl = data.mediaUrl || '';
  if (!imageUrl) return null;

  const alignmentClass = {
    left: 'mr-auto',
    center: 'mx-auto',
    right: 'ml-auto',
    full: 'w-full'
  }[data.alignment || 'full'];

  return (
    <figure className={`${alignmentClass} ${data.alignment !== 'full' ? 'max-w-2xl' : ''}`}>
      <div className="rounded-xl overflow-hidden shadow-lg">
        <img
          src={imageUrl}
          alt={data.altText || data.caption || 'Image'}
          className="w-full h-auto"
        />
      </div>
      {data.caption && (
        <figcaption className="mt-3 text-center text-slate-400 text-sm italic">
          {data.caption}
        </figcaption>
      )}
    </figure>
  );
}

// Gallery Block
function GalleryBlock({ data }: { data: ContentBlock['data'] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const images = data.mediaUrls || [];

  if (images.length === 0) return null;

  // Determine grid layout based on image count
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4'
  }[Math.min(images.length, 4)] || 'grid-cols-2 md:grid-cols-3';

  return (
    <>
      <div className={`grid ${gridClass} gap-3`}>
        {images.map((url, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className="aspect-square rounded-lg overflow-hidden bg-slate-800 group focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <img
              src={url}
              alt={`Gallery image ${index + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {data.caption && (
        <p className="mt-3 text-center text-slate-400 text-sm italic">{data.caption}</p>
      )}

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedIndex(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
            onClick={() => setSelectedIndex(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Navigation */}
          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 p-2 text-white/70 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((selectedIndex - 1 + images.length) % images.length);
                }}
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="absolute right-4 p-2 text-white/70 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((selectedIndex + 1) % images.length);
                }}
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <img
            src={images[selectedIndex]}
            alt={`Gallery image ${selectedIndex + 1}`}
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// Video Block
function VideoBlock({ data }: { data: ContentBlock['data'] }) {
  if (!data.videoUrl) return null;

  return (
    <figure>
      <VideoEmbed
        platform={data.platform || 'direct'}
        embedUrl={data.videoUrl}
        title={data.videoTitle}
        className="shadow-lg"
      />
      {data.caption && (
        <figcaption className="mt-3 text-center text-slate-400 text-sm italic">
          {data.caption}
        </figcaption>
      )}
    </figure>
  );
}

// Quote Block
function QuoteBlock({ data }: { data: ContentBlock['data'] }) {
  if (!data.quoteText) return null;

  return (
    <blockquote className="relative py-8 px-6 md:px-12 bg-slate-800/50 rounded-2xl border-l-4 border-teal-500">
      <svg
        className="absolute top-4 left-4 w-8 h-8 text-teal-500/30"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
      </svg>
      <p className="text-xl md:text-2xl text-slate-200 italic leading-relaxed pl-8">
        {data.quoteText}
      </p>
      {data.quoteAuthor && (
        <cite className="block mt-4 pl-8 text-teal-400 not-italic font-medium">
          &mdash; {data.quoteAuthor}
        </cite>
      )}
    </blockquote>
  );
}

// Callout Block
function CalloutBlock({ data }: { data: ContentBlock['data'] }) {
  if (!data.text) return null;

  const styles = {
    info: {
      bg: 'bg-blue-900/30',
      border: 'border-blue-500',
      icon: (
        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'text-blue-400'
    },
    success: {
      bg: 'bg-green-900/30',
      border: 'border-green-500',
      icon: (
        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'text-green-400'
    },
    warning: {
      bg: 'bg-amber-900/30',
      border: 'border-amber-500',
      icon: (
        <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      title: 'text-amber-400'
    },
    highlight: {
      bg: 'bg-teal-900/30',
      border: 'border-teal-500',
      icon: (
        <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      title: 'text-teal-400'
    }
  }[data.calloutType || 'info'];

  return (
    <div className={`${styles.bg} ${styles.border} border-l-4 rounded-r-xl p-6`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">{styles.icon}</div>
        <div>
          {data.calloutTitle && (
            <h4 className={`${styles.title} font-semibold mb-2`}>{data.calloutTitle}</h4>
          )}
          <p className="text-slate-200">{data.text}</p>
        </div>
      </div>
    </div>
  );
}

// Divider Block
function DividerBlock() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-4">
        <div className="w-16 h-px bg-gradient-to-r from-transparent to-slate-600" />
        <div className="w-2 h-2 rounded-full bg-teal-500" />
        <div className="w-16 h-px bg-gradient-to-l from-transparent to-slate-600" />
      </div>
    </div>
  );
}

// Stats Block - displays pipe-separated stats in a grid
function StatsBlock({ data }: { data: ContentBlock['data'] }) {
  if (!data.text) return null;

  // Parse pipe-separated stats: "150+ programs | 2,400 youth | $45M savings | 78% success"
  const stats = data.text.split('|').map(s => s.trim()).filter(Boolean);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
      {stats.map((stat, index) => {
        // Try to extract number and label
        const match = stat.match(/^([\d,$%+.]+[KMB]?)\s+(.+)$/i) ||
                      stat.match(/^(.+?)\s+([\d,$%+.]+[KMB]?)$/i);

        let value = stat;
        let label = '';

        if (match) {
          // Check which group is the number
          if (/^[\d,$%+.]+[KMB]?$/i.test(match[1])) {
            value = match[1];
            label = match[2];
          } else {
            value = match[2];
            label = match[1];
          }
        }

        return (
          <div
            key={index}
            className="text-center p-4 bg-slate-800/50 rounded-xl"
          >
            <div className="text-2xl md:text-3xl font-bold text-teal-400 mb-1">
              {value}
            </div>
            {label && (
              <div className="text-sm text-slate-400 uppercase tracking-wide">
                {label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ContentBlockRenderer;
