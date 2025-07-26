import { useMemo } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

interface MetricsCardsProps {
  projects: any[];
  opportunities: any[];
  organizations: any[];
}

const MetricsCards = ({ projects, opportunities, organizations }: MetricsCardsProps) => {
  const metrics = useMemo(() => {
    // Calculate key metrics from actual data
    const totalRevenue = projects.reduce((sum, p) => sum + (p.revenueActual || 0), 0);
    const potentialRevenue = projects.reduce((sum, p) => sum + (p.revenuePotential || 0), 0);
    const activeProjects = projects.filter(p => p.status?.includes('Active')).length;
    
    const opportunityValue = opportunities.reduce((sum, o) => sum + (o.amount || 0), 0);
    const weightedValue = opportunities.reduce((sum, o) => sum + (o.weightedValue || 0), 0);
    const appliedOpportunities = opportunities.filter(o => o.stage === 'Applied').length;
    
    const partnerOrgs = organizations.filter(o => o.relationshipStatus === 'Won').length;
    
    return {
      revenue: {
        actual: totalRevenue,
        potential: potentialRevenue,
        growth: totalRevenue > 0 ? ((potentialRevenue - totalRevenue) / totalRevenue * 100) : 0
      },
      projects: {
        total: projects.length,
        active: activeProjects,
        completion: activeProjects > 0 ? (activeProjects / projects.length * 100) : 0
      },
      opportunities: {
        total: opportunities.length,
        value: opportunityValue,
        weighted: weightedValue,
        applied: appliedOpportunities,
        conversionRate: opportunities.length > 0 ? (appliedOpportunities / opportunities.length * 100) : 0
      },
      partnerships: {
        total: organizations.length,
        active: partnerOrgs,
        rate: organizations.length > 0 ? (partnerOrgs / organizations.length * 100) : 0
      }
    };
  }, [projects, opportunities, organizations]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Revenue Card */}
      <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <Badge variant={metrics.revenue.growth > 0 ? 'success' : 'default'}>
            {metrics.revenue.growth > 0 ? '+' : ''}{formatPercentage(metrics.revenue.growth)}
          </Badge>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.revenue.actual)}</p>
          <p className="text-sm text-gray-600">Revenue Generated</p>
          <p className="text-xs text-gray-500">Potential: {formatCurrency(metrics.revenue.potential)}</p>
        </div>
      </Card>

      {/* Projects Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <Badge variant="primary">{metrics.projects.active} Active</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900">{metrics.projects.total}</p>
          <p className="text-sm text-gray-600">Total Projects</p>
          <p className="text-xs text-gray-500">{formatPercentage(metrics.projects.completion)} active rate</p>
        </div>
      </Card>

      {/* Opportunities Card */}
      <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-orange-100 rounded-lg">
            <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <Badge variant="warning">{formatPercentage(metrics.opportunities.conversionRate)}</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.opportunities.weighted)}</p>
          <p className="text-sm text-gray-600">Pipeline Value (Weighted)</p>
          <p className="text-xs text-gray-500">{metrics.opportunities.total} opportunities</p>
        </div>
      </Card>

      {/* Partnerships Card */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <Badge variant="default">{metrics.partnerships.active} Active</Badge>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900">{metrics.partnerships.total}</p>
          <p className="text-sm text-gray-600">Partner Organizations</p>
          <p className="text-xs text-gray-500">{formatPercentage(metrics.partnerships.rate)} partnership rate</p>
        </div>
      </Card>
    </div>
  );
};

export default MetricsCards;