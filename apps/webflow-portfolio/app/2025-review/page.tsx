'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { ConstellationCanvas } from '../../components/ConstellationCanvas';
import { SeasonSection } from '../../components/SeasonSection';
import { YearInNumbersRedesign } from '../../components/YearInNumbersRedesign';
import { ProjectModal } from '../../components/ProjectModal';
import { FeaturedProjectSection } from '../../components/FeaturedProjectSection';
import { LandRedevelopmentShowcase } from '../../components/LandRedevelopmentShowcase';
import { ProjectDiscovery } from '../../components/ProjectDiscovery';
import { YearReviewNavigation } from '../../components/YearReviewNavigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import PlacesMap to avoid SSR issues with Leaflet
const PlacesMap = dynamic(() => import('../../components/PlacesMap'), {
  ssr: false,
  loading: () => (
    <div className="bg-slate-800/30 rounded-2xl flex items-center justify-center" style={{ minHeight: '500px' }}>
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading map...</p>
      </div>
    </div>
  ),
});
import { getYearInReviewData, getCuratedEntries } from '../../lib/yearInReviewApi';
import { DEFAULT_FEATURED_PROJECTS } from '../../lib/featuredProjects';
import { DEFAULT_REDEVELOPMENT_SITES, cloneRedevelopmentSites } from '../../lib/redevelopmentSites';
import type { YearInReviewData, CuratedData, Season, TimelineEntry, RedevelopmentSite } from '../../types/yearInReview';

// Demo data for development/fallback
const DEMO_DATA: YearInReviewData = {
  year: 2025,
  seasons: [
    { name: 'Planting', months: [0, 1, 2], subtitle: 'Planning & Beginnings', color: '#59c3c3', index: 0, entries: [] },
    { name: 'Growing', months: [3, 4, 5], subtitle: 'Development & Momentum', color: '#ffa857', index: 1, entries: [] },
    { name: 'Harvesting', months: [6, 7, 8], subtitle: 'Achievements & Outputs', color: '#f7a399', index: 2, entries: [] },
    { name: 'Resting', months: [9, 10, 11], subtitle: 'Reflection & Preparation', color: '#d8d8f6', index: 3, entries: [] },
  ],
  timeline: [],
  metrics: {
    // Human-centered metrics
    peopleEngaged: 847,
    conversationsHad: 312,
    kmsTraveled: 24500,
    countriesVisited: 6,
    communitiesReached: 18,

    // Project metrics
    projectsCompleted: 8,
    projectsActive: 12,
    milestonesReached: 23,

    // Story & content metrics
    storiesCaptured: 47,
    eventsAttended: 34,
    workshopsRun: 12,

    // Connection metrics
    partnershipsFormed: 15,
    introductionsMade: 89,

    // Creative/fun metrics
    cupsOfTea: 1050,
    sunrisesMissed: 7,
    lateNights: 64,

    // Theme breakdown
    themes: {
      'First Nations': 12,
      'Agriculture': 8,
      'Community': 15,
      'Sustainability': 6,
      'Innovation': 9,
    },

    // Places
    places: [
      'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Darwin',
      'Dubbo', 'Tamworth', 'Cairns', 'Alice Springs', 'Broome',
    ],
  },
  rawData: { notion: { projects: [], people: [], opportunities: [], activities: [], stories: [] }, gmail: [], linkedin: [] },
};

interface SelectedPlace {
  id: string;
  name: string;
  traditionalName?: string;
  westernName?: string;
  firstPeople?: string;
  region?: string;
  relatedProjects: string[];
}

