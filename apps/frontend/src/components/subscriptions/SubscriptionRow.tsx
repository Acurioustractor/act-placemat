import React, { useState } from 'react';
import type { Subscription } from '../../types/subscription';

interface SubscriptionRowProps {
  subscription: Subscription;
  onUpdated?: () => void;
}

export const SubscriptionRow: React.FC<SubscriptionRowProps> = ({
  subscription,
  onUpdated
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Note: Update functionality disabled for now
  // The V1 API doesn't have update/delete endpoints yet
  const handleStatusChange = async (newStatus: string) => {
    console.log('Status update requested:', newStatus);
    alert('Update functionality coming soon! The V1 API discovery is complete but update endpoints are not yet implemented.');
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          High
        </span>
      );
    }
    if (confidence >= 0.6) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Low
      </span>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'canceled':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'pending_review':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="p-4">
          <div className="font-medium text-gray-900">{subscription.vendor}</div>
          {subscription.gmail_message_id && (
            <div className="text-xs text-gray-500 mt-1">
              ID: {subscription.id.slice(0, 8)}...
            </div>
          )}
        </td>

        <td className="p-4">
          {subscription.amount ? (
            <div className="font-medium text-gray-900">
              ${subscription.amount.toFixed(2)}
              <span className="text-xs text-gray-500 ml-1">{subscription.currency}</span>
            </div>
          ) : (
            <span className="text-gray-400 text-sm">Unknown</span>
          )}
        </td>

        <td className="p-4">
          <span className="capitalize text-gray-700">{subscription.frequency}</span>
        </td>

        <td className="p-4">
          <div className="flex items-center gap-2">
            {getConfidenceBadge(subscription.confidence)}
            <span className="text-sm text-gray-600">
              {(subscription.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Gmail: {(subscription.signals.gmail * 100).toFixed(0)}%
            {subscription.signals.xero > 0 && ` | Xero: ${(subscription.signals.xero * 100).toFixed(0)}%`}
          </div>
        </td>

        <td className="p-4">
          <div className="flex flex-wrap gap-1">
            {subscription.signals?.gmail > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                📧 Gmail
              </span>
            )}
            {subscription.signals?.xero > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                💰 Xero
              </span>
            )}
            {(!subscription.signals?.gmail && !subscription.signals?.xero) && (
              <span className="text-gray-400 text-sm">None</span>
            )}
          </div>
        </td>

        <td className="p-4">
          <span className={`px-3 py-1 border rounded-lg text-sm font-medium ${getStatusColor(subscription.status || 'pending_review')}`}>
            {subscription.status || 'pending_review'}
          </span>
        </td>

        <td className="p-4 text-right">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </td>
      </tr>

      {/* Details Row */}
      {showDetails && (
        <tr className="bg-gray-50 border-b border-gray-200">
          <td colSpan={7} className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Subscription Details</h4>
                <dl className="space-y-2">
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
                  {subscription.notes && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Notes</dt>
                      <dd className="text-sm text-gray-900">{subscription.notes}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Confidence Signals</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Gmail Signal</span>
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
                      <span className="text-gray-600">Xero Signal</span>
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
                      <span className="text-gray-600">AI Signal</span>
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
                  {subscription.metadata.gmail_emails.map((email, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                      <div className="text-sm font-medium text-gray-900">{email.subject}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        From: {email.sender} | {new Date(email.date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
};
