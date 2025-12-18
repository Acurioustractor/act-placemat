'use client';

import { useEffect, useRef, useState } from 'react';
import type { YearMetrics } from '../types/yearInReview';

interface MetricsDashboardProps {
  metrics: YearMetrics;
}

interface MetricCardProps {
  value: number;
  label: string;
  icon: string;
  suffix?: string;
  color: string;
  delay?: number;
  size?: 'large' | 'medium' | 'small';
}

function MetricCard({ value, label, icon, suffix = '', color, delay = 0, size = 'medium' }: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const timeout = setTimeout(() => {
      const duration = 1500;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        current = Math.min(value, Math.round(increment * step));
        setDisplayValue(current);

        if (step >= steps) {
          setDisplayValue(value);
          clearInterval(timer);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }, delay);

    return () => clearTimeout(timeout);
  }, [isVisible, value, delay]);

  const sizeClasses = {
    large: 'p-8 rounded-3xl',
    medium: 'p-6 rounded-2xl',
    small: 'p-4 rounded-xl',
  };

  const textSizes = {
    large: 'text-5xl md:text-6xl',
    medium: 'text-3xl md:text-4xl',
    small: 'text-2xl',
  };

  return (
    <div
      ref={cardRef}
      className={`bg-slate-900/70 backdrop-blur-md border border-slate-600/40 text-center transform transition-all duration-700 shadow-lg ${sizeClasses[size]} ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <div className={`${textSizes[size]} font-bold mb-2 drop-shadow-md`} style={{ color }}>
        {displayValue.toLocaleString()}
        {suffix && <span className="text-lg ml-1 opacity-80">{suffix}</span>}
      </div>
      <div className="text-slate-300 text-sm font-medium">{label}</div>
    </div>
  );
}

export function MetricsDashboard({ metrics }: MetricsDashboardProps) {
  // Hero metrics - the big ones
  const heroMetrics = [
    { value: metrics.peopleEngaged, label: 'People Engaged', icon: '👥', color: '#59c3c3' },
    { value: metrics.conversationsHad, label: 'Conversations Had', icon: '💬', color: '#ffa857' },
    { value: metrics.kmsTraveled, label: 'Kilometers Traveled', icon: '✈️', suffix: 'km', color: '#f7a399' },
    { value: metrics.communitiesReached, label: 'Communities Reached', icon: '🌏', color: '#d8d8f6' },
  ];

  // Project metrics
  const projectMetrics = [
    { value: metrics.projectsCompleted, label: 'Projects Completed', icon: '✅', color: '#59c3c3' },
    { value: metrics.projectsActive, label: 'Projects Active', icon: '🔥', color: '#ffa857' },
    { value: metrics.milestonesReached, label: 'Milestones Reached', icon: '🎯', color: '#f7a399' },
  ];

  // Connection metrics
  const connectionMetrics = [
    { value: metrics.partnershipsFormed, label: 'Partnerships Formed', icon: '🤝', color: '#3a7ca5' },
    { value: metrics.introductionsMade, label: 'Introductions Made', icon: '👋', color: '#59c3c3' },
    { value: metrics.countriesVisited, label: 'Countries Visited', icon: '🗺️', color: '#ffa857' },
  ];

  // Story metrics
  const storyMetrics = [
    { value: metrics.storiesCaptured, label: 'Stories Captured', icon: '📖', color: '#d8d8f6' },
    { value: metrics.eventsAttended, label: 'Events Attended', icon: '🎪', color: '#f7a399' },
    { value: metrics.workshopsRun, label: 'Workshops Run', icon: '🛠️', color: '#59c3c3' },
  ];

  // Fun/quirky metrics
  const funMetrics = [
    { value: metrics.cupsOfTea, label: 'Cups of Tea', icon: '🍵', color: '#8B4513' },
    { value: metrics.lateNights, label: 'Late Nights', icon: '🌙', color: '#6366f1' },
    { value: metrics.sunrisesMissed, label: 'Sunrises Missed', icon: '🌅', color: '#f59e0b' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12 bg-slate-900/50 backdrop-blur-sm rounded-3xl py-8 px-6">
        <p className="text-teal-400 text-sm uppercase tracking-[0.3em] font-semibold mb-4">2025 Impact</p>
        <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">The Year in Numbers</h2>
        <p className="text-slate-300 mt-3 max-w-xl mx-auto">
          Every number tells a story of connection, growth, and community
        </p>
      </div>

      {/* Hero metrics - large cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
        {heroMetrics.map((metric, i) => (
          <MetricCard key={metric.label} {...metric} delay={i * 100} size="large" />
        ))}
      </div>

      {/* Project metrics */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4 text-center drop-shadow">Projects & Progress</h3>
        <div className="grid grid-cols-3 gap-4">
          {projectMetrics.map((metric, i) => (
            <MetricCard key={metric.label} {...metric} delay={400 + i * 100} size="medium" />
          ))}
        </div>
      </div>

      {/* Connection + Story metrics in two columns */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 text-center drop-shadow">Connections Made</h3>
          <div className="grid grid-cols-3 gap-3">
            {connectionMetrics.map((metric, i) => (
              <MetricCard key={metric.label} {...metric} delay={700 + i * 100} size="small" />
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 text-center drop-shadow">Stories & Events</h3>
          <div className="grid grid-cols-3 gap-3">
            {storyMetrics.map((metric, i) => (
              <MetricCard key={metric.label} {...metric} delay={1000 + i * 100} size="small" />
            ))}
          </div>
        </div>
      </div>

      {/* Fun metrics - smaller, playful */}
      <div className="mt-10 pt-8 border-t border-slate-600/40">
        <h3 className="text-lg font-semibold text-white mb-4 text-center drop-shadow">Behind the Scenes</h3>
        <div className="flex justify-center gap-4 flex-wrap">
          {funMetrics.map((metric, i) => (
            <div
              key={metric.label}
              className="bg-slate-900/60 border border-slate-600/40 rounded-full px-6 py-3 flex items-center gap-3 backdrop-blur-sm"
            >
              <span className="text-2xl">{metric.icon}</span>
              <div>
                <span className="font-bold text-lg drop-shadow" style={{ color: metric.color }}>
                  {metric.value.toLocaleString()}
                </span>
                <span className="text-slate-300 text-sm ml-2">{metric.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Theme breakdown if available */}
      {Object.keys(metrics.themes).length > 0 && (
        <div className="mt-10 bg-slate-900/40 backdrop-blur-sm rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-6 text-center drop-shadow">Project Themes</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {Object.entries(metrics.themes)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([theme, count]) => (
                <div
                  key={theme}
                  className="px-4 py-2 bg-slate-800/60 border border-slate-600/40 rounded-full text-white"
                >
                  <span className="font-medium">{theme}</span>
                  <span className="ml-2 text-teal-400 font-bold">({count})</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
