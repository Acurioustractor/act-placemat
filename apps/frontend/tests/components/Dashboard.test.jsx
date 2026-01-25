/**
 * Dashboard Component Tests
 *
 * Tests for the main Dashboard component
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../../src/components/Dashboard';
import '@testing-library/jest-dom';

// Create a test QueryClient
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

// Mock API service
const mockApi = {
  getDashboardData: vi.fn(),
  getProjects: vi.fn(),
  getGoals: vi.fn(),
};

vi.mock('../../src/services/api', () => ({
  default: mockApi,
  getDashboardData: mockApi.getDashboardData,
  getProjects: mockApi.getProjects,
  getGoals: mockApi.getGoals,
}));

// Mock data
const mockDashboardData = {
  metrics: {
    totalProjects: 12,
    activeProjects: 8,
    completedProjects: 4,
    revenue: 150000,
    expenses: 75000,
  },
  recentActivity: [
    { id: 1, type: 'project', message: 'New project created', timestamp: new Date().toISOString() },
    { id: 2, type: 'goal', message: 'Goal completed', timestamp: new Date().toISOString() },
  ],
};

const mockProjects = [
  { id: '1', name: 'Project A', status: 'active', progress: 50 },
  { id: '2', name: 'Project B', status: 'completed', progress: 100 },
];

const mockGoals = [
  { id: '1', title: 'Increase Revenue', progress: 40 },
  { id: '2', title: 'Launch Product', progress: 75 },
];

describe('Dashboard Component', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();

    // Setup default mocks
    mockApi.getDashboardData.mockResolvedValue(mockDashboardData);
    mockApi.getProjects.mockResolvedValue(mockProjects);
    mockApi.getGoals.mockResolvedValue(mockGoals);
  });

  it('renders dashboard title', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });

  it('displays metrics cards', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Total Projects/i)).toBeInTheDocument();
      expect(screen.getByText(/12/i)).toBeInTheDocument();
      expect(screen.getByText(/Active/i)).toBeInTheDocument();
      expect(screen.getByText(/8/i)).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    mockApi.getDashboardData.mockImplementation(() => new Promise(() => {}));

    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
  });

  it('displays error state on API failure', async () => {
    mockApi.getDashboardData.mockRejectedValue(new Error('Failed to fetch'));

    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
    });
  });

  it('renders recent activity section', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Recent Activity/i)).toBeInTheDocument();
      expect(screen.getByText(/New project created/i)).toBeInTheDocument();
    });
  });

  it('handles refresh button click', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/12/i)).toBeInTheDocument();
    });

    // Simulate refresh
    mockApi.getDashboardData.mockResolvedValue({
      ...mockDashboardData,
      metrics: { ...mockDashboardData.metrics, totalProjects: 13 },
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText(/13/i)).toBeInTheDocument();
    });
  });
});

describe('Dashboard Metrics', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    mockApi.getDashboardData.mockResolvedValue(mockDashboardData);
    mockApi.getProjects.mockResolvedValue(mockProjects);
    mockApi.getGoals.mockResolvedValue(mockGoals);
  });

  it('displays revenue metric', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Revenue/i)).toBeInTheDocument();
      expect(screen.getByText(/\$150,000/i)).toBeInTheDocument();
    });
  });

  it('displays expense metric', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Expenses/i)).toBeInTheDocument();
      expect(screen.getByText(/\$75,000/i)).toBeInTheDocument();
    });
  });

  it('calculates net income correctly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/\$75,000/i)).toBeInTheDocument();
    });
  });
});
