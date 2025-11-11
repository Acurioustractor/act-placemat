import { useState } from 'react';
import { PlayCircleIcon } from '@heroicons/react/24/solid';

interface VideoEmbedProps {
  url: string;
  title?: string;
  caption?: string;
  autoplay?: boolean;
  className?: string;
}

/**
 * VideoEmbed - World-class video player component
 * Supports YouTube and Vimeo with responsive 16:9 aspect ratio
 * Lazy loads for performance (only loads when user clicks play)
 */
const VideoEmbed = ({ url, title = 'Project Video', caption, autoplay = false, className = '' }: VideoEmbedProps) => {
  const [isPlaying, setIsPlaying] = useState(autoplay);

  // Parse video URL to get embed format
  const getEmbedUrl = (videoUrl: string): string | null => {
    try {
      const url = new URL(videoUrl);

      // YouTube
      if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
        let videoId = '';
        if (url.hostname.includes('youtu.be')) {
          videoId = url.pathname.slice(1);
        } else {
          videoId = url.searchParams.get('v') || '';
        }
        return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&rel=0`;
      }

      // Vimeo
      if (url.hostname.includes('vimeo.com')) {
        const videoId = url.pathname.split('/').filter(Boolean).pop();
        return `https://player.vimeo.com/video/${videoId}?autoplay=${autoplay ? 1 : 0}`;
      }

      return null;
    } catch {
      return null;
    }
  };

  const embedUrl = getEmbedUrl(url);

  if (!embedUrl) {
    return (
      <div className={`bg-gray-100 rounded-lg p-8 text-center ${className}`}>
        <p className="text-gray-500">Invalid video URL</p>
      </div>
    );
  }

  // Get thumbnail for YouTube (Vimeo doesn't provide reliable thumbnail URLs)
  const getThumbnail = (): string | null => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        let videoId = '';
        if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.slice(1);
        } else {
          videoId = urlObj.searchParams.get('v') || '';
        }
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
      return null;
    } catch {
      return null;
    }
  };

  const thumbnail = getThumbnail();

  return (
    <div className={`relative ${className}`}>
      {/* Video Container - 16:9 aspect ratio */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        {!isPlaying && thumbnail ? (
          /* Thumbnail with play button overlay - saves bandwidth */
          <div
            className="absolute inset-0 cursor-pointer group"
            onClick={() => setIsPlaying(true)}
          >
            <img
              src={thumbnail}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover rounded-lg"
              loading="lazy"
            />
            {/* Dark overlay on hover */}
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity rounded-lg" />
            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <PlayCircleIcon className="w-20 h-20 text-white opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all" />
            </div>
          </div>
        ) : (
          /* Actual video embed */
          <iframe
            className="absolute inset-0 w-full h-full rounded-lg"
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>

      {/* Caption */}
      {caption && (
        <p className="mt-3 text-sm text-gray-600 italic text-center">
          {caption}
        </p>
      )}
    </div>
  );
};

export default VideoEmbed;
