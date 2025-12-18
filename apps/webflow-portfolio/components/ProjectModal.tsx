'use client';

import { useEffect, useCallback, useState } from 'react';
import { formatDate, getSourceIcon, getTypeColor } from '../lib/yearInReviewApi';
import { parseVideoUrl } from './VideoEmbed';
import type { TimelineEntry } from '../types/yearInReview';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ProjectModalProps {
  entry: TimelineEntry | null;
  onClose: () => void;
  seasonColor?: string;
}

export function ProjectModal({ entry, onClose, seasonColor = '#59c3c3' }: ProjectModalProps) {
  // Modal states for contact forms
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showNewsletterForm, setShowNewsletterForm] = useState(false);

  // Question form state
  const [questionName, setQuestionName] = useState('');
  const [questionEmail, setQuestionEmail] = useState('');
  const [questionMessage, setQuestionMessage] = useState('');
  const [sendingQuestion, setSendingQuestion] = useState(false);
  const [questionSent, setQuestionSent] = useState(false);

  // Newsletter form state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterName, setNewsletterName] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  // Reset forms when entry changes
  useEffect(() => {
    setShowQuestionForm(false);
    setShowNewsletterForm(false);
    setQuestionSent(false);
    setSubscribed(false);
  }, [entry]);

  // Send question to backend
  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingQuestion(true);

    try {
      const res = await fetch(`${API_BASE}/api/messages/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: questionName,
          email: questionEmail,
          message: questionMessage,
          projectTitle: entry?.title,
          source: '2025-review-timeline'
        })
      });

      if (!res.ok) throw new Error('Failed to send');

      setQuestionSent(true);
      setTimeout(() => {
        setShowQuestionForm(false);
        setQuestionSent(false);
        setQuestionName('');
        setQuestionEmail('');
        setQuestionMessage('');
      }, 2000);
    } catch {
      // Fallback to email
      const subject = encodeURIComponent(`Question about: ${entry?.title}`);
      const body = encodeURIComponent(`Hi,\n\nI have a question about "${entry?.title}":\n\n${questionMessage}\n\n---\nFrom: ${questionName} (${questionEmail})`);
      window.open(`mailto:hello@act.place?subject=${subject}&body=${body}`, '_blank');
      setShowQuestionForm(false);
    } finally {
      setSendingQuestion(false);
    }
  };

  // Subscribe to newsletter
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribing(true);

    try {
      const res = await fetch(`${API_BASE}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newsletterEmail,
          name: newsletterName,
          source: '2025-review-timeline',
          projectContext: entry?.title
        })
      });

      if (!res.ok) throw new Error('Failed to subscribe');

      setSubscribed(true);
      setTimeout(() => {
        setShowNewsletterForm(false);
        setSubscribed(false);
        setNewsletterEmail('');
        setNewsletterName('');
      }, 2000);
    } catch {
      alert('Thanks for your interest! Please email hello@act.place to join our newsletter.');
      setShowNewsletterForm(false);
    } finally {
      setSubscribing(false);
    }
  };

  // Close on escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showQuestionForm) {
          setShowQuestionForm(false);
        } else if (showNewsletterForm) {
          setShowNewsletterForm(false);
        } else {
          onClose();
        }
      }
    },
    [onClose, showQuestionForm, showNewsletterForm]
  );

  useEffect(() => {
    if (entry) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [entry, handleKeyDown]);

  if (!entry) return null;

  const parsedLegacyVideo = entry.metadata?.videoUrl ? parseVideoUrl(entry.metadata.videoUrl) : null;
  const video = entry.heroVideoUrl && entry.heroVideoPlatform
    ? { platform: entry.heroVideoPlatform, embedUrl: entry.heroVideoUrl, title: entry.heroVideoTitle }
    : parsedLegacyVideo
      ? { platform: parsedLegacyVideo.platform, embedUrl: parsedLegacyVideo.embedUrl, title: undefined }
      : null;

  const imageUrl = entry.heroImageUrl || entry.photos?.[0] || entry.metadata?.imageUrl;
  const hasMedia = !!video || !!imageUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        className="relative bg-slate-900/95 border border-slate-600/50 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Media Section */}
        {hasMedia && (
          <div className="relative aspect-video bg-slate-800 rounded-t-3xl overflow-hidden">
            {video ? (
              video.platform === 'direct' ? (
                <video
                  src={video.embedUrl}
                  controls
                  className="w-full h-full object-cover"
                  poster={imageUrl}
                />
              ) : (
                <iframe
                  src={video.embedUrl}
                  title={video.title || entry.title}
                  className="absolute inset-0 w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={entry.title}
                className="w-full h-full object-cover"
              />
            ) : null}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

            {/* Type badge overlay */}
            <div className="absolute bottom-4 left-6">
              <span
                className="px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wide backdrop-blur-sm"
                style={{ backgroundColor: `${getTypeColor(entry.type)}80`, color: '#fff' }}
              >
                {entry.type}
              </span>
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl" title={`From ${entry.source}`}>
              {getSourceIcon(entry.source)}
            </span>
            <span
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: `${seasonColor}30`, color: seasonColor }}
            >
              {formatDate(entry.date)}
            </span>
            {!hasMedia && (
              <span
                className="px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide"
                style={{ backgroundColor: `${getTypeColor(entry.type)}20`, color: getTypeColor(entry.type) }}
              >
                {entry.type}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 drop-shadow">{entry.title}</h2>

          {/* Description */}
          <div className="prose prose-invert prose-slate max-w-none">
            <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{entry.description}</p>
          </div>

          {/* Quote */}
          {entry.quote && (
            <blockquote
              className="mt-6 pl-4 border-l-4 italic text-slate-300"
              style={{ borderColor: seasonColor }}
            >
              <p className="text-lg">&ldquo;{entry.quote.text}&rdquo;</p>
              <cite className="block mt-2 text-sm text-slate-400 not-italic">&mdash; {entry.quote.author}</cite>
            </blockquote>
          )}

          {/* Photo Gallery (if multiple photos) */}
          {entry.photos && entry.photos.length > 1 && (
            <div className="mt-6 grid grid-cols-3 gap-3">
              {entry.photos.slice(1).map((photo, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-800">
                  <img src={photo} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {entry.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-slate-800/80 text-slate-300 text-sm rounded-full border border-slate-700/50"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Metadata */}
          {entry.metadata && (
            <div className="mt-6 pt-6 border-t border-slate-700/50 flex flex-wrap items-center gap-6 text-sm">
              {entry.metadata.organization && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Organization:</span>
                  <span className="text-slate-300 font-medium">{entry.metadata.organization}</span>
                </div>
              )}
              {entry.metadata.likes !== undefined && (
                <div className="flex items-center gap-1 text-slate-400">
                  <span>❤️</span>
                  <span>{entry.metadata.likes} likes</span>
                </div>
              )}
              {entry.metadata.comments !== undefined && (
                <div className="flex items-center gap-1 text-slate-400">
                  <span>💬</span>
                  <span>{entry.metadata.comments} comments</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={() => setShowQuestionForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-full font-semibold hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ask a Question
            </button>
            <button
              onClick={() => setShowNewsletterForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-full font-semibold hover:bg-teal-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Stay Connected
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-full transition-colors"
            >
              Close
            </button>
          </div>

          {entry.projectSlug && (
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={`/2025-review/${entry.projectSlug}?preview=true`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-600 rounded-full text-sm font-semibold text-teal-200 hover:border-teal-400 hover:text-white transition-colors"
              >
                Visit project page
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6h10m0 0v10m0-10L8 18" />
                </svg>
              </a>
              <a
                href={`/2025-review/admin/projects/${entry.projectSlug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 border border-teal-600 text-teal-200 rounded-full text-sm font-semibold hover:bg-teal-600/10 transition-colors"
              >
                Open admin page
                <span className="text-xs font-normal">✎</span>
              </a>
            </div>
          )}

          {/* Question Form (inline) */}
          {showQuestionForm && (
            <div className="mt-6 p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Ask a Question</h3>
                <button
                  onClick={() => setShowQuestionForm(false)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {questionSent ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-white font-medium">Message sent!</p>
                  <p className="text-slate-400 text-sm">We&apos;ll get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSendQuestion} className="space-y-4">
                  <p className="text-slate-400 text-sm">
                    About: <span className="text-teal-400 font-medium">{entry.title}</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={questionName}
                      onChange={e => setQuestionName(e.target.value)}
                      required
                      className="px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                      placeholder="Your name"
                    />
                    <input
                      type="email"
                      value={questionEmail}
                      onChange={e => setQuestionEmail(e.target.value)}
                      required
                      className="px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                      placeholder="Your email"
                    />
                  </div>
                  <textarea
                    value={questionMessage}
                    onChange={e => setQuestionMessage(e.target.value)}
                    required
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none"
                    placeholder="What would you like to know?"
                  />
                  <button
                    type="submit"
                    disabled={sendingQuestion}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {sendingQuestion ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Newsletter Form (inline) */}
          {showNewsletterForm && (
            <div className="mt-6 p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Stay Connected</h3>
                <button
                  onClick={() => setShowNewsletterForm(false)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {subscribed ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-white font-medium">You&apos;re in!</p>
                  <p className="text-slate-400 text-sm">Welcome to the community.</p>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-4">
                  <p className="text-slate-400 text-sm">
                    Join our newsletter to hear about new projects and updates.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newsletterName}
                      onChange={e => setNewsletterName(e.target.value)}
                      className="px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                      placeholder="Your name"
                    />
                    <input
                      type="email"
                      value={newsletterEmail}
                      onChange={e => setNewsletterEmail(e.target.value)}
                      required
                      className="px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                      placeholder="Your email *"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={subscribing}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {subscribing ? 'Subscribing...' : 'Subscribe'}
                  </button>
                  <p className="text-slate-500 text-xs text-center">
                    We respect your privacy and won&apos;t spam you.
                  </p>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectModal;
