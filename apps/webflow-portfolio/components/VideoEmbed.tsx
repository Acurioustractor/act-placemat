'use client';

import { useState, useCallback } from 'react';
import type { VideoPlatform } from '../types/yearInReview';

interface VideoEmbedProps {
  platform: VideoPlatform;
  embedUrl: string;
  title?: string;
  thumbnail?: string;
  autoplay?: boolean;
  className?: string;
}

/**
 * Responsive video embed component supporting Loom, YouTube, Vimeo, and direct video
 */
export function VideoEmbed({
  platform,
  embedUrl,
  title,
  thumbnail,
  autoplay = false,
  className = ''
}: VideoEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [error, setError] = useState(false);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  // For direct video files
  if (platform === 'direct') {
    return (
      <div className={`relative aspect-video bg-slate-900 rounded-xl overflow-hidden ${className}`}>
        <video
          src={embedUrl}
          controls
          autoPlay={autoplay}
          className="w-full h-full object-cover"
          poster={thumbnail}
          onError={() => setError(true)}
        >
          Your browser does not support the video tag.
        </video>
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80">
            <p className="text-slate-400">Failed to load video</p>
          </div>
        )}
      </div>
    );
  }

  // Build embed URL with autoplay parameter
  const getEmbedSrc = () => {
    let src = embedUrl;

    if (isPlaying) {
      const separator = src.includes('?') ? '&' : '?';

      switch (platform) {
        case 'youtube':
          src += `${separator}autoplay=1&rel=0`;
          break;
        case 'vimeo':
          src += `${separator}autoplay=1`;
          break;
        case 'loom':
          src += `${separator}autoplay=1&hide_owner=true&hide_share=true&hide_title=true`;
          break;
      }
    }

    return src;
  };

  // Platform-specific styles and branding
  const getPlatformIcon = () => {
    switch (platform) {
      case 'youtube':
        return (
          <svg className="w-16 h-16 text-red-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
          </svg>
        );
      case 'vimeo':
        return (
          <svg className="w-16 h-16 text-cyan-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.875 10.063c-2.442 5.217-8.337 12.319-12.063 12.319-3.672 0-4.203-7.831-6.208-13.043-.987-2.565-1.624-1.976-3.474-.681l-1.128-1.455c2.698-2.372 5.398-5.127 7.057-5.28 1.868-.179 3.018 1.098 3.448 3.832.568 3.593 1.362 9.17 2.748 9.17 1.08 0 3.741-4.424 3.878-6.006.243-2.316-1.703-2.386-3.392-1.663 2.673-8.754 13.793-7.142 9.134 2.807z" />
          </svg>
        );
      case 'loom':
        return (
          <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
          </div>
        );
    }
  };

  // Show thumbnail with play button if not playing
  if (!isPlaying && thumbnail) {
    return (
      <div className={`relative aspect-video bg-slate-900 rounded-xl overflow-hidden group cursor-pointer ${className}`} onClick={handlePlay}>
        <img
          src={thumbnail}
          alt={title || 'Video thumbnail'}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="transform transition-transform group-hover:scale-110">
            {getPlatformIcon()}
          </div>
          {title && (
            <p className="mt-4 text-white text-lg font-medium text-center px-4 drop-shadow">{title}</p>
          )}
        </div>
      </div>
    );
  }

  // Render iframe embed
  return (
    <div className={`relative aspect-video bg-slate-900 rounded-xl overflow-hidden ${className}`}>
      <iframe
        src={getEmbedSrc()}
        title={title || 'Video embed'}
        className="absolute inset-0 w-full h-full"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onError={() => setError(true)}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80">
          <p className="text-slate-400">Failed to load video</p>
        </div>
      )}
    </div>
  );
}

/**
 * Parse a video URL and extract platform info
 */
export function parseVideoUrl(url: string): { platform: VideoPlatform; videoId: string; embedUrl: string } | null {
  if (!url) return null;

  // Loom
  const loomMatch = url.match(/loom\.com\/(share|embed)\/([a-zA-Z0-9]+)/);
  if (loomMatch) {
    return {
      platform: 'loom',
      videoId: loomMatch[2],
      embedUrl: `https://www.loom.com/embed/${loomMatch[2]}`
    };
  }

  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    return {
      platform: 'youtube',
      videoId: ytMatch[1],
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`
    };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return {
      platform: 'vimeo',
      videoId: vimeoMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`
    };
  }

  // Descript
  const descriptMatch = url.match(/share\.descript\.com\/view\/([a-zA-Z0-9]+)/);
  if (descriptMatch) {
    return {
      platform: 'loom', // Descript uses similar embed pattern
      videoId: descriptMatch[1],
      embedUrl: `https://share.descript.com/embed/${descriptMatch[1]}`
    };
  }

  // Direct video URL
  if (url.match(/\.(mp4|webm|ogg)($|\?)/i)) {
    return {
      platform: 'direct',
      videoId: url,
      embedUrl: url
    };
  }

  return null;
}

/**
 * Get thumbnail URL for a video platform
 */
export function getVideoThumbnail(platform: VideoPlatform, videoId: string): string | null {
  switch (platform) {
    case 'youtube':
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    case 'vimeo':
      // Vimeo requires an API call for thumbnails, return null for now
      return null;
    case 'loom':
      // Loom doesn't have a simple thumbnail URL pattern
      return null;
    default:
      return null;
  }
}

export default VideoEmbed;
