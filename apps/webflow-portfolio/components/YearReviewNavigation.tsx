'use client';

import { useState, useEffect, useCallback, type ComponentType, type SVGProps } from 'react';
import { Menu, X, ChevronUp } from 'lucide-react';
import {
  TractorMini,
  RootedSprout,
  StorySpiral,
  PlaceSeed,
  PlowLines,
  DawnRays,
  Campfire,
  NightSky,
  CountryLines,
  CommunityCircle,
  Sparkle,
} from './icons/ACTIcons';

// Earth tone palette
const earthTones = {
  terracotta: '#C2704A',
  ochre: '#CC7A22',
  sage: '#7D9A6E',
  clay: '#A0785A',
  sand: '#D4B896',
};

type IconComponent = ComponentType<{ className?: string }>;

interface NavSection {
  id: string;
  label: string;
  icon: IconComponent;
  seasonColor?: string;
}

const SECTIONS: NavSection[] = [
  { id: 'hero', label: 'Intro', icon: TractorMini },
  { id: 'numbers', label: 'Year in Numbers', icon: StorySpiral },
  { id: 'projects', label: 'Projects', icon: RootedSprout },
  { id: 'places', label: 'Places', icon: PlaceSeed },
  { id: 'planting', label: 'Planting', icon: PlowLines, seasonColor: earthTones.sage },
  { id: 'growing', label: 'Growing', icon: DawnRays, seasonColor: earthTones.ochre },
  { id: 'harvesting', label: 'Harvesting', icon: Campfire, seasonColor: earthTones.terracotta },
  { id: 'resting', label: 'Resting', icon: NightSky, seasonColor: '#6366f1' },
  { id: 'land', label: 'Land Projects', icon: CountryLines },
  { id: 'footer', label: 'Get Involved', icon: CommunityCircle },
];

export function YearReviewNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Track scroll position for nav background and back-to-top
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      setShowBackToTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track active section via Intersection Observer
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SECTIONS.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
              setActiveSection(id);
            }
          });
        },
        { threshold: [0.3, 0.5, 0.7], rootMargin: '-80px 0px -40% 0px' } // Account for fixed nav
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Account for fixed nav
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
    setIsOpen(false);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Desktop Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 hidden md:block transition-all duration-300 ${
          isScrolled
            ? 'bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50 shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand - ACT tractor with earth tone hover */}
            <button
              onClick={() => scrollToSection('hero')}
              className="flex items-center gap-2 text-white font-semibold transition-colors group"
              style={{ ['--hover-color' as string]: earthTones.ochre }}
            >
              <TractorMini className="w-6 h-6 group-hover:text-amber-400 transition-colors" />
              <span className="text-sm tracking-wide group-hover:text-amber-200 transition-colors">2025 Review</span>
            </button>

            {/* Navigation Links - with earth tone accents */}
            <div className="flex items-center gap-1">
              {SECTIONS.slice(1, -1).map(({ id, label, seasonColor }) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                    activeSection === id
                      ? 'text-amber-300 bg-amber-400/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                  style={activeSection === id && seasonColor ? { color: seasonColor, backgroundColor: `${seasonColor}15` } : undefined}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* CTA Button - earth tone styling */}
            <button
              onClick={() => scrollToSection('footer')}
              className="px-4 py-2 text-white text-sm font-semibold rounded-full transition-all hover:scale-105"
              style={{ backgroundColor: earthTones.terracotta }}
            >
              Get Involved
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Bar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 md:hidden transition-all duration-300 ${
          isScrolled
            ? 'bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/50'
            : 'bg-slate-950/60 backdrop-blur-sm'
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo - ACT tractor */}
          <button
            onClick={() => scrollToSection('hero')}
            className="flex items-center gap-2 text-white font-semibold"
          >
            <TractorMini className="w-5 h-5 text-amber-400" />
            <span className="text-xs tracking-wide">2025</span>
          </button>

          {/* Current Section Indicator */}
          <span className="text-xs text-slate-400 truncate max-w-[120px]">
            {SECTIONS.find((s) => s.id === activeSection)?.label}
          </span>

          {/* Hamburger Button */}
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 text-white hover:bg-slate-800/50 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Mobile Full-Screen Menu */}
      <div
        className={`fixed inset-0 z-[100] md:hidden transition-all duration-500 ${
          isOpen ? 'visible' : 'invisible'
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-slate-950/98 backdrop-blur-2xl transition-opacity duration-500 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsOpen(false)}
        />

        {/* Menu Content */}
        <div
          className={`relative h-full flex flex-col transition-all duration-500 transform ${
            isOpen ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
          }`}
        >
          {/* Header - ACT branding */}
          <div className="flex items-center justify-between h-14 px-4 border-b border-amber-900/30">
            <span className="text-white font-semibold flex items-center gap-2">
              <TractorMini className="w-5 h-5 text-amber-400" />
              A Curious Tractor
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-white hover:bg-slate-800/50 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Links - with ACT icons and season colors */}
          <div className="flex-1 overflow-y-auto py-8 px-6">
            <div className="space-y-2">
              {SECTIONS.map(({ id, label, icon: Icon, seasonColor }, index) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all duration-300 ${
                    activeSection === id
                      ? 'border'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent'
                  }`}
                  style={{
                    transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                    ...(activeSection === id ? {
                      backgroundColor: `${seasonColor || earthTones.ochre}20`,
                      color: seasonColor || earthTones.ochre,
                      borderColor: `${seasonColor || earthTones.ochre}40`,
                    } : {}),
                  }}
                >
                  <Icon className="w-6 h-6" />
                  <div>
                    <span className="text-lg font-medium block">{label}</span>
                    {id.match(/planting|growing|harvesting|resting/) && (
                      <span className="text-xs text-slate-500">Season</span>
                    )}
                  </div>
                  {activeSection === id && (
                    <Sparkle className="ml-auto w-4 h-4 animate-pulse" style={{ color: seasonColor || earthTones.ochre }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Footer - ACT styled */}
          <div className="p-6 border-t border-amber-900/30">
            <p className="text-center text-slate-500 text-xs mb-4">
              A Curious Tractor &copy; 2025
            </p>
            <button
              onClick={() => scrollToSection('footer')}
              className="w-full py-4 text-white font-semibold rounded-2xl transition-all hover:scale-[1.02]"
              style={{ backgroundColor: earthTones.terracotta }}
            >
              Get Involved
            </button>
          </div>
        </div>
      </div>

      {/* Back to Top Button - earth tone styling */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-40 p-3 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 ${
          showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{ backgroundColor: earthTones.clay }}
        aria-label="Back to top"
      >
        <ChevronUp className="w-5 h-5" />
      </button>

      {/* Progress Bar - earth tone gradient */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-slate-900/80">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${(SECTIONS.findIndex((s) => s.id === activeSection) / (SECTIONS.length - 1)) * 100}%`,
            background: `linear-gradient(90deg, ${earthTones.sage} 0%, ${earthTones.ochre} 40%, ${earthTones.terracotta} 70%, #6366f1 100%)`,
          }}
        />
      </div>
    </>
  );
}

export default YearReviewNavigation;
