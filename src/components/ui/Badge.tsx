import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  rounded?: boolean;
  className?: string;
}

/**
 * Badge component for displaying status or category labels
 */
const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  rounded = false,
  className = '',
}: BadgeProps) => {
  // Base classes
  const baseClasses = 'inline-flex items-center font-medium';

  // Size classes
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };

  // Variant classes
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-primary-100 text-primary-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    outline: 'bg-white border border-gray-300 text-gray-700',
  };

  // Rounded classes
  const roundedClasses = rounded ? 'rounded-full' : 'rounded';

  // Combine classes
  const badgeClasses = [
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    roundedClasses,
    className,
  ].join(' ');

  return <span className={badgeClasses}>{children}</span>;
};

export default Badge;