import React, { useState } from 'react';
import { Card } from '../ui/Card';
import {
  useSubscriptions,
  useConsolidationProgress,
  useUpdateConsolidationStatus,
} from '../../hooks/useSubscriptions';
import type { Subscription } from '../../types/subscription';

interface ConsolidationTrackerProps {
  tenantId: string;
}

/**
 * Consolidation Tracker Component
 *
 * Manual workflow for consolidating all subscriptions to accounts@act.place
 * Shows vendor contact info for users to email themselves
 */
export const ConsolidationTracker: React.FC<ConsolidationTrackerProps> = ({ tenantId }) => {
  const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const { data: listData, isLoading: listLoading } = useSubscriptions({
    tenantId,
    limit: 200,
    offset: 0,
  });

  const { data: progressData, isLoading: progressLoading } = useConsolidationProgress(tenantId);
  const updateStatus = useUpdateConsolidationStatus();

  const isLoading = listLoading || progressLoading;

  const subscriptions = listData?.subscriptions || [];

  // Group subscriptions by current account email
  const groupByAccount = (subs: Subscription[]) => {
    const grouped: Record<string, Subscription[]> = {};

    subs.forEach((sub) => {
      const email = sub.account_email || 'unknown';
      if (!grouped[email]) {
        grouped[email] = [];
      }
      grouped[email].push(sub);
    });

    return grouped;
  };

  const handleStatusChange = (subscriptionId: string, newStatus: string) => {
    updateStatus.mutate(
      {
        id: subscriptionId,
        status: newStatus,
      },
      {
        onSuccess: () => {
          console.log('Status updated successfully');
        },
        onError: (err) => {
          alert(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`);
        },
      }
    );
  };

  const handleSaveNotes = (subscriptionId: string) => {
    updateStatus.mutate(
      {
        id: subscriptionId,
        notes,
      },
      {
        onSuccess: () => {
          setSelectedSubscription(null);
          setNotes('');
        },
        onError: (err) => {
          alert(`Failed to save notes: ${err instanceof Error ? err.message : 'Unknown error'}`);
        },
      }
    );
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'awaiting_confirmation':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'vendor_contacted':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'skipped':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-red-50 text-red-800 border-red-300';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'completed':
        return '✅ Completed';
      case 'awaiting_confirmation':
        return '⏳ Awaiting';
      case 'vendor_contacted':
        return '📧 Contacted';
      case 'skipped':
        return '⏭️ Skipped';
      default:
        return '🔴 Not Started';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-block animate-spin text-4xl">⟳</div>
          <p className="text-gray-600 mt-2">Loading consolidation tracker...</p>
        </div>
      </Card>
    );
  }

  const byAccount = groupByAccount(subscriptions);
  const targetEmail = 'accounts@act.place';

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">📧 Email Consolidation Progress</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Total Subscriptions</div>
            <div className="text-3xl font-bold text-gray-900">
              {progressData?.summary?.totalSubscriptions || 0}
            </div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Completed</div>
            <div className="text-3xl font-bold text-green-600">
              {progressData?.summary?.completedSubscriptions || 0}
            </div>
          </div>

          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Progress</div>
            <div className="text-3xl font-bold text-blue-600">
              {progressData?.summary?.progressPercentage?.toFixed(1) || '0.0'}%
            </div>
          </div>

          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Target Account</div>
            <div className="text-lg font-bold text-orange-600">{targetEmail}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-blue-600 h-4 rounded-full transition-all duration-500 flex items-center justify-center text-xs text-white font-semibold"
            style={{ width: `${progressData?.summary?.progressPercentage || 0}%` }}
          >
            {(progressData?.summary?.progressPercentage || 0) > 10 &&
              `${progressData?.summary?.progressPercentage?.toFixed(0)}%`}
          </div>
        </div>
      </Card>

      {/* Instructions Card */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 How to Consolidate</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>Review subscriptions on each email account below</li>
          <li>Click "Email Vendor" to draft a billing address change request</li>
          <li>Update status as you progress (Contacted → Awaiting → Completed)</li>
          <li>Add notes to track conversations and confirmation details</li>
          <li>Mark as "Skipped" if consolidation is not possible or needed</li>
        </ol>
      </Card>

      {/* Subscriptions by Account */}
      {Object.entries(byAccount).map(([email, subs]) => {
        if (email === targetEmail) return null; // Skip target account

        return (
          <Card key={email}>
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{email}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {subs.length} {subs.length === 1 ? 'subscription' : 'subscriptions'} to migrate
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Annual Cost</div>
                <div className="text-xl font-bold text-gray-900">
                  $
                  {subs
                    .reduce((sum, sub) => {
                      const annual =
                        sub.subscription_frequency === 'monthly'
                          ? (sub.amount || 0) * 12
                          : sub.subscription_frequency === 'quarterly'
                          ? (sub.amount || 0) * 4
                          : sub.amount || 0;
                      return sum + annual;
                    }, 0)
                    .toFixed(2)}
                </div>
              </div>
            </div>

            {/* Subscriptions Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="p-3 font-semibold text-gray-700">Vendor</th>
                    <th className="p-3 font-semibold text-gray-700">Amount</th>
                    <th className="p-3 font-semibold text-gray-700">Frequency</th>
                    <th className="p-3 font-semibold text-gray-700">Status</th>
                    <th className="p-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((sub) => (
                    <React.Fragment key={sub.id}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium text-gray-900">{sub.vendor}</div>
                          {sub.vendor_contact_email && (
                            <a
                              href={`mailto:${sub.vendor_contact_email}`}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {sub.vendor_contact_email}
                            </a>
                          )}
                        </td>
                        <td className="p-3 font-semibold text-gray-900">
                          ${sub.amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="p-3 text-gray-600 capitalize">
                          {sub.subscription_frequency || 'Unknown'}
                        </td>
                        <td className="p-3">
                          <select
                            value={sub.consolidation_status || 'not_started'}
                            onChange={(e) => handleStatusChange(sub.id!, e.target.value)}
                            disabled={updateStatus.isPending}
                            className={`px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(
                              sub.consolidation_status
                            )}`}
                          >
                            <option value="not_started">Not Started</option>
                            <option value="vendor_contacted">Contacted</option>
                            <option value="awaiting_confirmation">Awaiting</option>
                            <option value="completed">Completed</option>
                            <option value="skipped">Skipped</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                window.open(
                                  `mailto:${
                                    sub.vendor_contact_email || 'support@vendor.com'
                                  }?subject=Billing%20Address%20Update%20Request&body=Hi%2C%0A%0AI'd%20like%20to%20update%20our%20billing%20email%20for%20${encodeURIComponent(
                                    sub.vendor || ''
                                  )}%20to%20${targetEmail}.%0A%0ACurrent%20email%3A%20${email}%0ANew%20email%3A%20${targetEmail}%0A%0AThank%20you!`
                                )
                              }
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              📧 Email Vendor
                            </button>
                            <button
                              onClick={() => {
                                setSelectedSubscription(sub.id!);
                                setNotes(sub.consolidation_notes || '');
                              }}
                              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              📝 Notes
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Notes Row (expandable) */}
                      {selectedSubscription === sub.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="p-4">
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Consolidation Notes
                                </label>
                                <textarea
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  rows={3}
                                  placeholder="Track conversations, confirmation numbers, expected completion dates..."
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveNotes(sub.id!)}
                                  disabled={updateStatus.isPending}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                                >
                                  {updateStatus.isPending ? 'Saving...' : 'Save Notes'}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedSubscription(null);
                                    setNotes('');
                                  }}
                                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                              {sub.consolidation_notes && (
                                <div className="text-sm text-gray-600 italic">
                                  Current notes: {sub.consolidation_notes}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}

      {/* Target Account Status */}
      {byAccount[targetEmail] && byAccount[targetEmail].length > 0 && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">✅</span>
            <div>
              <h3 className="text-xl font-semibold text-green-600">{targetEmail}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {byAccount[targetEmail].length} subscriptions already on target account
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            These subscriptions are already using the consolidated email address.
          </div>
        </Card>
      )}
    </div>
  );
};
