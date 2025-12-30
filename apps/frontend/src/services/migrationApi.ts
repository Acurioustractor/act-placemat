/**
 * Migration API Client
 *
 * Client-side API wrapper for subscription email migration endpoints
 */

import { api } from './api';

export interface MigrationProgress {
  total: number;
  byStatus: {
    not_started: number;
    pending_contact: number;
    contacted: number;
    vendor_confirmed: number;
    completed: number;
    skipped: number;
  };
  done: number;
  completionRate: number;
  avgPendingPriority: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  emailStats: {
    sentToday: number;
    dailyLimit: number;
    remainingToday: number;
  };
}

export interface MigrationInitResult {
  total: number;
  emailsDiscovered: number;
  pendingContact: number;
  manualNeeded: number;
  priorities: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface ContactVendorsResult {
  sent: number;
  queued: number;
  failed: number;
  skipped: number;
  details?: {
    sent: Array<{ id: string; vendor: string }>;
    queued: Array<{ id: string; vendor: string }>;
    failed: Array<{ id: string; vendor: string; error: string }>;
    skipped: Array<{ id: string; vendor: string; reason: string }>;
  };
}

export interface Subscription {
  id: string;
  vendor: string;
  amount: number | null;
  frequency: string;
  status: string;
  confidence: number;
  account_email: string | null;
  vendor_contact_email: string | null;
  vendor_contact_source: string | null;
  migration_status: 'not_started' | 'pending_contact' | 'contacted' | 'vendor_confirmed' | 'completed' | 'skipped';
  migration_priority: number;
  migration_notes: string | null;
  contacted_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
}

export interface SubscriptionsListResponse {
  subscriptions: Subscription[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export const migrationApi = {
  /**
   * Get migration progress summary
   */
  async getProgress(tenantId: string): Promise<MigrationProgress> {
    const response: any = await (api as any).request(`/api/v1/subscriptions/migration/progress?tenantId=${tenantId}`);
    return response.data;
  },

  /**
   * Initialize migration workflow
   * Discovers vendor emails and calculates priorities
   */
  async initialize(tenantId: string, forceRediscover = false): Promise<MigrationInitResult> {
    const response: any = await (api as any).request(`/api/v1/subscriptions/migration/init?tenantId=${tenantId}`, {
      method: 'POST',
      body: JSON.stringify({ forceRediscover })
    });
    return response.data;
  },

  /**
   * Send vendor contact emails
   */
  async contactVendors(
    tenantId: string,
    subscriptionIds?: string[],
    dryRun = false,
    maxBatchSize = 50
  ): Promise<ContactVendorsResult> {
    const response: any = await (api as any).request(
      `/api/v1/subscriptions/migration/contact?tenantId=${tenantId}&dryRun=${dryRun}`,
      {
        method: 'POST',
        body: JSON.stringify({ subscriptionIds, maxBatchSize })
      }
    );
    return response.data;
  },

  /**
   * Update migration status for a subscription
   */
  async updateStatus(
    subscriptionId: string,
    action: 'confirm' | 'complete' | 'skip',
    notes?: string
  ): Promise<Subscription> {
    const response: any = await (api as any).request(`/api/v1/subscriptions/migration/${subscriptionId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ action, notes })
    });
    return response.data.subscription;
  },

  /**
   * Get next batch of subscriptions to process
   */
  async getNextBatch(tenantId: string, batchSize = 10): Promise<Subscription[]> {
    const response: any = await (api as any).request(
      `/api/v1/subscriptions/migration/next-batch?tenantId=${tenantId}&batchSize=${batchSize}`
    );
    return response.data.subscriptions;
  },

  /**
   * List subscriptions with filters
   */
  async listSubscriptions(
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      minConfidence?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      status?: string;
      migrationStatus?: string;
    } = {}
  ): Promise<SubscriptionsListResponse> {
    const params = new URLSearchParams({
      tenantId,
      ...Object.entries(options).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    });

    const response: any = await (api as any).request(`/api/v1/subscriptions?${params}`);
    return response.data;
  },

  /**
   * Update subscription fields
   */
  async updateSubscription(
    subscriptionId: string,
    tenantId: string,
    updates: Partial<Subscription>
  ): Promise<Subscription> {
    const response: any = await (api as any).request(`/api/v1/subscriptions/${subscriptionId}?tenantId=${tenantId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    return response.data.subscription;
  },

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(tenantId: string) {
    const response: any = await (api as any).request(`/api/v1/subscriptions/analytics/summary?tenantId=${tenantId}`);
    return response.data.analytics;
  }
};
