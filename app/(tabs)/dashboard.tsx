import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTabBar } from '@/contexts/TabBarContext';
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
  const { setTabBarVisible } = useTabBar();
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [preferences, setPreferences] = useState<DashboardPreferences>({
    lastViewedDate: new Date().toISOString(),
    favoriteMetrics: ['totalItems', 'productTypes'],
    notificationCount: 2,
  });

  // Calculate real metrics from database
  const totalProductsIn = products.reduce((sum, product) => sum + product.quantity, 0);
  const inventoryValue = products.reduce((sum, product) => sum + (product.buyingPrice * product.quantity), 0);
  
  // Calculate sales metrics
  const totalSalesAmount = salesData.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalItemsSold = salesData.reduce((sum, sale) => sum + sale.quantitySold, 0);
  
  // Calculate out of stock and low stock items
  const outOfStockItems = products.filter(product => product.quantity === 0);
  const lowStockItems = products.filter(product => product.quantity > 0 && product.quantity <= 5);
  const outOfStockCount = outOfStockItems.length;
  const lowStockCount = lowStockItems.length;
  const totalNotificationCount = outOfStockCount + lowStockCount;

  // Keep tab bar visible when notification sidebar is open
  // useEffect(() => {
  //   setTabBarVisible(!isNotificationOpen);
  // }, [isNotificationOpen, setTabBarVisible]);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load preferences from storage
      const storedPrefs = await AsyncStorage.getItem(DASHBOARD_PREFS_KEY);
      if (storedPrefs) {
        setPreferences(JSON.parse(storedPrefs));
      }
      
      // Load products data
      const isHealthy = await dbService.checkDatabaseHealth();
      if (!isHealthy) {
        await dbService.initDatabase();
      }
      const productsData = await dbService.getProducts();
      setProducts(productsData);
      
      // Load sales data
      const sales = await dbService.getSalesData();
      setSalesData(sales);
      
      // Generate transactions from products and sales
      const generatedTransactions = generateTransactionsFromProducts(productsData, sales);
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
    <>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
            <View style={styles.header}>
              <ThemedText type="title" style={styles.headerTitle} lightColor="#000000" darkColor="#FFFFFF">Dashboard</ThemedText>
              <TouchableOpacity 
                style={styles.notificationButton}
                onPress={() => setIsNotificationOpen(!isNotificationOpen)}
              >
                <Image 
                  source={require('@/assets/images/box.png')} 
                  style={styles.notificationIcon} 
                  resizeMode="contain" 
                />
                {totalNotificationCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <ThemedText adjustsFontSizeToFit numberOfLines={1} style={styles.badgeText}>{totalNotificationCount}</ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <StatCard 
                label="Items Value" 
                value={isLoading ? "..." : Math.round(inventoryValue).toLocaleString()} 
                deltaLabel="" 
                deltaColor="#3B82F6" 
              />
              <StatCard 
                label="Items Sold" 
                value={isLoading ? "..." : totalItemsSold.toLocaleString()} 
                deltaLabel="" 
                deltaColor="#22C55E" 
              />
            </View>

            <View style={styles.revenueSection}>
              <ThemedText style={styles.sectionTitle} darkColor="#9BA1A6">Total Sales Revenue</ThemedText>
              <View style={styles.revenueRow}>
                <View style={styles.revenueValueContainer}>
                  <ThemedText style={styles.currencySymbol}>₹</ThemedText>
                  <ThemedText style={styles.revenueValue}>
                    {isLoading ? "..." : totalSalesAmount.toLocaleString('en-US', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2 
                    })}
                  </ThemedText>
                </View>
                <View style={styles.percentChangeContainer}>
                  <ThemedText style={styles.percentChangeText}>
                    {isLoading ? "..." : `${totalItemsSold} sold`}
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.transactionsSection}>
              <ThemedText style={styles.sectionTitle} darkColor="#9BA1A6">Recent Activities</ThemedText>
              <View style={styles.transactionsList}>
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ThemedText style={styles.loadingText} darkColor="#9BA1A6">Loading activities...</ThemedText>
                  </View>
                ) : transactions.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <ThemedText style={styles.emptyText} darkColor="#9BA1A6">No activities yet</ThemedText>
                  </View>
                ) : (
                  <FlatList
                    data={transactions.slice(0, 4)} // Show only last 4 transactions
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <TransactionItem transaction={item} />}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </View>
            </View>
          </ThemedView>
      </SafeAreaView>
      
      {/* Notification Sidebar - Outside SafeAreaView to appear above everything */}
      {isNotificationOpen && (
        <View style={styles.notificationOverlay}>
          <TouchableOpacity 
            style={styles.overlayTouchable}
            onPress={() => setIsNotificationOpen(false)}
          />
          <View style={styles.notificationSidebar}>
            <View style={styles.sidebarHeader}>
              <ThemedText style={styles.sidebarTitle}>Inventory Alerts</ThemedText>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsNotificationOpen(false)}
              >
                <IconSymbol name="xmark" size={20} color="#9BA1A6" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.sidebarContent}>
              {totalNotificationCount === 0 ? (
                <View style={styles.emptyNotificationContainer}>
                  <View style={styles.emptyIconContainer}>
                    <IconSymbol name="checkmark.circle.fill" size={48} color="#9BA1A6" />
                  </View>
                  <ThemedText style={styles.emptyNotificationText}>All items in stock!</ThemedText>
                  <ThemedText style={styles.emptyNotificationSubtext}>
                    Your inventory is fully stocked. Great job!
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.itemsListContainer}>
                  <FlatList
                    data={[...outOfStockItems, ...lowStockItems]}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                      const isOutOfStock = item.quantity === 0;
                      const isLowStock = item.quantity > 0 && item.quantity <= 5;
                      
                      return (
                        <View style={[
                          styles.alertItem,
                          isOutOfStock && styles.outOfStockItem,
                          isLowStock && styles.lowStockItem
                        ]}>
                          <View style={styles.alertItemLeft}>
                            {item.imageUri ? (
                              <Image source={{ uri: item.imageUri }} style={styles.alertItemImage} resizeMode="cover" />
                            ) : (
                              <View style={[
                                styles.alertItemIcon,
                                isOutOfStock && styles.outOfStockIcon,
                                isLowStock && styles.lowStockIcon
                              ]}>
                                <IconSymbol 
                                  name={isOutOfStock ? "exclamationmark.triangle.fill" : "arrow.up.circle.fill"} 
                                  size={26} 
                                  color={isOutOfStock ? "#EF4444" : "#F59E0B"} 
                                />
                              </View>
                            )}
                            <View style={styles.alertItemInfo}>
                              <ThemedText style={styles.alertItemName}>{item.name}</ThemedText>
                              <View style={styles.alertItemDetails}>
                                <ThemedText style={styles.alertItemPrice}>₹{item.sellingPrice}</ThemedText>
                              </View>
                            </View>
                          </View>
                          <View style={[
                            styles.alertBadge,
                            isOutOfStock && styles.outOfStockBadge,
                            isLowStock && styles.lowStockBadge
                          ]}>
                            <ThemedText style={styles.alertBadgeText}>
                              {isOutOfStock ? "OUT" : "LOW"}
                            </ThemedText>
                          </View>
                        </View>
                      );
                    }}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </>
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
        <ThemedText style={[styles.transactionPrice, transaction.type === 'added' && { color: '#3B82F6' }]}>₹{transaction.price}</ThemedText>
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
    backgroundColor: '#1F1F1F', 
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  percentChangeText: {
    fontSize: 16,
    color: 'white',
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
  // Notification Sidebar Styles
  notificationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 9999,
  },
  overlayTouchable: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  notificationSidebar: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderLeftWidth: 1,
    borderLeftColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: -8, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
    zIndex: 10000,
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sidebarTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sidebarContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  itemsListContainer: {
    flex: 1,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#404040',
  },
  emptyNotificationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 24,
  },
  emptyNotificationText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyNotificationSubtext: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    color: '#9BA1A6',
    lineHeight: 22,
    fontWeight: '400',
  },
  // Alert Item Base Styles
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderRadius: 0,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  outOfStockItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#666666',
  },
  lowStockItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#666666',
  },
  alertItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertItemImage: {
    width: 40,
    height: 40,
    borderRadius: 0,
    marginRight: 12,
  },
  alertItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#404040',
  },
  outOfStockIcon: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#404040',
  },
  lowStockIcon: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#404040',
  },
  alertItemInfo: {
    flex: 1,
  },
  alertItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  alertItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertItemPrice: {
    fontSize: 14,
    color: '#9BA1A6',
    fontWeight: '500',
  },
  alertBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 0,
    minWidth: 40,
    alignItems: 'center',
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#404040',
  },
  outOfStockBadge: {
    backgroundColor: '#333333',
    borderColor: '#404040',
  },
  lowStockBadge: {
    backgroundColor: '#333333',
    borderColor: '#404040',
  },
  alertBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#CCCCCC',
    letterSpacing: 0.5,
  },
});

// Generate transactions from products and sales
function generateTransactionsFromProducts(products: Product[], sales: any[]): Transaction[] {
  const transactions: Transaction[] = [];
  
  // Add product addition transactions
  products.forEach((product) => {
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
  
  // Add sales transactions
  sales.forEach((sale) => {
    const product = products.find(p => p.id === sale.productId);
    if (product) {
      transactions.push({
        id: `sale-${sale.id}`,
        type: 'sold',
        productName: product.name,
        quantity: sale.quantitySold,
        price: sale.totalAmount,
        timestamp: sale.saleDate,
        imageUri: product.imageUri,
      });
    }
  });
  
  // Sort by timestamp (newest first)
  return transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}