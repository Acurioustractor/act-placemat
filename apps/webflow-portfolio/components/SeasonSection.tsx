'use client';

import { useRef, useEffect, useState } from 'react';
import { TimelineEntryCard } from './TimelineEntry';
import { FeaturedEntryCard } from './FeaturedEntryCard';
import type { Season, TimelineEntry } from '../types/yearInReview';

interface SeasonSectionProps {
  season: Season;
  isActive: boolean;
  onEntryClick?: (entry: TimelineEntry) => void;
}

// Month names for date ranges
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Custom SVG season icons - elegant, agricultural, brand-aligned
const SeasonIcons = {
  // Planting: Seed sprouting from soil - represents origin, potential, new beginnings
  Planting: ({ color, className }: { color: string; className?: string }) => (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Soil line */}
      <path
        d="M8 36 C12 34, 20 35, 24 34 C28 35, 36 34, 40 36"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Seed underground */}
      <ellipse cx="24" cy="38" rx="4" ry="2.5" fill={color} opacity="0.4" />
      {/* Sprouting stem */}
      <path
        d="M24 34 C24 28, 24 24, 24 18"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* First leaf unfurling left */}
      <path
        d="M24 22 C20 20, 16 18, 14 14 C16 16, 20 18, 24 20"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={color}
        opacity="0.3"
      />
      {/* First leaf unfurling right */}
      <path
        d="M24 22 C28 20, 32 18, 34 14 C32 16, 28 18, 24 20"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={color}
        opacity="0.3"
      />
      {/* Tiny emerging tip */}
      <path
        d="M24 18 C24 14, 24 12, 24 10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),

  // Growing: Radiant sun - represents energy, nurturing, peak activity, warmth
  Growing: ({ color, className }: { color: string; className?: string }) => (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Sun core */}
      <circle cx="24" cy="24" r="8" stroke={color} strokeWidth="2.5" fill={color} fillOpacity="0.2" />
      {/* Sun rays - 8 rays radiating outward */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 24 + Math.cos(rad) * 12;
        const y1 = 24 + Math.sin(rad) * 12;
        const x2 = 24 + Math.cos(rad) * 18;
        const y2 = 24 + Math.sin(rad) * 18;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            opacity={i % 2 === 0 ? 1 : 0.6}
          />
        );
      })}
      {/* Inner warmth circle */}
      <circle cx="24" cy="24" r="4" fill={color} opacity="0.4" />
    </svg>
  ),

  // Harvesting: Wheat sheaf/bundle - represents gathering, abundance, reward
  Harvesting: ({ color, className }: { color: string; className?: string }) => (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Central wheat stalk */}
      <path d="M24 42 L24 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Central wheat head */}
      <ellipse cx="24" cy="14" rx="2" ry="4" fill={color} opacity="0.8" />
      <ellipse cx="24" cy="10" rx="1.5" ry="3" fill={color} opacity="0.6" />
      {/* Central whiskers */}
      <path d="M24 8 L24 5" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <path d="M22 9 L20 6" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <path d="M26 9 L28 6" stroke={color} strokeWidth="1" strokeLinecap="round" />

      {/* Left wheat stalk */}
      <path d="M18 40 C18 36, 16 28, 14 20" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <ellipse cx="13" cy="16" rx="1.5" ry="3.5" fill={color} opacity="0.6" transform="rotate(-15 13 16)" />
      <path d="M12 13 L10 10" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.6" />

      {/* Right wheat stalk */}
      <path d="M30 40 C30 36, 32 28, 34 20" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <ellipse cx="35" cy="16" rx="1.5" ry="3.5" fill={color} opacity="0.6" transform="rotate(15 35 16)" />
      <path d="M36 13 L38 10" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.6" />

      {/* Binding tie at base */}
      <path
        d="M16 38 C18 36, 22 35, 24 35 C26 35, 30 36, 32 38"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M17 40 C19 38, 22 37, 24 37 C26 37, 29 38, 31 40"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </svg>
  ),

  // Resting: Crescent moon over horizon - represents quiet, reflection, renewal, peace
  Resting: ({ color, className }: { color: string; className?: string }) => (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Crescent moon */}
      <path
        d="M28 8 C20 10, 16 18, 18 26 C20 34, 28 38, 36 36 C30 38, 22 34, 20 26 C18 18, 22 10, 28 8 Z"
        fill={color}
        opacity="0.3"
        stroke={color}
        strokeWidth="2"
      />
      {/* Small stars */}
      <circle cx="38" cy="12" r="1.5" fill={color} opacity="0.6" />
      <circle cx="14" cy="16" r="1" fill={color} opacity="0.4" />
      <circle cx="40" cy="24" r="1" fill={color} opacity="0.5" />

      {/* Horizon line - gentle rolling hills */}
      <path
        d="M4 38 C10 36, 16 37, 24 35 C32 37, 38 36, 44 38"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Second horizon layer */}
      <path
        d="M6 40 C14 38, 20 39, 28 38 C36 39, 40 38, 42 40"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  ),
};

// Fallback icon for unknown seasons
const DefaultIcon = ({ color, className }: { color: string; className?: string }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="10" stroke={color} strokeWidth="2" />
    <circle cx="24" cy="24" r="4" fill={color} opacity="0.4" />
  </svg>
);

