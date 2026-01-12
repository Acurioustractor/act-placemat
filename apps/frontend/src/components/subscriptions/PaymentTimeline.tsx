import React from 'react';
import { Card } from '../ui/Card';
import { usePaymentCalendar } from '../../hooks/useSubscriptions';
import type { PaymentCalendarItem } from '../../services/subscriptionApi';

interface PaymentTimelineProps {
  tenantId: string;
}

interface WeekGroup {
  weekStartDate: Date;
  weekEndDate: Date;
  payments: PaymentCalendarItem[];
  totalCost: number;
}

/**
 * Payment Timeline Component
 *
 * Displays upcoming subscription payments grouped by week
 * Color-coded by urgency: red=overdue, orange=due today, yellow=due soon, gray=upcoming
 */
export const PaymentTimeline: React.FC<PaymentTimelineProps> = ({ tenantId }) => {
  const { data, isLoading, error } = usePaymentCalendar(tenantId);

  // Group payments by week
  const groupByWeek = (payments: PaymentCalendarItem[]): WeekGroup[] => {
    if (!payments || payments.length === 0) return [];

    const weeks = new Map<string, WeekGroup>();

    payments.forEach((payment) => {
      const paymentDate = new Date(payment.next_payment_date);

      // Get Monday of this week
      const monday = new Date(paymentDate);
      monday.setDate(paymentDate.getDate() - paymentDate.getDay() + 1);
      monday.setHours(0, 0, 0, 0);

      // Get Sunday of this week
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const weekKey = monday.toISOString().split('T')[0];

      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, {
          weekStartDate: monday,
          weekEndDate: sunday,
          payments: [],
          totalCost: 0,
        });
      }

      const week = weeks.get(weekKey)!;
      week.payments.push(payment);
      week.totalCost += payment.amount || 0;
    });

    return Array.from(weeks.values()).sort(
      (a, b) => a.weekStartDate.getTime() - b.weekStartDate.getTime()
    );
  };

  const formatWeek = (startDate: Date, endDate: Date): string => {
    const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case 'overdue':
        return 'bg-red-50 border border-red-200 text-red-900';
      case 'due_today':
        return 'bg-orange-50 border border-orange-200 text-orange-900';
      case 'due_soon':
        return 'bg-yellow-50 border border-yellow-200 text-yellow-900';
      default:
        return 'bg-gray-50 border border-gray-200 text-gray-900';
    }
  };

  const getUrgencyBadge = (urgency: string, daysUntilDue: number) => {
    switch (urgency) {
      case 'overdue':
        return <span className="text-xs font-semibold text-red-600">OVERDUE</span>;
      case 'due_today':
        return <span className="text-xs font-semibold text-orange-600">DUE TODAY</span>;
      case 'due_soon':
        return <span className="text-xs font-semibold text-yellow-600">DUE IN {daysUntilDue} DAYS</span>;
      default:
        return <span className="text-xs text-gray-500">{daysUntilDue} days</span>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-block animate-spin text-4xl">⟳</div>
          <p className="text-gray-600 mt-2">Loading payment timeline...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">❌ Failed to load payment timeline</p>
        </div>
      </Card>
    );
  }

  const weekGroups = groupByWeek(data?.all || []);

  if (weekGroups.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <p className="text-gray-600 text-lg">No upcoming payments</p>
          <p className="text-gray-500 text-sm mt-2">
            Payment predictions will appear here once subscription patterns are detected
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-sm text-gray-600 mb-1">Overdue</div>
          <div className="text-3xl font-bold text-red-600">{data?.counts.overdue || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Needs immediate attention</div>
        </Card>

        <Card>
          <div className="text-sm text-gray-600 mb-1">Due Today</div>
          <div className="text-3xl font-bold text-orange-600">{data?.counts.due_today || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Payment due today</div>
        </Card>

        <Card>
          <div className="text-sm text-gray-600 mb-1">Due Soon</div>
          <div className="text-3xl font-bold text-yellow-600">{data?.counts.due_soon || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Next 7 days</div>
        </Card>

        <Card>
          <div className="text-sm text-gray-600 mb-1">Upcoming</div>
          <div className="text-3xl font-bold text-gray-600">{data?.counts.upcoming || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Beyond 7 days</div>
        </Card>
      </div>

      {/* Weekly Timeline */}
      <div className="space-y-4">
        {weekGroups.map((week, index) => (
          <Card key={week.weekStartDate.toISOString()}>
            {/* Week Header */}
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {formatWeek(week.weekStartDate, week.weekEndDate)}
              </h3>
              <div className="text-right">
                <div className="text-sm text-gray-600">Week Total</div>
                <div className="text-xl font-bold text-gray-900">
                  ${week.totalCost.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Payment Items */}
            <div className="space-y-2">
              {week.payments.map((payment) => (
                <div
                  key={payment.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all hover:shadow-md ${getUrgencyStyles(
                    payment.urgency
                  )}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-lg">{payment.vendor}</div>
                      {getUrgencyBadge(payment.urgency, payment.days_until_due)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{payment.account_email}</div>
                    {payment.subscription_frequency && (
                      <div className="text-xs text-gray-500 mt-1 capitalize">
                        {payment.subscription_frequency} subscription
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      ${payment.amount?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {formatDate(payment.next_payment_date)}
                    </div>
                    {payment.payment_pattern_confidence > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {(payment.payment_pattern_confidence * 100).toFixed(0)}% confidence
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
