import { ResponsiveLine } from '@nivo/line';
import { COMMUNITY_COLORS } from '../../constants/designSystem';
import { Project, Opportunity } from '../../types';

interface TimeSeriesAnalyticsProps {
  projects: Project[];
  opportunities: Opportunity[];
  className?: string;
  height?: number;
}

interface TimeSeriesDataPoint {
  x: string;
  y: number;
}

interface TimeSeriesData {
  id: string;
  color: string;
  data: TimeSeriesDataPoint[];
}

/**
 * Time Series Analytics
 * Shows trends over time for projects creation, opportunity flow, and revenue
 * Provides insights into growth patterns and seasonal variations
 */
const TimeSeriesAnalytics = ({ 
  projects, 
  opportunities, 
  className = '', 
  height = 400 
}: TimeSeriesAnalyticsProps) => {
  
  // Generate monthly data points for the last 12 months
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    return date.toISOString().slice(0, 7); // YYYY-MM format
  });

  // Calculate projects created per month
  const projectsData: TimeSeriesDataPoint[] = last12Months.map(month => {
    const projectsInMonth = projects.filter(p => {
      if (!p.startDate) return false;
      const dateStr = p.startDate instanceof Date
        ? p.startDate.toISOString().slice(0, 7)
        : String(p.startDate).slice(0, 7);
      return dateStr === month;
    }).length;

    return {
      x: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      y: projectsInMonth
    };
  });

  // Calculate opportunities created per month
  const opportunitiesData: TimeSeriesDataPoint[] = last12Months.map(month => {
    const oppsInMonth = opportunities.filter(o => {
      if (!o.createdDate) return false;
      const dateStr = o.createdDate instanceof Date
        ? o.createdDate.toISOString().slice(0, 7)
        : String(o.createdDate).slice(0, 7);
      return dateStr === month;
    }).length;

    return {
      x: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      y: oppsInMonth
    };
  });

  // Calculate monthly revenue (cumulative)
  const revenueData: TimeSeriesDataPoint[] = last12Months.map((month, index) => {
    const monthsToInclude = last12Months.slice(0, index + 1);
    const cumulativeRevenue = projects
      .filter(p => {
        if (!p.startDate) return false;
        const dateStr = p.startDate instanceof Date
          ? p.startDate.toISOString().slice(0, 7)
          : String(p.startDate).slice(0, 7);
        return monthsToInclude.includes(dateStr);
      })
      .reduce((sum, p) => sum + (p.revenueActual || 0), 0) / 1000; // Convert to K

    return {
      x: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      y: Math.round(cumulativeRevenue)
    };
  });

  const timeSeriesData: TimeSeriesData[] = [
    {
      id: 'Projects Created',
      color: COMMUNITY_COLORS.primary[600],
      data: projectsData
    },
    {
      id: 'Opportunities',
      color: COMMUNITY_COLORS.secondary[600],
      data: opportunitiesData
    },
    {
      id: 'Cumulative Revenue ($K)',
      color: COMMUNITY_COLORS.success[600],
      data: revenueData
    }
  ];

  // Calculate growth metrics
  const projectGrowth = projectsData.length > 1 ? 
    ((projectsData[projectsData.length - 1].y - projectsData[0].y) / Math.max(projectsData[0].y, 1)) * 100 : 0;
  
  const opportunityGrowth = opportunitiesData.length > 1 ? 
    ((opportunitiesData[opportunitiesData.length - 1].y - opportunitiesData[0].y) / Math.max(opportunitiesData[0].y, 1)) * 100 : 0;

  const revenueGrowth = revenueData.length > 1 ? 
    ((revenueData[revenueData.length - 1].y - revenueData[0].y) / Math.max(revenueData[0].y, 1)) * 100 : 0;

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Growth Trends & Momentum
        </h3>
        <p className="text-sm text-gray-600">
          12-month trajectory showing project creation, opportunity flow, and cumulative revenue growth
        </p>
      </div>

      {/* Growth Indicators */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-teal-700">
                {projectGrowth > 0 ? '+' : ''}{projectGrowth.toFixed(1)}%
              </div>
              <div className="text-sm text-teal-600">Project Growth</div>
            </div>
            <div className={`p-2 rounded-full ${projectGrowth >= 0 ? 'bg-teal-600' : 'bg-red-500'}`}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d={projectGrowth >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-amber-700">
                {opportunityGrowth > 0 ? '+' : ''}{opportunityGrowth.toFixed(1)}%
              </div>
              <div className="text-sm text-amber-600">Opportunity Growth</div>
            </div>
            <div className={`p-2 rounded-full ${opportunityGrowth >= 0 ? 'bg-amber-600' : 'bg-red-500'}`}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d={opportunityGrowth >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-green-700">
                {revenueGrowth > 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
              </div>
              <div className="text-sm text-green-600">Revenue Growth</div>
            </div>
            <div className={`p-2 rounded-full ${revenueGrowth >= 0 ? 'bg-green-600' : 'bg-red-500'}`}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d={revenueGrowth >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Time Series Chart */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4" style={{ height }}>
        <ResponsiveLine
          data={timeSeriesData}
          margin={{ top: 20, right: 120, bottom: 60, left: 60 }}
          xScale={{ type: 'point' }}
          yScale={{
            type: 'linear',
            min: 'auto',
            max: 'auto',
            stacked: false,
            reverse: false
          }}
          curve="cardinal"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: 'Month',
            legendOffset: 45,
            legendPosition: 'middle'
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Count / Value',
            legendOffset: -45,
            legendPosition: 'middle'
          }}
          pointSize={8}
          pointColor={{ theme: 'background' }}
          pointBorderWidth={2}
          pointBorderColor={{ from: 'serieColor' }}
          pointLabelYOffset={-12}
          enableArea={false}
          useMesh={true}
          legends={[
            {
              anchor: 'bottom-right',
              direction: 'column',
              justify: false,
              translateX: 100,
              translateY: 0,
              itemsSpacing: 0,
              itemDirection: 'left-to-right',
              itemWidth: 80,
              itemHeight: 20,
              itemOpacity: 0.75,
              symbolSize: 12,
              symbolShape: 'circle',
              symbolBorderColor: 'rgba(0, 0, 0, .5)',
              effects: [
                {
                  on: 'hover',
                  style: {
                    itemBackground: 'rgba(0, 0, 0, .03)',
                    itemOpacity: 1
                  }
                }
              ]
            }
          ]}
          theme={{
            background: 'transparent',
            axis: {
              domain: {
                line: {
                  stroke: COMMUNITY_COLORS.neutral[300],
                  strokeWidth: 1
                }
              },
              legend: {
                text: {
                  fontSize: 14,
                  fill: COMMUNITY_COLORS.neutral[700],
                  fontWeight: 500
                }
              },
              ticks: {
                line: {
                  stroke: COMMUNITY_COLORS.neutral[300],
                  strokeWidth: 1
                },
                text: {
                  fontSize: 11,
                  fill: COMMUNITY_COLORS.neutral[600]
                }
              }
            },
            grid: {
              line: {
                stroke: COMMUNITY_COLORS.neutral[200],
                strokeWidth: 1
              }
            },
            tooltip: {
              container: {
                background: COMMUNITY_COLORS.neutral[900],
                color: COMMUNITY_COLORS.neutral[50],
                fontSize: '12px',
                borderRadius: '6px',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
              }
            }
          }}
        />
      </div>

      {/* Key Insights */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3">Trend Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-800">Activity Level:</span>
            <span className="ml-2 text-blue-700">
              {projectsData.reduce((sum, d) => sum + d.y, 0)} projects launched, {opportunitiesData.reduce((sum, d) => sum + d.y, 0)} opportunities identified
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Momentum:</span>
            <span className="ml-2 text-blue-700">
              {Math.abs(projectGrowth) > 10 ? 'Strong' : Math.abs(projectGrowth) > 5 ? 'Moderate' : 'Steady'} growth trajectory across metrics
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeSeriesAnalytics;