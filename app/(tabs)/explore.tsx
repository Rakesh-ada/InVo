import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Product as DBProduct, dbService } from '@/services/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type CartItem = { id: string; name: string; qty: number; price: number };


const CART_STORAGE_KEY = '@cart_items';

// Search Bar Component - moved outside to prevent re-creation
const SearchBarComponent = React.memo(({ 
  query, 
  onChangeText, 
  onSubmitEditing 
}: { 
  query: string; 
  onChangeText: (text: string) => void; 
  onSubmitEditing: () => void; 
}) => (
  <View style={styles.searchWrap}>
    <View style={styles.searchInputContainer}>
      <TextInput
        placeholder="Search products..."
        placeholderTextColor="#6B7280"
        value={query}
        onChangeText={onChangeText}
        style={styles.searchInput}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="search"
        keyboardType="default"
        autoCapitalize="none"
        autoCorrect={false}
        blurOnSubmit={false}
        autoFocus={false}
        accessibilityLabel="Search inventory to add to cart"
      />
      <TouchableOpacity
        onPress={onSubmitEditing}
        style={styles.addSearchBtn}
        accessibilityRole="button"
        accessibilityLabel="Add searched item to cart"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <IconSymbol name="plus.circle.fill" size={24} color="#3B82F6" />
      </TouchableOpacity>
    </View>
  </View>
));

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [settings, setSettings] = useState<{qrPaymentImageUri?: string; businessName?: string}>({});

  // Save cart to AsyncStorage
  const saveCartToStorage = useCallback(async (cartData: CartItem[]) => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData));
    } catch (error) {
      console.warn('Failed to save cart to storage:', error);
    }
  }, []);

  // Load cart from AsyncStorage
  const loadCartFromStorage = useCallback(async () => {
    try {
      const storedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (storedCart) {
        const cartData = JSON.parse(storedCart) as CartItem[];
        setCart(cartData);
      }
    } catch (error) {
      console.warn('Failed to load cart from storage:', error);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      await dbService.initDatabase();
      const productsList = await dbService.getProducts();
      setProducts(productsList);
    } catch (e) {
      console.warn('Failed to load products for cart', e);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('@invo_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({
          qrPaymentImageUri: parsedSettings.qrPaymentImageUri,
          businessName: parsedSettings.businessName
        });
      }
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      await loadProducts();
      await loadCartFromStorage();
      await loadSettings();
    };
    initializeData();
  }, [loadProducts, loadCartFromStorage, loadSettings]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const suggestions = useMemo(() => {
    if (!query || query.trim() === '') return [] as DBProduct[];
    const q = query.trim().toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q) && p.quantity > 0).slice(0, 5);
  }, [query, products]);

  const addToCart = (product: DBProduct) => {
    if (!product || product.quantity <= 0) {
      Alert.alert('Out of Stock', `${product.name} is currently out of stock.`);
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(c => c.id === product.id);
      let newCart;
      if (existing) {
        // Check if we're not exceeding inventory
        if (existing.qty < product.quantity) {
          newCart = prev.map(c => c.id === product.id ? { ...c, qty: c.qty + 1 } : c);
        } else {
          // Show alert when trying to exceed available stock
          Alert.alert(
            'Stock Limit Reached', 
            `You can only add up to ${product.quantity} ${product.name}(s). Only ${product.quantity} available in stock.`
          );
          newCart = prev; // Don't add if would exceed inventory
        }
      } else {
        newCart = [...prev, { id: product.id, name: product.name, price: product.sellingPrice, qty: 1 }];
      }
      
      // Save to storage
      if (newCart !== prev) {
        saveCartToStorage(newCart);
      }
      return newCart;
    });
  };

  const addByQuery = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const match = products.find(p => p.name.toLowerCase() === q && p.quantity > 0) || suggestions[0];
    if (!match) return;
    
    addToCart(match);
    setQuery('');
  };

  const increment = (id: string) => {
    const product = products.find(p => p.id === id);
    const cartItem = cart.find(c => c.id === id);
    
    if (product && cartItem) {
      if (cartItem.qty < product.quantity) {
        setCart(prev => {
          const newCart = prev.map(c => c.id === id ? { ...c, qty: c.qty + 1 } : c);
          saveCartToStorage(newCart);
          return newCart;
        });
      } else {
        // Show alert when trying to exceed available stock
        Alert.alert(
          'Stock Limit Reached', 
          `You can only add up to ${product.quantity} ${product.name}(s). Only ${product.quantity} available in stock.`
        );
      }
    }
  };

  const decrement = (id: string) => {
    setCart(prev => {
      const newCart = prev.flatMap(c => c.id !== id ? [c] : (c.qty <= 1 ? [] : [{ ...c, qty: c.qty - 1 }]));
      saveCartToStorage(newCart);
      return newCart;
    });
  };

  const total = useMemo(() => cart.reduce((sum, c) => sum + c.qty * c.price, 0), [cart]);

  const proceed = () => {
    if (cart.length === 0) return;
    setIsPaymentModalVisible(true);
  };

  const handlePaymentComplete = async () => {
    try {
      // Validate inventory before processing payment
      const inventoryErrors = [];
      for (const cartItem of cart) {
        const product = products.find(p => p.id === cartItem.id);
        if (product && cartItem.qty > product.quantity) {
          inventoryErrors.push(`${product.name}: Only ${product.quantity} available, but ${cartItem.qty} requested`);
        }
      }

      if (inventoryErrors.length > 0) {
        Alert.alert(
          'Inventory Error', 
          `Some items are no longer available in the requested quantities:\n\n${inventoryErrors.join('\n')}\n\nPlease update your cart and try again.`
        );
        return;
      }

      // Update inventory - reduce quantities for sold items and record sales
      for (const cartItem of cart) {
        const product = products.find(p => p.id === cartItem.id);
        if (product) {
          const newQuantity = product.quantity - cartItem.qty;
          
          // Update product quantity
          await dbService.updateProduct({
            ...product,
            quantity: newQuantity
          });
          
          // Record the sale
          await dbService.recordSale(
            cartItem.id,
            cartItem.qty,
            cartItem.qty * cartItem.price
          );
          
          console.log(`Updated ${product.name}: ${product.quantity} → ${newQuantity} (sold ${cartItem.qty})`);
        }
      }

      // Save daily sales data for dashboard tracking
      const dailySalesEntry = {
        id: Date.now().toString(),
        totalAmount: total,
        quantitySold: cart.reduce((sum, item) => sum + item.qty, 0),
        saleDate: new Date().toISOString(),
        items: cart.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.qty,
          price: item.price,
          total: item.qty * item.price
        }))
      };

      try {
        const existingDailySales = await AsyncStorage.getItem('@daily_sales_data');
        const dailySales = existingDailySales ? JSON.parse(existingDailySales) : [];
        dailySales.push(dailySalesEntry);
        await AsyncStorage.setItem('@daily_sales_data', JSON.stringify(dailySales));
      } catch (error) {
        console.warn('Failed to save daily sales data:', error);
      }

      // Clear cart
      setCart([]);
      saveCartToStorage([]);
      setIsPaymentModalVisible(false);
      
      // Reload products to reflect inventory changes
      await loadProducts();
      
      Alert.alert(
        'Payment Successful!', 
        `Payment completed successfully!\n\nTotal: ₹${total.toFixed(2)}\nItems sold: ${cart.length}\n\nInventory has been updated.`
      );
    } catch (error) {
      console.error('Failed to update inventory:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    }
  };

  const handlePaymentCancel = () => {
    setIsPaymentModalVisible(false);
  };

  const toggleSearch = () => {
    setIsSearchActive(!isSearchActive);
    if (!isSearchActive) {
      setQuery('');
    }
  };

  // ---- Design tokens ----
  const t = tokens;

  // ---- Modular components ----
  const SectionHeader = ({ title }: { title: string }) => (
    <View style={{ marginVertical: 8 }}>
      <ThemedText style={{ fontWeight: '700', fontSize: 16 }}>{title}</ThemedText>
    </View>
  );



  const CartItemRow = ({ item }: { item: CartItem }) => {
    const product = products.find(p => p.id === item.id);
    const isAtMaxStock = product && item.qty >= product.quantity;
    
    return (
      <View style={styles.cartRow}>
        <View style={styles.itemInfo}>
          <View style={styles.itemHeader}>
            <ThemedText style={styles.itemName}>{item.name}</ThemedText>
            <ThemedText style={styles.itemTotal}>₹{(item.qty * item.price).toFixed(2)}</ThemedText>
          </View>
          <View style={styles.itemDetails}>
            <View style={styles.itemPriceInfo}>
              <ThemedText style={styles.itemPrice}>₹{item.price.toFixed(2)} each</ThemedText>
              {product && (
                <ThemedText style={styles.stockInfo}>
                  Stock: {product.quantity - item.qty} remaining
                </ThemedText>
              )}
            </View>
            <View style={styles.qtyWrap}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => decrement(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Decrease ${item.name}`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconSymbol name="minus" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.qtyDisplay}>
                <ThemedText style={styles.qtyText}>{item.qty}</ThemedText>
              </View>
              <TouchableOpacity
                style={[styles.qtyBtn, isAtMaxStock && styles.qtyBtnDisabled]}
                onPress={() => increment(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Increase ${item.name}`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={isAtMaxStock}
              >
                <IconSymbol name="plus" size={16} color={isAtMaxStock ? "#6B7280" : "#FFFFFF"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText style={{ fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', opacity: 1 ,paddingBottom: 4,paddingTop: 4,paddingHorizontal: 10}}>Cart</ThemedText>
            <View style={styles.headerRight}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Toggle search"
                onPress={toggleSearch}
                style={styles.searchToggleBtn}
              >
                <Image 
                  source={require('@/assets/images/explore.png')} 
                  style={[styles.headerIcon, { tintColor: isSearchActive ? '#3B82F6' : '#9BA1A6' }]} 
                  resizeMode="contain" 
                />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Clear cart"
                onPress={() => {
                  setCart([]);
                  saveCartToStorage([]);
                }}
                style={styles.clearBtn}
                disabled={cart.length === 0}
              >
                <Image 
                  source={require('@/assets/images/delete.png')} 
                  style={[styles.headerIcon, { tintColor: cart.length === 0 ? '#6B7280' : '#FCA5A5' }]} 
                  resizeMode="contain" 
                />
              </TouchableOpacity>
              <View style={styles.countBadge}>
                <ThemedText style={styles.countBadgeText}>{cart.reduce((s, c) => s + c.qty, 0)}</ThemedText>
              </View>
            </View>
          </View>

          {isSearchActive && (
            <SearchBarComponent 
              query={query} 
              onChangeText={setQuery} 
              onSubmitEditing={addByQuery} 
            />
          )}
          {isSearchActive && suggestions.length > 0 && (
            <View style={styles.suggestionBar}>
              {suggestions.map(s => (
                <TouchableOpacity key={s.id} style={styles.suggestionChip} onPress={() => { addToCart(s); setQuery(''); }}>
                  <ThemedText>{s.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}

          
          <View style={[styles.cartBox, styles.cartBoxFilled]}>
            {cart.length === 0 ? (
              <View style={styles.emptyCartContainer}>
                <Image 
                  source={require('@/assets/images/empty.png')} 
                  style={styles.emptyCartGif} 
                  resizeMode="contain"
                />
                <ThemedText style={styles.emptyCartText}>Your cart is empty</ThemedText>
              </View>
            ) : (
              <FlatList
                data={cart}
                keyExtractor={(c) => c.id}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                contentContainerStyle={{ paddingVertical: 4, flexGrow: 1 }}
                renderItem={({ item }) => (
                  <CartItemRow item={item} />
                )}
                ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
              />
            )}
          </View>
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.totalRow}>
            <ThemedText style={styles.totalLabel}>Total</ThemedText>
            <ThemedText style={styles.totalValue}>₹{total.toFixed(2)}</ThemedText>
          </View>

          <TouchableOpacity
            style={[styles.proceed, cart.length === 0 && { opacity: 0.5 }]}
            onPress={proceed}
            disabled={cart.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Proceed to complete cart"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol name="cart.fill" size={20} color="#FFFFFF" />
            <ThemedText style={styles.proceedText}>Proceed</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Payment Modal */}
      <Modal
        visible={isPaymentModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handlePaymentCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModal}>
            <View style={styles.paymentHeader}>
              <ThemedText style={styles.paymentTitle}>Payment</ThemedText>
              <TouchableOpacity onPress={handlePaymentCancel} style={styles.closeButton}>
                <IconSymbol name="xmark" size={20} color="#9BA1A6" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.paymentContent}>
              <ThemedText style={styles.paymentInstruction}>
                Scan QR code to pay ₹{total.toFixed(2)}
              </ThemedText>
              
              <View style={styles.qrCodeContainer}>
                {settings.qrPaymentImageUri ? (
                  <Image 
                    source={{ uri: settings.qrPaymentImageUri }} 
                    style={styles.qrCodeImage} 
                    resizeMode="contain" 
                  />
                ) : (
                  <View style={styles.qrCodePlaceholder}>
                    <IconSymbol name="qrcode" size={48} color="#9BA1A6" />
                    <ThemedText style={styles.qrCodePlaceholderText}>
                      No QR Code
                    </ThemedText>
                    <ThemedText style={styles.qrCodePlaceholderSubtext}>
                      Add in Settings
                    </ThemedText>
                  </View>
                )}
              </View>
              
              <View style={styles.paymentSummary}>
                <View style={styles.paymentTotal}>
                  <ThemedText style={styles.paymentTotalLabel}>Total :</ThemedText>
                  <ThemedText style={styles.paymentTotalAmount}>₹{total.toFixed(2)}</ThemedText>
                </View>
              </View>
            </View>
            
            <View style={styles.paymentActions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={handlePaymentCancel}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.completeButton} 
                onPress={handlePaymentComplete}
                disabled={!settings.qrPaymentImageUri}
              >
                <IconSymbol name="checkmark" size={20} color="#FFFFFF" />
                <ThemedText style={styles.completeButtonText}>Done</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#121212' },
  container: { flex: 1, padding: 16 },
  content: { flex: 1 },
  bottomSection: { 
    paddingTop: 5,
    paddingBottom: 80,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, marginTop: 50 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 5 },
  searchToggleBtn: { 
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  clearBtn: { 
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  countBadge: { 
    width: 46, 
    height: 46, 
    borderRadius: 23, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#2A2A2A', 
    borderWidth: 2, 
    borderColor: '#3b82f6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  countBadgeText: { color: '#3b82f6', fontWeight: '700', fontSize: 14 },
  headerIcon: {
    width: 20,
    height: 20,
  },
  searchWrap: { 
    marginBottom: 0,
    marginHorizontal: 5,
  },
  searchInputContainer: {
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1F1F1F', 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    height: 56,
    borderWidth: 1, 
    borderColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: { 
    flex: 1, 
    color: '#FFFFFF', 
    fontSize: 16,
    paddingVertical: 0,
  },
  addSearchBtn: { 
    backgroundColor: 'transparent', 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginLeft: 10,
  },
  section: { marginVertical: 10, fontWeight: '700' },
  suggestionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 0, marginTop: 15,marginHorizontal: 10 },
  suggestionChip: { backgroundColor: '#1A1A1A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  cartBox: { backgroundColor: 'transparent', borderRadius: 14, padding: 12, paddingBottom:0, flex: 1, borderWidth: 0, borderColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  cartBoxFilled: { backgroundColor: 'transparent', borderRadius: 14, padding: 12, minHeight: 140, maxHeight: 420, shadowColor: 'transparent', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0, borderWidth: 0, borderColor: 'transparent' },
  cartBoxEmpty: { backgroundColor: 'transparent', borderRadius: 14, padding: 12, minHeight: 140, maxHeight: 380, alignItems: 'center', justifyContent: 'center', borderWidth: 0, borderColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  cartRow: { 
    backgroundColor: '#1F1F1F', 
    borderRadius: 16, 
    padding: 16, 
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  qtyWrap: { 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 2,
  },
  qtyBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 12, 
    backgroundColor: 'transparent', 
    borderWidth: 1,
    borderColor: '#3B82F6',
    alignItems: 'center', 
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  qtyDisplay: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    minWidth: 48,
  },
  qtyText: { 
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 24,
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  itemTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#22C55E',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPriceInfo: {
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    color: '#9BA1A6',
    fontWeight: '500',
  },
  stockInfo: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: 2,
  },
  qtyBtnDisabled: {
    opacity: 0.5,
    borderColor: '#6B7280',
  },
  totalRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginTop: 20,
    marginLeft: 10,
    marginRight: 10,
  },
  totalLabel: { fontWeight: '700', fontSize: 16 },
  totalValue: { fontWeight: '800', fontSize: 18 },
  proceed: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#3b82f6', 
    paddingVertical: 16, 
    borderRadius: 14, 
    marginTop: 15, 
    marginLeft: 5,
    marginRight: 5,
    gap: 10, 
    opacity: 1 
  },
  proceedText: { color: '#FFFFFF', fontWeight: '700' },
  emptyCartContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    flex: 1, 
    padding: 40,
    minHeight: 200,
    backgroundColor: 'transparent',
  },
  emptyCartGif: { 
    width: 150, 
    height: 150, 
    marginBottom: 24, 
    opacity: 0.9,
  },
  emptyCartText: { 
    color: '#9BA1A6', 
    fontSize: 18, 
    fontWeight: '600',
    textAlign: 'center',
  },
  // Payment Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  paymentModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  paymentTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#404040',
  },
  paymentContent: {
    padding: 24,
    paddingTop: 20,
  },
  paymentInstruction: {
    fontSize: 18,
    color: '#E5E5E5',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    fontWeight: '500',
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrCodeImage: {
    width: 220,
    height: 220,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 8,
  },
  qrCodePlaceholder: {
    width: 220,
    height: 220,
    borderRadius: 16,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
  },
  qrCodePlaceholderText: {
    fontSize: 18,
    color: '#9BA1A6',
    marginTop: 12,
    fontWeight: '600',
  },
  qrCodePlaceholderSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
  },
  paymentSummary: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  paymentTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentTotalLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  paymentTotalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#22C55E',
    letterSpacing: -0.3,
  },
  paymentActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#404040',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9BA1A6',
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});

// Minimal design tokens for consistent spacing/colors
const tokens = {
  color: {
    muted: '#9BA1A6',
    onPrimary: '#FFFFFF',
  },
};
