import { ProjectTestimonial } from '../../types';

interface TestimonialCardProps {
  testimonial: ProjectTestimonial;
  variant?: 'default' | 'featured' | 'compact';
  className?: string;
}

/**
 * TestimonialCard - Beautiful testimonial display
 * Variants:
 * - default: Standard card with photo, quote, and attribution
 * - featured: Large, prominent display for hero testimonials
 * - compact: Condensed version for sidebars
 */
const TestimonialCard = ({
  testimonial,
  variant = 'default',
  className = ''
}: TestimonialCardProps) => {
  const { quote, authorName, authorRole, authorPhotoUrl, authorOrganization } = testimonial;

  // Featured variant - Large, centered, with background
  if (variant === 'featured') {
    return (
      <div className={`relative bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-8 md:p-12 ${className}`}>
        {/* Quotation mark decoration */}
        <div className="absolute top-8 left-8 text-6xl text-primary-200 font-serif">"</div>

        <div className="relative z-10">
          {/* Quote */}
          <blockquote className="text-xl md:text-2xl font-medium text-gray-900 mb-8 italic leading-relaxed">
            {quote}
          </blockquote>

          {/* Author */}
          <div className="flex items-center gap-4">
            {authorPhotoUrl && (
              <img
                src={authorPhotoUrl}
                alt={authorName}
                className="w-16 h-16 rounded-full object-cover ring-4 ring-white shadow-lg"
                loading="lazy"
              />
            )}
            <div>
              <div className="font-semibold text-lg text-gray-900">{authorName}</div>
              {authorRole && (
                <div className="text-gray-600">{authorRole}</div>
              )}
              {authorOrganization && (
                <div className="text-sm text-gray-500">{authorOrganization}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compact variant - Minimal, inline
  if (variant === 'compact') {
    return (
      <div className={`bg-white rounded-lg p-4 border border-gray-200 ${className}`}>
        <p className="text-sm text-gray-700 italic mb-3">"{quote}"</p>
        <div className="flex items-center gap-2">
          {authorPhotoUrl && (
            <img
              src={authorPhotoUrl}
              alt={authorName}
              loading="lazy"
              className="w-8 h-8 rounded-full object-cover"
            />
          )}
          <div className="text-xs">
            <div className="font-medium text-gray-900">{authorName}</div>
            {authorRole && <div className="text-gray-500">{authorRole}</div>}
          </div>
        </div>
      </div>
    );
  }

  // Default variant - Standard card
  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow ${className}`}>
      {/* Quote */}
      <div className="mb-6">
        <svg
          className="w-10 h-10 text-primary-200 mb-4"
          fill="currentColor"
          viewBox="0 0 32 32"
        >
          <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
        </svg>
        <p className="text-gray-700 text-lg leading-relaxed italic">
          {quote}
        </p>
      </div>

      {/* Author info */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
        {authorPhotoUrl && (
          <img
            src={authorPhotoUrl}
            alt={authorName}
            className="w-12 h-12 rounded-full object-cover"
            loading="lazy"
          />
        )}
        <div>
          <div className="font-semibold text-gray-900">{authorName}</div>
          {authorRole && (
            <div className="text-sm text-gray-600">{authorRole}</div>
          )}
          {authorOrganization && (
            <div className="text-xs text-gray-500">{authorOrganization}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestimonialCard;
