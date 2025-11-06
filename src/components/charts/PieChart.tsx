import { useMemo } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartDataPoint } from '../../types';
import { CHART_COLORS } from '../../constants';

interface PieChartProps {
  data: ChartDataPoint[];
  title?: string;
  donut?: boolean;
  showLegend?: boolean;
  height?: number;
  className?: string;
}

/**
 * PieChart component for displaying pie charts
 */
const PieChart = ({
  data,
  title,
  donut = false,
  showLegend = true,
  height = 300,
  className = '',
}: PieChartProps) => {
  // Format data for Recharts
  const chartData = useMemo(() => {
    return data.map((item) => ({
      name: item.label,
      value: item.value,
      color: item.color || CHART_COLORS.rainbow[0],
      ...item.metadata,
    }));
  }, [data]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-sm rounded-md">
          <p className="font-medium">{data.name}</p>
          <p className="text-gray-700">
            {data.value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={className}>
      {title && <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              innerRadius={donut ? 40 : 0}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }: { name: string; percent?: number }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
              isAnimationActive={true}
              animationDuration={500}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || CHART_COLORS.rainbow[index % CHART_COLORS.rainbow.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PieChart;