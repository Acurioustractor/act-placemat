import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  // Basic SEO
  title: string;
  description: string;
  url?: string;

  // Images
  image?: string;
  imageAlt?: string;

  // Social
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  tags?: string[];

  // Schema.org structured data
  schema?: any;

  // Twitter
  twitterCard?: 'summary' | 'summary_large_image';
  twitterSite?: string;
  twitterCreator?: string;
}

/**
 * SEOHead - Comprehensive SEO meta tags component
 *
 * Features:
 * - Basic meta tags (title, description)
 * - Open Graph for Facebook/LinkedIn
 * - Twitter Cards for Twitter
 * - Schema.org structured data
 * - Canonical URLs
 * - Robots directives
 *
 * Usage:
 * ```tsx
 * <SEOHead
 *   title="Youth Justice Program - ACT Placemat"
 *   description="Empowering young people in Canberra..."
 *   image="https://example.com/hero.jpg"
 *   type="article"
 *   tags={["Youth Justice", "Canberra"]}
 * />
 * ```
 */
const SEOHead = ({
  title,
  description,
  url,
  image,
  imageAlt,
  type = 'article',
  publishedTime,
  modifiedTime,
  author,
  tags = [],
  schema,
  twitterCard = 'summary_large_image',
  twitterSite,
  twitterCreator
}: SEOHeadProps) => {
  // Construct full URL
  const fullUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  // Site name
  const siteName = 'ACT Placemat';

  // Full title with branding
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;

  // Clean description (max 155 characters for Google)
  const cleanDescription = description.length > 155
    ? description.substring(0, 152) + '...'
    : description;

  // Default image if none provided
  const defaultImage = 'https://act-revised-site.webflow.io/images/og-default.jpg';
  const ogImage = image || defaultImage;
  const ogImageAlt = imageAlt || title;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={cleanDescription} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

      {/* Canonical URL */}
      {fullUrl && <link rel="canonical" href={fullUrl} />}

      {/* Open Graph / Facebook / LinkedIn */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={cleanDescription} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={ogImageAlt} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Article-specific Open Graph tags */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}
      {type === 'article' && tags.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={cleanDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={ogImageAlt} />
      {twitterSite && <meta name="twitter:site" content={twitterSite} />}
      {twitterCreator && <meta name="twitter:creator" content={twitterCreator} />}

      {/* Additional Meta Tags */}
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="author" content={author || siteName} />

      {/* Schema.org Structured Data */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
};

/**
 * Generate Schema.org structured data for a project
 */
export const generateProjectSchema = (project: {
  name: string;
  description: string;
  url: string;
  image?: string;
  location?: string;
  startDate?: Date;
  fundingAmount?: number;
  organizationName?: string;
}) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Project',
    name: project.name,
    description: project.description,
    url: project.url,
    ...(project.image && { image: project.image }),
    ...(project.location && {
      location: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: project.location
        }
      }
    }),
    ...(project.startDate && {
      startDate: project.startDate.toISOString()
    }),
    ...(project.fundingAmount && {
      funding: {
        '@type': 'MonetaryGrant',
        funder: {
          '@type': 'Organization',
          name: project.organizationName || 'ACT'
        },
        ...(project.fundingAmount && {
          amount: {
            '@type': 'MonetaryAmount',
            currency: 'AUD',
            value: project.fundingAmount
          }
        })
      }
    })
  };
};

export default SEOHead;
