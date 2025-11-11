import { ReactNode } from 'react';
import {
  HeartIcon,
  UserGroupIcon,
  SparklesIcon,
  EnvelopeIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

interface CTAButtonProps {
  type?: 'donate' | 'partner' | 'volunteer' | 'learn' | 'contact';
  text?: string;
  href?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  icon?: ReactNode;
}

/**
 * CTAButton - Call-to-Action button component
 * Pre-styled buttons for common actions with appropriate icons and colors
 *
 * Types:
 * - donate: Donation/funding support (red, heart icon)
 * - partner: Partnership opportunities (blue, users icon)
 * - volunteer: Volunteer sign-up (green, sparkles icon)
 * - learn: Learn more (purple, academic icon)
 * - contact: Contact us (gray, envelope icon)
 */
const CTAButton = ({
  type = 'donate',
  text,
  href,
  onClick,
  size = 'md',
  variant = 'primary',
  className = '',
  icon
}: CTAButtonProps) => {
  // Get configuration based on type
  const getConfig = () => {
    switch (type) {
      case 'donate':
        return {
          defaultText: 'Support This Project',
          icon: icon || <HeartIcon className="w-5 h-5" />,
          colors: {
            primary: 'bg-red-600 hover:bg-red-700 text-white',
            secondary: 'bg-red-100 hover:bg-red-200 text-red-700',
            outline: 'border-2 border-red-600 text-red-600 hover:bg-red-50'
          }
        };
      case 'partner':
        return {
          defaultText: 'Partner With Us',
          icon: icon || <UserGroupIcon className="w-5 h-5" />,
          colors: {
            primary: 'bg-blue-600 hover:bg-blue-700 text-white',
            secondary: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
            outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
          }
        };
      case 'volunteer':
        return {
          defaultText: 'Get Involved',
          icon: icon || <SparklesIcon className="w-5 h-5" />,
          colors: {
            primary: 'bg-green-600 hover:bg-green-700 text-white',
            secondary: 'bg-green-100 hover:bg-green-200 text-green-700',
            outline: 'border-2 border-green-600 text-green-600 hover:bg-green-50'
          }
        };
      case 'learn':
        return {
          defaultText: 'Learn More',
          icon: icon || <AcademicCapIcon className="w-5 h-5" />,
          colors: {
            primary: 'bg-purple-600 hover:bg-purple-700 text-white',
            secondary: 'bg-purple-100 hover:bg-purple-200 text-purple-700',
            outline: 'border-2 border-purple-600 text-purple-600 hover:bg-purple-50'
          }
        };
      case 'contact':
        return {
          defaultText: 'Contact Us',
          icon: icon || <EnvelopeIcon className="w-5 h-5" />,
          colors: {
            primary: 'bg-gray-700 hover:bg-gray-800 text-white',
            secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
            outline: 'border-2 border-gray-700 text-gray-700 hover:bg-gray-50'
          }
        };
      default:
        return {
          defaultText: 'Click Here',
          icon: icon || null,
          colors: {
            primary: 'bg-primary-600 hover:bg-primary-700 text-white',
            secondary: 'bg-primary-100 hover:bg-primary-200 text-primary-700',
            outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50'
          }
        };
    }
  };

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-4 py-2 text-sm';
      case 'lg':
        return 'px-8 py-4 text-lg';
      case 'md':
      default:
        return 'px-6 py-3 text-base';
    }
  };

  const config = getConfig();
  const buttonText = text || config.defaultText;
  const colorClasses = config.colors[variant];
  const sizeClasses = getSizeClasses();

  const baseClasses = `
    inline-flex items-center justify-center gap-2
    font-semibold rounded-lg
    transition-all duration-200
    hover:scale-105 hover:shadow-lg
    focus:outline-none focus:ring-4 focus:ring-offset-2
    ${colorClasses}
    ${sizeClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Render as link if href provided
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClasses}
      >
        {config.icon}
        {buttonText}
      </a>
    );
  }

  // Render as button
  return (
    <button
      onClick={onClick}
      className={baseClasses}
    >
      {config.icon}
      {buttonText}
    </button>
  );
};

export default CTAButton;
