# Frontend Integration Guide - Subscription Tracker

**Real-time subscription management dashboard with multi-account Gmail scanning**

---

## 📊 All Discovered Subscriptions (Current Results)

From Gmail scan of ACT's inbox:

### High Confidence (20%+)
1. **Musicbed** - Music licensing (26.8% confidence)
2. **Figma** - Design tool (26.5% confidence)

### Medium Confidence (10-20%)
3. **Paddle** - Payment processor (13.4%)
4. **Act** - CRM/Marketing (11.0%)
5. **GoHighLevel** - Business automation (10.1%)
6. **Stripe** - Payment processor (10.1%)
7. **Google** - Workspace/Cloud (10.1%)

**Total**: 7 confirmed vendors (21 vendors identified, 7 above 5% threshold)

---

## 🎯 Frontend Architecture

### Option 1: Add to Existing ACT Dashboard (Recommended)

**Location**: `/apps/frontend/src/components/SubscriptionManager.tsx`

**Integration Points**:
- Add tab to existing dashboard navigation
- Reuse ACT's Card, Button, Badge components
- Use existing API service pattern
- Share authentication context

### Option 2: Standalone App

**Location**: `/apps/subscription-dashboard/`

**Tech Stack**:
- React + TypeScript
- Vite (already used in ACT frontend)
- TailwindCSS (matches ACT design)
- React Query for real-time sync
- Supabase Realtime for live updates

---

## 📦 TypeScript Types

Create: `/apps/frontend/src/types/subscription.ts`

```typescript
/**
 * Subscription Tracker TypeScript Definitions
 * Auto-synced with Supabase schema
 */

// ============================================================================
// Core Subscription Types
// ============================================================================

export interface Subscription {
  id: string;
  tenant_id: string;

  // Vendor information
  vendor: string;
  amount: number | null;
  currency: string;
  frequency: SubscriptionFrequency;

  // Status
  status: SubscriptionStatus;
  cancel_reason?: string;
  notes?: string;

  // Multi-signal confidence
  confidence: number; // 0-1.0
  signals: SubscriptionSignals;
  sources: SubscriptionSources;

  // External references
  gmail_message_id?: string;
  xero_contact_id?: string;
  notion_page_id?: string;

  // Metadata
  metadata?: {
    gmail_emails?: Array<{
      subject: string;
      date: string;
      sender: string;
    }>;
    xero_transactions?: Array<{
      date: string;
      amount: number;
      reference: string;
    }>;
  };

  // Timestamps
  first_detected: string;
  last_scanned: string;
  created_at: string;
  updated_at: string;
}

export type SubscriptionFrequency =
  | 'monthly'
  | 'yearly'
  | 'quarterly'
  | 'irregular'
  | 'unknown';

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'paused'
  | 'pending_review';

export interface SubscriptionSignals {
  gmail: number;  // 0-1.0
  xero: number;   // 0-1.0
  ai: number;     // 0-1.0
}

export interface SubscriptionSources {
  hasGmail: boolean;
  hasXero: boolean;
  hasAI: boolean;
}

// ============================================================================
// Discovery & Scanning Types
// ============================================================================

export interface DiscoveryRequest {
  tenantId: string;
  rescan?: boolean;
  emailAccounts?: string[]; // For multi-account scanning
}

export interface DiscoveryResponse {
  success: boolean;
  data: {
    subscriptions: Subscription[];
    count: number;
    cached: boolean;
    cacheAge?: number; // milliseconds
  };
  meta: {
    timestamp: string;
    processingTime: number; // milliseconds
    emailsScanned: number;
    vendorsFound: number;
  };
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface SavingsAnalytics {
  potentialSavings: number;
  lowConfidenceCount: number;
  recommendation: string;
  breakdown: {
    monthly: number;
    yearly: number;
    total: number;
  };
}

export interface SubscriptionSummary {
  total: number;
  active: number;
  canceled: number;
  pendingReview: number;
  totalMonthlySpend: number;
  totalYearlySpend: number;
  byFrequency: {
    monthly: number;
    yearly: number;
    quarterly: number;
    unknown: number;
  };
  byConfidence: {
    high: number;    // > 0.8
    medium: number;  // 0.6-0.8
    low: number;     // < 0.6
  };
}

// ============================================================================
// Filter & Sort Types
// ============================================================================

export interface SubscriptionFilters {
  status?: SubscriptionStatus[];
  frequency?: SubscriptionFrequency[];
  minConfidence?: number;
  maxConfidence?: number;
  hasAmount?: boolean;
  search?: string; // Vendor name search
}

export type SubscriptionSortField =
  | 'vendor'
  | 'confidence'
  | 'amount'
  | 'frequency'
  | 'last_scanned'
  | 'created_at';

export interface SubscriptionSort {
  field: SubscriptionSortField;
  direction: 'asc' | 'desc';
}

// ============================================================================
// Update Types
// ============================================================================

export interface SubscriptionUpdate {
  status?: SubscriptionStatus;
  notes?: string;
  cancel_reason?: string;
  amount?: number;
  frequency?: SubscriptionFrequency;
}

// ============================================================================
// Multi-Account Gmail Scanning
// ============================================================================

export interface GmailAccount {
  id: string;
  email: string;
  name?: string;
  connected: boolean;
  last_sync?: string;
  tokens?: {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
  };
}

export interface MultiAccountScanRequest {
  accounts: string[]; // Account IDs to scan
  timeframe?: string; // e.g., "3m", "6m", "1y"
  maxResultsPerAccount?: number;
}

// ============================================================================
// Real-time Subscription Event
// ============================================================================

export interface SubscriptionEvent {
  type: 'subscription.created' | 'subscription.updated' | 'subscription.deleted';
  payload: Subscription;
  timestamp: string;
}
```

