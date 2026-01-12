import React from 'react';
import { Card } from '../ui/Card';
import { useCostByAccount, useCostByVendor } from '../../hooks/useSubscriptions';

interface CostBreakdownChartsProps {
  tenantId: string;
}

/**
 * Cost Breakdown Charts Component
 *
 * Displays cost analysis visualizations:
 * - Cost by email account
 * - Top vendors by annual cost
 * - Subscription count distribution
 */
export const CostBreakdownCharts: React.FC<CostBreakdownChartsProps> = ({ tenantId }) => {
  const { data: accountData, isLoading: accountLoading, error: accountError } = useCostByAccount(tenantId);
  const { data: vendorData, isLoading: vendorLoading, error: vendorError } = useCostByVendor(tenantId, 15);

  const isLoading = accountLoading || vendorLoading;
  const error = accountError || vendorError;

  // Calculate max cost for bar chart scaling
  const maxVendorCost = vendorData?.vendors?.[0]?.cost || 1;

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-block animate-spin text-4xl">⟳</div>
          <p className="text-gray-600 mt-2">Loading cost breakdown...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">❌ Failed to load cost breakdown</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-sm text-gray-600 mb-1">Total Annual Cost</div>
          <div className="text-3xl font-bold text-gray-900">
            ${accountData?.totals?.totalAnnualCost?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Across all accounts</div>
        </Card>

        <Card>
          <div className="text-sm text-gray-600 mb-1">Total Subscriptions</div>
          <div className="text-3xl font-bold text-gray-900">
            {accountData?.totals?.totalSubscriptions || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">Active subscriptions</div>
        </Card>

        <Card>
          <div className="text-sm text-gray-600 mb-1">Average per Account</div>
          <div className="text-3xl font-bold text-gray-900">
            ${accountData?.avgCostPerAccount?.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Per year</div>
        </Card>
      </div>

      {/* Cost by Account */}
      <Card>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">💰 Cost by Email Account</h3>
        <div className="space-y-4">
          {accountData?.accounts && accountData.accounts.length > 0 ? (
            accountData.accounts.map((account) => {
              const percentage =
                accountData.totals.totalAnnualCost > 0
                  ? (account.annual_cost / accountData.totals.totalAnnualCost) * 100
                  : 0;

              return (
                <div key={account.account_email} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">{account.account_email}</div>
                      <div className="text-sm text-gray-500">
                        {account.subscription_count} {account.subscription_count === 1 ? 'subscription' : 'subscriptions'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">
                        ${account.annual_cost?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-sm text-gray-500">{percentage.toFixed(1)}% of total</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Cost Range */}
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Min: ${account.min_amount?.toFixed(2) || '0.00'}</span>
                    <span>Avg: ${account.avg_amount?.toFixed(2) || '0.00'}</span>
                    <span>Max: ${account.max_amount?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">No account data available</div>
          )}
        </div>
      </Card>

      {/* Top Vendors by Cost */}
      <Card>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">🏆 Top Vendors by Annual Cost</h3>
        <div className="space-y-3">
          {vendorData?.vendors && vendorData.vendors.length > 0 ? (
            vendorData.vendors.map((vendor, index) => {
              const percentage = maxVendorCost > 0 ? (vendor.cost / maxVendorCost) * 100 : 0;

              return (
                <div key={vendor.name} className="flex items-center gap-4">
                  {/* Rank Badge */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : index === 1
                        ? 'bg-gray-200 text-gray-700'
                        : index === 2
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* Vendor Info & Bar */}
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-medium text-gray-900">{vendor.name}</span>
                      <span className="font-bold text-gray-900">${vendor.cost.toFixed(2)}</span>
                    </div>

                    {/* Bar Chart */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          index === 0
                            ? 'bg-blue-600'
                            : index === 1
                            ? 'bg-blue-500'
                            : index === 2
                            ? 'bg-blue-400'
                            : 'bg-blue-300'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      {vendor.subscriptionCount} {vendor.subscriptionCount === 1 ? 'subscription' : 'subscriptions'}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">No vendor data available</div>
          )}
        </div>

        {/* Top Vendor Callout */}
        {vendorData?.topVendor && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800 mb-1">🥇 Highest Cost Vendor</div>
            <div className="text-xl font-bold text-blue-900">{vendorData.topVendor.name}</div>
            <div className="text-sm text-blue-700 mt-1">
              ${vendorData.topVendor.cost.toFixed(2)}/year •{' '}
              {((vendorData.topVendor.cost / vendorData.totalCost) * 100).toFixed(1)}% of total cost
            </div>
          </div>
        )}
      </Card>

      {/* Monthly Cost Estimate */}
      <Card>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 Monthly Cost Estimate</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {accountData?.accounts?.map((account) => (
            <div key={account.account_email} className="text-center">
              <div className="text-sm text-gray-600 mb-1 truncate" title={account.account_email}>
                {account.account_email.split('@')[0]}@
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ${(account.annual_cost / 12).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">per month</div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <div className="text-sm text-gray-600 mb-1">Total Monthly Average</div>
          <div className="text-3xl font-bold text-gray-900">
            ${((accountData?.totals?.totalAnnualCost || 0) / 12).toFixed(2)}
          </div>
        </div>
      </Card>
    </div>
  );
};
