import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

/**
 * Card component for displaying content in a contained box
 */
const Card = ({
  children,
  title,
  subtitle,
  className = '',
  onClick,
  onMouseEnter,
  onMouseLeave,
  hoverable = false,
  padding = 'md',
  style,
}: CardProps) => {
  // Base classes
  const baseClasses = 'bg-white border border-gray-200 rounded-lg shadow-sm';

  // Padding classes
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  };

  // Hover classes
  const hoverClasses = hoverable
    ? 'transition-shadow hover:shadow-md cursor-pointer'
    : '';

  // Combine classes
  const cardClasses = [
    baseClasses,
    paddingClasses[padding],
    hoverClasses,
    className,
  ].join(' ');

  return (
    <div 
      className={cardClasses} 
      onClick={onClick} 
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={style}
    >
      {(title || subtitle) && (
        <div className={padding === 'none' ? 'p-4 pb-0' : 'mb-4'}>
          {title && <h3 className="text-lg font-medium text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;