---

## 🔌 API Service

Create: `/apps/frontend/src/services/subscriptionApi.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type {
  Subscription,
  DiscoveryRequest,
  DiscoveryResponse,
  SubscriptionUpdate,
  SubscriptionFilters,
  SubscriptionSort,
  SavingsAnalytics,
  SubscriptionSummary,
  MultiAccountScanRequest
} from '../types/subscription';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

class SubscriptionAPI {
  private baseUrl = '/api/v1/subscriptions';

  /**
   * Trigger subscription discovery scan
   */
  async discover(request: DiscoveryRequest): Promise<DiscoveryResponse> {
    const params = new URLSearchParams({
      tenantId: request.tenantId,
      ...(request.rescan !== undefined && { rescan: String(request.rescan) })
    });

    const response = await fetch(`${this.baseUrl}/discover?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailAccounts: request.emailAccounts })
    });

    if (!response.ok) throw new Error('Discovery failed');
    return response.json();
  }

  /**
   * List subscriptions with filters and pagination
   */
  async list(
    tenantId: string,
    filters?: SubscriptionFilters,
    sort?: SubscriptionSort,
    pagination?: { limit: number; offset: number }
  ): Promise<{ subscriptions: Subscription[]; total: number }> {
    let query = supabase
      .from('discovered_subscriptions')
      .select('*, subscription_receipts(*)', { count: 'exact' })
      .eq('tenant_id', tenantId);

    // Apply filters
    if (filters?.status) {
      query = query.in('status', filters.status);
    }
    if (filters?.frequency) {
      query = query.in('frequency', filters.frequency);
    }
    if (filters?.minConfidence !== undefined) {
      query = query.gte('confidence', filters.minConfidence);
    }
    if (filters?.maxConfidence !== undefined) {
      query = query.lte('confidence', filters.maxConfidence);
    }
    if (filters?.search) {
      query = query.ilike('vendor', `%${filters.search}%`);
    }

    // Apply sorting
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    } else {
      query = query.order('confidence', { ascending: false });
    }

    // Apply pagination
    if (pagination) {
      query = query.range(pagination.offset, pagination.offset + pagination.limit - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      subscriptions: data || [],
      total: count || 0
    };
  }

  /**
   * Get single subscription details
   */
  async get(id: string): Promise<Subscription> {
    const { data, error } = await supabase
      .from('discovered_subscriptions')
      .select(`
        *,
        subscription_receipts(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Subscription not found');

    return data;
  }

  /**
   * Update subscription
   */
  async update(id: string, updates: SubscriptionUpdate): Promise<Subscription> {
    const { data, error } = await supabase
      .from('discovered_subscriptions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete subscription
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('discovered_subscriptions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Get savings analytics
   */
  async getSavings(tenantId: string): Promise<SavingsAnalytics> {
    const response = await fetch(
      `${this.baseUrl}/analytics/savings?tenantId=${tenantId}`
    );

    if (!response.ok) throw new Error('Failed to fetch savings');
    const result = await response.json();
    return result.data;
  }

  /**
   * Get subscription summary
   */
  async getSummary(tenantId: string): Promise<SubscriptionSummary> {
    const response = await fetch(
      `${this.baseUrl}/analytics/summary?tenantId=${tenantId}`
    );

    if (!response.ok) throw new Error('Failed to fetch summary');
    const result = await response.json();
    return result.data;
  }

  /**
   * Multi-account Gmail scan
   */
  async scanMultipleAccounts(request: MultiAccountScanRequest): Promise<DiscoveryResponse> {
    const response = await fetch(`${this.baseUrl}/scan-multiple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) throw new Error('Multi-account scan failed');
    return response.json();
  }

  /**
   * Subscribe to real-time subscription updates
   */
  subscribeToChanges(
    tenantId: string,
    callback: (event: 'INSERT' | 'UPDATE' | 'DELETE', subscription: Subscription) => void
  ) {
    return supabase
      .channel('subscriptions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discovered_subscriptions',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          callback(payload.eventType as any, payload.new as Subscription);
        }
      )
      .subscribe();
  }
}

