// Component prop types for the ACT Placemat application

import { ReactNode } from 'react';
import { Project, Opportunity, Organization, Person, Artifact } from './models';
import {
  ProjectFilters,
  OpportunityFilters,
  SortOption,
  ChartDataPoint,
  TimeSeriesDataPoint,
  RevenueChartData,
  PipelineChartData
} from './api';

// Layout component props
export interface AppLayoutProps {
  children: ReactNode;
}

export interface NavigationProps {
  currentPath: string;
  userRole?: string;
}

export interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

// Card component props
export interface ProjectCardProps {
  project: Project;
  onClick?: (project: Project) => void;
  showDetails?: boolean;
  className?: string;
}

export interface OpportunityCardProps {
  opportunity: Opportunity;
  onStageChange?: (id: string, stage: string) => void;
  showActions?: boolean;
  className?: string;
}

export interface OrganizationCardProps {
  organization: Organization;
  showContacts?: boolean;
  showOpportunities?: boolean;
  className?: string;
}

export interface PersonCardProps {
  person: Person;
  showOrganization?: boolean;
  showContactInfo?: boolean;
  className?: string;
}

export interface ArtifactCardProps {
  artifact: Artifact;
  showMetadata?: boolean;
  onDownload?: (artifact: Artifact) => void;
  className?: string;
}

// Filter and search component props
export interface FilterPanelProps<T> {
  filters: T;
  onFiltersChange: (filters: T) => void;
  onReset: () => void;
  isLoading?: boolean;
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export interface SortSelectorProps {
  options: SortOption[];
  value: SortOption;
  onChange: (option: SortOption) => void;
  className?: string;
}

// Table component props
export interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, item: T) => ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

// Chart component props
export interface RevenueChartProps {
  data: RevenueChartData;
  timeRange: 'month' | 'quarter' | 'year';
  showProjections?: boolean;
  height?: number;
  className?: string;
}

export interface PipelineChartProps {
  data: PipelineChartData;
  groupBy: 'stage' | 'organization' | 'amount';
  interactive?: boolean;
  height?: number;
  className?: string;
}

export interface DonutChartProps {
  data: ChartDataPoint[];
  title?: string;
  showLegend?: boolean;
  height?: number;
  className?: string;
}

export interface BarChartProps {
  data: ChartDataPoint[];
  title?: string;
  horizontal?: boolean;
  showValues?: boolean;
  height?: number;
  className?: string;
}

export interface LineChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  showDots?: boolean;
  smooth?: boolean;
  height?: number;
  className?: string;
}

// Form component props
export interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'password' | 'number' | 'date' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { value: string; label: string }[];
  className?: string;
}

export interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
}

// Page component props
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DashboardPageProps {
  // Dashboard-specific props if needed
}

export interface ProjectsPageProps {
  initialFilters?: ProjectFilters;
}

export interface OpportunitiesPageProps {
  initialFilters?: OpportunityFilters;
}

export interface NetworkPageProps {
  initialTab?: 'organizations' | 'people';
}

export interface AnalyticsPageProps {
  initialTimeRange?: 'month' | 'quarter' | 'year';
}

// Loading and error states
export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

// Utility types for component configuration
export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'range' | 'date' | 'search';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface ViewConfig {
  key: string;
  label: string;
  icon?: ReactNode;
  component: ReactNode;
}

export interface ActionConfig {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}