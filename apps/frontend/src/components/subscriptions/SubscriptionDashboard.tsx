import React, { useState } from 'react';
import type {
  Subscription,
} from '../../types/subscription';
import { Card } from '../ui/Card';
import { SubscriptionRow } from './SubscriptionRow';
import {
  useSubscriptions,
  useDiscoverSubscriptions,
  useSubscriptionSummary,
  useUpdateSubscription,
} from '../../hooks/useSubscriptions';
import MigrationDashboard from './MigrationDashboard';
import { PaymentTimeline } from './PaymentTimeline';
import { CostBreakdownCharts } from './CostBreakdownCharts';
import { ConsolidationTracker } from './ConsolidationTracker';

interface SubscriptionDashboardProps {
  tenantId: string;
}

type TabView = 'overview' | 'timeline' | 'costs' | 'consolidation' | 'migration';

export const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({ tenantId }) => {
  const [activeView, setActiveView] = useState<TabView>('overview');
  const [minConfidence, setMinConfidence] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'confidence' | 'vendor' | 'amount' | 'created_at'>('confidence');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // React Query hooks
  const { data: listData, isLoading, error } = useSubscriptions({
    tenantId,
    limit: 100,
    offset: 0,
    minConfidence,
    sortBy,
    sortOrder,
  });

  const { data: summaryData } = useSubscriptionSummary(tenantId);

  const discoverMutation = useDiscoverSubscriptions();
  const updateMutation = useUpdateSubscription();

  // Extract data from responses
  const subscriptions = listData?.subscriptions || [];
  const analytics = summaryData?.analytics;

  // Handle subscription updates
  const handleUpdateSubscription = async (id: string, updates: Partial<Subscription>) => {
    try {
      await updateMutation.mutateAsync({ id, updates });
      alert('✅ Subscription updated successfully!');
    } catch (error) {
      alert(`❌ Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Run discovery scan
  const handleScan = () => {
    discoverMutation.mutate(
      {
        tenantId,
        maxResults: 100,
        timeframe: '1y',
        force: true,
      },
      {
        onSuccess: (result) => {
          alert(`✅ Found ${result.summary.total} subscriptions!`);
        },
        onError: (err) => {
          alert(`❌ Scan failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        },
      }
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header with Tab Navigation */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">💳 Subscription Tracker</h1>
          <p className="text-gray-600 mt-1">
            {listData?.pagination.total || 0} subscriptions discovered from Gmail & Xero
          </p>
        </div>

        {activeView === 'overview' && (
          <button
            onClick={handleScan}
            disabled={discoverMutation.isPending}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              discoverMutation.isPending
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {discoverMutation.isPending ? (
              <>
                <span className="inline-block animate-spin mr-2">⟳</span>
                Scanning...
              </>
            ) : (
              <>🔍 Scan for Subscriptions</>
            )}
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveView('overview')}
          className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
            activeView === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveView('timeline')}
          className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
            activeView === 'timeline'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📅 Payment Timeline
        </button>
        <button
          onClick={() => setActiveView('costs')}
          className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
            activeView === 'costs'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          💰 Cost Analysis
        </button>
        <button
          onClick={() => setActiveView('consolidation')}
          className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
            activeView === 'consolidation'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📧 Consolidation
        </button>
        <button
          onClick={() => setActiveView('migration')}
          className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
            activeView === 'migration'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🔄 Email Migration
        </button>
      </div>

      {/* Render active view */}
      {activeView === 'migration' ? (
        <MigrationDashboard />
      ) : activeView === 'timeline' ? (
        <PaymentTimeline tenantId={tenantId} />
      ) : activeView === 'costs' ? (
        <CostBreakdownCharts tenantId={tenantId} />
      ) : activeView === 'consolidation' ? (
        <ConsolidationTracker tenantId={tenantId} />
      ) : (
        <>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">❌ {error instanceof Error ? error.message : 'An error occurred'}</p>
        </div>
      )}

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-sm text-gray-600 mb-1">Total Subscriptions</div>
          <div className="text-3xl font-bold text-gray-900">{analytics?.subscriptionCount || 0}</div>
          <div className="text-xs text-gray-500 mt-1">
            Avg confidence: {((analytics?.avgConfidence || 0) * 100).toFixed(0)}%
          </div>
        </Card>

        <Card>
          <div className="text-sm text-gray-600 mb-1">Annual Cost</div>
          <div className="text-3xl font-bold text-gray-900">
            ${(analytics?.totalAnnualCost || 0).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Estimated yearly spend
          </div>
        </Card>

        <Card>
          <div className="text-sm text-gray-600 mb-1">Monthly Estimate</div>
          <div className="text-3xl font-bold text-gray-900">
            ${((analytics?.totalAnnualCost || 0) / 12).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Per month average
          </div>
        </Card>

        <Card>
          <div className="text-sm text-gray-600 mb-1">Potential Savings</div>
          <div className="text-3xl font-bold text-green-600">
            ${(analytics?.savingsOpportunities?.reduce((sum, s) => sum + s.potentialSavings, 0) || 0).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {analytics?.savingsOpportunities?.length || 0} opportunities
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex gap-4">
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={minConfidence || ''}
            onChange={(e) => setMinConfidence(e.target.value ? parseFloat(e.target.value) : undefined)}
          >
            <option value="">All Confidence Levels</option>
            <option value="0.8">High (80%+)</option>
            <option value="0.6">Medium (60%+)</option>
            <option value="0.4">Low (40%+)</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="confidence">Sort by Confidence</option>
            <option value="amount">Sort by Amount</option>
            <option value="vendor">Sort by Vendor</option>
            <option value="created_at">Sort by Date</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-4 font-semibold text-gray-700">Vendor</th>
                <th className="text-left p-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left p-4 font-semibold text-gray-700">Frequency</th>
                <th className="text-left p-4 font-semibold text-gray-700">Confidence</th>
                <th className="text-left p-4 font-semibold text-gray-700">Sources</th>
                <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                <th className="text-right p-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="inline-block animate-spin text-4xl">⟳</div>
                    <p className="text-gray-600 mt-2">Loading subscriptions...</p>
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <p className="text-gray-600 text-lg">No subscriptions found</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Click "Scan for Subscriptions" to discover them from Gmail & Xero
                    </p>
                  </td>
                </tr>
              ) : (
                subscriptions.map((subscription) => (
                  <SubscriptionRow
                    key={subscription.id || subscription.vendor}
                    subscription={subscription}
                    onUpdate={handleUpdateSubscription}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary Info */}
      {subscriptions.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Showing {subscriptions.length} of {listData?.pagination.total || subscriptions.length} subscriptions
        </div>
      )}
        </>
      )}
    </div>
  );
};
