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
