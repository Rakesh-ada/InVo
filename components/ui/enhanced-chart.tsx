import React, { useMemo, useState } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { ThemedText } from '../themed-text';

const { width: screenWidth } = Dimensions.get('window');

export type ChartDataPoint = {
  day: string;
  value: number;
  comparisonValue: number;
  date: string;
};

export type TimeFilter = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';

type EnhancedChartProps = {
  data?: ChartDataPoint[];
  height?: number;
  activeIndex?: number;
  onPointPress?: (index: number, value: number) => void;
  showComparison?: boolean;
  timeFilter?: TimeFilter;
  isLoading?: boolean;
};

export function EnhancedChart({
  data = [],
  height = 300,
  activeIndex = 0,
  onPointPress,
  showComparison = true,
  timeFilter = '1W',
  isLoading = false,
}: EnhancedChartProps) {
  const [selectedIndex, setSelectedIndex] = useState(activeIndex);
  const chartWidth = screenWidth - 40;
  const padding = 5;
  const chartInnerWidth = chartWidth - (padding * 2);
  const chartInnerHeight = height - 60;

  // Generate chart data based on time filter
  const chartData = useMemo(() => {
    if (isLoading || !data || data.length === 0) {
      return generateEmptyData(timeFilter);
    }
    return data;
  }, [data, timeFilter, isLoading]);

  // Get all values from both datasets for scaling
  const allValues = chartData.flatMap(d => [d.value, d.comparisonValue || 0]);
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues) * 0.85;
  const valueRange = maxValue - minValue;

  // Main data points
  const points = chartData.map((item, index) => {
    const x = padding + (index / Math.max(chartData.length - 1, 1)) * chartInnerWidth;
    const normalizedValue = (item.value - minValue) / Math.max(valueRange, 1);
    const y = height - 50 - (normalizedValue * chartInnerHeight);
    return { x, y, value: item.value, day: item.day };
  });
  
  // Comparison data points (usually previous period)
  const comparisonPoints = chartData.map((item, index) => {
    const x = padding + (index / Math.max(chartData.length - 1, 1)) * chartInnerWidth;
    const normalizedValue = ((item.comparisonValue || 0) - minValue) / Math.max(valueRange, 1);
    const y = height - 50 - (normalizedValue * chartInnerHeight);
    return { x, y, value: item.comparisonValue || 0, day: item.day };
  });

  type ChartPoint = { x: number; y: number; value: number; day: string };

  // Create smooth curve path using cubic bezier
  const createSmoothPath = (chartPoints: ChartPoint[]) => {
    if (chartPoints.length < 2) return '';

    let path = `M ${chartPoints[0].x},${chartPoints[0].y}`;
    
    for (let i = 1; i < chartPoints.length; i++) {
      const prev = chartPoints[i - 1];
      const curr = chartPoints[i];
      const next = chartPoints[i + 1];
      
      // Calculate control points for smooth curve
      const cp1x = prev.x + (curr.x - prev.x) * 0.5;
      const cp1y = prev.y;
      const cp2x = curr.x - (next ? (next.x - curr.x) * 0.3 : (curr.x - prev.x) * 0.3);
      const cp2y = curr.y;
      
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
    }
    
    return path;
  };

  // Create area path for gradient fill
  const createAreaPath = (chartPoints: ChartPoint[]) => {
    const linePath = createSmoothPath(chartPoints);
    const firstPoint = chartPoints[0];
    const lastPoint = chartPoints[chartPoints.length - 1];
    
    return `${linePath} L ${lastPoint.x},${height - 50} L ${firstPoint.x},${height - 50} Z`;
  };

  const mainLinePath = createSmoothPath(points);
  const comparisonLinePath = createSmoothPath(comparisonPoints);
  const areaPath = createAreaPath(points);

  const handlePointPress = (index: number) => {
    setSelectedIndex(index);
    if (onPointPress && chartData[index]) {
      onPointPress(index, chartData[index].value);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${value.toFixed(0)}`;
  };

  return (
    <View style={[styles.container, { height }]}>
      <Svg height={height} width={chartWidth}>
        <Defs>
          <LinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
          </LinearGradient>
        </Defs>
        
        {/* Background grid lines - horizontal */}
        {[0.25, 0.5, 0.75].map((ratio, i) => {
          const y = height - 50 - (ratio * chartInnerHeight);
          return (
            <Path
              key={`grid-h-${i}`}
              d={`M ${padding} ${y} L ${chartWidth - padding} ${y}`}
              stroke="#FFFFFF"
              strokeWidth={0.3}
              strokeOpacity={0.15}
              strokeDasharray="4,4"
            />
          );
        })}
        
        {/* Area fill */}
        <Path
          d={areaPath}
          fill="url(#gradient)"
        />
        
        {/* Comparison line (usually previous period) */}
        {showComparison && (
          <Path
            d={comparisonLinePath}
            fill="none"
            stroke="#CCCCCC"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.5}
          />
        )}
        
        {/* Main line */}
        <Path
          d={mainLinePath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points - only show for the selected point */}
        {points.map((point, index) => (
          <React.Fragment key={index}>
            {index === selectedIndex && (
              <Circle
                cx={point.x}
                cy={point.y}
                r={8}
                fill="#054cbeff"
                stroke="#FFFFFF"
                strokeWidth={2}
                onPress={() => handlePointPress(index)}
              />
            )}
          </React.Fragment>
        ))}
      </Svg>
      
      {/* No tooltip */}
      
      {/* Day labels */}
      <View style={styles.labelsContainer}>
        {chartData.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={[
              styles.labelButton,
              index === selectedIndex && styles.selectedLabelButton
            ]}
            onPress={() => handlePointPress(index)}
          >
            <ThemedText style={[
              styles.dayLabel,
              index === selectedIndex && styles.selectedDayLabel
            ]}>
              {item.day}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginVertical: 15,
    backgroundColor: 'transparent',
  },

  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  labelButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  selectedLabelButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 15,
    color: '#9BA1A6',
    fontWeight: '400',
  },
  selectedDayLabel: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
});

// Helper function to generate empty data for different time periods
function generateEmptyData(timeFilter: TimeFilter): ChartDataPoint[] {
  const now = new Date();
  
  switch (timeFilter) {
    case '1D':
      return generateHourlyData(now);
    case '1W':
      return generateWeeklyData(now);
    case '1M':
      return generateMonthlyData(now, 1);
    case '3M':
      return generateMonthlyData(now, 3);
    case '6M':
      return generateMonthlyData(now, 6);
    case '1Y':
      return generateYearlyData(now);
    default:
      return generateWeeklyData(now);
  }
}

function generateHourlyData(now: Date): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  for (let i = 0; i < 24; i++) {
    const hour = new Date(now);
    hour.setHours(i, 0, 0, 0);
    data.push({
      day: hour.getHours().toString().padStart(2, '0'),
      value: 0,
      comparisonValue: 0,
      date: hour.toISOString().split('T')[0],
    });
  }
  return data;
}

function generateWeeklyData(now: Date): ChartDataPoint[] {
  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const data: ChartDataPoint[] = [];
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() - (6 - i));
    data.push({
      day: days[i],
      value: 0,
      comparisonValue: 0,
      date: day.toISOString().split('T')[0],
    });
  }
  return data;
}

function generateMonthlyData(now: Date, months: number): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const points = Math.min(months * 4, 12); // Max 12 points for readability
  
  for (let i = 0; i < points; i++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - (points - 1 - i));
    data.push({
      day: `${date.getMonth() + 1}/${date.getDate()}`,
      value: 0,
      comparisonValue: 0,
      date: date.toISOString().split('T')[0],
    });
  }
  return data;
}

function generateYearlyData(now: Date): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  
  for (let i = 0; i < 12; i++) {
    const month = new Date(now);
    month.setMonth(month.getMonth() - (11 - i));
    data.push({
      day: month.toLocaleDateString('en-US', { month: 'short' }),
      value: 0,
      comparisonValue: 0,
      date: month.toISOString().split('T')[0],
    });
  }
  return data;
}
