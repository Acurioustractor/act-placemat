'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Users,
  MessageCircle,
  Plane,
  Globe,
  Heart,
  Sprout,
  Handshake,
  BookOpen,
  Calendar,
  Coffee,
  Moon,
  Sunrise,
  Music,
  MapPin,
  ExternalLink,
  Play,
  Sparkles,
  Ticket,
  Youtube,
} from 'lucide-react';
import type { YearMetrics, TuneItem, ConcertItem, ArtItem, FamilyMoment, TripItem, CuratedData } from '../types/yearInReview';

interface YearInNumbersProps {
  metrics: YearMetrics;
  curatedSettings?: CuratedData['settings'] & {
    favouriteTunes?: TuneItem[];
    concertsAttended?: ConcertItem[];
    inspiringArt?: ArtItem[];
    familyMoments?: FamilyMoment[];
    internationalTrips?: TripItem[];
  };
}

// Animated counter hook
function useAnimatedCounter(target: number, isVisible: boolean, duration = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const steps = 60;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(target, Math.round(increment * step));
      setCount(current);

      if (step >= steps) {
        setCount(target);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, target, duration]);

  return count;
}

// Journey Visualization - Beautiful arc with distance
function JourneyVisualization({ km, countries, isVisible }: { km: number; countries: number; isVisible: boolean }) {
  const displayKm = useAnimatedCounter(km, isVisible);
  const earthCircumference = 40075;
  const timesAroundEarth = (km / earthCircumference).toFixed(1);

  return (
    <div className="relative">
      {/* Decorative arc path */}
      <svg className="w-full h-32 mb-4" viewBox="0 0 400 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="journeyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#59c3c3" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#59c3c3" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffa857" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {/* Background arc */}
        <path
          d="M 30 80 Q 200 -20 370 80"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        {/* Animated journey arc */}
        <path
          d="M 30 80 Q 200 -20 370 80"
          fill="none"
          stroke="url(#journeyGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          className={isVisible ? 'animate-draw-path' : ''}
          style={{
            strokeDasharray: 500,
            strokeDashoffset: isVisible ? 0 : 500,
            transition: 'stroke-dashoffset 2s ease-out',
          }}
        />
        {/* Start point */}
        <circle cx="30" cy="80" r="6" fill="#59c3c3" />
        <text x="30" y="95" textAnchor="middle" className="fill-slate-400 text-[8px]">HOME</text>
        {/* End point */}
        <circle cx="370" cy="80" r="6" fill="#ffa857" />
        <text x="370" y="95" textAnchor="middle" className="fill-slate-400 text-[8px]">2025</text>
        {/* Small dots along the path for visual interest */}
        <circle cx="100" cy="45" r="2" fill="#59c3c3" opacity="0.4" />
        <circle cx="150" cy="25" r="2" fill="#59c3c3" opacity="0.5" />
        <circle cx="200" cy="15" r="3" fill="#59c3c3" opacity="0.6" />
        <circle cx="250" cy="25" r="2" fill="#ffa857" opacity="0.5" />
        <circle cx="300" cy="45" r="2" fill="#ffa857" opacity="0.4" />
      </svg>

      {/* Stats row */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-12">
        <div className="text-center">
          <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-teal-400 tabular-nums">
            {displayKm.toLocaleString()}
          </div>
          <div className="text-sm text-slate-400 mt-1">kilometers traveled</div>
          <div className="text-xs text-slate-500 mt-1">≈ {timesAroundEarth}× around Earth</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-3xl sm:text-4xl md:text-5xl font-bold text-orange-400">
            <Globe className="w-6 h-6 sm:w-8 sm:h-8" />
            {countries}
          </div>
          <div className="text-sm text-slate-400 mt-1">countries visited</div>
        </div>
      </div>
    </div>
  );
}

// People & Connections - Network visualization
function ConnectionsNetwork({ people, conversations, partnerships, introductions, isVisible }: {
  people: number;
  conversations: number;
  partnerships: number;
  introductions: number;
  isVisible: boolean;
}) {
  const displayPeople = useAnimatedCounter(people, isVisible);
  const displayConvos = useAnimatedCounter(conversations, isVisible);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* People Engaged - Main stat */}
      <div className="bg-gradient-to-br from-teal-500/10 to-transparent rounded-2xl p-6 border border-teal-500/20">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-xl bg-teal-500/20">
            <Users className="w-6 h-6 text-teal-400" />
          </div>
          <Sparkles className="w-5 h-5 text-teal-400/50" />
        </div>
        <div className="text-5xl font-bold text-white mb-2 tabular-nums">{displayPeople}</div>
        <div className="text-teal-400 font-medium">People Engaged</div>
        <div className="text-sm text-slate-400 mt-2">
          Every number is a name, a story, a connection
        </div>
      </div>

      {/* Conversations */}
      <div className="bg-gradient-to-br from-orange-500/10 to-transparent rounded-2xl p-6 border border-orange-500/20">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-xl bg-orange-500/20">
            <MessageCircle className="w-6 h-6 text-orange-400" />
          </div>
        </div>
        <div className="text-5xl font-bold text-white mb-2 tabular-nums">{displayConvos}</div>
        <div className="text-orange-400 font-medium">Conversations Had</div>
        <div className="text-sm text-slate-400 mt-2">
          Deep listening, shared understanding
        </div>
      </div>

      {/* Partnerships & Introductions - smaller cards */}
      <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-purple-500/20">
          <Handshake className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <div className="text-3xl font-bold text-white">{partnerships}</div>
          <div className="text-sm text-slate-400">Partnerships Formed</div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-pink-500/20">
          <Heart className="w-5 h-5 text-pink-400" />
        </div>
        <div>
          <div className="text-3xl font-bold text-white">{introductions}</div>
          <div className="text-sm text-slate-400">Introductions Made</div>
        </div>
      </div>
    </div>
  );
}

