import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Product as DBProduct, dbService, Supplier } from '@/services/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Linking, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type CartItem = { id: string; name: string; qty: number; price: number };

const CART_STORAGE_KEY = '@supplier_order_cart';

// Search Bar Component
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
        placeholder="Search products to order..."
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
        accessibilityLabel="Search products to order"
      />
      <TouchableOpacity
        onPress={onSubmitEditing}
        style={styles.addSearchBtn}
        accessibilityRole="button"
        accessibilityLabel="Add searched item to order"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <IconSymbol name="plus.circle.fill" size={24} color="#3B82F6" />
      </TouchableOpacity>
    </View>
  </View>
));

export default function SupplierOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const supplierId = params.supplierId as string;
  
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Save cart to AsyncStorage
  const saveCartToStorage = useCallback(async (cartData: CartItem[]) => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData));
    } catch (error) {
      console.warn('Failed to save order cart to storage:', error);
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
      console.warn('Failed to load order cart from storage:', error);
    }
  }, []);

  const loadSupplier = useCallback(async () => {
    try {
      await dbService.initDatabase();
      const suppliers = await dbService.getSuppliers();
      const foundSupplier = suppliers.find(s => s.id === supplierId);
      setSupplier(foundSupplier || null);
    } catch (e) {
      console.warn('Failed to load supplier', e);
    }
  }, [supplierId]);

  const loadProducts = useCallback(async () => {
    try {
      await dbService.initDatabase();
      const productsList = await dbService.getProducts();
      setProducts(productsList);
    } catch (e) {
      console.warn('Failed to load products for order', e);
    }
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      await loadSupplier();
      await loadProducts();
      await loadCartFromStorage();
    };
    initializeData();
  }, [loadSupplier, loadProducts, loadCartFromStorage]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const suggestions = useMemo(() => {
    if (!query || query.trim() === '') return [] as DBProduct[];
    const q = query.trim().toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 5);
  }, [query, products]);

  const addToCart = (product: DBProduct) => {
    if (!product) return;
    
    setCart(prev => {
      const existing = prev.find(c => c.id === product.id);
      let newCart;
      if (existing) {
        newCart = prev.map(c => c.id === product.id ? { ...c, qty: c.qty + 1 } : c);
      } else {
        newCart = [...prev, { id: product.id, name: product.name, price: product.sellingPrice, qty: 1 }];
      }
      
      saveCartToStorage(newCart);
      return newCart;
    });
  };

  const addByQuery = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const match = products.find(p => p.name.toLowerCase() === q) || suggestions[0];
    if (!match) return;
    
    addToCart(match);
    setQuery('');
  };

  const increment = (id: string) => {
    setCart(prev => {
      const newCart = prev.map(c => c.id === id ? { ...c, qty: c.qty + 1 } : c);
      saveCartToStorage(newCart);
      return newCart;
    });
  };

  const decrement = (id: string) => {
    setCart(prev => {
      const newCart = prev.flatMap(c => c.id !== id ? [c] : (c.qty <= 1 ? [] : [{ ...c, qty: c.qty - 1 }]));
      saveCartToStorage(newCart);
      return newCart;
    });
  };

  const total = useMemo(() => cart.reduce((sum, c) => sum + c.qty * c.price, 0), [cart]);

  const handleCall = async () => {
    if (!supplier) return;
    
    try {
      const url = `tel:${supplier.phoneNumber}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to make phone calls on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate call');
    }
  };

  const handleWhatsAppOrder = async () => {
    if (!supplier || cart.length === 0) return;
    
    try {
      // Create order message
      const orderItems = cart.map(item => `• ${item.name} - Qty: ${item.qty} - ₹${(item.qty * item.price).toFixed(2)}`).join('\n');
      const message = `Hello ${supplier.name},\n\nI would like to place an order:\n\n${orderItems}\n\nTotal: ₹${total.toFixed(2)}\n\nPlease confirm availability and delivery details.\n\nThank you!`;
      
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `whatsapp://send?phone=${supplier.whatsappNumber}&text=${encodedMessage}`;
      
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        // Clear cart after sending order
        setCart([]);
        saveCartToStorage([]);
        Alert.alert('Order Sent', 'Your order has been sent via WhatsApp!');
      } else {
        // Fallback to web WhatsApp
        const webWhatsappUrl = `https://wa.me/${supplier.whatsappNumber}?text=${encodedMessage}`;
        await Linking.openURL(webWhatsappUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send WhatsApp message');
    }
  };

  const toggleSearch = () => {
    setIsSearchActive(!isSearchActive);
    if (!isSearchActive) {
      setQuery('');
    }
  };

  const CartItemRow = ({ item }: { item: CartItem }) => (
    <View style={styles.cartRow}>
      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <ThemedText style={styles.itemName}>{item.name}</ThemedText>
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
              style={styles.qtyBtn}
              onPress={() => increment(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Increase ${item.name}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconSymbol name="plus" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <ThemedText style={styles.supplierName}>Orders</ThemedText>
            </View>
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
                accessibilityLabel="Clear order"
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

          <View style={styles.cartBox}>
            {cart.length === 0 ? (
              <View style={styles.emptyCartContainer}>
                <Image 
                  source={require('@/assets/images/empty.png')} 
                  style={styles.emptyCartGif} 
                  resizeMode="contain"
                />
                <ThemedText style={styles.emptyCartText}>No items in order</ThemedText>
                <ThemedText style={styles.emptyCartSubtext}>Search and add products to create an order</ThemedText>
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
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.callButton]}
              onPress={handleCall}
              accessibilityRole="button"
              accessibilityLabel="Call supplier"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconSymbol name="phone.fill" size={24} color="#3B82F6" />
              <ThemedText style={styles.callButtonText}>Call</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.whatsappButton, cart.length === 0 && { opacity: 0.5 }]}
              onPress={handleWhatsAppOrder}
              disabled={cart.length === 0}
              accessibilityRole="button"
              accessibilityLabel="Send order via WhatsApp"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconSymbol name="paperplane.fill" size={20} color="#FFFFFF" />
              <ThemedText style={styles.whatsappButtonText}>Send Order</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#121212' },
  container: { flex: 1, padding: 16 },
  content: { flex: 1 },
  bottomSection: { 
    paddingTop: 5,
    paddingBottom: 5,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 15, 
    marginTop: 50 
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 14,
    color: '#9BA1A6',
    fontWeight: '500',
  },
  supplierName: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
    marginRight: 30,
  },
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
  suggestionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 0, marginTop: 15, marginHorizontal: 10 },
  suggestionChip: { backgroundColor: '#1A1A1A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  cartBox: { backgroundColor: 'transparent', borderRadius: 14, padding: 12, paddingBottom: 0, flex: 1, borderWidth: 0, borderColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  cartRow: { 
    backgroundColor: '#1F1F1F', 
    borderRadius: 16, 
    padding: 20, 
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 80,
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
    alignItems: 'center',
    marginBottom: 16,
  },
  itemName: {
    fontSize: 20,
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
    justifyContent: 'flex-end',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 15,
    marginLeft: 5,
    marginRight: 5,
  },
  callButton: { 
    flex: 1,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#2A2A2A', 
    paddingVertical: 16, 
    borderRadius: 14, 
    gap: 10,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  callButtonText: { color: '#FFFFFF', fontWeight: '700' },
  whatsappButton: { 
    flex: 1,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#25D366', 
    paddingVertical: 16, 
    borderRadius: 14, 
    gap: 10, 
  },
  whatsappButtonText: { color: '#FFFFFF', fontWeight: '700' },
  emptyCartContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    flex: 1, 
    padding: 40,
    minHeight: 200,
    backgroundColor: 'transparent',
  },
  emptyCartGif: { 
    width: 120, 
    height: 120, 
    marginBottom: 24, 
    opacity: 0.7,
  },
  emptyCartText: { 
    color: '#9BA1A6', 
    fontSize: 18, 
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyCartSubtext: { 
    color: '#6B7280', 
    fontSize: 14, 
    fontWeight: '500',
    textAlign: 'center',
  },
});