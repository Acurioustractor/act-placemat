'use client';

import { useState, useEffect, useCallback } from 'react';
import { Menu, X, ChevronUp } from 'lucide-react';

interface NavSection {
  id: string;
  label: string;
  icon?: string;
}

const SECTIONS: NavSection[] = [
  { id: 'hero', label: 'Intro', icon: '🌱' },
  { id: 'numbers', label: 'Year in Numbers', icon: '📊' },
  { id: 'projects', label: 'Projects', icon: '🔍' },
  { id: 'places', label: 'Places', icon: '🗺️' },
  { id: 'planting', label: 'Planting', icon: '🌿' },
  { id: 'growing', label: 'Growing', icon: '☀️' },
  { id: 'harvesting', label: 'Harvesting', icon: '🌾' },
  { id: 'resting', label: 'Resting', icon: '❄️' },
  { id: 'land', label: 'Land Projects', icon: '🏗️' },
  { id: 'footer', label: 'Get Involved', icon: '🤝' },
];

// Height of the Webflow/ACT navigation bar
const WEBFLOW_NAV_HEIGHT = 64;

export function YearReviewNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [navTop, setNavTop] = useState(WEBFLOW_NAV_HEIGHT);

  // Track scroll position for nav background, position, and back-to-top
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 50);
      setShowBackToTop(scrollY > 500);
      // Slide up as user scrolls past the Webflow nav
      setNavTop(Math.max(0, WEBFLOW_NAV_HEIGHT - scrollY));
    };
    handleScroll(); // Initial call
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
        { threshold: [0.3, 0.5, 0.7], rootMargin: '-140px 0px -40% 0px' } // Account for both navs (~140px total)
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // Account for both Webflow nav (64px) and Year Review nav (64px/56px)
      const offset = WEBFLOW_NAV_HEIGHT + 70;
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
        className={`fixed left-0 right-0 z-50 hidden md:block transition-all duration-300 ${
          isScrolled
            ? 'bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50 shadow-lg'
            : 'bg-slate-950/60 backdrop-blur-sm'
        }`}
        style={{ top: `${navTop}px` }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <button
              onClick={() => scrollToSection('hero')}
              className="flex items-center gap-2 text-white font-semibold hover:text-teal-400 transition-colors"
            >
              <span className="text-xl">🚜</span>
              <span className="text-sm tracking-wide">2025 Review</span>
            </button>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              {SECTIONS.slice(1, -1).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                    activeSection === id
                      ? 'text-teal-400 bg-teal-400/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* CTA Button */}
            <button
              onClick={() => scrollToSection('footer')}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 text-sm font-semibold rounded-full transition-colors"
            >
              Get Involved
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Bar */}
      <nav
        className={`fixed left-0 right-0 z-50 md:hidden transition-all duration-300 ${
          isScrolled
            ? 'bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/50'
            : 'bg-slate-950/60 backdrop-blur-sm'
        }`}
        style={{ top: `${navTop}px` }}
      >
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo */}
          <button
            onClick={() => scrollToSection('hero')}
            className="flex items-center gap-2 text-white font-semibold"
          >
            <span className="text-lg">🚜</span>
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
          {/* Header */}
          <div className="flex items-center justify-between h-14 px-4 border-b border-slate-800/50">
            <span className="text-white font-semibold flex items-center gap-2">
              <span className="text-lg">🚜</span>
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

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto py-8 px-6">
            <div className="space-y-2">
              {SECTIONS.map(({ id, label, icon }, index) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all duration-300 ${
                    activeSection === id
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent'
                  }`}
                  style={{
                    transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                  }}
                >
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <span className="text-lg font-medium block">{label}</span>
                    {id.match(/planting|growing|harvesting|resting/) && (
                      <span className="text-xs text-slate-500">Season</span>
                    )}
                  </div>
                  {activeSection === id && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-800/50">
            <p className="text-center text-slate-500 text-xs mb-4">
              A Curious Tractor &copy; 2025
            </p>
            <button
              onClick={() => scrollToSection('footer')}
              className="w-full py-4 bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold rounded-2xl transition-colors"
            >
              Get Involved
            </button>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-40 p-3 bg-slate-800/90 hover:bg-slate-700 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 ${
          showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        aria-label="Back to top"
      >
        <ChevronUp className="w-5 h-5" />
      </button>

      {/* Progress Bar */}
      <div
        className="fixed left-0 right-0 z-[60] h-0.5 bg-slate-800/50"
        style={{ top: `${navTop}px` }}
      >
        <div
          className="h-full bg-gradient-to-r from-teal-500 via-teal-400 to-orange-400 transition-all duration-150"
          style={{
            width: `${(SECTIONS.findIndex((s) => s.id === activeSection) / (SECTIONS.length - 1)) * 100}%`,
          }}
        />
      </div>
    </>
  );
}

export default YearReviewNavigation;
