'use client';

import { useState, useCallback, useRef } from 'react';
import type { VideoPlatform } from '../types/yearInReview';

interface VideoEmbedProps {
  platform: VideoPlatform;
  embedUrl: string;
  title?: string;
  thumbnail?: string;
  autoplay?: boolean;
  muted?: boolean; // Allow explicit mute control
  loop?: boolean;
  className?: string;
  onError?: (error: Error) => void;
  onLoad?: () => void;
}

/**
 * Responsive video embed component supporting Loom, YouTube, Vimeo, and direct MP4 video
 *
 * Browser autoplay policies:
 * - Videos can autoplay if muted (required by Chrome, Safari, Firefox)
 * - Videos with sound require user interaction first
 */
export function VideoEmbed({
  platform,
  embedUrl,
  title,
  thumbnail,
  autoplay = false,
  muted = true, // Default muted for autoplay compatibility
  loop = false,
  className = '',
  onError,
  onLoad
}: VideoEmbedProps) {
  // Detect platform from URL if not provided
  const detectPlatformFromUrl = (url: string): VideoPlatform => {
    if (!url) return 'direct';
    if (url.includes('loom.com')) return 'loom';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url.includes('descript.com')) return 'descript';
    // Only use 'direct' for actual video file extensions
    if (url.match(/\.(mp4|webm|ogg|mov|m4v)($|\?|#)/i)) return 'direct';
    // For unknown URLs, don't default to direct - use iframe instead
    return 'unknown';
  };

  // Use provided platform, or detect from URL
  const detectedPlatform = detectPlatformFromUrl(embedUrl);

  // Helper to check if URL is actually a video file
  const isActualVideoFile = (url: string): boolean => {
    return /\.(mp4|webm|ogg|mov|m4v)($|\?|#)/i.test(url);
  };

  // Determine the platform to use
  // If platform is 'direct' but URL isn't a video file, use detected platform instead
  // This prevents trying to play non-video URLs with the <video> element
  let safePlatform = platform || detectedPlatform;
  if (safePlatform === 'direct' && !isActualVideoFile(embedUrl)) {
    safePlatform = detectedPlatform !== 'direct' ? detectedPlatform : 'unknown';
  }

  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(muted || autoplay); // Must be muted for autoplay
  const [autoplayFailed, setAutoplayFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const retryCount = useRef(0);
  const maxRetries = 2;

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    setError(null);
  }, []);

  const handleError = useCallback((message: string, err?: Error) => {
    console.error(`[VideoEmbed] ${message}:`, err);
    setError(message);
    setIsLoading(false);
    onError?.(err || new Error(message));
  }, [onError]);

  const handleRetry = useCallback(() => {
    if (retryCount.current < maxRetries) {
      retryCount.current++;
      setError(null);
      setIsLoading(true);
      // Force re-render by toggling play state
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 100);
    }
  }, []);

  // Handle missing embedUrl - AFTER all hooks
  if (!embedUrl) {
    return (
      <div className={`relative aspect-video bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center ${className}`}>
        <p className="text-slate-400">No video URL provided</p>
      </div>
    );
  }

  // For direct video files (MP4, WebM, etc.)
  if (safePlatform === 'direct') {
    return (
      <div className={`relative aspect-video bg-slate-900 rounded-xl overflow-hidden ${className}`}>
        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-slate-600 border-t-teal-500 rounded-full animate-spin" />
              <span className="text-slate-400 text-sm">Loading video...</span>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          src={embedUrl}
          controls
          autoPlay={autoplay}
          muted={isMuted}
          loop={loop}
          playsInline
          preload={autoplay ? 'auto' : 'metadata'}
          className="w-full h-full object-cover"
          poster={thumbnail}
          onLoadStart={() => {
            setError(null);
            setIsLoading(true);
          }}
          onLoadedData={() => {
            setIsLoading(false);
            setError(null);
            onLoad?.();
          }}
          onCanPlay={() => {
            setIsLoading(false);
            setError(null);
          }}
          onPlaying={() => {
            setAutoplayFailed(false);
            setIsLoading(false);
            setError(null);
          }}
          onError={(e) => {
            const video = e.currentTarget;

            // Ignore errors if video has no src (component unmounting/transitioning)
            if (!video.src || video.src === window.location.href) {
              return;
            }

            // Ignore MEDIA_ERR_ABORTED (code 1) - happens during normal transitions
            const errorCode = video.error?.code;
            if (!errorCode || errorCode === 1) {
              return;
            }

            // If video has any data loaded, it's not really an error
            if (video.readyState > 0) {
              return;
            }

            const errorMessages: Record<number, string> = {
              2: 'Network error while loading video',
              3: 'Video decoding failed',
              4: 'Video format not supported'
            };

            // Longer delay (500ms) to ensure this isn't a transient error during mount
            setTimeout(() => {
              // Re-check: only show error if video is still broken AND not loading
              if (video.error &&
                  video.error.code > 1 &&
                  video.readyState === 0 &&
                  video.networkState === 3) { // NETWORK_NO_SOURCE
                handleError(errorMessages[video.error.code] || 'Failed to load video');
              }
            }, 500);
          }}
        >
          Your browser does not support the video tag.
        </video>

        {/* Autoplay failed - show play button */}
        {autoplayFailed && !error && (
          <button
            type="button"
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors z-20"
            onClick={() => {
              setAutoplayFailed(false);
              const video = videoRef.current;
              if (video) {
                video.muted = true;
                video.play().catch(() => handleError('Playback failed'));
              }
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-slate-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-white font-medium">Tap to play</span>
            </div>
          </button>
        )}

        {/* Unmute button - shown when video is playing muted */}
        {!error && !isLoading && isMuted && !autoplayFailed && (
          <button
            type="button"
            className="absolute bottom-4 right-4 px-3 py-2 bg-black/70 hover:bg-black/90 rounded-full text-white text-sm font-medium flex items-center gap-2 transition-colors z-20"
            onClick={() => {
              const video = videoRef.current;
              if (video) {
                video.muted = false;
                setIsMuted(false);
              }
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
            Unmute
          </button>
        )}

        {/* Error state with retry */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/90 z-20">
            <svg className="w-12 h-12 text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-400 text-center mb-4">{error}</p>
            {retryCount.current < maxRetries && (
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-full text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // For unknown URLs that don't match any platform, show as link with option to try iframe
  if (safePlatform === 'unknown') {
    return (
      <div className={`relative aspect-video bg-slate-900 rounded-xl overflow-hidden ${className}`}>
        {isPlaying ? (
          // Try iframe embed for unknown URLs
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-slate-600 border-t-teal-500 rounded-full animate-spin" />
                  <span className="text-slate-400 text-sm">Loading video...</span>
                </div>
              </div>
            )}
            <iframe
              src={embedUrl}
              title={title || 'Video embed'}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => {
                setIsLoading(false);
                onLoad?.();
              }}
            />
          </>
        ) : (
          // Show play button for unknown URLs
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-4 cursor-pointer group"
            onClick={handlePlay}
          >
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={title || 'Video thumbnail'}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              {title && <p className="text-white font-medium drop-shadow">{title}</p>}
              <p className="text-white/70 text-sm">Click to play</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Build embed URL with platform-specific parameters
  const getEmbedSrc = () => {
    let src = embedUrl;
    const separator = src.includes('?') ? '&' : '?';

    switch (safePlatform) {
      case 'youtube':
        // YouTube: autoplay requires mute, enable JS API for better control
        if (isPlaying) {
          src += `${separator}autoplay=1&rel=0&modestbranding=1&enablejsapi=1`;
          if (isMuted) src += '&mute=1';
        }
        break;
      case 'vimeo':
        // Vimeo: similar autoplay rules
        if (isPlaying) {
          src += `${separator}autoplay=1&byline=0&portrait=0`;
          if (isMuted) src += '&muted=1';
        }
        break;
      case 'loom':
        // Loom: clean embed with autoplay
        if (isPlaying) {
          src += `${separator}autoplay=1&hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`;
        }
        break;
      case 'descript':
        // Descript: convert /view/ to /embed/ and add autoplay
        src = src.replace('/view/', '/embed/');
        if (isPlaying) {
          const sep = src.includes('?') ? '&' : '?';
          src += `${sep}autoplay=1`;
        }
        break;
    }

    return src;
  };

  // Platform-specific styles and branding
  const getPlatformIcon = () => {
    switch (safePlatform) {
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
      case 'descript':
        return (
          <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
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

  // Get platform-specific allow policies
  const getAllowPolicy = () => {
    return 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  };

  // Render iframe embed with loading state
  return (
    <div className={`relative aspect-video bg-slate-900 rounded-xl overflow-hidden ${className}`}>
      {/* Loading spinner - shown until iframe loads */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-slate-600 border-t-teal-500 rounded-full animate-spin" />
            <span className="text-slate-400 text-sm">Loading {safePlatform} video...</span>
          </div>
        </div>
      )}

      <iframe
        src={getEmbedSrc()}
        title={title || 'Video embed'}
        className="absolute inset-0 w-full h-full border-0"
        allow={getAllowPolicy()}
        allowFullScreen
        onLoad={() => {
          setIsLoading(false);
          onLoad?.();
        }}
      />

      {/* Platform badge */}
      {!isLoading && (
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-xs text-white/70 capitalize pointer-events-none">
          {safePlatform}
        </div>
      )}

      {/* Error fallback - iframe errors don't propagate, but we can show this if needed */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/90 z-20">
          <svg className="w-12 h-12 text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-slate-400 text-center mb-4">{error}</p>
          <a
            href={embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-full text-sm font-medium transition-colors"
          >
            Open in new tab
          </a>
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
      platform: 'descript',
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
