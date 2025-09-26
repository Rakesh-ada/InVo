import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoryItem } from '@/components/ui/category-item';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MetricCard } from '@/components/ui/metric-card';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProductsScreen() {
  const [activeTab, setActiveTab] = useState<'list' | 'stock'>('list');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.headerTitle} lightColor="#000000" darkColor="#FFFFFF">Products</ThemedText>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconButton}>
                <IconSymbol name="square.and.pencil" size={22} color="#3b82f6" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <IconSymbol name="magnifyingglass" size={22} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'list' ? styles.activeTab : undefined]} 
              onPress={() => setActiveTab('list')}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <IconSymbol 
                  name="list.bullet" 
                  size={16} 
                  color={activeTab === 'list' ? 'white' : '#9BA1A6'} 
                  style={{marginRight: 6}} 
                />
                <ThemedText style={[styles.tabText, activeTab === 'list' ? styles.activeTabText : undefined]}>
                  Products list
                </ThemedText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'stock' ? styles.activeTab : undefined]} 
              onPress={() => setActiveTab('stock')}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <IconSymbol 
                  name="shippingbox.fill" 
                  size={16} 
                  color={activeTab === 'stock' ? 'white' : '#9BA1A6'} 
                  style={{marginRight: 6}} 
                />
                <ThemedText style={[styles.tabText, activeTab === 'stock' ? styles.activeTabText : undefined]}>
                  Stock In Hand
                </ThemedText>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.metricsContainer}>
            <View style={styles.metricRow}>
              <MetricCard 
                title="Total Products" 
                value="128" 
                backgroundColor="#1A1A1A" 
                textColor="#ECEDEE"
                icon="cube.fill"
                percentChange={18.0}
              />
              <MetricCard 
                title="Stock in Hand" 
                value="2,350" 
                backgroundColor="#1A1A1A" 
                textColor="#ECEDEE"
                icon="shippingbox.fill"
                percentChange={2.34}
              />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#10b981' }]} />
              <ThemedText style={styles.statText}>+18.00% from last week</ThemedText>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#3b82f6' }]} />
              <ThemedText style={styles.statText}>+2.34% from last month</ThemedText>
            </View>
          </View>
          
          <ThemedText style={styles.sectionTitle}>Products list</ThemedText>
          
          <ThemedView style={styles.productList}>
            <CategoryItem 
              title="Vegetables"
              iconBgColor="#e8f5e9"
              iconComponent={<IconSymbol name="leaf.fill" size={20} color="green" />}
              upCount={267}
              downCount={143}
            />
            
            <CategoryItem 
              title="Sweet Food"
              iconBgColor="#fce4ec"
              iconComponent={<IconSymbol name="birthday.cake.fill" size={20} color="#d81b60" />}
              upCount={124}
              downCount={87}
            />
            
            <CategoryItem 
              title="Snack"
              iconBgColor="#fff3e0"
              iconComponent={<IconSymbol name="popcorn.fill" size={20} color="#ff9800" />}
              upCount={58}
              downCount={37}
            />
            
            <CategoryItem 
              title="Fruits"
              iconBgColor="#f1f8e9"
              iconComponent={<IconSymbol name="leaf.fill" size={20} color="#7cb342" />}
              upCount={450}
              downCount={234}
            />
          </ThemedView>

          <Link href="/scan-product" asChild>
            <TouchableOpacity style={styles.scanButton}>
              <View style={styles.scanButtonIconContainer}>
                <IconSymbol name="barcode.viewfinder" size={24} color="#ffffff" />
              </View>
              <ThemedText style={styles.scanButtonText}>Scan Products</ThemedText>
            </TouchableOpacity>
          </Link>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollView: {
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 4,
    marginTop: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9BA1A6',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  metricsContainer: {
    marginBottom: 24,
    marginTop: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 28,
    marginTop: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    flex: 1,
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statText: {
    fontSize: 12,
    color: '#9BA1A6',
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#ECEDEE',
  },
  productList: {
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  scanButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  scanButtonIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 6,
    marginRight: 12,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});