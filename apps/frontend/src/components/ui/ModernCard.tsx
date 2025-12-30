/**
 * Modern Card Component - World-Class UI
 * 
 * Enhanced card component with modern design patterns
 * Inspired by best-in-class BI and CRM platforms
 */

import React, { type PropsWithChildren } from 'react';

interface ModernCardProps {
  className?: string;
  variant?: 'default' | 'elevated' | 'glass' | 'gradient' | 'interactive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  header?: React.ReactNode;
  footer?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function ModernCard({
  children,
  className = '',
  variant = 'default',
  size = 'md',
  header,
  footer,
  icon,
  badge,
  onClick,
  loading = false,
  disabled = false,
}: PropsWithChildren<ModernCardProps>) {
  const baseClasses = 'relative overflow-hidden transition-all duration-300 ease-out';
  
  const variantClasses = {
    default: 'bg-white border border-clay-200 shadow-subtle hover:shadow-soft',
    elevated: 'bg-white border border-clay-200 shadow-medium hover:shadow-hover hover:-translate-y-1',
    glass: 'bg-white/80 backdrop-blur-sm border border-white/20 shadow-soft hover:bg-white/90',
    gradient: 'bg-gradient-to-br from-white to-clay-50 border border-clay-200 shadow-soft hover:shadow-medium',
    interactive: 'bg-white border border-clay-200 shadow-subtle hover:shadow-medium hover:-translate-y-0.5 hover:border-brand-300 cursor-pointer'
  };

  const sizeClasses = {
    sm: 'p-4 rounded-xl',
    md: 'p-6 rounded-2xl',
    lg: 'p-8 rounded-2xl',
    xl: 'p-10 rounded-3xl'
  };

  const cardClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    onClick && !disabled ? 'cursor-pointer' : '',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
    className
  ].filter(Boolean).join(' ');

  const CardContent = () => (
    <>
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-clay-600">Loading...</span>
          </div>
        </div>
      )}

      {/* Badge */}
      {badge && (
        <div className="absolute top-4 right-4 z-5">
          {badge}
        </div>
      )}

      {/* Header */}
      {(header || icon) && (
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-brand-500 to-ocean-500 rounded-xl flex items-center justify-center text-white text-lg">
                {icon}
              </div>
            )}
            {header && (
              <div className="flex-1">
                {typeof header === 'string' ? (
                  <h3 className="text-lg font-semibold text-clay-900">{header}</h3>
                ) : header}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative">
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="mt-6 pt-4 border-t border-clay-100">
          {footer}
        </div>
      )}
    </>
  );

  if (onClick && !disabled) {
    return (
      <button
        className={cardClasses}
        onClick={onClick}
        disabled={disabled || loading}
      >
        <CardContent />
      </button>
    );
  }

  return (
    <div className={cardClasses}>
      <CardContent />
    </div>
  );
}
