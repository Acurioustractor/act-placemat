'use client';

import { useState, useCallback } from 'react';
import type { ContentBlock } from '../../types/yearInReview';

interface MediaQuickAddProps {
  onAddBlock: (block: ContentBlock) => void;
  className?: string;
}

type VideoPlatform = 'loom' | 'youtube' | 'vimeo' | 'direct';

// Detect and parse various video/media URLs
function detectMediaType(url: string): { type: VideoPlatform | 'image' | 'unknown'; embedUrl?: string; thumbnail?: string } | null {
  if (!url) return null;

  const trimmedUrl = url.trim();

  // Loom
  const loomMatch = trimmedUrl.match(/(?:loom\.com\/share|loom\.com\/embed)\/([a-zA-Z0-9]+)/);
  if (loomMatch) {
    return {
      type: 'loom',
      embedUrl: `https://www.loom.com/embed/${loomMatch[1]}`,
      thumbnail: `https://cdn.loom.com/sessions/thumbnails/${loomMatch[1]}-with-play.gif`
    };
  }

  // YouTube
  const ytMatch = trimmedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
      thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`
    };
  }

  // Vimeo
  const vimeoMatch = trimmedUrl.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  // Image URLs
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(trimmedUrl)) {
    return {
      type: 'image',
      embedUrl: trimmedUrl,
    };
  }

  // Unknown but valid URL
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return { type: 'unknown' };
  }

  return null;
}

export function MediaQuickAdd({ onAddBlock, className = '' }: MediaQuickAddProps) {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [detectedMedia, setDetectedMedia] = useState<ReturnType<typeof detectMediaType>>(null);
  const [activeQuickType, setActiveQuickType] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Handle URL paste/change
  const handleUrlChange = useCallback((value: string) => {
    setUrl(value);
    const detected = detectMediaType(value);
    setDetectedMedia(detected);
    if (detected && detected.type !== 'unknown') {
      setShowPreview(true);
    }
  }, []);

  // Quick add a video block
  const handleAddVideo = useCallback(() => {
    if (!url || !detectedMedia) return;

    // Only allow valid video platforms
    const validPlatforms: VideoPlatform[] = ['loom', 'youtube', 'vimeo', 'direct'];
    const platform = validPlatforms.includes(detectedMedia.type as VideoPlatform)
      ? (detectedMedia.type as VideoPlatform)
      : 'direct';

    const block: ContentBlock = {
      id: `vid-${Date.now()}`,
      type: 'video',
      data: {
        videoUrl: detectedMedia.embedUrl || url,
        platform,
        caption: caption || undefined
      }
    };

    onAddBlock(block);
    setUrl('');
    setCaption('');
    setDetectedMedia(null);
    setShowPreview(false);
    setActiveQuickType(null);
  }, [url, detectedMedia, caption, onAddBlock]);

  // Quick add an image block
  const handleAddImage = useCallback(() => {
    if (!url) return;

    const block: ContentBlock = {
      id: `img-${Date.now()}`,
      type: 'image',
      data: {
        mediaUrl: url,
        caption: caption || undefined
      }
    };

    onAddBlock(block);
    setUrl('');
    setCaption('');
    setDetectedMedia(null);
    setShowPreview(false);
    setActiveQuickType(null);
  }, [url, caption, onAddBlock]);

  // Quick add a quote block
  const handleAddQuote = useCallback(() => {
    setActiveQuickType('quote');
  }, []);

  // Submit quote
  const handleSubmitQuote = useCallback((quoteText: string, author: string) => {
    const block: ContentBlock = {
      id: `q-${Date.now()}`,
      type: 'quote',
      data: {
        quoteText,
        quoteAuthor: author || undefined
      }
    };

    onAddBlock(block);
    setActiveQuickType(null);
  }, [onAddBlock]);

  // Quick add a stats block
  const handleAddStats = useCallback(() => {
    setActiveQuickType('stats');
  }, []);

  // Submit stats
  const handleSubmitStats = useCallback((statsText: string) => {
    const block: ContentBlock = {
      id: `stats-${Date.now()}`,
      type: 'stats',
      data: {
        text: statsText
      }
    };

    onAddBlock(block);
    setActiveQuickType(null);
  }, [onAddBlock]);

  // Quick add a callout block
  const handleAddCallout = useCallback(() => {
    setActiveQuickType('callout');
  }, []);

  // Submit callout
  const handleSubmitCallout = useCallback((text: string, style: 'info' | 'success' | 'warning' | 'highlight') => {
    const block: ContentBlock = {
      id: `callout-${Date.now()}`,
      type: 'callout',
      data: {
        text,
        calloutType: style
      }
    };

    onAddBlock(block);
    setActiveQuickType(null);
  }, [onAddBlock]);

  return (
    <div className={`bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Quick Add Media
      </h3>

      {/* Quick Add Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveQuickType('video')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeQuickType === 'video'
              ? 'bg-purple-500 text-white'
              : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Loom / Video
        </button>

        <button
          onClick={() => setActiveQuickType('image')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeQuickType === 'image'
              ? 'bg-teal-500 text-white'
              : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Photo / Drone
        </button>

        <button
          onClick={handleAddQuote}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeQuickType === 'quote'
              ? 'bg-amber-500 text-white'
              : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Quote
        </button>

        <button
          onClick={handleAddStats}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeQuickType === 'stats'
              ? 'bg-pink-500 text-white'
              : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Stats
        </button>

        <button
          onClick={handleAddCallout}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeQuickType === 'callout'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Callout
        </button>
      </div>

      {/* Video/Image Input */}
      {(activeQuickType === 'video' || activeQuickType === 'image') && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {activeQuickType === 'video' ? 'Paste Loom, YouTube, or Vimeo URL' : 'Paste image URL'}
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={activeQuickType === 'video' ? 'https://www.loom.com/share/...' : 'https://example.com/photo.jpg'}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Detection Badge */}
          {detectedMedia && detectedMedia.type !== 'unknown' && (
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                detectedMedia.type === 'loom' ? 'bg-purple-500/20 text-purple-300' :
                detectedMedia.type === 'youtube' ? 'bg-red-500/20 text-red-300' :
                detectedMedia.type === 'vimeo' ? 'bg-blue-500/20 text-blue-300' :
                'bg-teal-500/20 text-teal-300'
              }`}>
                {detectedMedia.type.charAt(0).toUpperCase() + detectedMedia.type.slice(1)} detected
              </span>
              <span className="text-xs text-slate-500">Auto-embed ready</span>
            </div>
          )}

          {/* Preview */}
          {showPreview && detectedMedia && (
            <div className="rounded-lg overflow-hidden border border-slate-700">
              {detectedMedia.type === 'image' ? (
                <img
                  src={detectedMedia.embedUrl}
                  alt="Preview"
                  className="w-full h-40 object-cover"
                />
              ) : detectedMedia.thumbnail ? (
                <div className="relative">
                  <img
                    src={detectedMedia.thumbnail}
                    alt="Video thumbnail"
                    className="w-full h-40 object-cover opacity-80"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-32 bg-slate-900 flex items-center justify-center">
                  <span className="text-slate-400 text-sm">Video preview</span>
                </div>
              )}
            </div>
          )}

          {/* Caption */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Caption (optional)</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Add Button */}
          <div className="flex gap-2">
            <button
              onClick={activeQuickType === 'video' ? handleAddVideo : handleAddImage}
              disabled={!url || (activeQuickType === 'video' && (!detectedMedia || detectedMedia.type === 'unknown'))}
              className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add {activeQuickType === 'video' ? 'Video' : 'Image'}
            </button>
            <button
              onClick={() => {
                setActiveQuickType(null);
                setUrl('');
                setCaption('');
                setDetectedMedia(null);
                setShowPreview(false);
              }}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quote Input */}
      {activeQuickType === 'quote' && (
        <QuoteForm
          onSubmit={handleSubmitQuote}
          onCancel={() => setActiveQuickType(null)}
        />
      )}

      {/* Stats Input */}
      {activeQuickType === 'stats' && (
        <StatsForm
          onSubmit={handleSubmitStats}
          onCancel={() => setActiveQuickType(null)}
        />
      )}

      {/* Callout Input */}
      {activeQuickType === 'callout' && (
        <CalloutForm
          onSubmit={handleSubmitCallout}
          onCancel={() => setActiveQuickType(null)}
        />
      )}

      {/* Hint when no type selected */}
      {!activeQuickType && (
        <p className="text-xs text-slate-500 text-center">
          Click a button above to quickly add media or content blocks
        </p>
      )}
    </div>
  );
}

// Quote Form Component
function QuoteForm({ onSubmit, onCancel }: { onSubmit: (text: string, author: string) => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Quote</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter the quote text..."
          rows={3}
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Author (optional)</label>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Who said this?"
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit(text, author)}
          disabled={!text.trim()}
          className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add Quote
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Stats Form Component
function StatsForm({ onSubmit, onCancel }: { onSubmit: (stats: string) => void; onCancel: () => void }) {
  const [stats, setStats] = useState('');

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Stats (pipe-separated)</label>
        <input
          type="text"
          value={stats}
          onChange={(e) => setStats(e.target.value)}
          placeholder="150+ programs | 2,400 youth | $45M savings | 78% success"
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
        />
        <p className="text-xs text-slate-500 mt-1">Separate stats with | (pipe)</p>
      </div>
      {stats && (
        <div className="flex flex-wrap gap-4 p-3 bg-slate-900/30 rounded-lg">
          {stats.split('|').map((s, i) => {
            const parts = s.trim().match(/^([\d$€,.\+]+)\s*(.*)$/);
            return parts ? (
              <div key={i} className="text-center">
                <div className="text-lg font-bold text-teal-400">{parts[1]}</div>
                <div className="text-xs text-slate-500 uppercase">{parts[2]}</div>
              </div>
            ) : null;
          })}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit(stats)}
          disabled={!stats.trim()}
          className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add Stats
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Callout Form Component
type CalloutStyle = 'info' | 'success' | 'warning' | 'highlight';

function CalloutForm({ onSubmit, onCancel }: { onSubmit: (text: string, style: CalloutStyle) => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const [style, setStyle] = useState<CalloutStyle>('info');

  const styles: { value: CalloutStyle; label: string; color: string }[] = [
    { value: 'info', label: 'Info', color: 'bg-blue-500' },
    { value: 'success', label: 'Success', color: 'bg-green-500' },
    { value: 'warning', label: 'Warning', color: 'bg-amber-500' },
    { value: 'highlight', label: 'Highlight', color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Style</label>
        <div className="flex gap-2">
          {styles.map((s) => (
            <button
              key={s.value}
              onClick={() => setStyle(s.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                style === s.value
                  ? `${s.color} text-white`
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Callout Text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter callout text..."
          rows={2}
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit(text, style)}
          disabled={!text.trim()}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add Callout
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default MediaQuickAdd;
