import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Product as DBProduct, dbService } from '@/services/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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

  useEffect(() => {
    const initializeData = async () => {
      await loadProducts();
      await loadCartFromStorage();
    };
    initializeData();
  }, [loadProducts, loadCartFromStorage]);

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
    if (!product || product.quantity <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(c => c.id === product.id);
      let newCart;
      if (existing) {
        // Check if we're not exceeding inventory
        if (existing.qty < product.quantity) {
          newCart = prev.map(c => c.id === product.id ? { ...c, qty: c.qty + 1 } : c);
        } else {
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
    
    if (product && cartItem && cartItem.qty < product.quantity) {
      setCart(prev => {
        const newCart = prev.map(c => c.id === id ? { ...c, qty: c.qty + 1 } : c);
        saveCartToStorage(newCart);
        return newCart;
      });
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
    setCart([]);
    saveCartToStorage([]);
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



  const CartItemRow = ({ item }: { item: CartItem }) => (
    <View style={styles.cartRow}>
      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <ThemedText style={styles.itemName}>{item.name}</ThemedText>
          <ThemedText style={styles.itemTotal}>₹{(item.qty * item.price).toFixed(2)}</ThemedText>
        </View>
        <View style={styles.itemDetails}>
          <ThemedText style={styles.itemPrice}>₹{item.price.toFixed(2)} each</ThemedText>
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
            <ThemedText style={{ fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', opacity: 1 ,paddingBottom: 4,paddingTop: 4,paddingLeft: 5}}>Cart</ThemedText>
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

          <SectionHeader title="" />
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
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#121212' },
  container: { flex: 1, padding: 16 },
  content: { flex: 1 },
  bottomSection: { 
    paddingTop: 16,
    paddingBottom: 150,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, marginTop: 50 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
    marginBottom: 10,
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
  suggestionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  suggestionChip: { backgroundColor: '#1A1A1A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  cartBox: { backgroundColor: 'transparent', borderRadius: 14, padding: 12, flex: 1, borderWidth: 0, borderColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  cartBoxFilled: { backgroundColor: 'transparent', borderRadius: 14, padding: 12, minHeight: 140, maxHeight: 380, shadowColor: 'transparent', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0, borderWidth: 0, borderColor: 'transparent' },
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
  itemPrice: {
    fontSize: 14,
    color: '#9BA1A6',
    fontWeight: '500',
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
});

// Minimal design tokens for consistent spacing/colors
const tokens = {
  color: {
    muted: '#9BA1A6',
    onPrimary: '#FFFFFF',
  },
};
