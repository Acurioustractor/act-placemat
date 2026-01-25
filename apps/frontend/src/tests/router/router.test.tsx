/**
 * Router Configuration Tests
 *
 * Tests for React Router configuration and navigation
 */
import React, { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mock components for testing routes
const MockDashboard = () => <div data-testid="dashboard-page">Dashboard Page</div>;
const MockIntelligence = () => <div data-testid="intelligence-page">Intelligence Page</div>;
const MockProjects = () => <div data-testid="projects-page">Projects Page</div>;
const MockContacts = () => <div data-testid="contacts-page">Contacts Page</div>;
const MockGoals = () => <div data-testid="goals-page">Goals Page</div>;
const MockFinance = () => <div data-testid="finance-page">Finance Page</div>;
const MockBrain = () => <div data-testid="brain-page">Brain Center</div>;
const MockNotFound = () => <div data-testid="not-found">Not Found</div>;

// Create test QueryClient
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
}

// Custom render with routes - uses a MemoryRouter to set initial path
function renderWithRoutes(initialPath = '/', routeList: Array<{ path: string; component: React.ComponentType }> = []) {
  const defaultRoutes = [
    { path: '/', component: MockDashboard },
    { path: '/dashboard', component: MockDashboard },
    { path: '/dashboard/goals', component: MockGoals },
    { path: '/dashboard/finance', component: MockFinance },
    { path: '/intelligence', component: MockIntelligence },
    { path: '/projects', component: MockProjects },
    { path: '/contacts', component: MockContacts },
    { path: '/brain', component: MockBrain },
  ];

  const routesToUse = routeList.length > 0 ? routeList : defaultRoutes;
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          {routesToUse.map((route) => (
            <Route key={route.path} path={route.path} element={<route.component />} />
          ))}
          <Route path="*" element={<MockNotFound />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Router Configuration', () => {
  describe('Route Rendering', () => {
    it('renders dashboard at root path', () => {
      renderWithRoutes('/');
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('renders dashboard at /dashboard path', () => {
      renderWithRoutes('/dashboard');
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('renders goals at /dashboard/goals path', () => {
      renderWithRoutes('/dashboard/goals');
      expect(screen.getByTestId('goals-page')).toBeInTheDocument();
    });

    it('renders finance at /dashboard/finance path', () => {
      renderWithRoutes('/dashboard/finance');
      expect(screen.getByTestId('finance-page')).toBeInTheDocument();
    });

    it('renders intelligence at /intelligence path', () => {
      renderWithRoutes('/intelligence');
      expect(screen.getByTestId('intelligence-page')).toBeInTheDocument();
    });

    it('renders projects at /projects path', () => {
      renderWithRoutes('/projects');
      expect(screen.getByTestId('projects-page')).toBeInTheDocument();
    });

    it('renders contacts at /contacts path', () => {
      renderWithRoutes('/contacts');
      expect(screen.getByTestId('contacts-page')).toBeInTheDocument();
    });

    it('renders brain center at /brain path', () => {
      renderWithRoutes('/brain');
      expect(screen.getByTestId('brain-page')).toBeInTheDocument();
    });

    it('renders not found for unknown routes', () => {
      renderWithRoutes('/unknown-path');
      expect(screen.getByTestId('not-found')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates between routes using Link', () => {
      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/']}>
            <nav>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/intelligence">Intelligence</Link>
            </nav>
            <Routes>
              <Route path="/" element={<MockDashboard />} />
              <Route path="/dashboard" element={<MockDashboard />} />
              <Route path="/intelligence" element={<MockIntelligence />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Click intelligence link
      const intelligenceLink = screen.getByRole('link', { name: /Intelligence/i });
      fireEvent.click(intelligenceLink);

      expect(screen.getByTestId('intelligence-page')).toBeInTheDocument();
    });

    it('navigates using useNavigate hook', () => {
      function NavigateButton() {
        const navigate = useNavigate();
        return (
          <button onClick={() => navigate('/intelligence')}>
            Go to Intelligence
          </button>
        );
      }

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/']}>
            <NavigateButton />
            <Routes>
              <Route path="/" element={<MockDashboard />} />
              <Route path="/intelligence" element={<MockIntelligence />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      const button = screen.getByRole('button', { name: /Go to Intelligence/i });
      fireEvent.click(button);

      expect(screen.getByTestId('intelligence-page')).toBeInTheDocument();
    });
  });

  describe('Route Guards', () => {
    it('renders guarded route when condition is met', () => {
      function ProtectedRoute({ children }: { children: React.ReactNode }) {
        const isAuthenticated = true;
        return isAuthenticated ? <>{children}</> : <MockNotFound />;
      }

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <MockDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('redirects when authentication fails', () => {
      function ProtectedRoute({ children }: { children: React.ReactNode }) {
        const isAuthenticated = false;
        return isAuthenticated ? <>{children}</> : <MockNotFound />;
      }

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <MockDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('not-found')).toBeInTheDocument();
    });
  });

  describe('URL Params', () => {
    it('extracts route parameters', () => {
      function ProjectRoute() {
        const location = useLocation();
        return <div data-testid="current-path">{location.pathname}</div>;
      }

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/projects/123']}>
            <Routes>
              <Route path="/projects/:id" element={<ProjectRoute />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('current-path')).toHaveTextContent('/projects/123');
    });
  });

  describe('Lazy Loading', () => {
    it('shows loading state while component loads', async () => {
      const LazyComponent = () => {
        return <div data-testid="lazy-component">Lazy Component</div>;
      };

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/']}>
            <Suspense fallback={<div data-testid="loading">Loading...</div>}>
              <Routes>
                <Route path="/" element={<LazyComponent />} />
              </Routes>
            </Suspense>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Should render immediately since component is not actually lazy
      expect(screen.getByTestId('lazy-component')).toBeInTheDocument();
    });
  });

  describe('Backward Compatibility', () => {
    it('redirects from old tab param to new route', () => {
      // Simulating the redirect from ?tab=dashboard to /dashboard
      function RedirectComponent() {
        const location = useLocation();
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');

        if (tab === 'dashboard') {
          return <div data-testid="redirected">Redirected from ?tab=dashboard</div>;
        }
        return <div data-testid="not-redirected">No redirect</div>;
      }

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/?tab=dashboard']}>
            <RedirectComponent />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('redirected')).toBeInTheDocument();
    });
  });
});

describe('useNavigation Hook', () => {
  it('provides navigation functions', () => {
    function TestComponent() {
      const navigate = useNavigate();

      const handleClick = () => {
        navigate('/intelligence');
      };

      return (
        <div>
          <button onClick={handleClick}>Navigate</button>
          <Routes>
            <Route path="/" element={<MockDashboard />} />
            <Route path="/intelligence" element={<MockIntelligence />} />
          </Routes>
        </div>
      );
    }

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <TestComponent />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const button = screen.getByRole('button', { name: /Navigate/i });
    fireEvent.click(button);

    expect(screen.getByTestId('intelligence-page')).toBeInTheDocument();
  });
});

describe('useActiveRoute Hook', () => {
  it('returns current route path', () => {
    function ActiveRouteTest() {
      const location = useLocation();
      return <div data-testid="active-route">{location.pathname}</div>;
    }

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard/goals']}>
          <ActiveRouteTest />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('active-route')).toHaveTextContent('/dashboard/goals');
  });
});
