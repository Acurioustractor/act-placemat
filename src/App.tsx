import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AppLayout } from './components';
import { QuickCaptureButton } from './components/quickCapture';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { prefetchService } from './services/prefetchService';
import { projectService } from './services';
import { ROUTES } from './constants';

// Route-based code splitting using React.lazy()
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const ProjectsPage = lazy(() => import('./pages/Projects/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/Projects/ProjectDetailPage'));
const OpportunitiesPage = lazy(() => import('./pages/Opportunities/OpportunitiesPage'));
const ArtifactsPage = lazy(() => import('./pages/Artifacts/ArtifactsPage'));
const NetworkPage = lazy(() => import('./pages/Network/NetworkPage'));
const AnalyticsPage = lazy(() => import('./pages/Analytics/AnalyticsPage'));

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

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
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.PROJECTS} element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path={ROUTES.OPPORTUNITIES} element={<OpportunitiesPage />} />
            <Route path={ROUTES.ARTIFACTS} element={<ArtifactsPage />} />
            <Route path={ROUTES.NETWORK} element={<NetworkPage />} />
            <Route path={ROUTES.ANALYTICS} element={<AnalyticsPage />} />
            <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          </Routes>
        </Suspense>
      </AppLayout>
      <QuickCaptureButton />
    </Router>
  );
}

export default App;
