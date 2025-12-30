'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Youtube } from 'lucide-react';
import {
  CommunityCircle,
  YarningCircle,
  WorldPath,
  Heartland,
  RootedSprout,
  ConnectionWeb,
  StorySpiral,
  Campfire,
  NightSky,
  DawnRays,
  Songlines,
  PlaceSeed,
  OutwardArrow,
  Sparkle,
  LiveMusic,
  SeasonMarker,
  JourneyPath,
  BrewCup,
  FlightPath,
  GlobeMarker,
  TicketStub,
  HeartHands,
} from './icons/ACTIcons';
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
            <WorldPath className="w-6 h-6 sm:w-8 sm:h-8" />
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
      {/* People Engaged - Main stat with organic styling */}
      <div className="relative rounded-2xl p-6 overflow-hidden group">
        {/* Organic background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/40 via-slate-900 to-slate-900" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl transform translate-x-8 -translate-y-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-600/5 rounded-full blur-xl" />

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <CommunityCircle className="w-10 h-10 text-teal-400" />
            <Sparkle className="w-5 h-5 text-teal-400/40" />
          </div>
          <div className="text-5xl font-bold text-white mb-2 tabular-nums">{displayPeople}</div>
          <div className="text-teal-400 font-medium">People Engaged</div>
          <div className="text-sm text-slate-400 mt-2">
            Every number is a name, a story, a connection
          </div>
        </div>
      </div>

      {/* Conversations - Yarning circle style */}
      <div className="relative rounded-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 via-slate-900 to-slate-900" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2" />

        <div className="relative">
          <div className="mb-4">
            <YarningCircle className="w-10 h-10 text-amber-400" />
          </div>
          <div className="text-5xl font-bold text-white mb-2 tabular-nums">{displayConvos}</div>
          <div className="text-amber-400 font-medium">Yarning Circles</div>
          <div className="text-sm text-slate-400 mt-2">
            Deep listening, shared understanding
          </div>
        </div>
      </div>

      {/* Partnerships - Connection web style with network pulse */}
      <div className="relative rounded-2xl p-5 overflow-hidden flex items-center gap-4 group cursor-pointer">
        <div className="absolute inset-0 bg-slate-800/60 transition-colors group-hover:bg-slate-800/80" />
        {/* Network pulse rings */}
        <div className="absolute left-8 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-purple-500/0 group-hover:border-purple-500/30 group-hover:scale-[2.5] transition-all duration-700 ease-out" />
        <div className="absolute left-8 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-purple-500/0 group-hover:border-purple-500/20 group-hover:scale-[3.5] transition-all duration-1000 ease-out delay-100" />

        <div className="relative z-10 transition-transform group-hover:rotate-12 duration-300">
          <ConnectionWeb className="w-10 h-10 text-purple-400 group-hover:text-purple-300 transition-colors" />
        </div>
        <div className="relative z-10">
          <div className="text-3xl font-bold text-white group-hover:text-purple-100 transition-colors">{partnerships}</div>
          <div className="text-sm text-slate-400 group-hover:text-purple-300/70 transition-colors">Partnerships Woven</div>
        </div>
      </div>

      {/* Introductions - Heartland style with warm glow */}
      <div className="relative rounded-2xl p-5 overflow-hidden flex items-center gap-4 group cursor-pointer">
        <div className="absolute inset-0 bg-slate-800/60 transition-colors group-hover:bg-slate-800/80" />
        {/* Heart warmth glow */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-20 h-20 bg-rose-500/0 rounded-full blur-2xl group-hover:bg-rose-500/30 transition-all duration-500" />

        <div className="relative z-10 transition-transform group-hover:scale-110 duration-300">
          <Heartland className="w-10 h-10 text-rose-400 group-hover:text-rose-300 transition-colors" />
        </div>
        <div className="relative z-10">
          <div className="text-3xl font-bold text-white group-hover:text-rose-100 transition-colors">{introductions}</div>
          <div className="text-sm text-slate-400 group-hover:text-rose-300/70 transition-colors">Introductions Made</div>
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
      {/* Main community stat - organic centered design */}
      <div className="text-center mb-8">
        <div className="inline-flex flex-col items-center">
          <RootedSprout className="w-12 h-12 text-teal-400 mb-3" />
          <div className="text-5xl font-bold text-teal-400 tabular-nums">{displayCommunities}</div>
          <div className="text-sm text-slate-300 mt-2">Communities Rooted</div>
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent mt-4" />
        </div>
      </div>

      {/* Project stats - varied card sizes */}
      <div className="grid grid-cols-3 gap-4">
        <div className="relative rounded-xl p-4 text-center overflow-hidden group">
          <div className="absolute inset-0 bg-slate-800/40" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500/50 via-teal-400/30 to-transparent" />
          <div className="relative">
            <div className="text-2xl font-bold text-white">{projects}</div>
            <div className="text-xs text-slate-400 mt-1">Projects Growing</div>
          </div>
        </div>
        <div className="relative rounded-xl p-4 text-center overflow-hidden">
          <div className="absolute inset-0 bg-slate-800/40" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/50 via-amber-400/30 to-transparent" />
          <div className="relative">
            <div className="text-2xl font-bold text-white">{milestones}</div>
            <div className="text-xs text-slate-400 mt-1">Milestones Passed</div>
          </div>
        </div>
        <div className="relative rounded-xl p-4 text-center overflow-hidden">
          <div className="absolute inset-0 bg-slate-800/40" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500/50 via-purple-400/30 to-transparent" />
          <div className="relative flex flex-col items-center">
            <StorySpiral className="w-5 h-5 text-purple-400 mb-1" />
            <span className="text-2xl font-bold text-white">47</span>
            <div className="text-xs text-slate-400 mt-1">Stories Captured</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Behind The Scenes - Cozy stats with unique organic hover effects
function BehindTheScenes({ tea, lateNights, sunrises }: { tea: number; lateNights: number; sunrises: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {/* Cups of Coffee/Tea - steam rising effect on hover */}
      <div className="relative bg-gradient-to-br from-amber-900/30 to-amber-950/20 rounded-2xl p-4 sm:p-5 text-center border border-amber-800/30 hover:border-amber-600/50 transition-all group overflow-hidden cursor-pointer">
        {/* Steam wisps that rise on hover */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="w-px h-6 bg-gradient-to-t from-amber-400/40 to-transparent animate-pulse" style={{ animationDelay: '0ms' }} />
        </div>
        <div className="absolute top-6 left-[45%] opacity-0 group-hover:opacity-70 transition-opacity duration-700 delay-100">
          <div className="w-px h-8 bg-gradient-to-t from-amber-300/30 to-transparent animate-pulse" style={{ animationDelay: '200ms' }} />
        </div>
        <div className="absolute top-7 left-[55%] opacity-0 group-hover:opacity-50 transition-opacity duration-600 delay-200">
          <div className="w-px h-5 bg-gradient-to-t from-amber-400/20 to-transparent animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl transform translate-x-4 -translate-y-4 group-hover:bg-amber-500/25 transition-colors duration-500" />
        <BrewCup className="relative z-10 w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 text-amber-400 group-hover:text-amber-300 transition-colors" />
        <div className="text-xl sm:text-2xl font-bold text-amber-400 group-hover:text-amber-300 transition-colors">{tea.toLocaleString()}</div>
        <div className="text-xs text-slate-400 mt-1">Cups of Warmth</div>
      </div>

      {/* Late Nights - stars twinkling effect on hover */}
      <div className="relative bg-gradient-to-br from-indigo-900/30 to-indigo-950/20 rounded-2xl p-4 sm:p-5 text-center border border-indigo-800/30 hover:border-indigo-600/50 transition-all group overflow-hidden cursor-pointer">
        {/* Stars that twinkle on hover */}
        <div className="absolute inset-0 opacity-20 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute top-2 left-3 w-1.5 h-1.5 bg-indigo-200 rounded-full group-hover:animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute top-4 right-6 w-1 h-1 bg-white rounded-full group-hover:animate-pulse" />
          <div className="absolute bottom-6 left-8 w-1 h-1 bg-indigo-300 rounded-full group-hover:animate-ping" style={{ animationDuration: '3s', animationDelay: '500ms' }} />
          <div className="absolute top-8 right-4 w-0.5 h-0.5 bg-white rounded-full group-hover:animate-pulse" style={{ animationDelay: '300ms' }} />
          <div className="absolute bottom-4 right-8 w-1 h-1 bg-indigo-200 rounded-full group-hover:animate-ping" style={{ animationDuration: '2.5s', animationDelay: '700ms' }} />
        </div>
        {/* Moon glow effect */}
        <div className="absolute top-4 right-4 w-8 h-8 bg-indigo-400/0 rounded-full blur-lg group-hover:bg-indigo-400/30 transition-all duration-700" />
        <NightSky className="relative z-10 w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
        <div className="text-xl sm:text-2xl font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">{lateNights.toLocaleString()}</div>
        <div className="text-xs text-slate-400 mt-1">Late Nights</div>
      </div>

      {/* Sunrises Missed - dawn rays expanding effect */}
      <div className="relative bg-gradient-to-br from-orange-900/30 to-orange-950/20 rounded-2xl p-4 sm:p-5 text-center border border-orange-800/30 hover:border-orange-600/50 transition-all group overflow-hidden cursor-pointer">
        {/* Rising sun glow that expands */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-12 bg-gradient-to-t from-orange-500/20 to-transparent rounded-t-full group-hover:h-20 group-hover:w-32 group-hover:from-orange-400/30 transition-all duration-700" />
        {/* Horizon line */}
        <div className="absolute bottom-6 left-4 right-4 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent group-hover:via-orange-400/60 transition-colors duration-500" />
        {/* Ray beams on hover */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-1 h-0 bg-gradient-to-t from-orange-400/50 to-transparent group-hover:h-6 transition-all duration-500 delay-100" />
        <div className="absolute bottom-8 left-[40%] w-1 h-0 bg-gradient-to-t from-orange-300/40 to-transparent group-hover:h-4 transition-all duration-500 delay-200 rotate-[-20deg]" />
        <div className="absolute bottom-8 left-[60%] w-1 h-0 bg-gradient-to-t from-orange-300/40 to-transparent group-hover:h-4 transition-all duration-500 delay-200 rotate-[20deg]" />
        <DawnRays className="relative z-10 w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 text-orange-400 group-hover:text-orange-300 transition-colors" />
        <div className="text-xl sm:text-2xl font-bold text-orange-400 group-hover:text-orange-300 transition-colors">{sunrises.toLocaleString()}</div>
        <div className="text-xs text-slate-400 mt-1">Sunrises Missed</div>
      </div>
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
            <Songlines className="w-7 h-7 text-white" />
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
                className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-[#1DB954]/10 transition-all group cursor-pointer relative overflow-hidden"
              >
                {/* Sound wave visualization on hover */}
                <div className="absolute left-0 bottom-0 h-1 w-0 group-hover:w-full bg-gradient-to-r from-[#1DB954]/60 to-[#1DB954]/20 transition-all duration-500" />
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
            <TicketStub className="w-7 h-7 text-white" />
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
              className="relative flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-pink-500/10 via-transparent to-transparent border border-pink-500/20 hover:border-pink-400/50 transition-all group overflow-hidden cursor-pointer"
            >
              {/* Stage spotlight effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-b from-pink-500/0 via-transparent to-pink-500/0 group-hover:from-pink-500/10 group-hover:to-transparent transition-all duration-500" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-0 group-hover:h-full bg-gradient-to-b from-white/5 to-transparent transition-all duration-700 blur-xl" />
              {/* Ticket stub perforated edge effect */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500/30 group-hover:bg-pink-400/60 transition-colors" />
              <div className="absolute left-1 top-2 bottom-2 border-l-2 border-dashed border-slate-700 group-hover:border-pink-600/50 transition-colors" />

              {/* Concert image or icon */}
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 ml-2 relative">
                {concert.image ? (
                  <Image src={concert.image} alt={concert.artist} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-600/30 to-purple-600/20 flex items-center justify-center">
                    <LiveMusic className="w-6 h-6 text-pink-400" />
                  </div>
                )}
              </div>

              {/* Concert details */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-lg">{concert.artist}</div>
                <div className="text-sm text-pink-400">{concert.venue}</div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <PlaceSeed className="w-3 h-3" />
                  {concert.city}
                  <span className="mx-1">•</span>
                  <SeasonMarker className="w-3 h-3" />
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

// Art & Thinkers Section - Full-width Gallery celebrating diverse creative influences
function ArtGallerySection({ art }: { art: ArtItem[] }) {
  if (!art || art.length === 0) return null;

  // Find the piece with inspiration for the featured quote
  const featuredPiece = art.find((a) => a.inspiration);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950/20 rounded-3xl overflow-hidden relative w-full max-w-full">
      {/* Creative pattern background */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `radial-gradient(circle, #a855f7 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }} />

      <div className="relative p-6 md:p-10">
        {/* Header - Art & Thinkers */}
        <div className="text-center mb-8">
          <div className="inline-block">
            <p className="text-[10px] uppercase tracking-[0.4em] text-purple-400/60 mb-2">Creative Influences</p>
            <h3 className="text-3xl md:text-4xl font-light text-white tracking-wide">Art & Thinkers</h3>
            <div className="h-px w-24 mx-auto mt-4 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
            <p className="text-xs text-slate-400 mt-4 max-w-md mx-auto italic">
              The artists, musicians, and visionaries who shaped our thinking this year
            </p>
          </div>
        </div>

        {/* Masonry Gallery - True masonry with varied heights */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-min">
          {art.map((piece, i) => {
            const ratio = piece.aspectRatio ?? 0.75;

            return (
              <div key={i} className="group relative">
                <div className="rounded-xl overflow-hidden bg-slate-800 shadow-2xl shadow-black/30 ring-1 ring-purple-900/20">
                  <div
                    className="relative w-full"
                    style={{ paddingBottom: `${ratio * 100}%` }}
                  >
                    {piece.image ? (
                      <>
                        <Image
                          src={piece.image}
                          alt={piece.title}
                          fill
                          sizes="(max-width: 768px) 50vw, 33vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        {/* Vignette overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-purple-900/10 opacity-50 group-hover:opacity-70 transition-opacity" />
                      </>
                    ) : (
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(${135 + i * 30}deg,
                            #7c3aed20,
                            #6d28d915,
                            #4c1d9510)`,
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/10 flex items-center justify-center">
                            <Sparkle className="w-8 h-8 text-purple-400/40" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Title overlay - always visible at bottom */}
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                      <p className="text-white font-medium text-sm leading-tight">{piece.title}</p>
                      <p className="text-purple-300/70 text-xs mt-1">{piece.artist}</p>
                    </div>

                    {/* Link button */}
                    {piece.link && (
                      <a
                        href={piece.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-purple-600/80 hover:scale-110"
                        title="View on artist website"
                      >
                        <OutwardArrow className="w-4 h-4 text-white" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Featured quote */}
        {featuredPiece && (
          <div className="mt-10 relative max-w-2xl mx-auto">
            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500/60 via-purple-500/30 to-transparent rounded-full" />
            <div className="pl-8 pr-4">
              <svg className="w-8 h-8 text-purple-500/30 mb-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="text-slate-200 text-lg leading-relaxed italic">
                {featuredPiece.inspiration}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center">
                  <Sparkle className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-purple-400 text-sm font-medium">{featuredPiece.artist}</p>
                  {featuredPiece.link && (
                    <a
                      href={featuredPiece.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-purple-400 transition-colors flex items-center gap-1"
                    >
                      Learn More <OutwardArrow className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
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
          <HeartHands className="w-7 h-7 text-white" />
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
                <HeartHands className="w-6 h-6 text-rose-400" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-white">{moment.description}</p>
              {moment.date && (
                <p className="text-sm text-rose-400 mt-1 flex items-center gap-1">
                  <SeasonMarker className="w-3 h-3" />
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

// International Trips - Travel Journal Style
function TripsSection({ trips }: { trips: TripItem[] }) {
  if (!trips || trips.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/30 rounded-3xl overflow-hidden relative">
      {/* Subtle paper texture */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />

      <div className="relative p-8">
        {/* Header - Journal style */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-8 h-px bg-gradient-to-r from-transparent to-blue-400/50" />
            <FlightPath className="w-5 h-5 text-blue-400" />
            <div className="w-8 h-px bg-gradient-to-l from-transparent to-blue-400/50" />
          </div>
          <h3 className="text-2xl font-light text-white tracking-wide">Miles From Home</h3>
          <p className="text-xs text-slate-500 mt-2 italic">Learning from communities worldwide</p>
        </div>

        {/* Journey path visualization */}
        <div className="relative mb-6">
          <div className="absolute top-6 left-6 right-6 h-px bg-gradient-to-r from-blue-500/30 via-cyan-500/30 to-blue-500/30" />
          <div className="flex justify-between px-2">
            {trips.map((trip, i) => (
              <div key={i} className="relative flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-blue-500/40 flex items-center justify-center text-2xl shadow-lg shadow-blue-500/10 z-10">
                  {trip.flag || '🌍'}
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs font-medium text-white">{trip.destination}</p>
                  <p className="text-[10px] text-blue-400/70">{trip.country}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trip cards - Journal entries */}
        <div className="space-y-4">
          {trips.map((trip, i) => (
            <div
              key={i}
              className="group relative"
            >
              {/* Card with torn paper effect */}
              <div className="relative bg-slate-800/40 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700/50 hover:border-blue-500/30 transition-all duration-300">
                {/* Decorative left border */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-cyan-500 to-blue-500 opacity-50" />

                <div className="p-5 pl-6">
                  <div className="flex items-start gap-4">
                    {/* Flag + Location */}
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <span className="text-4xl drop-shadow-lg">{trip.flag || '🌍'}</span>
                        {/* Passport stamp effect */}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                          <PlaceSeed className="w-2.5 h-2.5 text-blue-400" />
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-lg font-semibold text-white">{trip.destination}</h4>
                        <span className="text-xs text-blue-400/60 uppercase tracking-wider">{trip.country}</span>
                      </div>

                      {/* Purpose - like a journal entry */}
                      <p className="text-slate-300 text-sm leading-relaxed mb-3">
                        {trip.purpose}
                      </p>

                      {/* Highlights - photo tags style */}
                      {trip.highlights && trip.highlights.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {trip.highlights.map((h, j) => (
                            <span
                              key={j}
                              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                            >
                              <span className="w-1 h-1 rounded-full bg-blue-400" />
                              {h}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Trip image if available */}
                    {trip.image && (
                      <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden relative ring-2 ring-white/10">
                        <Image src={trip.image} alt={trip.destination} fill className="object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Decorative footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-slate-500 text-xs">
            <GlobeMarker className="w-3.5 h-3.5" />
            <span className="italic">Every mile a lesson, every community a teacher</span>
          </div>
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
      title: 'Starman',
      artist: 'David Bowie',
      medium: 'Performance portrait',
      image: '/images/art/Bowie.jpg',
      inspiration: "I don't know where I'm going from here, but I promise it won't be boring.",
      aspectRatio: 0.5625,
    },
    {
      title: 'Cave of Quiet Light',
      artist: 'Nick Cave',
      medium: 'Photography & reflection',
      image: '/images/art/Cave.avif',
      inspiration: 'Stillness and raw emotion that keep us honest.',
      aspectRatio: 0.5625,
    },
    {
      title: 'Persistence of Memory',
      artist: 'Salvador Dalí',
      medium: 'Surrealist oil study',
      image: '/images/art/Dali.jpeg',
      inspiration: 'Dreamscapes and the fluidity of time.',
      aspectRatio: 0.7493333333333333,
    },
    {
      title: 'Visionary Thinker',
      artist: 'David Unaipon',
      medium: 'Portrait',
      image: '/images/art/David Unaipon.webp',
      inspiration: 'First Nations inventor and storyteller—genius already lives here.',
      link: 'https://en.wikipedia.org/wiki/David_Unaipon',
      aspectRatio: 1,
    },
    {
      title: 'Abstract Gradient',
      artist: 'Gerhard Richter',
      medium: 'Oil on canvas',
      image: '/images/art/Gerhard.webp',
      inspiration: 'Blurring the boundaries between memory and reality.',
      aspectRatio: 1.134,
    },
    {
      title: 'Palm Island Sovereignty',
      artist: 'Uncle Allan – Palm Island Art',
      medium: 'Acrylic on board',
      image: 'https://cdn.prod.website-files.com/689e3bfaae680c28030c9cc1/689e5dfcfa94de9dbc8b5acb_UA_paintings8.jpg',
      inspiration: 'Stories of reef life and cultural sovereignty continue to guide every stroke.',
      link: 'https://burrgumanbarraart.com',
      aspectRatio: 1.11476,
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
    <div ref={containerRef} className="space-y-12 relative">
      <div className="max-w-6xl mx-auto space-y-12 relative">
        {/* Organic background decoration - hand-drawn style curves */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
        <svg className="absolute top-20 -left-20 w-64 h-64" viewBox="0 0 200 200" fill="none" stroke="#CC7A22">
          <path d="M10 100 Q50 30 100 50 Q150 70 180 20" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 150 Q70 100 120 130 Q170 160 190 110" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <svg className="absolute top-40 -right-16 w-48 h-48" viewBox="0 0 200 200" fill="none" stroke="#7D9A6E">
          <path d="M180 30 Q130 80 150 140 Q170 180 120 190" strokeWidth="2" strokeLinecap="round" />
          <circle cx="150" cy="140" r="3" fill="#7D9A6E" />
        </svg>
        <svg className="absolute bottom-40 -left-10 w-32 h-32" viewBox="0 0 100 100" fill="none" stroke="#C2704A">
          <path d="M10 50 Q30 20 50 40 Q70 60 90 30" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Header - with organic underline */}
      <div className="text-center relative">
        <p className="text-amber-400 text-sm uppercase tracking-[0.3em] font-semibold mb-4">2025 Impact</p>
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">The Year in Numbers</h2>
        {/* Hand-drawn style underline */}
        <svg className="w-48 h-4 mx-auto mb-4" viewBox="0 0 200 20" fill="none">
          <path
            d="M10 10 Q50 5 100 12 Q150 18 190 8"
            stroke="url(#headerUnderline)"
            strokeWidth="2"
            strokeLinecap="round"
            className="animate-draw-path"
          />
          <defs>
            <linearGradient id="headerUnderline" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#CC7A22" />
              <stop offset="50%" stopColor="#C2704A" />
              <stop offset="100%" stopColor="#7D9A6E" />
            </linearGradient>
          </defs>
        </svg>
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

      {/* Organic Divider - hand-drawn style */}
      <div className="relative py-12">
        <svg className="w-full h-8" viewBox="0 0 800 32" preserveAspectRatio="xMidYMid meet" fill="none">
          {/* Organic wavy line */}
          <path
            d="M0 16 Q100 8 200 16 Q300 24 400 16 Q500 8 600 16 Q700 24 800 16"
            stroke="url(#dividerGradient)"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.4"
          />
          {/* Decorative dots along the path */}
          <circle cx="200" cy="16" r="2" fill="#CC7A22" opacity="0.6" />
          <circle cx="400" cy="16" r="3" fill="#C2704A" opacity="0.8" />
          <circle cx="600" cy="16" r="2" fill="#7D9A6E" opacity="0.6" />
          <defs>
            <linearGradient id="dividerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="30%" stopColor="#CC7A22" />
              <stop offset="50%" stopColor="#C2704A" />
              <stop offset="70%" stopColor="#7D9A6E" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
        {/* Central sparkle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Sparkle className="w-6 h-6 text-amber-500/60" />
        </div>
      </div>

      {/* What Kept Us Grounded - with organic decorative elements */}
      <div className="text-center mb-8 relative">
        {/* Decorative leaves/sprouts on sides */}
        <svg className="absolute left-8 top-0 w-12 h-12 opacity-20" viewBox="0 0 48 48" fill="none" stroke="#7D9A6E">
          <path d="M24 44 Q20 30 28 20 Q36 10 24 4" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M24 44 Q28 32 22 24 Q16 16 24 4" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <svg className="absolute right-8 top-0 w-12 h-12 opacity-20 scale-x-[-1]" viewBox="0 0 48 48" fill="none" stroke="#7D9A6E">
          <path d="M24 44 Q20 30 28 20 Q36 10 24 4" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M24 44 Q28 32 22 24 Q16 16 24 4" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <h3 className="text-2xl font-bold text-white mb-2">What Kept Us Grounded</h3>
        <p className="text-slate-400">Work is only as meaningful as the life that surrounds it</p>
        {/* Organic underline */}
        <svg className="w-32 h-3 mx-auto mt-3" viewBox="0 0 128 12" fill="none">
          <path d="M4 6 Q32 2 64 8 Q96 12 124 6" stroke="#C2704A" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </svg>
      </div>

      {/* Cultural sections - Music row */}
      <div className="grid md:grid-cols-2 gap-6">
        <PlaylistSection tunes={defaultTunes} />
        <ConcertsSection concerts={defaultConcerts} />
      </div>

      </div>

      <div className="w-full px-4 sm:px-6 md:px-10">
        <ArtGallerySection art={defaultArt} />
      </div>

      <div className="max-w-6xl mx-auto space-y-12 relative">
        {/* International Trips - Full width */}
        <TripsSection trips={defaultTrips} />

        {/* Family section - full width */}
        <FamilySection moments={defaultMoments} />
      </div>
    </div>
  );
}