export default function YearInReview2025() {
  const [data, setData] = useState<YearInReviewData | null>(null);
  const [curated, setCurated] = useState<CuratedData | null>(null);
  const [activeSeasonIndex, setActiveSeasonIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry | null>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  // Handle entry click to open modal
  const handleEntryClick = useCallback((entry: TimelineEntry) => {
    setSelectedEntry(entry);
  }, []);

  // Get season color for the selected entry
  const getSeasonColorForEntry = useCallback((entry: TimelineEntry | null) => {
    if (!entry) return '#59c3c3';
    const month = new Date(entry.date).getMonth();
    const seasonIndex = Math.floor(month / 3);
    const colors = ['#59c3c3', '#ffa857', '#f7a399', '#d8d8f6'];
    return colors[seasonIndex] || '#59c3c3';
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [yearData, curatedData] = await Promise.all([
          getYearInReviewData(2025).catch(() => DEMO_DATA),
          getCuratedEntries(2025).catch(() => ({ entries: [], lastUpdated: null })),
        ]);
        setData(yearData);
        setCurated(curatedData);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data. Using demo data.');
        setData(DEMO_DATA);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Scroll tracking for active season
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 3;

      for (let i = sectionRefs.current.length - 1; i >= 0; i--) {
        const section = sectionRefs.current[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSeasonIndex(i);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Merge curated edits with raw data
  const getDisplayTimeline = (): Season[] => {
    if (!data) return [];

    // If we have curated entries, use those
    if (curated?.entries && curated.entries.length > 0) {
      const includedEntries = curated.entries.filter((e) => e.included !== false);
      const seasons = [...data.seasons].map((s, idx) => ({
        ...s,
        index: idx,
        entries: includedEntries
          .filter((e) => {
            if (e.seasonOverride !== undefined) return e.seasonOverride === idx;
            const month = new Date(e.date).getMonth();
            return s.months.includes(month);
          })
          .sort((a, b) => {
            const sortA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
            const sortB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
            if (sortA !== sortB) return sortA - sortB;
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateA - dateB;
          })
          .map((e) => ({
            ...e,
            title: e.editedTitle || e.title,
            description: e.editedDescription || e.description,
          })),
      }));
      return seasons;
    }

    // Otherwise use raw timeline
    return data.timeline;
  };

  const timeline = getDisplayTimeline();
  const allEntries = timeline.flatMap((s) => s.entries);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading 2025 in Review...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <YearReviewNavigation />

      {/* Constellation Canvas - Fixed Background */}
      <ConstellationCanvas entries={allEntries} activeSeasonIndex={activeSeasonIndex} onNodeClick={(entry) => console.log('Clicked:', entry)} />

      {/* Hero Section */}
      <section id="hero" className="relative z-10 min-h-[80vh] flex flex-col items-center justify-center text-center px-6 pt-24 pb-16">
        <div className="bg-slate-950/60 backdrop-blur-sm rounded-3xl px-8 py-12 md:px-16 md:py-16">
          <p className="text-teal-400 text-sm uppercase tracking-[0.3em] font-semibold mb-4 drop-shadow">A Curious Tractor</p>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            {curated?.settings?.heroTitle || 'Growing Curious'}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mb-8 drop-shadow">
            {curated?.settings?.heroSubtitle || 'Our Journey Through the 2025 Seasons'}
          </p>
          <p className="text-slate-200 max-w-3xl leading-relaxed">
            {curated?.settings?.introText ||
              'Each season has brought its own harvest of learning. Through meaningful relationships and respect, transformation emerges when we create space for different ways of knowing.'}
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Year in Numbers - Reimagined */}
      {data && (
        <section id="numbers" className="relative z-10 py-16 px-6">
          <YearInNumbersRedesign metrics={data.metrics} curatedSettings={curated?.settings} />
        </section>
      )}

      {/* Project Discovery - Explore All Projects */}
      <section id="projects">
        <ProjectDiscovery className="relative z-10" />
      </section>

      {/* Places Map */}
      <section id="places" className="relative z-10 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <PlacesMap
            onPlaceClick={(place) => console.log('Place clicked:', place)}
            className="mb-8"
          />
        </div>
      </section>

      {/* Season Sections with Featured Projects */}
      <div className="relative z-10">
        {timeline.map((season, index) => (
          <div key={season.name}>
            {/* Season Timeline */}
            <section
              id={season.name.toLowerCase()}
              ref={(el) => {
                sectionRefs.current[index] = el;
              }}
              className="min-h-screen py-24 px-6"
            >
              <SeasonSection season={season} isActive={index === activeSeasonIndex} onEntryClick={handleEntryClick} />
            </section>

            {/* Featured Project after this season */}
            {(() => {
              const featuredFromSettings = curated?.settings?.featuredProjects as any;
              const featuredProject =
                featuredFromSettings?.[index] && featuredFromSettings[index]?.slug
                  ? featuredFromSettings[index]
                  : DEFAULT_FEATURED_PROJECTS[index];

              if (!featuredProject) return null;
              return (
                <FeaturedProjectSection
                  project={featuredProject}
                  seasonName={season.name}
                  seasonColor={season.color}
                />
              );
            })()}
          </div>
        ))}
      </div>

      {/* Land Redevelopment Showcase - Finale after all seasons */}
      <section id="land">
        <LandRedevelopmentShowcase
        sites={
          (curated?.settings?.redevelopmentSites?.length
            ? curated.settings.redevelopmentSites
            : cloneRedevelopmentSites()) as RedevelopmentSite[]
        }
        title="Transforming Land, Building Community"
        subtitle="Our partners in place-based regeneration"
        introText="Across Townsville, Sydney, and Alice Springs, we've partnered with Traditional Owners and local organizations to transform land into thriving community spaces. These drone images capture the scale of what's possible when development is led by community."
        />
      </section>

      {/* Project Modal */}
      <ProjectModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        seasonColor={getSeasonColorForEntry(selectedEntry)}
      />

      {/* Footer CTA */}
      <section id="footer" className="relative z-10 py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto bg-slate-900/60 backdrop-blur-sm rounded-3xl p-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 drop-shadow-lg">Looking Ahead to 2026</h2>
          <p className="text-slate-200 mb-8">
            The seeds planted in 2025 continue to grow. Join us in nurturing these connections and building community strength.
          </p>
          <a
            href="https://act.place/contact"
            className="inline-block bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold px-8 py-4 rounded-full transition-colors shadow-lg"
          >
            Get Involved
          </a>
        </div>
      </section>

      {/* Admin link (hidden unless you know to look) */}
      <div className="fixed bottom-4 right-4 z-50 opacity-20 hover:opacity-100 transition-opacity">
        <Link href="/2025-review/admin" className="text-xs text-slate-500 hover:text-slate-300">
          Admin
        </Link>
      </div>
    </div>
  );
}