// Community Impact
function CommunityImpact({ communities, projects, milestones, isVisible }: {
  communities: number;
  projects: number;
  milestones: number;
  isVisible: boolean;
}) {
  const displayCommunities = useAnimatedCounter(communities, isVisible);

  return (
    <div className="relative">
      {/* Main community stat */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-500/20 via-teal-500/10 to-transparent px-8 py-4 rounded-full border border-teal-500/30">
          <Sprout className="w-8 h-8 text-teal-400" />
          <div>
            <div className="text-4xl font-bold text-teal-400 tabular-nums">{displayCommunities}</div>
            <div className="text-sm text-slate-300">Communities Reached</div>
          </div>
        </div>
      </div>

      {/* Project stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/50">
          <div className="text-2xl font-bold text-white">{projects}</div>
          <div className="text-xs text-slate-400 mt-1">Projects Active</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/50">
          <div className="text-2xl font-bold text-white">{milestones}</div>
          <div className="text-xs text-slate-400 mt-1">Milestones Hit</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/50">
          <div className="flex items-center justify-center gap-1">
            <BookOpen className="w-4 h-4 text-slate-400" />
            <span className="text-2xl font-bold text-white">47</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Stories Captured</div>
        </div>
      </div>
    </div>
  );
}

// Behind The Scenes - Cozy stats with better icons
function BehindTheScenes({ tea, lateNights, sunrises }: { tea: number; lateNights: number; sunrises: number }) {
  const stats = [
    { icon: Coffee, value: tea, label: 'Cups of Coffee', color: 'amber', bg: 'from-amber-900/30 to-amber-950/20' },
    { icon: Moon, value: lateNights, label: 'Late Nights', color: 'indigo', bg: 'from-indigo-900/30 to-indigo-950/20' },
    { icon: Sunrise, value: sunrises, label: 'Sunrises Missed', color: 'orange', bg: 'from-orange-900/30 to-orange-950/20' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {stats.map(({ icon: Icon, value, label, color, bg }) => (
        <div
          key={label}
          className={`bg-gradient-to-br ${bg} rounded-2xl p-4 sm:p-5 text-center border border-${color}-800/30 hover:border-${color}-700/50 transition-all hover:scale-[1.02]`}
        >
          <Icon className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 text-${color}-400`} />
          <div className={`text-xl sm:text-2xl font-bold text-${color}-400`}>{value.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}

// Music Playlist Section - Supports Spotify and YouTube
function PlaylistSection({ tunes }: { tunes: TuneItem[] }) {
  if (!tunes || tunes.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-[#1DB954]/10 via-slate-900/80 to-slate-900 rounded-3xl p-8 border border-[#1DB954]/20 overflow-hidden relative">
      {/* Spotify-style background glow */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#1DB954]/20 rounded-full blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1DB954] to-[#169c46] flex items-center justify-center shadow-lg shadow-[#1DB954]/30">
            <Music className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Tunes That Got Us Through</h3>
            <p className="text-sm text-slate-400">The 2025 Soundtrack</p>
          </div>
        </div>

        <div className="space-y-2">
          {tunes.map((tune, i) => {
            const primaryUrl = tune.spotifyUrl || tune.youtubeUrl || '#';
            const isYouTube = !tune.spotifyUrl && tune.youtubeUrl;

            return (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
              >
                {/* Track number or album art */}
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
                  {tune.albumArt ? (
                    <Image src={tune.albumArt} alt={tune.title} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                      <span className="text-slate-500 font-bold">{i + 1}</span>
                    </div>
                  )}
                </div>

                {/* Track info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{tune.title}</div>
                  <div className="text-sm text-slate-400 truncate">{tune.artist}</div>
                  {tune.whyWeLoveIt && (
                    <div className="text-xs text-slate-500 mt-1 truncate">&ldquo;{tune.whyWeLoveIt}&rdquo;</div>
                  )}
                </div>

                {/* Link buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {tune.spotifyUrl && (
                    <a
                      href={tune.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-[#1DB954]/20 hover:bg-[#1DB954]/40 flex items-center justify-center transition-colors"
                      title="Listen on Spotify"
                    >
                      <svg className="w-4 h-4 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                      </svg>
                    </a>
                  )}
                  {tune.youtubeUrl && (
                    <a
                      href={tune.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors"
                      title="Watch on YouTube"
                    >
                      <Youtube className="w-4 h-4 text-red-500" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-500 mt-6 text-center italic">
          Click to listen
        </p>
      </div>
    </div>
  );
}

// Concerts Section - Ticket stub style
function ConcertsSection({ concerts }: { concerts: ConcertItem[] }) {
  if (!concerts || concerts.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-pink-900/20 via-slate-900/80 to-slate-900 rounded-3xl p-8 border border-pink-500/20 overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <Ticket className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Live Shows</h3>
            <p className="text-sm text-slate-400">Concerts that moved us</p>
          </div>
        </div>

        <div className="space-y-3">
          {concerts.map((concert, i) => (
            <div
              key={i}
              className="relative flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-pink-500/10 via-transparent to-transparent border border-pink-500/20 hover:border-pink-400/40 transition-all group overflow-hidden"
            >
              {/* Ticket stub perforated edge effect */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500/30" />
              <div className="absolute left-1 top-2 bottom-2 border-l-2 border-dashed border-slate-700" />

              {/* Concert image or icon */}
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 ml-2 relative">
                {concert.image ? (
                  <Image src={concert.image} alt={concert.artist} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-600/30 to-purple-600/20 flex items-center justify-center">
                    <Music className="w-6 h-6 text-pink-400" />
                  </div>
                )}
              </div>

              {/* Concert details */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-lg">{concert.artist}</div>
                <div className="text-sm text-pink-400">{concert.venue}</div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <MapPin className="w-3 h-3" />
                  {concert.city}
                  <span className="mx-1">•</span>
                  <Calendar className="w-3 h-3" />
                  {concert.date}
                </div>
                {concert.highlight && (
                  <div className="text-xs text-slate-500 mt-2 italic">&ldquo;{concert.highlight}&rdquo;</div>
                )}
              </div>

              {/* Decorative ticket number */}
              <div className="absolute top-2 right-3 text-xs text-pink-500/40 font-mono">
                #{String(i + 1).padStart(3, '0')}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500 mt-6 text-center italic">
          The energy you can only get live
        </p>
      </div>
    </div>
  );
}

// Art & Thinkers Section - List format
function ArtGallerySection({ art }: { art: ArtItem[] }) {
  if (!art || art.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-purple-900/20 via-slate-900/80 to-slate-900 rounded-3xl p-8 border border-purple-500/20 overflow-hidden relative">
      {/* Background accent */}
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Art & Thinkers</h3>
            <p className="text-sm text-slate-400">Ideas that shaped our year</p>
          </div>
        </div>

        {/* List format */}
        <div className="space-y-3">
          {art.map((piece, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
            >
              {/* Image or icon */}
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
                {piece.image ? (
                  <Image src={piece.image} alt={piece.title} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600/30 to-pink-600/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white">{piece.title}</div>
                <div className="text-sm text-purple-400">{piece.artist}</div>
                {piece.medium && (
                  <div className="text-xs text-slate-500 mt-0.5">{piece.medium}</div>
                )}
              </div>

              {/* Link if available */}
              {piece.link && (
                <a
                  href={piece.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-purple-500/20 hover:bg-purple-500/40 flex items-center justify-center transition-colors flex-shrink-0"
                  title="View more"
                >
                  <ExternalLink className="w-4 h-4 text-purple-400" />
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Featured inspiration quote */}
        {art.some((a) => a.inspiration) && (
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 to-transparent rounded-xl border-l-2 border-purple-500">
            <p className="text-sm text-slate-300 italic">
              &ldquo;{art.find((a) => a.inspiration)?.inspiration}&rdquo;
            </p>
            <p className="text-xs text-purple-400 mt-2">
              — {art.find((a) => a.inspiration)?.artist}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Family & Friends Section - Photo-focused
function FamilySection({ moments }: { moments: FamilyMoment[] }) {
  if (!moments || moments.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-rose-900/20 via-slate-900/80 to-slate-900 rounded-3xl p-8 border border-rose-500/20">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
          <Heart className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Family & Friends Time</h3>
          <p className="text-sm text-slate-400">What grounds the work</p>
        </div>
      </div>

      <div className="space-y-4">
        {moments.map((moment, i) => (
          <div
            key={i}
            className="flex gap-4 items-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            {moment.image ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative">
                <Image src={moment.image} alt="" fill className="object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/10 flex items-center justify-center flex-shrink-0">
                <Heart className="w-6 h-6 text-rose-400" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-white">{moment.description}</p>
              {moment.date && (
                <p className="text-sm text-rose-400 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {moment.date}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-slate-500 mt-6 text-center italic">
        Because the work only matters when it&apos;s grounded in love
      </p>
    </div>
  );
}

// International Trips - Passport Stamps Style
function TripsSection({ trips }: { trips: TripItem[] }) {
  if (!trips || trips.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-blue-900/20 via-slate-900/80 to-slate-900 rounded-3xl p-8 border border-blue-500/20 overflow-hidden relative">
      {/* World map background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Plane className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Miles From Home</h3>
            <p className="text-sm text-slate-400">Learning from communities worldwide</p>
          </div>
        </div>

        {/* Passport stamps grid */}
        <div className="grid md:grid-cols-3 gap-4">
          {trips.map((trip, i) => (
            <div
              key={i}
              className="relative group"
            >
              {/* Stamp-style card */}
              <div
                className="rounded-xl overflow-hidden border-2 border-dashed border-blue-500/30 bg-slate-800/50 p-4 hover:border-blue-400/50 transition-all hover:scale-[1.02]"
                style={{
                  transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)`,
                }}
              >
                {/* Flag and location */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-4xl">{trip.flag || '🌍'}</span>
                  <div>
                    <div className="font-bold text-white">{trip.destination}</div>
                    <div className="text-xs text-blue-400 uppercase tracking-wider">{trip.country}</div>
                  </div>
                </div>

                {/* Purpose */}
                <p className="text-sm text-slate-300 mb-3">{trip.purpose}</p>

                {/* Highlights as stamps */}
                {trip.highlights && trip.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {trip.highlights.map((h, j) => (
                      <span
                        key={j}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                {/* Decorative stamp mark */}
                <div className="absolute top-2 right-2 w-8 h-8 rounded-full border-2 border-blue-500/30 flex items-center justify-center opacity-50">
                  <MapPin className="w-4 h-4 text-blue-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main Component
export function YearInNumbersRedesign({ metrics, curatedSettings }: YearInNumbersProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Use curated settings if available, fall back to metrics, then defaults
  const defaultTunes: TuneItem[] = curatedSettings?.favouriteTunes || metrics.favouriteTunes || [
    {
      title: 'Solid Ground',
      artist: 'Michael Kiwanuka',
      spotifyUrl: 'https://open.spotify.com/track/2rFxUTlbOAFSO6Qymk8wfK',
      whyWeLoveIt: 'Finding your footing',
    },
    {
      title: 'Treaty',
      artist: 'Yothu Yindi',
      spotifyUrl: 'https://open.spotify.com/track/1p5B9QNqeXf6kwfrNwJW4K',
      whyWeLoveIt: 'Reconciliation anthem',
    },
    {
      title: 'From Little Things Big Things Grow',
      artist: 'Paul Kelly & Kev Carmody',
      spotifyUrl: 'https://open.spotify.com/track/0VgkVdmE1HWbpk0ELBcCMK',
      whyWeLoveIt: 'Community power',
    },
    {
      title: 'Rise Up',
      artist: 'Andra Day',
      spotifyUrl: 'https://open.spotify.com/track/0tBbt8CrmxbjRP0pueQkyU',
      whyWeLoveIt: 'Resilience distilled',
    },
    {
      title: 'Blackfella/Whitefella',
      artist: 'Warumpi Band',
      spotifyUrl: 'https://open.spotify.com/track/3Yb1x9mvHMGFt8u7HLQMGK',
      whyWeLoveIt: 'Unity on Country',
    },
  ];

  const defaultArt: ArtItem[] = curatedSettings?.inspiringArt || metrics.inspiringArt || [
    {
      title: "Earth's Creation",
      artist: 'Emily Kame Kngwarreye',
      medium: 'Acrylic on canvas',
      inspiration: 'Connection to land is everything - every dot, every line tells a story of Country.',
    },
    {
      title: 'Water Dreaming',
      artist: 'Clifford Possum Tjapaltjarri',
      medium: 'Synthetic polymer on canvas',
    },
    {
      title: 'Ngapa Jukurrpa',
      artist: 'Judy Watson Napangardi',
      medium: 'Acrylic on linen',
    },
  ];

  const defaultConcerts: ConcertItem[] = curatedSettings?.concertsAttended || metrics.concertsAttended || [
    {
      artist: 'Midnight Oil',
      venue: 'Qudos Bank Arena',
      city: 'Sydney',
      date: 'March 2025',
      highlight: 'Beds Are Burning hits different when you work in housing',
    },
    {
      artist: 'Paul Kelly',
      venue: 'Sidney Myer Music Bowl',
      city: 'Melbourne',
      date: 'May 2025',
      highlight: 'From Little Things Big Things Grow — the live version brings tears',
    },
    {
      artist: 'Archie Roach Tribute',
      venue: 'Melbourne Recital Centre',
      city: 'Melbourne',
      date: 'July 2025',
      highlight: 'Honouring Uncle Archie with community',
    },
    {
      artist: 'Baker Boy',
      venue: 'Darwin Festival',
      city: 'Darwin',
      date: 'August 2025',
      highlight: 'Yolngu Matha in the air, feet on Country',
    },
  ];

  const defaultMoments: FamilyMoment[] = curatedSettings?.familyMoments || metrics.familyMoments || [
    { description: 'Sunday dinners that turned into Monday mornings', date: 'Every week' },
    { description: 'Video calls across time zones keeping us connected', date: 'Ongoing' },
    { description: 'Celebrating small wins with the people who matter', date: 'All year' },
  ];

  const defaultTrips: TripItem[] = curatedSettings?.internationalTrips || metrics.internationalTrips || [
    {
      destination: 'Murcia',
      country: 'Spain',
      flag: '🇪🇸',
      purpose: "Learning from Diagrama's revolutionary youth justice model",
      highlights: ['Youth programs', 'Restorative practice'],
    },
    {
      destination: 'London',
      country: 'United Kingdom',
      flag: '🇬🇧',
      purpose: 'Social innovation partnerships',
      highlights: ['Policy forums', 'Design thinking'],
    },
    {
      destination: 'Auckland',
      country: 'New Zealand',
      flag: '🇳🇿',
      purpose: 'Maori-led innovation summit',
      highlights: ['Indigenous tech', 'Co-design'],
    },
  ];

  return (
    <div ref={containerRef} className="max-w-6xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center">
        <p className="text-teal-400 text-sm uppercase tracking-[0.3em] font-semibold mb-4">2025 Impact</p>
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">The Year in Numbers</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Numbers tell part of the story. The connections behind them tell the rest.
        </p>
      </div>

      {/* Journey - Distance & Countries */}
      <div className="bg-slate-900/60 backdrop-blur-sm rounded-3xl p-8 border border-slate-700/50">
        <JourneyVisualization
          km={metrics.kmsTraveled}
          countries={metrics.countriesVisited}
          isVisible={isVisible}
        />
      </div>

      {/* People & Connections */}
      <ConnectionsNetwork
        people={metrics.peopleEngaged}
        conversations={metrics.conversationsHad}
        partnerships={metrics.partnershipsFormed}
        introductions={metrics.introductionsMade}
        isVisible={isVisible}
      />

      {/* Community Impact */}
      <div className="bg-slate-900/60 backdrop-blur-sm rounded-3xl p-8 border border-slate-700/50">
        <CommunityImpact
          communities={metrics.communitiesReached}
          projects={metrics.projectsActive}
          milestones={metrics.milestonesReached}
          isVisible={isVisible}
        />
      </div>

      {/* Behind the Scenes */}
      <div className="bg-slate-900/60 backdrop-blur-sm rounded-3xl p-8 border border-slate-700/50">
        <h3 className="text-center text-slate-400 text-sm uppercase tracking-wider mb-6">Behind The Scenes</h3>
        <BehindTheScenes tea={metrics.cupsOfTea} lateNights={metrics.lateNights} sunrises={metrics.sunrisesMissed} />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 py-8">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        <Sparkles className="w-5 h-5 text-slate-600" />
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
      </div>

      {/* What Kept Us Grounded */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-white mb-2">What Kept Us Grounded</h3>
        <p className="text-slate-400">Work is only as meaningful as the life that surrounds it</p>
      </div>

      {/* Cultural sections - Music row */}
      <div className="grid md:grid-cols-2 gap-6">
        <PlaylistSection tunes={defaultTunes} />
        <ConcertsSection concerts={defaultConcerts} />
      </div>

      {/* Cultural sections - Other */}
      <div className="grid md:grid-cols-2 gap-6">
        <ArtGallerySection art={defaultArt} />
        <TripsSection trips={defaultTrips} />
      </div>

      {/* Family section - full width */}
      <FamilySection moments={defaultMoments} />
    </div>
  );
}
