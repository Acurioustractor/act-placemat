import { useMemo } from 'react';
import { ChartDataPoint } from '../../types';
import { CHART_COLORS } from '../../constants';

interface FunnelChartProps {
  data: ChartDataPoint[];
  title?: string;
  showValues?: boolean;
  height?: number;
  className?: string;
}

/**
 * FunnelChart component for displaying funnel charts
 */
const FunnelChart = ({
  data,
  title,
  showValues = true,
  height = 300,
  className = '',
}: FunnelChartProps) => {
  // Sort data by value in descending order
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.value - a.value);
  }, [data]);

  // Calculate max value for scaling
  const maxValue = useMemo(() => {
    return Math.max(...sortedData.map((item) => item.value));
  }, [sortedData]);

  return (
    <div className={className}>
      {title && <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>}
      <div style={{ width: '100%', height }}>
        <div className="flex flex-col items-center space-y-2" style={{ height: '100%' }}>
          {sortedData.map((item, index) => {
            const widthPercent = (item.value / maxValue) * 100;
            const color = item.color || CHART_COLORS.rainbow[index % CHART_COLORS.rainbow.length];
            
            return (
              <div key={item.label} className="w-full flex flex-col items-center">
                <div className="flex justify-between w-full px-2">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  {showValues && (
                    <span className="text-sm text-gray-500">{item.value.toLocaleString()}</span>
                  )}
                </div>
                <div
                  className="rounded-md h-12 flex items-center justify-center text-white font-medium transition-all duration-500"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: color,
                    minWidth: '40px',
                  }}
                >
                  {showValues && widthPercent > 20 && (
                    <span>{item.value.toLocaleString()}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FunnelChart;