import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { dbService, Product } from '@/services/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

type StatProps = {
  label: string;
  value: string;
  deltaLabel: string;
  deltaColor: string;
};

type Transaction = {
  id: string;
  type: 'added' | 'updated' | 'sold';
  productName: string;
  quantity: number;
  price: number;
  timestamp: string;
  imageUri?: string;
};

function StatCard({ label, value, deltaLabel, deltaColor }: StatProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statContent}>
        <View style={styles.statHeader}>
          <View style={styles.statLabelContainer}>
            <ThemedText style={styles.statLabel} darkColor="#9BA1A6">{label.toUpperCase()}</ThemedText>
          </View>
          <ThemedText style={styles.statValue} type="title">{value}</ThemedText>
        </View>
        {deltaLabel && deltaLabel !== "" && (
          <View style={[styles.deltaPill, { backgroundColor: `${deltaColor}22` }]}> 
            <View style={[styles.deltaDot, { backgroundColor: deltaColor }]} />
            <ThemedText style={[styles.deltaText]} darkColor={deltaColor}>{deltaLabel}</ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const DASHBOARD_PREFS_KEY = '@dashboard_preferences';

type DashboardPreferences = {
  lastViewedDate: string;
  favoriteMetrics: string[];
  notificationCount: number;
};

export default function DashboardScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<DashboardPreferences>({
    lastViewedDate: new Date().toISOString(),
    favoriteMetrics: ['totalItems', 'productTypes'],
    notificationCount: 2,
  });

  // Calculate real metrics from database
  const totalProductsIn = products.reduce((sum, product) => sum + product.quantity, 0);
  const totalProductTypes = products.length; // Number of product types
  const totalRevenue = products.reduce((sum, product) => sum + (product.sellingPrice * product.quantity), 0);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load preferences from storage
      const storedPrefs = await AsyncStorage.getItem(DASHBOARD_PREFS_KEY);
      if (storedPrefs) {
        setPreferences(JSON.parse(storedPrefs));
      }
      
      // Load products data
      await dbService.initDatabase();
      const productsData = await dbService.getProducts();
      setProducts(productsData);
      
      // Generate transactions from products
      const generatedTransactions = generateTransactionsFromProducts(productsData);
      setTransactions(generatedTransactions);
      
      // Save updated preferences
      const updatedPrefs = {
        ...preferences,
        lastViewedDate: new Date().toISOString(),
      };
      await AsyncStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(updatedPrefs));
      setPreferences(updatedPrefs);
      
    } catch (error) {
      console.warn('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [preferences]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
      return () => {};
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.headerTitle} lightColor="#000000" darkColor="#FFFFFF">Dashboard</ThemedText>
            <TouchableOpacity style={styles.notificationButton}>
              <Image 
                source={require('@/assets/images/box.png')} 
                style={styles.notificationIcon} 
                resizeMode="contain" 
              />
              <View style={styles.notificationBadge}>
                <ThemedText adjustsFontSizeToFit numberOfLines={1} style={styles.badgeText}>{preferences.notificationCount}</ThemedText>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <StatCard 
              label="Total Items" 
              value={isLoading ? "..." : totalProductsIn.toLocaleString()} 
              deltaLabel="" 
              deltaColor="#3B82F6" 
            />
            <StatCard 
              label="Product Types" 
              value={isLoading ? "..." : totalProductTypes.toLocaleString()} 
              deltaLabel="" 
              deltaColor="#06B6D4" 
            />
          </View>

          <View style={styles.revenueSection}>
            <ThemedText style={styles.sectionTitle} darkColor="#9BA1A6">Total Inventory Value</ThemedText>
            <View style={styles.revenueRow}>
              <View style={styles.revenueValueContainer}>
                <ThemedText style={styles.currencySymbol}>₹</ThemedText>
                <ThemedText style={styles.revenueValue}>
                  {isLoading ? "..." : totalRevenue.toLocaleString('en-US', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })}
                </ThemedText>
              </View>
              <View style={styles.percentChangeContainer}>
                <ThemedText style={styles.percentChangeText}>
                  {isLoading ? "..." : `${products.length} items`}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.transactionsSection}>
            <ThemedText style={styles.sectionTitle} darkColor="#9BA1A6">Recent Transactions</ThemedText>
            <View style={styles.transactionsList}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ThemedText style={styles.loadingText} darkColor="#9BA1A6">Loading transactions...</ThemedText>
                </View>
              ) : transactions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <ThemedText style={styles.emptyText} darkColor="#9BA1A6">No transactions yet</ThemedText>
                </View>
              ) : (
                <FlatList
                  data={transactions.slice(0, 5)} // Show only last 5 transactions
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => <TransactionItem transaction={item} />}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          </View>
        </ThemedView>
    </SafeAreaView>
  );
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const getTransactionIcon = () => {
    switch (transaction.type) {
      case 'added':
        return 'plus.circle.fill';
      case 'updated':
        return 'pencil.circle.fill';
      case 'sold':
        return 'cart.fill';
      default:
        return 'circle.fill';
    }
  };

  const getTransactionColor = () => {
    switch (transaction.type) {
      case 'added':
        return '#22C55E';
      case 'updated':
        return '#3B82F6';
      case 'sold':
        return '#F59E0B';
      default:
        return '#9BA1A6';
    }
  };

  const getTransactionText = () => {
    switch (transaction.type) {
      case 'added':
        return 'Added';
      case 'updated':
        return 'Updated';
      case 'sold':
        return 'Sold';
      default:
        return 'Transaction';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View style={styles.transactionIconContainer}>
          {transaction.imageUri ? (
            <Image source={{ uri: transaction.imageUri }} style={styles.transactionImage} resizeMode="cover" />
          ) : (
            <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor() + '20' }]}>
              <IconSymbol name={getTransactionIcon()} size={20} color={getTransactionColor()} />
            </View>
          )}
        </View>
        <View style={styles.transactionDetails}>
          <ThemedText style={styles.transactionProduct}>{transaction.productName}</ThemedText>
          <ThemedText style={styles.transactionType} darkColor="#9BA1A6">
            {getTransactionText()} • Qty: {transaction.quantity}
          </ThemedText>
        </View>
      </View>
      <View style={styles.transactionRight}>
        <ThemedText style={styles.transactionPrice}>₹{transaction.price}</ThemedText>
        <ThemedText style={styles.transactionTime} darkColor="#9BA1A6">
          {formatTime(transaction.timestamp)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 43,
    marginLeft: 5,
    marginRight: 5,
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
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  notificationIcon: {
    width: 20,
    height: 20,
    tintColor: '#ECEDEE',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
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
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    minHeight: 120,
  },
  statContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  statHeader: {
    marginBottom: 16,
  },
  statLabelContainer: {
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    opacity: 0.7,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 25,
  },
  deltaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  deltaText: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.2,
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
    backgroundColor: '#2A2A2A',
    minWidth: 40,
  },
  activeFilterButton: {
    backgroundColor: '#3b82f6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9BA1A6',
  },
  activeFilterText: {
    color: 'white',
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginLeft: 10,
    marginRight: 10,
  },
  revenueSection: {
    marginBottom: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#9BA1A6',
    marginBottom: 8,
    fontWeight: '500',
    marginLeft: 10,
  },
  revenueValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 0,
    marginBottom: 0,
  },
  currencySymbol: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ECEDEE',
    marginRight: 2,
  },
  revenueValue: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ECEDEE',
    letterSpacing: -0.5,
  },
  percentChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b7e0a58', 
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  percentChangeText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '700',
  },
  chartContainer: {
    marginTop: 16,
    height: 280,
    marginBottom: 10,
  },
  transactionsSection: {
    marginBottom: 20,
  },
  transactionsList: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionProduct: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionType: {
    fontSize: 12,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22C55E',
    marginBottom: 2,
  },
  transactionTime: {
    fontSize: 12,
  },
});

// Generate transactions from products (only real transactions)
function generateTransactionsFromProducts(products: Product[]): Transaction[] {
  const transactions: Transaction[] = [];
  
  products.forEach((product) => {
    // Add product addition transaction
    transactions.push({
      id: `add-${product.id}`,
      type: 'added',
      productName: product.name,
      quantity: product.quantity,
      price: product.sellingPrice * product.quantity,
      timestamp: product.addedDate,
      imageUri: product.imageUri,
    });
  });
  
  // Sort by timestamp (newest first)
  return transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}