export const subscriptionApi = new SubscriptionAPI();
```

---

## 🎨 React Components

### 1. Main Dashboard Component

Create: `/apps/frontend/src/components/SubscriptionDashboard.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi } from '../services/subscriptionApi';
import type { Subscription, SubscriptionFilters, SubscriptionSort } from '../types/subscription';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export const SubscriptionDashboard: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [filters, setFilters] = useState<SubscriptionFilters>({});
  const [sort, setSort] = useState<SubscriptionSort>({ field: 'confidence', direction: 'desc' });
  const queryClient = useQueryClient();

  // Fetch subscriptions
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['subscriptions', tenantId, filters, sort],
    queryFn: () => subscriptionApi.list(tenantId, filters, sort, { limit: 50, offset: 0 })
  });

  // Fetch summary analytics
  const { data: summary } = useQuery({
    queryKey: ['subscription-summary', tenantId],
    queryFn: () => subscriptionApi.getSummary(tenantId)
  });

  // Fetch savings analytics
  const { data: savings } = useQuery({
    queryKey: ['subscription-savings', tenantId],
    queryFn: () => subscriptionApi.getSavings(tenantId)
  });

  // Trigger discovery scan
  const discoverMutation = useMutation({
    mutationFn: (rescan: boolean) => subscriptionApi.discover({ tenantId, rescan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-summary'] });
    }
  });

  // Real-time subscription updates
  useEffect(() => {
    const channel = subscriptionApi.subscribeToChanges(tenantId, (event, subscription) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [tenantId, queryClient]);

  return (
    <div className="space-y-6">
      {/* Header with Scan Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Subscription Tracker</h1>
          <p className="text-gray-600">
            Found {summary?.total || 0} subscriptions from Gmail & Xero
          </p>
        </div>

        <Button
          onClick={() => discoverMutation.mutate(true)}
          loading={discoverMutation.isPending}
        >
          🔍 Scan for Subscriptions
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-sm text-gray-600">Total Subscriptions</div>
          <div className="text-3xl font-bold">{summary?.total || 0}</div>
        </Card>

        <Card>
          <div className="text-sm text-gray-600">Monthly Spend</div>
          <div className="text-3xl font-bold">
            ${(summary?.totalMonthlySpend || 0).toFixed(2)}
          </div>
        </Card>

        <Card>
          <div className="text-sm text-gray-600">Yearly Spend</div>
          <div className="text-3xl font-bold">
            ${(summary?.totalYearlySpend || 0).toFixed(2)}
          </div>
        </Card>

        <Card>
          <div className="text-sm text-gray-600">Potential Savings</div>
          <div className="text-3xl font-bold text-green-600">
            ${(savings?.potentialSavings || 0).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">
            {savings?.lowConfidenceCount || 0} low-use subscriptions
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search vendors..."
            className="flex-1 px-4 py-2 border rounded"
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />

          <select
            className="px-4 py-2 border rounded"
            onChange={(e) => setFilters({
              ...filters,
              status: e.target.value ? [e.target.value as any] : undefined
            })}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="canceled">Canceled</option>
            <option value="pending_review">Pending Review</option>
          </select>

          <select
            className="px-4 py-2 border rounded"
            onChange={(e) => setSort({
              field: e.target.value as any,
              direction: 'desc'
            })}
          >
            <option value="confidence">Confidence</option>
            <option value="amount">Amount</option>
            <option value="vendor">Vendor</option>
            <option value="last_scanned">Last Scanned</option>
          </select>
        </div>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Vendor</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Frequency</th>
              <th className="text-left p-3">Confidence</th>
              <th className="text-left p-3">Sources</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions?.subscriptions.map((sub) => (
              <SubscriptionRow key={sub.id} subscription={sub} tenantId={tenantId} />
            ))}
          </tbody>
        </table>

        {isLoading && <div className="text-center py-8">Loading...</div>}
        {!isLoading && subscriptions?.subscriptions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No subscriptions found. Click "Scan for Subscriptions" to discover them.
          </div>
        )}
      </Card>
    </div>
  );
};
```

### 2. Subscription Row Component

```typescript
const SubscriptionRow: React.FC<{ subscription: Subscription; tenantId: string }> = ({
  subscription,
  tenantId
}) => {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (update: SubscriptionUpdate) =>
      subscriptionApi.update(subscription.id, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    }
  });

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return <Badge variant="success">High</Badge>;
    if (confidence >= 0.6) return <Badge variant="warning">Medium</Badge>;
    return <Badge variant="error">Low</Badge>;
  };

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="p-3 font-medium">{subscription.vendor}</td>
      <td className="p-3">
        {subscription.amount
          ? `$${subscription.amount.toFixed(2)}`
          : <span className="text-gray-400">Unknown</span>
        }
      </td>
      <td className="p-3 capitalize">{subscription.frequency}</td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          {getConfidenceBadge(subscription.confidence)}
          <span className="text-sm text-gray-600">
            {(subscription.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </td>
      <td className="p-3">
        <div className="flex gap-1">
          {subscription.sources.hasGmail && <Badge size="sm">📧 Gmail</Badge>}
          {subscription.sources.hasXero && <Badge size="sm">💰 Xero</Badge>}
        </div>
      </td>
      <td className="p-3">
        <select
          value={subscription.status}
          onChange={(e) => updateMutation.mutate({ status: e.target.value as any })}
          className="px-2 py-1 border rounded text-sm"
        >
          <option value="active">Active</option>
          <option value="pending_review">Review</option>
          <option value="canceled">Canceled</option>
        </select>
      </td>
      <td className="p-3 text-right">
        <Button size="sm" variant="ghost">View Details</Button>
      </td>
    </tr>
  );
};
```

---

## 🔄 Real-time Sync Implementation

### Supabase Realtime Setup

```typescript
// In your component or custom hook
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabaseClient';

export function useRealtimeSubscriptions(tenantId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('subscriptions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discovered_subscriptions',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('Subscription changed:', payload);

          // Invalidate queries to refetch
          queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
          queryClient.invalidateQueries({ queryKey: ['subscription-summary'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [tenantId, queryClient]);
}
```

---

## 📧 Multi-Account Gmail Scanning

### Backend API Endpoint

Add to `/apps/backend/subscription-tracker/routes/subscriptions.js`:

```javascript
/**
 * POST /api/v1/subscriptions/scan-multiple
 * Scan multiple Gmail accounts
 */
router.post('/scan-multiple', async (req, res) => {
  try {
    const { accounts, timeframe = '3m', maxResultsPerAccount = 100 } = req.body;

    const allSubscriptions = [];

    for (const accountEmail of accounts) {
      // Get Gmail tokens for this account
      const { data: account } = await supabase
        .from('gmail_accounts')
        .select('*')
        .eq('email', accountEmail)
        .single();

      if (!account || !account.connected) continue;

      // Authenticate with this account's tokens
      await gmailService.authenticate(
        account.tokens.access_token,
        account.tokens.refresh_token
      );

      // Run discovery
      const detector = new SubscriptionDetector(gmailService, supabase);
      const subscriptions = await detector.discoverSubscriptions(account.tenant_id);

      allSubscriptions.push(...subscriptions);
    }

    // Deduplicate by vendor
    const unique = deduplicateByVendor(allSubscriptions);

    return apiResponse(res, {
      subscriptions: unique,
      count: unique.length,
      accountsScanned: accounts.length
    });
  } catch (error) {
    return apiError(res, error, { status: 500, code: 'MULTI_SCAN_ERROR' });
  }
});
```

### Frontend Multi-Account UI

```typescript
const MultiAccountScanner: React.FC = () => {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  const { data: accounts } = useQuery({
    queryKey: ['gmail-accounts'],
    queryFn: () => fetch('/api/v1/gmail-accounts').then(r => r.json())
  });

  const scanMutation = useMutation({
    mutationFn: (accounts: string[]) =>
      subscriptionApi.scanMultipleAccounts({ accounts }),
    onSuccess: (data) => {
      alert(`Found ${data.data.count} subscriptions across ${data.meta.emailsScanned} accounts`);
    }
  });

  return (
    <Card>
      <h3>Gmail Accounts</h3>
      {accounts?.map((account) => (
        <label key={account.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedAccounts.includes(account.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedAccounts([...selectedAccounts, account.id]);
              } else {
                setSelectedAccounts(selectedAccounts.filter(id => id !== account.id));
              }
            }}
          />
          <span>{account.email}</span>
          <Badge>{account.connected ? 'Connected' : 'Disconnected'}</Badge>
        </label>
      ))}

      <Button
        onClick={() => scanMutation.mutate(selectedAccounts)}
        disabled={selectedAccounts.length === 0}
      >
        Scan {selectedAccounts.length} Accounts
      </Button>
    </Card>
  );
};
```

---

## 🚀 Quick Start

### 1. Add to Existing Dashboard

```bash
cd apps/frontend

# Create new components
mkdir -p src/components/subscriptions
touch src/components/subscriptions/SubscriptionDashboard.tsx
touch src/components/subscriptions/SubscriptionRow.tsx
touch src/components/subscriptions/MultiAccountScanner.tsx

# Create types
touch src/types/subscription.ts

# Create API service
touch src/services/subscriptionApi.ts
```

### 2. Add Route

In `src/App.tsx`:

```typescript
import { SubscriptionDashboard } from './components/subscriptions/SubscriptionDashboard';

// Add route
<Route path="/subscriptions" element={<SubscriptionDashboard tenantId="act-tenant-production" />} />
```

### 3. Add Navigation

In your nav component:

```typescript
<NavLink to="/subscriptions">
  💳 Subscriptions
</NavLink>
```

### 4. Install Dependencies

```bash
npm install @tanstack/react-query @supabase/supabase-js
```

---

## 📝 Next Steps

1. **Create the React components** using the code above
2. **Test with current 7 subscriptions** (Musicbed, Figma, etc.)
3. **Add Gmail account management** UI
4. **Implement multi-account scanning**
5. **Add Xero data** to boost confidence scores
6. **Build cancellation workflow**

Would you like me to:
1. Create the React components now?
2. Set up the multi-account Gmail scanning backend?
3. Build the real-time sync hooks?
