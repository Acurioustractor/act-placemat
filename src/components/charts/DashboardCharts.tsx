import { useMemo } from 'react';
import Card from '../ui/Card';
import PieChart from './PieChart';
import BarChart from './BarChart';
import LineChart from './LineChart';
import { ChartDataPoint, TimeSeriesDataPoint, Project, Opportunity, Organization } from '../../types';

interface DashboardChartsProps {
  projects: Project[];
  opportunities: Opportunity[];
  organizations: Organization[];
}

const DashboardCharts = ({ projects, opportunities, organizations }: DashboardChartsProps) => {
  // Theme colors mapping
  const themeColors: Record<string, string> = {
    'Economic Freedom': '#10b981',
    'Storytelling': '#3b82f6',
    'Operations': '#64748b',
    'Youth Justice': '#8b5cf6',
    'Health and wellbeing': '#06b6d4',
    'Indigenous': '#f59e0b',
    'Global community': '#ef4444'
  };

  const statusColors: Record<string, string> = {
    'Active 🔥': '#10b981',
    'Active': '#10b981',
    'Transferred ✅': '#06b6d4',
    'Sunsetting 🌅': '#f59e0b',
    'Ideation 🌀': '#ef4444'
  };

  const stageColors: Record<string, string> = {
    'Discovery': '#6b7280',
    'Applied': '#3b82f6',
    'Negotiation': '#f59e0b',
    'Closed Won': '#10b981',
    'Closed Lost': '#ef4444'
  };

  // Process data for visualizations
  const chartData = useMemo(() => {
    // Projects by Theme
    const projectsByTheme = projects.reduce((acc: Record<string, number>, project) => {
      const themes = Array.isArray(project.themes) ? project.themes : 
                    project.theme ? [project.theme] : ['Uncategorized'];
      
      themes.forEach((theme: string) => {
        acc[theme] = (acc[theme] || 0) + 1;
      });
      return acc;
    }, {});

    // Projects by Status
    const projectsByStatus = projects.reduce((acc: Record<string, number>, project) => {
      const status = project.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Revenue by Theme
    const revenueByTheme = projects.reduce((acc: Record<string, number>, project) => {
      const themes = Array.isArray(project.themes) ? project.themes : 
                    project.theme ? [project.theme] : ['Uncategorized'];
      const revenue = project.revenueActual || 0;
      
      themes.forEach((theme: string) => {
        acc[theme] = (acc[theme] || 0) + revenue;
      });
      return acc;
    }, {});

    // Opportunities Pipeline
    const opportunitiesByStage = opportunities.reduce((acc, opp) => {
      const stage = opp.stage || 'Unknown';
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {});

    // Revenue trend (mock data for demo - in real app, would be historical)
    const revenueTrend = [
      { month: 'Jan', revenue: 45000, projects: 8 },
      { month: 'Feb', revenue: 52000, projects: 10 },
      { month: 'Mar', revenue: 48000, projects: 9 },
      { month: 'Apr', revenue: 61000, projects: 12 },
      { month: 'May', revenue: 58000, projects: 11 },
      { month: 'Jun', revenue: 67000, projects: 14 },
    ];

    // Partnership status
    const partnershipStatus = organizations.reduce((acc, org) => {
      const status = org.relationshipStatus || org.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      projectsByTheme: Object.entries(projectsByTheme).map(([label, value]) => ({ 
        label, 
        value: value as number,
        color: themeColors[label] || '#6b7280'
      })) as ChartDataPoint[],
      projectsByStatus: Object.entries(projectsByStatus).map(([label, value]) => ({ 
        label, 
        value: value as number,
        color: statusColors[label] || '#6b7280'
      })) as ChartDataPoint[],
      revenueByTheme: Object.entries(revenueByTheme).map(([label, value]) => ({ 
        label, 
        value: value as number,
        color: themeColors[label] || '#6b7280'
      })) as ChartDataPoint[],
      opportunitiesByStage: Object.entries(opportunitiesByStage).map(([label, value]) => ({ 
        label, 
        value: value as number,
        color: stageColors[label] || '#6b7280'
      })) as ChartDataPoint[],
      revenueTrend: revenueTrend.map(item => ({
        date: new Date(`2024-${item.month}-01`),
        value: item.revenue,
        category: 'revenue'
      })) as TimeSeriesDataPoint[],
      partnershipStatus: Object.entries(partnershipStatus).map(([label, value]) => ({ 
        label, 
        value: value as number,
        color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][Object.keys(partnershipStatus).indexOf(label)] || '#6b7280'
      })) as ChartDataPoint[]
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, opportunities, organizations]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
      {/* Projects by Theme */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Projects by Theme</h3>
        <div className="h-64">
          <PieChart
            data={chartData.projectsByTheme}
            showLegend
          />
        </div>
      </Card>

      {/* Project Status Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Status</h3>
        <div className="h-64">
          <BarChart
            data={chartData.projectsByStatus}
            showValues
          />
        </div>
      </Card>

      {/* Revenue Trend */}
      <Card className="p-6 lg:col-span-2 xl:col-span-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
        <div className="h-64">
          <LineChart
            data={chartData.revenueTrend}
            showDots
            smooth
          />
        </div>
      </Card>

      {/* Opportunities Pipeline */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Opportunities Pipeline</h3>
        <div className="h-64">
          <BarChart
            data={chartData.opportunitiesByStage}
            horizontal
            showValues
          />
        </div>
      </Card>

      {/* Revenue by Theme */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Theme</h3>
        <div className="h-64">
          <BarChart
            data={chartData.revenueByTheme}
            showValues
          />
        </div>
      </Card>

      {/* Partnership Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Partnership Status</h3>
        <div className="h-64">
          <PieChart
            data={chartData.partnershipStatus}
            showLegend
          />
        </div>
      </Card>
    </div>
  );
};

export default DashboardCharts;