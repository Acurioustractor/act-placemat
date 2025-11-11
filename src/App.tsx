import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AppLayout } from './components';
import { QuickCaptureButton } from './components/quickCapture';
import { LoadingSpinner } from './components/ui';
import { prefetchService } from './services/prefetchService';
import { projectService } from './services';
import {
  DashboardPage,
  ProjectsPage,
  OpportunitiesPage,
  ArtifactsPage,
  NetworkPage,
  AnalyticsPage
} from './pages';
import ProjectDetailPage from './pages/Projects/ProjectDetailPage';
import ProjectAnalysisPage from './pages/Admin/ProjectAnalysisPage';
import { ROUTES } from './constants';

// Lazy load showcase pages for better initial load performance
const ProjectShowcasePage = lazy(() => import('./pages/Showcase/ProjectShowcasePage'));
const PublicProjectShowcase = lazy(() => import('./components/public/PublicProjectShowcase'));

function App() {
  const queryClient = useQueryClient();

  // Initialize prefetch service but DON'T prefetch everything at once
  useEffect(() => {
    prefetchService.init(queryClient);
    
    // Only prefetch projects for now - the most common page
    setTimeout(() => {
      console.log('🚀 Prefetching only projects for faster initial load');
      queryClient.prefetchQuery({
        queryKey: ['projects'],
        queryFn: () => projectService.getProjects()
      });
    }, 2000); // Wait 2 seconds after app loads
  }, [queryClient]);

  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.PROJECTS} element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path={ROUTES.OPPORTUNITIES} element={<OpportunitiesPage />} />
          <Route path={ROUTES.ARTIFACTS} element={<ArtifactsPage />} />
          <Route path={ROUTES.NETWORK} element={<NetworkPage />} />
          <Route path={ROUTES.ANALYTICS} element={<AnalyticsPage />} />

          {/* Admin/Analysis Routes */}
          <Route path="/admin/project-analysis" element={<ProjectAnalysisPage />} />

          {/* Public Showcase Routes - Lazy loaded for performance */}
          <Route
            path="/showcase"
            element={
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen">
                  <LoadingSpinner size="lg" />
                </div>
              }>
                <PublicProjectShowcase />
              </Suspense>
            }
          />
          <Route
            path="/showcase/:slug"
            element={
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen">
                  <LoadingSpinner size="lg" />
                </div>
              }>
                <ProjectShowcasePage />
              </Suspense>
            }
          />

          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        </Routes>
      </AppLayout>
      <QuickCaptureButton />
    </Router>
  );
}

export default App;
