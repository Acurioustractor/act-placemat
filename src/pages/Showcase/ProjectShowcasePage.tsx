import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ShareIcon,
  MapPinIcon,
  CalendarIcon,
  UserGroupIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useProjects } from '../../hooks';
import {
  VideoEmbed,
  PhotoGallery,
  TestimonialCard,
  ImpactStats,
  ShareButtons,
  CTAButton,
  SEOHead,
  generateProjectSchema
} from '../../components/showcase';
import { LoadingSpinner, Badge, Button } from '../../components/ui';
import { PROJECT_AREAS } from '../../constants';
import { formatCurrency } from '../../utils/formatting';

/**
 * ProjectShowcasePage - World-class individual project page
 *
 * Features:
 * - Hero video/image section
 * - Problem → Solution → Impact storytelling structure
 * - Photo gallery
 * - Animated impact statistics
 * - Testimonials from beneficiaries
 * - Clear call-to-action
 * - Social sharing
 * - SEO optimized
 */
const ProjectShowcasePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();

  // Find project by slug or ID
  const project = projects.find(p =>
    p.slug === slug ||
    p.id === slug ||
    p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <p className="text-gray-600 mb-8">The project you're looking for doesn't exist or isn't publicly visible.</p>
          <Button onClick={() => navigate('/showcase')}>
            View All Projects
          </Button>
        </div>
      </div>
    );
  }

  // Get area configuration
  const areaConfig = PROJECT_AREAS.find(a => a.value === project.area);

  // Handle share
  const handleShare = async () => {
    const shareData = {
      title: project.name,
      text: project.metaDescription || project.description,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* SEO Meta Tags */}
      <SEOHead
        title={project.name}
        description={project.metaDescription || project.aiSummary || project.description}
        url={window.location.href}
        image={project.socialImageUrl || project.heroImageUrl || project.galleryImages?.[0]}
        type="article"
        publishedTime={project.startDate?.toISOString()}
        tags={project.themes}
        schema={generateProjectSchema({
          name: project.name,
          description: project.description,
          url: window.location.href,
          image: project.heroImageUrl || project.galleryImages?.[0],
          location: project.location,
          startDate: project.startDate,
          fundingAmount: project.revenueActual,
          organizationName: 'ACT Placemat'
        })}
      />

      {/* Back Navigation */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/showcase')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to All Projects
          </button>
        </div>
      </div>

      {/* HERO SECTION */}
      <div className="relative bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Hero Media */}
          {project.heroVideoUrl ? (
            <VideoEmbed
              url={project.heroVideoUrl}
              title={project.name}
              caption={project.heroCaption}
              className="mb-12"
            />
          ) : project.heroImageUrl ? (
            <div className="mb-12">
              <img
                src={project.heroImageUrl}
                alt={project.name}
                className="w-full h-[60vh] object-cover rounded-2xl shadow-2xl"
              />
              {project.heroCaption && (
                <p className="mt-4 text-center text-gray-600 italic">{project.heroCaption}</p>
              )}
            </div>
          ) : null}

          {/* Project Header */}
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              {areaConfig && (
                <Badge
                  size="lg"
                  style={{ backgroundColor: areaConfig.color, color: 'white' }}
                >
                  {areaConfig.label}
                </Badge>
              )}
              <Badge variant="success" size="lg">
                {project.status}
              </Badge>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              {project.name}
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 leading-relaxed mb-8">
              {project.aiSummary || project.description}
            </p>

            {/* Meta info */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-gray-600">
              {project.location && (
                <div className="flex items-center gap-2">
                  <MapPinIcon className="w-5 h-5" />
                  <span>{project.location}</span>
                </div>
              )}
              {project.startDate && (
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  <span>Started {new Date(project.startDate).getFullYear()}</span>
                </div>
              )}
              {project.partnerOrganizations.length > 0 && (
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5" />
                  <span>{project.partnerOrganizations.length} Partners</span>
                </div>
              )}
            </div>

            {/* Share buttons */}
            <div className="mt-8 flex justify-center">
              <ShareButtons
                title={project.name}
                description={project.aiSummary || project.description}
                hashtags={project.themes}
              />
            </div>
          </div>
        </div>
      </div>

      {/* IMPACT STATS */}
      {project.impactStats && (
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Our Impact
              </h2>
              <p className="text-xl text-gray-600">
                Real results from real people
              </p>
            </div>
            <ImpactStats stats={project.impactStats} variant="hero" animated />
          </div>
        </div>
      )}

      {/* STORYTELLING SECTIONS */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {/* THE CHALLENGE */}
        {project.challengeDescription && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">The Challenge</h2>
            </div>
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
              <p>{project.challengeDescription}</p>
            </div>
          </section>
        )}

        {/* THE SOLUTION */}
        {project.solutionDescription && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💡</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Our Approach</h2>
            </div>
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
              <p>{project.solutionDescription}</p>
            </div>
          </section>
        )}

        {/* THE PROCESS */}
        {project.processDescription && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔄</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            </div>
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
              <p>{project.processDescription}</p>
            </div>
          </section>
        )}
      </div>

      {/* PHOTO GALLERY */}
      {project.galleryImages && project.galleryImages.length > 0 && (
        <div className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              See It In Action
            </h2>
            <PhotoGallery images={project.galleryImages} columns={3} />
            {project.photographyCredit && (
              <p className="mt-6 text-center text-sm text-gray-500">
                {project.photographyCredit}
              </p>
            )}
          </div>
        </div>
      )}

      {/* TESTIMONIALS */}
      {project.testimonials && project.testimonials.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Hear From The Community
          </h2>

          {/* Featured testimonial */}
          {project.testimonials.find(t => t.featured) && (
            <div className="mb-12">
              <TestimonialCard
                testimonial={project.testimonials.find(t => t.featured)!}
                variant="featured"
              />
            </div>
          )}

          {/* Other testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {project.testimonials
              .filter(t => !t.featured)
              .map((testimonial, index) => (
                <TestimonialCard
                  key={index}
                  testimonial={testimonial}
                  variant="default"
                />
              ))}
          </div>
        </div>
      )}

      {/* CALL TO ACTION */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-6">
            <SparklesIcon className="w-8 h-8" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {project.ctaText || 'Get Involved'}
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join us in making a difference. Your support helps us continue this important work.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            {project.ctaLink && (
              <CTAButton
                type={project.ctaType || 'donate'}
                text={project.ctaText}
                href={project.ctaLink}
                size="lg"
                variant="primary"
                className="bg-white text-primary-600 hover:bg-gray-50"
              />
            )}
            <CTAButton
              type="contact"
              size="lg"
              variant="outline"
              onClick={() => {}}
              className="border-white text-white hover:bg-white hover:bg-opacity-20"
            />
          </div>

          {/* Share buttons */}
          <div className="flex justify-center">
            <ShareButtons
              title={project.name}
              description={project.aiSummary || project.description}
              hashtags={project.themes}
              className="flex-wrap justify-center"
            />
          </div>
        </div>
      </div>

      {/* PROJECT DETAILS FOOTER */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {project.themes.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Focus Areas</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {project.themes.map((theme, idx) => (
                    <Badge key={idx} variant="default">{theme}</Badge>
                  ))}
                </div>
              </div>
            )}
            {project.partnerOrganizations.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Partners</h3>
                <p className="text-gray-600">{project.partnerOrganizations.length} organizations</p>
              </div>
            )}
            {project.revenueActual > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Community Investment</h3>
                <p className="text-2xl font-bold text-primary-600">
                  {formatCurrency(project.revenueActual)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectShowcasePage;
