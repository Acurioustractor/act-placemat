import React, { useState } from 'react';
import type { Subscription } from '../../types/subscription';
import { SubscriptionEditor } from './SubscriptionEditor';

interface SubscriptionRowProps {
  subscription: Subscription;
  onUpdate?: (id: string, updates: Partial<Subscription>) => Promise<void>;
}

export const SubscriptionRow: React.FC<SubscriptionRowProps> = ({
  subscription,
  onUpdate
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async (updates: Partial<Subscription>) => {
    if (onUpdate) {
      await onUpdate(subscription.id, updates);
      setIsEditing(false);
      setShowDetails(false);
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'saas': return '💻';
      case 'infrastructure': return '🏗️';
      case 'design': return '🎨';
      case 'marketing': return '📢';
      case 'communication': return '💬';
      case 'productivity': return '⚡';
      case 'development': return '👨‍💻';
      case 'business': return '📊';
      case 'entertainment': return '🎬';
      case 'other': return '📦';
      default: return '';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">✅ Active</span>;
      case 'canceled':
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">❌ Canceled</span>;
      case 'paused':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">⏸️ Paused</span>;
      case 'pending_review':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">🔍 Review</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          High ({(confidence * 100).toFixed(0)}%)
        </span>
      );
    }
    if (confidence >= 0.6) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Medium ({(confidence * 100).toFixed(0)}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Low ({(confidence * 100).toFixed(0)}%)
      </span>
    );
  };

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        {/* Vendor */}
        <td className="p-4">
          <div className="flex items-center gap-2">
            {subscription.category && (
              <span className="text-xl">{getCategoryIcon(subscription.category)}</span>
            )}
            <div>
              <div className="font-medium text-gray-900">{subscription.vendor}</div>
              {subscription.category && (
                <div className="text-xs text-gray-500 mt-0.5 capitalize">
                  {subscription.category}
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Amount */}
        <td className="p-4">
          {subscription.amount ? (
            <div className="font-medium text-gray-900">
              ${subscription.amount.toFixed(2)}
            </div>
          ) : (
            <span className="text-gray-400 text-sm">Unknown</span>
          )}
        </td>

        {/* Frequency */}
        <td className="p-4">
          <span className="capitalize text-gray-700">
            {subscription.subscription_frequency || subscription.frequency || 'Unknown'}
          </span>
        </td>

        {/* Confidence */}
        <td className="p-4">
          {getConfidenceBadge(subscription.confidence)}
        </td>

        {/* Sources */}
        <td className="p-4">
          <div className="flex flex-wrap gap-1">
            {subscription.sources?.hasGmail && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                📧 Gmail
              </span>
            )}
            {subscription.sources?.hasXero && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                💰 Xero
              </span>
            )}
          </div>
        </td>

        {/* Status */}
        <td className="p-4">
          {getStatusBadge(subscription.status || 'pending_review')}
        </td>

        {/* Actions */}
        <td className="p-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded font-medium"
            >
              ✏️ Edit
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded font-medium"
            >
              {showDetails ? '▲' : '▼'}
            </button>
          </div>
        </td>
      </tr>

      {/* Tags Row (if any) */}
      {subscription.tags && subscription.tags.length > 0 && !isEditing && (
        <tr className="border-b border-gray-100 bg-gray-50">
          <td colSpan={7} className="px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Tags:</span>
              <div className="flex flex-wrap gap-1">
                {subscription.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                  >
                    🏷️ {tag}
                  </span>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Editor Row */}
      {isEditing && (
        <tr className="bg-white">
          <td colSpan={7} className="p-4">
            <SubscriptionEditor
              subscription={subscription}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
            />
          </td>
        </tr>
      )}

      {/* Details Row */}
      {showDetails && !isEditing && (
        <tr className="bg-gray-50 border-b border-gray-200">
          <td colSpan={7} className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Subscription Details</h4>
                <dl className="space-y-2">
                  {subscription.account_email && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Account Email</dt>
                      <dd className="text-sm text-gray-900">{subscription.account_email}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-600">First Detected</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(subscription.first_detected).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Last Scanned</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(subscription.last_scanned).toLocaleDateString()}
                    </dd>
                  </div>
                  {subscription.next_payment_date && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Next Payment</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(subscription.next_payment_date).toLocaleDateString()}
                        {subscription.payment_pattern_confidence && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({(subscription.payment_pattern_confidence * 100).toFixed(0)}% confidence)
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                  {subscription.notes && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Notes</dt>
                      <dd className="text-sm text-gray-900">{subscription.notes}</dd>
                    </div>
                  )}
                  {subscription.cancel_reason && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Cancel Reason</dt>
                      <dd className="text-sm text-gray-900">{subscription.cancel_reason}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Confidence Signals</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">📧 Gmail Signal</span>
                      <span className="font-medium">
                        {(subscription.signals.gmail * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${subscription.signals.gmail * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">💰 Xero Signal</span>
                      <span className="font-medium">
                        {(subscription.signals.xero * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${subscription.signals.xero * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">🤖 AI Signal</span>
                      <span className="font-medium">
                        {(subscription.signals.ai * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${subscription.signals.ai * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gmail Emails */}
            {subscription.metadata?.gmail_emails && subscription.metadata.gmail_emails.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Related Gmail Emails</h4>
                <div className="space-y-2">
                  {subscription.metadata.gmail_emails.slice(0, 5).map((email, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                      <div className="text-sm font-medium text-gray-900">{email.subject}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        From: {email.sender} | {new Date(email.date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {subscription.metadata.gmail_emails.length > 5 && (
                    <div className="text-sm text-gray-500 text-center">
                      ...and {subscription.metadata.gmail_emails.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
};
