import React, { useState } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { ThemedText } from '../themed-text';

const { width: screenWidth } = Dimensions.get('window');

// Real revenue data for the last 7 days
const revenueData = [
  { day: 'Mo', value: 19500, comparisonValue: 14400, date: '2025-09-20' },
  { day: 'Tu', value: 22300, comparisonValue: 16200, date: '2025-09-21' },
  { day: 'We', value: 19800, comparisonValue: 18900, date: '2025-09-22' },
  { day: 'Th', value: 24500, comparisonValue: 20700, date: '2025-09-23' },
  { day: 'Fr', value: 22000, comparisonValue: 22673, date: '2025-09-24' },
  { day: 'Sa', value: 24500, comparisonValue: 23100, date: '2025-09-25' },
  { day: 'Su', value: 24500, comparisonValue: 21500, date: '2025-09-26' },
];

type EnhancedChartProps = {
  data?: typeof revenueData;
  height?: number;
  activeIndex?: number;
  onPointPress?: (index: number, value: number) => void;
  showComparison?: boolean;
};

export function EnhancedChart({
  data = revenueData,
  height = 300, // Increased default height
  activeIndex = 5, // Default to Saturday as in reference image
  onPointPress,
  showComparison = true,
}: EnhancedChartProps) {
  const [selectedIndex, setSelectedIndex] = useState(activeIndex);
  const chartWidth = screenWidth - 40; // Reduced padding for more space
  const padding = 5; // Smaller padding for better chart utilization
  const chartInnerWidth = chartWidth - (padding * 2);
  const chartInnerHeight = height - 60; // More space for bottom labels
  
  // Get all values from both datasets for scaling
  const allValues = data.flatMap(d => [d.value, d.comparisonValue || 0]);
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues) * 0.85; // Add some bottom margin
  const valueRange = maxValue - minValue;

  // Main data points
  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * chartInnerWidth;
    const normalizedValue = (item.value - minValue) / valueRange;
    const y = height - 50 - (normalizedValue * chartInnerHeight);
    return { x, y, value: item.value, day: item.day };
  });
  
  // Comparison data points (usually previous period)
  const comparisonPoints = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * chartInnerWidth;
    const normalizedValue = ((item.comparisonValue || 0) - minValue) / valueRange;
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
    if (onPointPress) {
      onPointPress(index, data[index].value);
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
        {data.map((item, index) => (
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
