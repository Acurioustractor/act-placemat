import { useState } from 'react';
import {
  ShareIcon,
  LinkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface ShareButtonsProps {
  url?: string;
  title: string;
  description?: string;
  hashtags?: string[];
  className?: string;
}

/**
 * ShareButtons - Social media sharing component
 * Supports: Twitter, LinkedIn, Facebook, Email, Copy Link
 *
 * Features:
 * - Native share API with fallback
 * - Individual platform share buttons
 * - Copy-to-clipboard with visual feedback
 * - Mobile-optimized
 */
const ShareButtons = ({
  url,
  title,
  description = '',
  hashtags = [],
  className = ''
}: ShareButtonsProps) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  // Encode for URLs
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);
  const hashtagString = hashtags.join(',');

  // Share URLs
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}${hashtagString ? `&hashtags=${hashtagString}` : ''}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`
  };

  // Native share (mobile)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: shareUrl
        });
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    }
  };

  // Copy to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Social button component
  const SocialButton = ({
    href,
    icon,
    label,
    color
  }: {
    href: string;
    icon: React.ReactNode;
    label: string;
    color: string;
  }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all hover:scale-105 ${color}`}
      aria-label={`Share on ${label}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </a>
  );

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {/* Native Share Button (Mobile) */}
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          onClick={handleNativeShare}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all hover:scale-105"
        >
          <ShareIcon className="w-5 h-5" />
          <span>Share</span>
        </button>
      )}

      {/* Twitter */}
      <SocialButton
        href={shareLinks.twitter}
        icon={
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        }
        label="Twitter"
        color="bg-black hover:bg-gray-900"
      />

      {/* LinkedIn */}
      <SocialButton
        href={shareLinks.linkedin}
        icon={
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        }
        label="LinkedIn"
        color="bg-[#0077B5] hover:bg-[#006399]"
      />

      {/* Facebook */}
      <SocialButton
        href={shareLinks.facebook}
        icon={
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 3.667h-3.533v7.98H9.101z" />
          </svg>
        }
        label="Facebook"
        color="bg-[#1877F2] hover:bg-[#1565C0]"
      />

      {/* Email */}
      <SocialButton
        href={shareLinks.email}
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
        label="Email"
        color="bg-gray-600 hover:bg-gray-700"
      />

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 ${
          copied
            ? 'bg-green-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        {copied ? (
          <>
            <CheckIcon className="w-5 h-5" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <LinkIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Copy Link</span>
          </>
        )}
      </button>
    </div>
  );
};

export default ShareButtons;
