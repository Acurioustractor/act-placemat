/**
 * Migration Dashboard Component
 *
 * UI for managing subscription email migration workflow
 */

import React, { useState, useMemo } from 'react';
import {
  useMigrationProgress,
  useInitMigration,
  useContactVendors,
  useUpdateMigrationStatus,
  useSubscriptions
} from '../../hooks/useMigration';
import { Card } from '../ui/Card';
import { MetricCard } from '../ui/MetricCard';

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

const MigrationDashboard: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [dryRun, setDryRun] = useState(true);

  // Queries
  const { data: progress, isLoading: progressLoading } = useMigrationProgress(TENANT_ID);
  const { data: subscriptionsData, isLoading: subscriptionsLoading } = useSubscriptions(TENANT_ID, {
    limit: 100,
    sortBy: 'migration_priority',
    sortOrder: 'desc'
  });

  // Mutations
  const initMigration = useInitMigration();
  const contactVendors = useContactVendors();
  const updateStatus = useUpdateMigrationStatus();

  const subscriptions = subscriptionsData?.subscriptions || [];

  // Handlers
  const handleInitialize = async () => {
    if (confirm('Initialize migration workflow? This will discover vendor emails and calculate priorities.')) {
      try {
        await initMigration.mutateAsync({ tenantId: TENANT_ID, forceRediscover: false });
        alert('Migration initialized successfully!');
      } catch (error: any) {
        alert(`Initialization failed: ${error.message}`);
      }
    }
  };

  const handleContactSelected = async () => {
    if (selectedIds.size === 0) {
      alert('Please select subscriptions to contact');
      return;
    }

    const mode = dryRun ? 'DRY RUN' : 'LIVE';
    if (confirm(`${mode}: Send emails to ${selectedIds.size} vendors?`)) {
      try {
        const result = await contactVendors.mutateAsync({
          tenantId: TENANT_ID,
          subscriptionIds: Array.from(selectedIds),
          dryRun
        });

        alert(
          `Emails sent!\n\nSent: ${result.sent}\nQueued: ${result.queued}\nFailed: ${result.failed}\nSkipped: ${result.skipped}`
        );
        setSelectedIds(new Set());
      } catch (error: any) {
        alert(`Contact failed: ${error.message}`);
      }
    }
  };

  const handleConfirm = async (subscriptionId: string) => {
    const notes = prompt('Add notes (optional):');
    try {
      await updateStatus.mutateAsync({
        subscriptionId,
        action: 'confirm',
        notes: notes || undefined,
        tenantId: TENANT_ID
      });
    } catch (error: any) {
      alert(`Confirm failed: ${error.message}`);
    }
  };

  const handleComplete = async (subscriptionId: string) => {
    if (confirm('Mark migration as completed?')) {
      try {
        await updateStatus.mutateAsync({
          subscriptionId,
          action: 'complete',
          tenantId: TENANT_ID
        });
      } catch (error: any) {
        alert(`Complete failed: ${error.message}`);
      }
    }
  };

  const handleSkip = async (subscriptionId: string) => {
    const notes = prompt('Reason for skipping:');
    if (!notes) return;

    try {
      await updateStatus.mutateAsync({
        subscriptionId,
        action: 'skip',
        notes,
        tenantId: TENANT_ID
      });
    } catch (error: any) {
      alert(`Skip failed: ${error.message}`);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === subscriptions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(subscriptions.map(s => s.id)));
    }
  };

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      not_started: 'bg-gray-200 text-gray-700',
      pending_contact: 'bg-blue-200 text-blue-700',
      contacted: 'bg-yellow-200 text-yellow-700',
      vendor_confirmed: 'bg-green-200 text-green-700',
      completed: 'bg-green-500 text-white',
      skipped: 'bg-gray-400 text-white'
    };

    const labels: Record<string, string> = {
      not_started: 'Not Started',
      pending_contact: 'Pending Contact',
      contacted: 'Contacted',
      vendor_confirmed: 'Confirmed',
      completed: 'Completed',
      skipped: 'Skipped'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || 'bg-gray-200'}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Priority badge styling
  const getPriorityBadge = (priority: number) => {
    let color = 'bg-gray-200 text-gray-700';
    if (priority >= 80) color = 'bg-red-200 text-red-700';
    else if (priority >= 60) color = 'bg-orange-200 text-orange-700';
    else if (priority >= 40) color = 'bg-yellow-200 text-yellow-700';

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
        {priority}
      </span>
    );
  };

  if (progressLoading || subscriptionsLoading) {
    return <div className="p-8 text-center">Loading migration dashboard...</div>;
  }

  const completionPercentage = progress ? Math.round(progress.completionRate * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Email Migration Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={handleInitialize}
            disabled={initMigration.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {initMigration.isPending ? 'Initializing...' : 'Initialize'}
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Preview Template
          </button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Total Subscriptions"
          value={progress?.total || 0}
          icon={<span className="text-2xl">📋</span>}
        />
        <MetricCard
          title="Completion Rate"
          value={`${completionPercentage}%`}
          icon={<span className="text-2xl">✅</span>}
        />
        <MetricCard
          title="Emails Sent Today"
          value={`${progress?.emailStats.sentToday || 0}/${progress?.emailStats.dailyLimit || 100}`}
          icon={<span className="text-2xl">📧</span>}
        />
        <MetricCard
          title="Remaining Today"
          value={progress?.emailStats.remainingToday || 0}
          icon={<span className="text-2xl">⏳</span>}
        />
      </div>

      {/* Status Breakdown */}
      <Card header={<h3 className="text-lg font-semibold">Migration Status Breakdown</h3>}>
        <div className="grid grid-cols-6 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{progress?.byStatus.not_started || 0}</div>
            <div className="text-sm text-gray-600">Not Started</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{progress?.byStatus.pending_contact || 0}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">{progress?.byStatus.contacted || 0}</div>
            <div className="text-sm text-gray-600">Contacted</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{progress?.byStatus.vendor_confirmed || 0}</div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-700">{progress?.byStatus.completed || 0}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-500">{progress?.byStatus.skipped || 0}</div>
            <div className="text-sm text-gray-600">Skipped</div>
          </div>
        </div>
      </Card>

      {/* Bulk Actions */}
      <div className="flex gap-2 items-center">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Dry Run Mode</span>
        </label>
        <button
          onClick={handleContactSelected}
          disabled={selectedIds.size === 0 || contactVendors.isPending}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {contactVendors.isPending
            ? 'Sending...'
            : `Contact Selected (${selectedIds.size})`}
        </button>
      </div>

      {/* Subscriptions Table */}
      <Card header={<h3 className="text-lg font-semibold p-4">Subscriptions</h3>} padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    checked={subscriptions.length > 0 && selectedIds.size === subscriptions.length}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="p-3 text-left font-medium">Vendor</th>
                <th className="p-3 text-left font-medium">Priority</th>
                <th className="p-3 text-left font-medium">Amount</th>
                <th className="p-3 text-left font-medium">Current Email</th>
                <th className="p-3 text-left font-medium">Vendor Email</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(sub.id)}
                      onChange={() => toggleSelection(sub.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3 font-medium">{sub.vendor}</td>
                  <td className="p-3">{getPriorityBadge(sub.migration_priority)}</td>
                  <td className="p-3">
                    {sub.amount ? `$${sub.amount}/${sub.frequency}` : '-'}
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {sub.account_email || 'unknown'}
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {sub.vendor_contact_email || (
                      <span className="text-red-500">Not found</span>
                    )}
                  </td>
                  <td className="p-3">{getStatusBadge(sub.migration_status)}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {sub.migration_status === 'contacted' && (
                        <button
                          onClick={() => handleConfirm(sub.id)}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Confirm
                        </button>
                      )}
                      {sub.migration_status === 'vendor_confirmed' && (
                        <button
                          onClick={() => handleComplete(sub.id)}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Complete
                        </button>
                      )}
                      {!['completed', 'skipped'].includes(sub.migration_status) && (
                        <button
                          onClick={() => handleSkip(sub.id)}
                          className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          Skip
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Email Template Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Email Template Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Subject:</div>
                <div className="p-3 bg-gray-50 rounded">
                  Update Billing Email for [Vendor] - A Curious Tractor
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Body:</div>
                <div className="p-3 bg-gray-50 rounded whitespace-pre-wrap font-mono text-sm">
{`Hi [Vendor] Team,

I'm writing to update our billing email address for our subscription.

Current Email: [oldEmail]
New Email: accounts@act.place

Could you please update your records to send all invoices and billing
notifications to the new email address?

Thank you!

Best regards,
Nicholas Morgan
A Curious Tractor
accounts@act.place`}
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <strong>Variables:</strong> {'{{vendor}}, {{oldEmail}}, {{newEmail}}, {{amount}}, {{frequency}}'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MigrationDashboard;
