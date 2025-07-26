import { useMemo } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TimeSeriesDataPoint } from '../../types';
import { CHART_COLORS } from '../../constants';

interface LineChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  showDots?: boolean;
  smooth?: boolean;
  height?: number;
  className?: string;
}

/**
 * LineChart component for displaying line charts
 */
const LineChart = ({
  data,
  title,
  showDots = true,
  smooth = true,
  height = 300,
  className = '',
}: LineChartProps) => {
  // Format data for Recharts and group by category
  const { chartData, categories } = useMemo(() => {
    // Group data by date
    const dateGroups = data.reduce((acc, item) => {
      const dateStr = item.date.toISOString().split('T')[0];
      if (!acc[dateStr]) {
        acc[dateStr] = {
          date: dateStr,
          formattedDate: new Date(item.date).toLocaleDateString(),
        };
      }
      
      const category = item.category || 'value';
      acc[dateStr][category] = item.value;
      
      return acc;
    }, {} as Record<string, any>);
    
    // Extract unique categories
    const uniqueCategories = Array.from(
      new Set(data.map((item) => item.category || 'value'))
    );
    
    // Convert to array
    const formattedData = Object.values(dateGroups);
    
    return {
      chartData: formattedData,
      categories: uniqueCategories,
    };
  }, [data]);

  return (
    <div className={className}>
      {title && <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="formattedDate" />
            <YAxis />
            <Tooltip />
            <Legend />
            {categories.map((category, index) => (
              <Line
                key={category}
                type={smooth ? 'monotone' : 'linear'}
                dataKey={category}
                name={category}
                stroke={CHART_COLORS.rainbow[index % CHART_COLORS.rainbow.length]}
                activeDot={{ r: 8 }}
                dot={showDots}
                isAnimationActive={true}
                animationDuration={500}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LineChart;