import { useMemo } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ChartDataPoint } from '../../types';
import { CHART_COLORS } from '../../constants';

interface BarChartProps {
  data: ChartDataPoint[];
  title?: string;
  horizontal?: boolean;
  showValues?: boolean;
  height?: number;
  className?: string;
}

/**
 * BarChart component for displaying bar charts
 */
const BarChart = ({
  data,
  title,
  horizontal = false,
  showValues = true,
  height = 300,
  className = '',
}: BarChartProps) => {
  // Format data for Recharts
  const chartData = useMemo(() => {
    return data.map((item) => ({
      name: item.label,
      value: item.value,
      color: item.color || CHART_COLORS.rainbow[0],
      ...item.metadata,
    }));
  }, [data]);

  return (
    <div className={className}>
      {title && <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={chartData}
            layout={horizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            {horizontal ? (
              <>
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" />
                <YAxis />
              </>
            )}
            <Tooltip />
            <Legend />
            <Bar
              dataKey="value"
              name={title || 'Value'}
              isAnimationActive={true}
              animationDuration={500}
              label={showValues ? { position: 'top' } : false}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || CHART_COLORS.rainbow[index % CHART_COLORS.rainbow.length]}
                />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BarChart;