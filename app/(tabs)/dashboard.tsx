import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EnhancedChart } from '@/components/ui/enhanced-chart';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MetricCard } from '@/components/ui/metric-card';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('1W');
  const [currentRevenue, setCurrentRevenue] = useState(19500.00); // Matches the reference image

  const handleChartPointPress = (index: number, value: number) => {
    setCurrentRevenue(value);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.headerTitle} lightColor="#000000" darkColor="#FFFFFF">Dashboard</ThemedText>
            <TouchableOpacity style={styles.notificationButton}>
              <IconSymbol name="bell.fill" size={20} color="#ECEDEE" />
              <View style={styles.notificationBadge}>
                <ThemedText adjustsFontSizeToFit numberOfLines={1} style={styles.badgeText}>2</ThemedText>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.metricsContainer}>
            <View style={styles.metricRow}>
              <MetricCard 
                title="Products In" 
                value="3,027" 
                subtitle="Product In"
                backgroundColor="#3b82f6" 
                icon="cube.fill"
                percentChange={18.0}
              />
              <MetricCard 
                title="Products Out" 
                value="2,698" 
                subtitle="Product Out"
                backgroundColor="#06b6d4"
                icon="shippingbox.fill"
                percentChange={2.34}
              />
            </View>
          </View>

          <View style={styles.timeFilter}>
            <TimeFilterButton 
              label="1D" 
              isActive={selectedTimeFilter === '1D'} 
              onPress={() => setSelectedTimeFilter('1D')}
            />
            <TimeFilterButton 
              label="1W" 
              isActive={selectedTimeFilter === '1W'} 
              onPress={() => setSelectedTimeFilter('1W')}
            />
            <TimeFilterButton 
              label="1M" 
              isActive={selectedTimeFilter === '1M'} 
              onPress={() => setSelectedTimeFilter('1M')}
            />
            <TimeFilterButton 
              label="3M" 
              isActive={selectedTimeFilter === '3M'} 
              onPress={() => setSelectedTimeFilter('3M')}
            />
            <TimeFilterButton 
              label="6M" 
              isActive={selectedTimeFilter === '6M'} 
              onPress={() => setSelectedTimeFilter('6M')}
            />
            <TimeFilterButton 
              label="1Y" 
              isActive={selectedTimeFilter === '1Y'} 
              onPress={() => setSelectedTimeFilter('1Y')}
            />
          </View>

          <View style={styles.revenueSection}>
            <ThemedText style={styles.sectionTitle}>Revenue</ThemedText>
            <View style={styles.revenueRow}>
              <View style={styles.revenueValueContainer}>
                <ThemedText style={styles.currencySymbol}>₹</ThemedText>
                <ThemedText style={styles.revenueValue}>
                  {currentRevenue.toLocaleString('en-US', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })}
                </ThemedText>
              </View>
              <View style={styles.percentChangeContainer}>
                <ThemedText style={styles.percentChangeText}>+7.6%</ThemedText>
              </View>
            </View>
            
            <View style={styles.chartContainer}>
              <EnhancedChart 
                onPointPress={handleChartPointPress}
                height={300}
                showComparison={true}
              />
            </View>
          </View>
        </ThemedView>
    </SafeAreaView>
  );
}

function TimeFilterButton({ label, isActive, onPress }: { label: string; isActive: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <ThemedView style={[
        styles.filterButton, 
        isActive ? styles.activeFilterButton : undefined
      ]}>
        <ThemedText style={[
          styles.filterText, 
          isActive ? styles.activeFilterText : undefined
        ]}>
          {label}
        </ThemedText>
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#121212',
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    opacity: 1,
  },
  notificationButton: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1A1A1A', // Updated for dark mode
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3b82f6', // Changed from red (#ef4444) to blue
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6', // Changed from red to blue
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 14,
    includeFontPadding: false,
  },
  metricsContainer: {
    marginBottom: 24,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  timeFilter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A', // Updated for dark mode
    minWidth: 40,
  },
  activeFilterButton: {
    backgroundColor: '#3b82f6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9BA1A6', // Updated for dark mode
  },
  activeFilterText: {
    color: 'white',
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  revenueSection: {
    marginBottom: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#9BA1A6', // Updated for dark mode
    marginBottom: 8,
    fontWeight: '500',
  },
  revenueValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  currencySymbol: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ECEDEE',
    marginRight: 1,
  },
  revenueValue: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ECEDEE', // Updated for dark mode
    letterSpacing: -0.5,
  },
  percentChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  percentChangeText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
  },
  chartContainer: {
    marginTop: 16,
    height: 280, // Adjusted height to fit within non-scrollable view
    marginBottom: 10, // Reduced margin to fit in viewport
  },
  simpleChart: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPlaceholder: {
    color: '#9BA1A6',
    fontSize: 16,
  },
});