export function SeasonSection({ season, isActive, onEntryClick }: SeasonSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(false);
  const startMonth = MONTH_NAMES[season.months[0]];
  const endMonth = MONTH_NAMES[season.months[season.months.length - 1]];

  // Intersection observer for header animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeaderVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={sectionRef}
      className={`
        max-w-5xl mx-auto px-4 md:px-0
        transition-all duration-1000
        ${isActive ? 'opacity-100' : 'opacity-60'}
      `}
    >
      {/* Season Header with enhanced visuals */}
      <div
        className={`
          relative mb-8 md:mb-12 text-center overflow-hidden
          bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80
          backdrop-blur-xl
          border border-slate-600/30
          rounded-2xl md:rounded-3xl
          py-8 md:py-12 px-6 md:px-10
          shadow-xl shadow-slate-950/50
          transition-all duration-1000 ease-out
          ${headerVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-10 scale-95'
          }
        `}
      >
        {/* Decorative background elements */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 50% 50% at 50% 0%, ${season.color}20, transparent)`
          }}
        />
        <div
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: season.color }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ backgroundColor: season.color }}
        />

        {/* Animated accent line */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 h-1 rounded-full transition-all duration-1000 ease-out"
          style={{
            backgroundColor: season.color,
            width: headerVisible ? '120px' : '0px',
            boxShadow: `0 0 20px ${season.color}60`
          }}
        />

        {/* Season icon */}
        <div
          className={`
            mb-4
            transition-all duration-700 delay-200
            ${headerVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
          `}
        >
          {(() => {
            const IconComponent = SeasonIcons[season.name as keyof typeof SeasonIcons] || DefaultIcon;
            return (
              <IconComponent
                color={season.color}
                className="w-14 h-14 md:w-16 md:h-16 mx-auto"
              />
            );
          })()}
        </div>

        {/* Date range pill */}
        <div
          className={`
            inline-flex items-center gap-2
            px-4 py-1.5 rounded-full
            text-sm font-semibold
            mb-4 shadow-lg
            backdrop-blur-sm
            transition-all duration-700 delay-300
            ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
          style={{
            backgroundColor: `${season.color}30`,
            color: season.color,
            boxShadow: `0 4px 20px ${season.color}20`
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {startMonth} - {endMonth}
        </div>

        {/* Season name */}
        <h2
          className={`
            text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3
            transition-all duration-700 delay-400
            ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
          style={{ textShadow: `0 4px 30px ${season.color}40` }}
        >
          {season.name}
        </h2>

        {/* Subtitle */}
        <p
          className={`
            text-lg md:text-xl text-slate-300
            transition-all duration-700 delay-500
            ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          {season.subtitle}
        </p>

        {/* Entry count indicator */}
        {season.entries.length > 0 && (
          <div
            className={`
              mt-6 inline-flex items-center gap-2 text-sm text-slate-400
              transition-all duration-700 delay-600
              ${headerVisible ? 'opacity-100' : 'opacity-0'}
            `}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: season.color }}
            />
            {season.entries.length} {season.entries.length === 1 ? 'story' : 'stories'}
          </div>
        )}
      </div>

      {/* Timeline Entries */}
      {season.entries.length === 0 ? (
        <div
          className={`
            text-center py-12 md:py-16
            bg-slate-900/40 backdrop-blur-md
            border border-slate-700/30
            rounded-2xl md:rounded-3xl
            transition-all duration-700 delay-300
            ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
        >
          {/* Empty state icon - dormant field */}
          <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12 mx-auto mb-4 opacity-40" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 32 C14 28, 22 30, 24 28 C26 30, 34 28, 42 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-400" />
            <path d="M10 36 C18 32, 26 34, 30 32 C34 34, 38 32, 42 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-500" />
            <circle cx="24" cy="20" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" className="text-slate-500" />
            <path d="M24 26 L24 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-500" />
          </svg>
          <p className="text-slate-400 font-medium">No entries yet for this season</p>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto px-4">
            Stories will appear here as you aggregate from Gmail, Notion, and LinkedIn
          </p>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8">
          {/* Vertical timeline line - desktop only */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-slate-600/50 to-transparent" />

          {season.entries.map((entry, index) => (
            entry.isFeatured ? (
              <FeaturedEntryCard
                key={entry.id}
                entry={entry}
                seasonColor={season.color}
                onClick={onEntryClick}
              />
            ) : (
              <TimelineEntryCard
                key={entry.id}
                entry={entry}
                index={index}
                seasonColor={season.color}
                onClick={onEntryClick}
              />
            )
          ))}
        </div>
      )}

      {/* Season divider with decorative element */}
      <div className="relative mt-16 md:mt-24 mb-8">
        <div className="absolute inset-0 flex items-center">
          <div
            className="w-full h-px opacity-30"
            style={{
              background: `linear-gradient(to right, transparent, ${season.color}, transparent)`
            }}
          />
        </div>
        <div className="relative flex justify-center">
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: season.color,
              boxShadow: `0 0 20px ${season.color}60`
            }}
          />
        </div>
      </div>
    </div>
  );
}
