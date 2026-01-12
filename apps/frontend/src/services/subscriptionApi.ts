/**
 * Subscription Tracker API Client
 * Updated to match V1 API standards (2025-12-30)
 */

import { API_BASE_URL } from '../config/env';
import type {
  Subscription,
  SubscriptionSummary,
  SavingsAnalytics,
} from '../types/subscription';

// ============================================================================
// API Response Types (V1 Standard)
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: {
    timestamp: string;
    processingTime?: number;
    [key: string]: unknown;
  };
}

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    timestamp: string;
  };
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface DiscoverParams {
  tenantId: string;
  maxResults?: number;
  timeframe?: string;
  force?: boolean;
}

export interface DiscoveryResponse {
  subscriptions: Subscription[];
  summary: {
    total: number;
    sources: Record<string, number>;
    avgConfidence: number;
  };
}

export interface ListParams {
  tenantId: string;
  limit?: number;
  offset?: number;
  minConfidence?: number;
  sortBy?: 'confidence' | 'vendor' | 'amount' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface ListResponse {
  subscriptions: Subscription[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ReconcileParams {
  tenantId: string;
  force?: boolean;
}

export interface ReconciliationResponse {
  reconciliation: {
    matched: number;
    unmatched: number;
    lowConfidence: number;
    avgConfidence: number;
  };
}

export interface AnalyticsResponse {
  analytics: {
    totalAnnualCost: number;
    subscriptionCount: number;
    avgConfidence: number;
    savingsOpportunities: SavingsAnalytics[];
  };
}

export interface OutstandingInvoice {
  id: string;
  vendor: string;
  amount: number;
  dueDate: string;
  priorityStatus: 'critical' | 'high' | 'medium' | 'low';
}

export interface OutstandingInvoicesResponse {
  invoices: OutstandingInvoice[];
  summary: {
    total: number;
    critical: number;
    high: number;
  };
}

export interface PaymentCalendarItem {
  id: string;
  tenant_id: string;
  vendor: string;
  amount: number;
  currency: string;
  account_email: string;
  next_payment_date: string;
  days_until_due: number;
  payment_pattern_confidence: number;
  subscription_frequency: string;
  urgency: 'overdue' | 'due_today' | 'due_soon' | 'upcoming';
}

export interface PaymentCalendarResponse {
  all: PaymentCalendarItem[];
  byUrgency: {
    overdue: PaymentCalendarItem[];
    due_today: PaymentCalendarItem[];
    due_soon: PaymentCalendarItem[];
    upcoming: PaymentCalendarItem[];
  };
  counts: {
    overdue: number;
    due_today: number;
    due_soon: number;
    upcoming: number;
    total: number;
  };
}

export interface CostByAccount {
  tenant_id: string;
  account_email: string;
  subscription_count: number;
  annual_cost: number;
  avg_amount: number;
  min_amount: number;
  max_amount: number;
}

export interface CostByAccountResponse {
  accounts: CostByAccount[];
  totals: {
    totalSubscriptions: number;
    totalAnnualCost: number;
  };
  avgCostPerAccount: number;
}

export interface CostByVendor {
  name: string;
  cost: number;
  subscriptionCount: number;
}

export interface CostByVendorResponse {
  vendors: CostByVendor[];
  totalCost: number;
  topVendor: CostByVendor | null;
}

export interface ConsolidationProgressItem {
  tenant_id: string;
  account_email: string;
  consolidation_status: string;
  subscription_count: number;
  annual_value: number;
}

export interface ConsolidationProgressResponse {
  progress: ConsolidationProgressItem[];
  summary: {
    totalSubscriptions: number;
    completedSubscriptions: number;
    progressPercentage: number;
    targetAccount: string;
  };
}

export interface UpdateConsolidationParams {
  id: string;
  status?: string;
  notes?: string;
  vendorContactEmail?: string;
}

// ============================================================================
// Subscription API Client
// ============================================================================

class SubscriptionAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/v1/subscriptions`;
  }

  private async fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const error = data as ApiError;
        throw new Error(error.error?.message || 'API request failed');
      }

      return (data as ApiResponse<T>).data;
    } catch (error) {
      console.error(`[Subscription API] Error fetching ${endpoint}:`, error);
      throw error;
    }
  }

  private buildQueryString(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    return searchParams.toString();
  }

  /**
   * Discover subscriptions from Gmail, Xero, and AI sources
   */
  async discover(params: DiscoverParams): Promise<DiscoveryResponse> {
    const query = this.buildQueryString({
      tenantId: params.tenantId,
      maxResults: params.maxResults || 100,
      timeframe: params.timeframe || '1y',
      force: params.force || false,
    });

    return this.fetchApi<DiscoveryResponse>(
      `/discover?${query}`,
      { method: 'POST' }
    );
  }

  /**
   * List subscriptions with pagination
   */
  async list(params: ListParams): Promise<ListResponse> {
    const query = this.buildQueryString({
      tenantId: params.tenantId,
      limit: params.limit || 20,
      offset: params.offset || 0,
      minConfidence: params.minConfidence,
      sortBy: params.sortBy || 'confidence',
      sortOrder: params.sortOrder || 'desc',
    });

    return this.fetchApi<ListResponse>(`?${query}`);
  }

  /**
   * Get single subscription details
   */
  async get(id: string, tenantId: string): Promise<Subscription> {
    const query = this.buildQueryString({ tenantId });
    const response = await this.fetchApi<{ subscription: Subscription }>(
      `/${id}?${query}`
    );
    return response.subscription;
  }

  /**
   * Reconcile Gmail receipts with Xero transactions
   */
  async reconcile(params: ReconcileParams): Promise<ReconciliationResponse> {
    const query = this.buildQueryString({
      tenantId: params.tenantId,
      force: params.force || false,
    });

    return this.fetchApi<ReconciliationResponse>(
      `/reconcile?${query}`,
      { method: 'POST' }
    );
  }

  /**
   * Get analytics summary (cost totals, savings opportunities)
   */
  async getSummary(tenantId: string): Promise<AnalyticsResponse> {
    const query = this.buildQueryString({ tenantId });
    return this.fetchApi<AnalyticsResponse>(`/analytics/summary?${query}`);
  }

  /**
   * Get outstanding/unpaid invoices
   */
  async getOutstanding(tenantId: string): Promise<OutstandingInvoicesResponse> {
    const query = this.buildQueryString({ tenantId });
    return this.fetchApi<OutstandingInvoicesResponse>(`/outstanding?${query}`);
  }

  /**
   * Get payment calendar with upcoming due dates
   */
  async getPaymentCalendar(tenantId: string): Promise<PaymentCalendarResponse> {
    const query = this.buildQueryString({ tenantId });
    return this.fetchApi<PaymentCalendarResponse>(`/payment-calendar?${query}`);
  }

  /**
   * Get subscription costs aggregated by email account
   */
  async getCostByAccount(tenantId: string): Promise<CostByAccountResponse> {
    const query = this.buildQueryString({ tenantId });
    return this.fetchApi<CostByAccountResponse>(`/cost-by-account?${query}`);
  }

  /**
   * Get subscription costs aggregated by vendor
   */
  async getCostByVendor(
    tenantId: string,
    limit?: number
  ): Promise<CostByVendorResponse> {
    const query = this.buildQueryString({ tenantId, limit });
    return this.fetchApi<CostByVendorResponse>(`/cost-by-vendor?${query}`);
  }

  /**
   * Get consolidation workflow progress
   */
  async getConsolidationProgress(
    tenantId: string
  ): Promise<ConsolidationProgressResponse> {
    const query = this.buildQueryString({ tenantId });
    return this.fetchApi<ConsolidationProgressResponse>(
      `/consolidation-progress?${query}`
    );
  }

  /**
   * Update consolidation status for a subscription
   */
  async updateConsolidationStatus(
    params: UpdateConsolidationParams
  ): Promise<Subscription> {
    const { id, ...body } = params;
    return this.fetchApi<Subscription>(`/${id}/consolidation`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * Update subscription details (status, tags, category, notes, etc.)
   */
  async update(id: string, updates: Partial<Subscription>): Promise<Subscription> {
    return this.fetchApi<Subscription>(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }
}

export const subscriptionApi = new SubscriptionAPI();
