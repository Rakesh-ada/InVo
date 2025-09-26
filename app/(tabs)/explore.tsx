import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type CatalogItem = { id: string; name: string; price: number };
type CartItem = { id: string; name: string; qty: number; price: number };

const CATALOG: CatalogItem[] = [
  { id: 'veg', name: 'Vegetables', price: 2.5 },
  { id: 'sweet', name: 'Sweet Food', price: 3.0 },
  { id: 'snack', name: 'Snack', price: 1.8 },
  { id: 'fruit', name: 'Fruits', price: 2.2 },
  { id: 'bakery', name: 'Bakery', price: 4.0 },
  { id: 'dairy', name: 'Dairy', price: 3.5 },
  { id: 'beverage', name: 'Beverages', price: 2.9 },
  { id: 'frozen', name: 'Frozen', price: 5.0 },
  // Additional commonly searched items
  { id: 'rice', name: 'Rice', price: 1.2 },
  { id: 'wheat', name: 'Wheat Flour', price: 1.5 },
  { id: 'oil', name: 'Cooking Oil', price: 3.8 },
  { id: 'eggs', name: 'Eggs', price: 2.4 },
  { id: 'milk', name: 'Milk', price: 1.1 },
  { id: 'bread', name: 'Bread', price: 1.6 },
  { id: 'chicken', name: 'Chicken', price: 6.5 },
  { id: 'water', name: 'Mineral Water', price: 0.9 },
  { id: 'coffee', name: 'Coffee', price: 4.5 },
  { id: 'tea', name: 'Tea', price: 2.7 },
];

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const suggestions = useMemo(() => {
    if (!query || query.trim() === '') return [] as CatalogItem[];
    const q = query.trim().toLowerCase();
    return CATALOG.filter(i => i.name.toLowerCase().includes(q)).slice(0, 5);
  }, [query]);

  const addByQuery = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const match = CATALOG.find(i => i.name.toLowerCase() === q) || suggestions[0];
    if (!match) return;
    setCart(prev => {
      const existing = prev.find(c => c.id === match.id);
      if (existing) return prev.map(c => c.id === match.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: match.id, name: match.name, price: match.price, qty: 1 }];
    });
    setQuery('');
  };

  const increment = (id: string) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: c.qty + 1 } : c));
  };

  const decrement = (id: string) => {
    setCart(prev => prev.flatMap(c => c.id !== id ? [c] : (c.qty <= 1 ? [] : [{ ...c, qty: c.qty - 1 }])));
  };

  const total = useMemo(() => cart.reduce((sum, c) => sum + c.qty * c.price, 0), [cart]);

  const proceed = () => {
    setCart([]);
  };

  // ---- Design tokens ----
  const t = tokens;

  // ---- Modular components ----
  const SectionHeader = ({ title }: { title: string }) => (
    <View style={{ marginVertical: 8 }}>
      <ThemedText style={{ fontWeight: '700', fontSize: 16 }}>{title}</ThemedText>
    </View>
  );

  const SearchBar = () => (
    <View style={styles.searchWrap}>
      <IconSymbol name="magnifyingglass" size={18} color={t.color.muted} />
      <TextInput
        placeholder="Search and add to cart"
        placeholderTextColor={t.color.muted}
        value={query}
        onChangeText={setQuery}
        style={styles.searchInput}
        onSubmitEditing={addByQuery}
        returnKeyType="search"
        keyboardType="default"
        autoCapitalize="none"
        autoCorrect={false}
        blurOnSubmit={false}
        accessibilityLabel="Search inventory to add to cart"
      />
      <TouchableOpacity
        onPress={addByQuery}
        style={styles.addSearchBtn}
        accessibilityRole="button"
        accessibilityLabel="Add searched item to cart"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <IconSymbol name="plus" size={18} color={t.color.onPrimary} />
      </TouchableOpacity>
    </View>
  );

  const CartItemRow = ({ item }: { item: CartItem }) => (
    <View style={styles.cartRow}>
      <View style={{ flex: 1 }}>
        <ThemedText style={{ fontWeight: '700' }}>{item.name}</ThemedText>
        <ThemedText darkColor={t.color.muted}>${item.price.toFixed(2)} each</ThemedText>
      </View>
      <View style={styles.qtyWrap}>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => decrement(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${item.name}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.qtyBtnText}>-</Text>
        </TouchableOpacity>
        <ThemedText style={styles.qtyText}>{item.qty}</ThemedText>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => increment(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${item.name}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <ThemedText style={{ width: 70, textAlign: 'right', fontWeight: '700' }}>${(item.qty * item.price).toFixed(2)}</ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={{ fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', opacity: 1 ,paddingBottom: 4,paddingTop: 4}}>Cart</ThemedText>
          <View style={styles.headerRight}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Clear cart"
              onPress={() => setCart([])}
              style={styles.clearBtn}
              disabled={cart.length === 0}
            >
              <IconSymbol name="trash" size={16} color={cart.length === 0 ? '#6B7280' : '#FCA5A5'} />
            </TouchableOpacity>
            <View style={styles.countBadge}>
              <ThemedText style={styles.countBadgeText}>{cart.reduce((s, c) => s + c.qty, 0)}</ThemedText>
            </View>
          </View>
        </View>

        <SearchBar />
        {suggestions.length > 0 && (
          <View style={styles.suggestionBar}>
            {suggestions.map(s => (
              <TouchableOpacity key={s.id} style={styles.suggestionChip} onPress={() => { setQuery(s.name); }}>
                <ThemedText>{s.name}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <SectionHeader title="" />
        <View style={[styles.cartBox, cart.length === 0 ? styles.cartBoxEmpty : styles.cartBoxFilled]}>
          {cart.length === 0 ? (
            <ThemedText darkColor="#9BA1A6">Cart is empty</ThemedText>
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

        <View style={styles.totalRow}>
          <ThemedText style={styles.totalLabel}>Total</ThemedText>
          <ThemedText style={styles.totalValue}>${total.toFixed(2)}</ThemedText>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#121212' },
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 15 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearBtn: { backgroundColor: '#1F2937', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  countBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#3b82f6' },
  countBadgeText: { color: '#3b82f6', fontWeight: '700', fontSize: 14 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1F1F1F', borderRadius: 14, paddingHorizontal: 14, height: 48, marginBottom: 10, borderWidth: 1, borderColor: '#27272A' },
  searchInput: { flex: 1, color: '#FFFFFF', paddingVertical: 0 },
  addSearchBtn: { backgroundColor: 'transparent', width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  section: { marginVertical: 8, fontWeight: '700' },
  suggestionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  suggestionChip: { backgroundColor: '#1A1A1A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  cartBox: { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 12, flex: 1, borderWidth: 1, borderColor: '#232323' },
  cartBoxFilled: { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 12, minHeight: 140, maxHeight: 380, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, borderWidth: 1, borderColor: '#232323' },
  cartBoxEmpty: { backgroundColor: 'transparent', borderRadius: 0, padding: 0, flexGrow: 0 },
  cartRow: { flexDirection: 'row', alignItems: 'center' },
  qtyWrap: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#232323', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2F2F2F' },
  qtyBtnText: { color: '#FFFFFF', fontSize: 18, lineHeight: 18 },
  qtyText: { width: 32, textAlign: 'center', fontWeight: '700' },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  totalLabel: { fontWeight: '700', fontSize: 16 },
  totalValue: { fontWeight: '800', fontSize: 18 },
  proceed: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 14, marginTop: 12, gap: 8, opacity: 1 },
  proceedText: { color: '#FFFFFF', fontWeight: '700' },
});

// Minimal design tokens for consistent spacing/colors
const tokens = {
  color: {
    muted: '#9BA1A6',
    onPrimary: '#FFFFFF',
  },
};
