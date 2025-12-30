/**
 * Metric Card Component - World-Class Business Intelligence UI
 * 
 * Beautiful metric display inspired by modern BI platforms
 */

import React from 'react';
import { ModernCard } from './ModernCard';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: string;
    type: 'positive' | 'negative' | 'neutral';
    period?: string;
  };
  icon?: React.ReactNode;
  trend?: number[]; // Array of values for sparkline
  status?: 'healthy' | 'warning' | 'critical' | 'unknown';
  onClick?: () => void;
  loading?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  icon,
  trend,
  status = 'unknown',
  onClick,
  loading = false,
  className = ''
}: MetricCardProps) {
  const statusColors = {
    healthy: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    critical: 'text-red-600 bg-red-50 border-red-200',
    unknown: 'text-clay-600 bg-clay-50 border-clay-200'
  };

  const changeColors = {
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-clay-600 bg-clay-50'
  };

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <ModernCard
      variant={onClick ? 'interactive' : 'elevated'}
      size="md"
      onClick={onClick}
      loading={loading}
      className={className}
    >
      <div className="space-y-4">
        {/* Header with icon and status */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="flex-shrink-0">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-clay-600 uppercase tracking-wide">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-clay-500 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          
          {/* Status Indicator */}
          <div className={`w-3 h-3 rounded-full ${statusColors[status].split(' ')[2]} ${statusColors[status].split(' ')[1]}`}></div>
        </div>

        {/* Main Value */}
        <div className="space-y-2">
          <div className="text-3xl font-bold text-clay-900">
            {formatValue(value)}
          </div>
          
          {/* Change Indicator */}
          {change && (
            <div className="flex items-center space-x-2">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${changeColors[change.type]}`}>
                <span className="mr-1">
                  {change.type === 'positive' ? '↗' : change.type === 'negative' ? '↘' : '→'}
                </span>
                {change.value}
              </div>
              {change.period && (
                <span className="text-xs text-clay-500">{change.period}</span>
              )}
            </div>
          )}
        </div>

        {/* Trend Sparkline */}
        {trend && trend.length > 0 && (
          <div className="h-8 flex items-end space-x-1">
            {trend.map((point, index) => {
              const maxValue = Math.max(...trend);
              const height = (point / maxValue) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-gradient-to-t from-brand-500 to-brand-300 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                  style={{ height: `${height}%`, minHeight: '4px' }}
                ></div>
              );
            })}
          </div>
        )}
      </div>
    </ModernCard>
  );
}
