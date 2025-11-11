import { useEffect, useRef, useState } from 'react';
import { ProjectImpactStats } from '../../types';
import { formatNumber, formatCurrency, formatPercentage } from '../../utils/formatting';

interface ImpactStatsProps {
  stats: ProjectImpactStats;
  variant?: 'default' | 'compact' | 'hero';
  animated?: boolean;
  className?: string;
}

/**
 * ImpactStats - Animated big number displays
 * Shows project impact metrics with smooth counter animations
 * Variants:
 * - default: Standard grid layout
 * - compact: Horizontal row for tight spaces
 * - hero: Large, prominent display
 */
const ImpactStats = ({
  stats,
  variant = 'default',
  animated = true,
  className = ''
}: ImpactStatsProps) => {
  const [hasAnimated, setHasAnimated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for scroll-triggered animation
  useEffect(() => {
    if (!animated || hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [animated, hasAnimated]);

  // Animated counter hook
  const useCountUp = (end: number, duration: number = 2000) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (!hasAnimated && animated) return;

      let startTime: number | null = null;
      const startValue = 0;

      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);

        // Easing function (easeOutExpo)
        const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        setCount(Math.floor(startValue + (end - startValue) * easeOut));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, [end, duration, hasAnimated]);

    return count;
  };

  // Build stat items
  const statItems: Array<{ label: string; value: string; icon?: string }> = [];

  if (stats.peopleServed) {
    statItems.push({
      label: 'People Served',
      value: formatNumber(useCountUp(stats.peopleServed)),
      icon: '👥'
    });
  }

  if (stats.locationsReached) {
    statItems.push({
      label: 'Locations',
      value: formatNumber(useCountUp(stats.locationsReached)),
      icon: '📍'
    });
  }

  if (stats.partnersInvolved) {
    statItems.push({
      label: 'Partners',
      value: formatNumber(useCountUp(stats.partnersInvolved)),
      icon: '🤝'
    });
  }

  if (stats.successRate) {
    statItems.push({
      label: 'Success Rate',
      value: formatPercentage(useCountUp(stats.successRate) / 100),
      icon: '✨'
    });
  }

  if (stats.fundingRaised) {
    statItems.push({
      label: 'Funding Raised',
      value: formatCurrency(useCountUp(stats.fundingRaised)),
      icon: '💰'
    });
  }

  if (stats.hoursDelivered) {
    statItems.push({
      label: 'Hours Delivered',
      value: formatNumber(useCountUp(stats.hoursDelivered)),
      icon: '⏱️'
    });
  }

  // Add custom metrics
  if (stats.customMetrics) {
    stats.customMetrics.forEach((metric) => {
      const value = typeof metric.value === 'number'
        ? formatNumber(useCountUp(metric.value))
        : metric.value;

      statItems.push({
        label: metric.label,
        value: metric.unit ? `${value} ${metric.unit}` : value
      });
    });
  }

  if (statItems.length === 0) {
    return null;
  }

  // Hero variant - Large, centered
  if (variant === 'hero') {
    return (
      <div ref={containerRef} className={`text-center ${className}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {statItems.map((stat, index) => (
            <div key={index} className="p-6">
              {stat.icon && (
                <div className="text-4xl mb-3">{stat.icon}</div>
              )}
              <div className="text-5xl md:text-6xl font-bold text-primary-600 mb-2">
                {stat.value}
              </div>
              <div className="text-lg text-gray-600 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Compact variant - Horizontal
  if (variant === 'compact') {
    return (
      <div ref={containerRef} className={`flex flex-wrap gap-6 ${className}`}>
        {statItems.map((stat, index) => (
          <div key={index} className="flex items-center gap-3">
            {stat.icon && <span className="text-2xl">{stat.icon}</span>}
            <div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default variant - Grid cards
  return (
    <div ref={containerRef} className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-${Math.min(statItems.length, 4)} gap-6 ${className}`}>
      {statItems.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          {stat.icon && (
            <div className="text-3xl mb-3">{stat.icon}</div>
          )}
          <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">
            {stat.value}
          </div>
          <div className="text-sm text-gray-600 font-medium">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ImpactStats;
