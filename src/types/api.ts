// API-related types for the ACT Placemat application

// API Response types
export interface APIResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// API Error types
export class APIError extends Error {
  status: number;
  details?: Record<string, unknown>;
  timestamp: Date;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
    this.timestamp = new Date();
  }
}

// Notion API specific types
export interface NotionQueryRequest {
  databaseId: string;
  filters?: NotionFilter;
  sorts?: NotionSort[];
  pageSize?: number;
  startCursor?: string;
}

export interface NotionFilter {
  and?: NotionPropertyFilter[];
  or?: NotionPropertyFilter[];
  property?: string;
  [key: string]: unknown;
}

export interface NotionPropertyFilter {
  property: string;
  select?: {
    equals?: string;
    does_not_equal?: string;
  };
  multi_select?: {
    contains?: string;
    does_not_contain?: string;
  };
  title?: {
    contains?: string;
    starts_with?: string;
    ends_with?: string;
  };
  rich_text?: {
    contains?: string;
    starts_with?: string;
    ends_with?: string;
  };
  number?: {
    equals?: number;
    does_not_equal?: number;
    greater_than?: number;
    less_than?: number;
    greater_than_or_equal_to?: number;
    less_than_or_equal_to?: number;
  };
  date?: {
    equals?: string;
    before?: string;
    after?: string;
    on_or_before?: string;
    on_or_after?: string;
  };
  checkbox?: {
    equals?: boolean;
  };
}

export interface NotionSort {
  property: string;
  direction: 'ascending' | 'descending';
}

export interface NotionResponse<T> {
  object: 'list';
  results: T[];
  next_cursor: string | null;
  has_more: boolean;
  type: 'page_or_database';
  page_or_database: Record<string, never>;
}

// Filter and search types
export interface ProjectFilters {
  area?: string[];
  status?: string[];
  location?: string[];
  tags?: string[];
  revenueRange?: {
    min?: number;
    max?: number;
  };
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  search?: string;
  [key: string]: unknown;
}

export interface OpportunityFilters {
  stage?: string[];
  type?: string[];
  organization?: string[];
  probability?: string[];
  amountRange?: {
    min?: number;
    max?: number;
  };
  probabilityRange?: {
    min?: number;
    max?: number;
  };
  deadlineRange?: {
    start?: Date;
    end?: Date;
  };
  search?: string;
}

export interface OrganizationFilters {
  type?: string[];
  sector?: string[];
  size?: string[];
  status?: string[];
  relationshipStatus?: string[];
  location?: string[];
  fundingCapacity?: string[];
  email?: string;
  mobile?: string;
  source?: string;
  search?: string;
}

export interface PersonFilters {
  organization?: string[];
  relationshipType?: string[];
  influenceLevel?: string[];
  location?: string[];
  expertise?: string[];
  email?: string;
  mobile?: string;
  source?: string;
  search?: string;
}

export interface ArtifactFilters {
  type?: string[];
  format?: string[];
  status?: string[];
  purpose?: string[];
  accessLevel?: string[];
  tags?: string[];
  search?: string;
}

// Sort options
export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
  label: string;
}

// Dashboard analytics types
export interface DashboardMetrics {
  projects: {
    total: number;
    active: number;
    completed: number;
    totalRevenue: number;
    potentialRevenue: number;
  };
  opportunities: {
    total: number;
    totalValue: number;
    weightedValue: number;
    averageProbability: number;
    byStage: Record<string, number>;
  };
  organizations: {
    total: number;
    partners: number;
    prospects: number;
    byType: Record<string, number>;
  };
  people: {
    total: number;
    byRelationshipType: Record<string, number>;
    byInfluenceLevel: Record<string, number>;
  };
  artifacts: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
}

// Chart data types
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface TimeSeriesDataPoint {
  date: Date;
  value: number;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface RevenueChartData {
  actual: TimeSeriesDataPoint[];
  projected: TimeSeriesDataPoint[];
  byProject: ChartDataPoint[];
  byArea: ChartDataPoint[];
}

export interface PipelineChartData {
  stages: ChartDataPoint[];
  conversion: {
    stage: string;
    rate: number;
    count: number;
  }[];
  timeline: TimeSeriesDataPoint[];
}