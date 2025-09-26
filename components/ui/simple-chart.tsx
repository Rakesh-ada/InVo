import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';

// Mock data for the chart
const mockData = [50, 65, 55, 70, 95, 85, 75, 90, 110, 95, 120, 110];

type SimpleChartProps = {
  data?: number[];
  height?: number;
  activePointIndex?: number;
  activeValue?: number;
};

export function SimpleChart({
  data = mockData,
  height = 100,
  activePointIndex = 9,
  activeValue = 95,
}: SimpleChartProps) {
  const width = Dimensions.get('window').width - 40;
  
  // Calculate points for the chart
  const maxValue = Math.max(...data);
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - (value / maxValue) * height;
    return { x, y };
  });

  // Generate SVG path
  const pathD = points.reduce((acc, point, index) => {
    if (index === 0) {
      return `M ${point.x},${point.y}`;
    }
    return `${acc} L ${point.x},${point.y}`;
  }, '');

  // Area under the curve for background
  const areaPathD = `${pathD} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

  return (
    <ThemedView style={[styles.container, { height }]}>
      <Svg height={height} width={width}>
        {/* Area fill with gradient */}
        <Path
          d={areaPathD}
          fill="rgba(10, 126, 164, 0.1)"
          strokeWidth={0}
        />
        
        {/* Line chart */}
        <Path
          d={pathD}
          fill="none"
          stroke="#0a7ea4"
          strokeWidth={2}
        />
        
        {/* Active point */}
        {activePointIndex !== undefined && (
          <Circle
            cx={points[activePointIndex].x}
            cy={points[activePointIndex].y}
            r={6}
            fill="white"
            stroke="#0a7ea4"
            strokeWidth={2}
          />
        )}
      </Svg>
      
      {/* Active value tooltip */}
      {activeValue !== undefined && (
        <View style={[
          styles.tooltip, 
          { 
            left: points[activePointIndex || 0].x - 20,
            top: points[activePointIndex || 0].y - 35
          }
        ]}>
          <ThemedText style={styles.tooltipText}>${activeValue}</ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginVertical: 20,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: 'black',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});