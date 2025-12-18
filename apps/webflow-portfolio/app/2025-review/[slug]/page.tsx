import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getReviewProject } from '../../../lib/reviewProjectsApi';
import { ProjectStoryPage } from '../../../components/ProjectStoryPage';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getReviewProject(2025, slug, true);

  if (!project) {
    return {
      title: 'Project Not Found | 2025 Year in Review',
    };
  }

  return {
    title: project.metaTitle || `${project.title} | 2025 Year in Review`,
    description: project.metaDescription || project.subtitle || `Explore ${project.title} from our 2025 journey.`,
    openGraph: {
      title: project.metaTitle || project.title,
      description: project.metaDescription || project.subtitle,
      images: project.heroImageUrl ? [project.heroImageUrl] : [],
    },
  };
}

export default async function ReviewProjectPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === 'true';

  const project = await getReviewProject(2025, slug, isPreview);

  if (!project) {
    notFound();
  }

  // If not published and not in preview mode, show 404
  if (!project.isPublished && !isPreview) {
    notFound();
  }

  return <ProjectStoryPage project={project} isPreview={isPreview} />;
}
