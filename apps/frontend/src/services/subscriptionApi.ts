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
}

export const subscriptionApi = new SubscriptionAPI();
