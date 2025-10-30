import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SearchIcon } from '@/components/ui/search-icon';
import { Colors } from '@/constants/theme';
import { dbService, Product } from '@/services/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type StatProps = {
  label: string;
  value: string;
  deltaLabel: string;
  deltaColor: string;
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

type ProductRowProps = {
  product: Product;
  onMeasure?: (height: number) => void;
};

const ROW_HEIGHT = 64;
const SEPARATOR_HEIGHT = 4;
const VISIBLE_ITEMS = 5;
const MAX_LIST_HEIGHT = 350;

function ProductRow({ product, onMeasure, onPress }: ProductRowProps & { onPress: (product: Product) => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.row}
      onPress={() => onPress(product)}
      onLayout={(e) => {
        if (onMeasure) onMeasure(e.nativeEvent.layout.height);
      }}
    >
      <View style={styles.rowLeft}>
        <View style={styles.rowIconWrap}>
          {product.imageUri ? (
            <Image source={{ uri: product.imageUri }} style={styles.rowIcon} resizeMode="cover" />
          ) : (
            <Image source={require('@/assets/images/partial-react-logo.png')} style={styles.rowIcon} resizeMode="contain" />
          )}
        </View>
        <View style={styles.rowContent}>
          <ThemedText style={styles.rowTitle}>{product.name}</ThemedText>
          <View style={styles.rowDetails}>
            <ThemedText style={styles.rowDetailPrice}>₹{product.sellingPrice}</ThemedText>
          </View>
        </View>
      </View>
      <ThemedText darkColor="#9BA1A6">›</ThemedText>
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Image 
        source={require('@/assets/images/empty.png')} 
        style={styles.emptyImage} 
        resizeMode="contain" 
      />
      <ThemedText style={styles.emptyTitle}>No Products Yet</ThemedText>
      <ThemedText style={styles.emptySubtitle} darkColor="#9BA1A6">
        Start by adding your first product
      </ThemedText>
    </View>
  );
}

const PRODUCTS_FORM_KEY = '@products_form_data';
const SEARCH_HISTORY_KEY = '@search_history';

type FormData = {
  nameInput: string;
  buyingPriceInput: string;
  sellingPriceInput: string;
  quantityInput: string;
  unitInput: string;
  expiryDateInput: string;
  selectedImage: string | null;
};

export default function ProductsScreen() {
  const router = useRouter();
  const isDark = true;
  const bg = Colors.dark.background;

  const UNIT_OPTIONS = ['pc','kg','g','lt','ml','box','pkt'];

  const [products, setProducts] = useState<Product[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [buyingPriceInput, setBuyingPriceInput] = useState('');
  const [sellingPriceInput, setSellingPriceInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [unitInput, setUnitInput] = useState('pc');
  const [expiryDateInput, setExpiryDateInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [measuredRowHeight, setMeasuredRowHeight] = useState<number | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempExpiryDate, setTempExpiryDate] = useState<Date | null>(null);
  const onMeasureRow = useCallback((h: number) => {
    if (!measuredRowHeight && h > 0) setMeasuredRowHeight(h);
  }, [measuredRowHeight]);

  const saveFormData = useCallback(async () => {
    try {
      const formData: FormData = {
        nameInput,
        buyingPriceInput,
        sellingPriceInput,
        quantityInput,
        unitInput,
        expiryDateInput,
        selectedImage,
      };
      await AsyncStorage.setItem(PRODUCTS_FORM_KEY, JSON.stringify(formData));
    } catch (error) {
      console.warn('Failed to save form data:', error);
    }
  }, [nameInput, buyingPriceInput, sellingPriceInput, quantityInput, unitInput, expiryDateInput, selectedImage]);

  const loadFormData = useCallback(async () => {
    try {
      const storedForm = await AsyncStorage.getItem(PRODUCTS_FORM_KEY);
      const storedHistory = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      
      if (storedForm) {
        const formData: FormData = JSON.parse(storedForm);
        setNameInput(formData.nameInput || '');
        setBuyingPriceInput(formData.buyingPriceInput || '');
        setSellingPriceInput(formData.sellingPriceInput || '');
        setQuantityInput(formData.quantityInput || '');
        setUnitInput(formData.unitInput || 'pc');
        setExpiryDateInput(formData.expiryDateInput || '');
        setSelectedImage(formData.selectedImage || null);
      }
      
      if (storedHistory) {
        setSearchHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.warn('Failed to load form data:', error);
    }
  }, []);

  const saveSearchHistory = useCallback(async (query: string) => {
    if (query.trim()) {
      const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
      setSearchHistory(newHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    }
  }, [searchHistory]);

  // Calculate stats from actual product data
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, product) => sum + product.quantity, 0);

  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const currentProducts = isSearchOpen ? filteredProducts : products;
  const visibleCount = Math.min(currentProducts.length, VISIBLE_ITEMS);
  const baseRowHeight = measuredRowHeight ?? ROW_HEIGHT;
  const computedHeight = baseRowHeight * (visibleCount || VISIBLE_ITEMS) + SEPARATOR_HEIGHT * Math.max((visibleCount || VISIBLE_ITEMS) - 1, 0) + 8;
  const listHeight = Math.min(computedHeight, MAX_LIST_HEIGHT);

  const loadProducts = useCallback(async () => {
    try {
      console.log('Loading products from database...');
      
      // Check if database is healthy first
      const isHealthy = await dbService.checkDatabaseHealth();
      if (!isHealthy) {
        console.log('Database not healthy, initializing...');
        await dbService.initDatabase();
      }
      
      const products = await dbService.getProducts();
      console.log(`Loaded ${products.length} products from database`);
      setProducts(products);
    } catch (e) {
      console.error('Failed to load products', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      
      // Show user-friendly error with reset option
      Alert.alert(
        'Database Error',
        `Failed to load products: ${errorMessage}\n\nWould you like to reset the database?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Reset Database', 
            style: 'destructive',
            onPress: async () => {
              try {
                await dbService.resetDatabase();
                await loadProducts();
                Alert.alert('Success', 'Database reset successfully!');
              } catch (resetError) {
                console.error('Failed to reset database:', resetError);
                Alert.alert('Error', 'Failed to reset database. Please restart the app.');
              }
            }
          }
        ]
      );
    }
  }, []);

  const parseDisplayDate = (value: string): Date | null => {
    // Expecting DD/MM/YYYY
    const match = /^([0-3]\d)\/(0\d|1[0-2])\/(\d{4})$/.exec(value.trim());
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const d = new Date(year, month - 1, day);
    // Validate no rollover
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return d;
  };

  const formatDisplayDate = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  };

  const formatISODate = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const openExpiryDatePicker = useCallback(() => {
    const parsed = expiryDateInput ? parseDisplayDate(expiryDateInput) : null;
    const current = parsed ?? new Date();
    setTempExpiryDate(current);
    setIsDatePickerOpen(true);
  }, [expiryDateInput]);

  const onChangeExpiryDate = useCallback((event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      // On Android, event.type can be 'set' or 'dismissed'
      if (event.type === 'set' && selected) {
        setExpiryDateInput(formatDisplayDate(selected));
      }
      setIsDatePickerOpen(false);
      return;
    }

    // iOS inline/modal behavior
    if (selected) setTempExpiryDate(selected);
  }, []);

  const confirmIosDate = useCallback(() => {
    if (tempExpiryDate) {
      setExpiryDateInput(formatDisplayDate(tempExpiryDate));
    }
    setIsDatePickerOpen(false);
  }, [tempExpiryDate]);

  useEffect(() => {
    loadFormData();
    loadProducts();
  }, [loadProducts, loadFormData]);

  // Save form data when inputs change
  useEffect(() => {
    if (isAddOpen) {
      saveFormData();
    }
  }, [nameInput, buyingPriceInput, sellingPriceInput, quantityInput, unitInput, expiryDateInput, selectedImage, isAddOpen, saveFormData]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
      return () => {};
    }, [loadProducts])
  );

  const openAddForm = () => setIsAddOpen(true);
  const closeAddForm = async () => {
    setIsAddOpen(false);
    setNameInput('');
    setBuyingPriceInput('');
    setSellingPriceInput('');
    setQuantityInput('');
    setExpiryDateInput('');
    setUnitInput('pc');
    setSelectedImage(null);
    
    // Clear saved form data
    try {
      await AsyncStorage.removeItem(PRODUCTS_FORM_KEY);
    } catch (error) {
      console.warn('Failed to clear form data:', error);
    }
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (isSearchOpen) {
      if (searchQuery.trim()) {
        saveSearchHistory(searchQuery);
      }
      setSearchQuery('');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleAddProduct = async () => {
    const trimmedName = nameInput.trim();
    const buyingPrice = Number.parseFloat(buyingPriceInput || '0');
    const sellingPrice = Number.parseFloat(sellingPriceInput || '0');
    const quantity = Number.parseInt(quantityInput || '0', 10);
    
    if (!trimmedName) {
      Alert.alert('Validation', 'Please enter a product name.');
      return;
    }
    if (Number.isNaN(buyingPrice) || Number.isNaN(sellingPrice) || Number.isNaN(quantity)) {
      Alert.alert('Validation', 'Please enter valid numbers for prices and quantity.');
      return;
    }
    if (buyingPrice < 0 || sellingPrice < 0 || quantity < 0) {
      Alert.alert('Validation', 'Prices and quantity must be positive numbers.');
      return;
    }
    
    try {
      console.log('Adding product:', {
        name: trimmedName,
        buyingPrice,
        sellingPrice,
        quantity,
        unit: unitInput,
        expiryDate: expiryDateInput || new Date().toISOString().split('T')[0],
        imageUri: selectedImage || undefined,
      });

      // Normalize date to ISO (YYYY-MM-DD) for DB
      const parsedDisplay = expiryDateInput ? parseDisplayDate(expiryDateInput) : null;
      const expiryISO = (parsedDisplay ? formatISODate(parsedDisplay) : new Date().toISOString().split('T')[0]);

      await dbService.addProduct({
        name: trimmedName,
        buyingPrice,
        sellingPrice,
        quantity,
        unit: unitInput,
        expiryDate: expiryISO,
        imageUri: selectedImage || undefined,
      });
      
      // Reload products to get updated list
      await loadProducts();
      closeAddForm();
      
      Alert.alert('Success', 'Product added successfully!');
    } catch (e) {
      console.error('Failed to add product:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      
      // Provide more specific error messages
      if (errorMessage.includes('NullPointerException')) {
        Alert.alert(
          'Database Error', 
          'Database connection lost. Would you like to reset the database?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Reset Database', 
              style: 'destructive',
              onPress: async () => {
                try {
                  await dbService.resetDatabase();
                  Alert.alert('Success', 'Database reset successfully! Please try adding the product again.');
                } catch (resetError) {
                  console.error('Failed to reset database:', resetError);
                  Alert.alert('Error', 'Failed to reset database. Please restart the app.');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', `Failed to save product: ${errorMessage}`);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}> 
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Products</ThemedText>
          <View style={styles.headerActions}>
            {!isSearchOpen && (
              <TouchableOpacity style={styles.headerButton} onPress={openAddForm}>
              <IconSymbol name="plus" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.headerButton} onPress={toggleSearch}>
              <SearchIcon size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {isSearchOpen && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
            />
            <TouchableOpacity style={styles.searchCloseButton} onPress={() => {
              setIsSearchOpen(false);
              setSearchQuery('');
            }}>
              <IconSymbol name="xmark" size={18} color="#9BA1A6" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsRow}>
          <StatCard 
            label="Total Products" 
            value={currentProducts.length.toString()} 
            deltaLabel="" 
            deltaColor="#3B82F6" 
          />
          <StatCard 
            label="Stock in Hand" 
            value={currentProducts.reduce((sum, product) => sum + product.quantity, 0).toLocaleString()} 
            deltaLabel="" 
            deltaColor="#38BDF8" 
          />
        </View>

        <ThemedText style={styles.sectionTitle} darkColor="#9BA1A6">Products list</ThemedText>

        <View style={styles.listWrap}>
          {currentProducts.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={[styles.list, { height: listHeight }]}> 
              <FlatList
                data={currentProducts}
                keyExtractor={(item) => ('id' in item ? (item as any).id : (item as any).name)}
                renderItem={({ item, index }) => (
                  <ProductRow
                    product={item}
                    onMeasure={index === 0 && !measuredRowHeight ? onMeasureRow : undefined}
                    onPress={(product) => router.push({ pathname: '/product-detail', params: { id: product.id } })}
                  />
                )}
                ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 4 }}
                style={{ flexGrow: 0, height: listHeight }}
                getItemLayout={measuredRowHeight ? ((_, index) => ({ length: measuredRowHeight, offset: (measuredRowHeight + SEPARATOR_HEIGHT) * index, index })) : undefined}
                initialNumToRender={VISIBLE_ITEMS}
              />
            </View>
          )}
        </View>
        <Modal visible={isAddOpen} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCard}>
              <ThemedText type="subtitle" style={{ marginBottom: 12 }}>Add Product</ThemedText>
              <View style={{ gap: 10 }}>
                <View>
                  <ThemedText style={styles.inputLabel} darkColor="#9BA1A6">Product Name</ThemedText>
                  <TextInput
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="e.g., Apples"
                    placeholderTextColor="#6B7280"
                    style={styles.input}
                  />
                </View>
                
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.inputLabel} darkColor="#9BA1A6">Buying Price (₹)</ThemedText>
                    <TextInput
                      value={buyingPriceInput}
                      onChangeText={setBuyingPriceInput}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#6B7280"
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.inputLabel} darkColor="#9BA1A6">Selling Price (₹)</ThemedText>
                    <TextInput
                      value={sellingPriceInput}
                      onChangeText={setSellingPriceInput}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#6B7280"
                      style={styles.input}
                    />
                  </View>
                </View>
                
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.inputLabel} darkColor="#9BA1A6">Quantity</ThemedText>
                    <TextInput
                      value={quantityInput}
                      onChangeText={setQuantityInput}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor="#6B7280"
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.inputLabel} darkColor="#9BA1A6">Expiry Date</ThemedText>
                    <View style={styles.dateFieldContainer}>
                      <TextInput
                        value={expiryDateInput}
                        placeholder="DD/MM/YYYY"
                        placeholderTextColor="#6B7280"
                        style={[styles.input, { paddingRight: 44 }]}
                        editable={false}
                      />
                      <TouchableOpacity style={styles.calendarButton} onPress={openExpiryDatePicker}>
                        <IconSymbol name="calendar" size={20} color="#9BA1A6" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                
                {/* Unit selection */}
                <View>
                  <ThemedText style={styles.inputLabel} darkColor="#9BA1A6">Unit</ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {UNIT_OPTIONS.map(u => (
                      <TouchableOpacity key={u} onPress={() => setUnitInput(u)} style={[styles.unitChip, unitInput === u && styles.unitChipActive]}>
                        <ThemedText style={[styles.unitChipText, unitInput === u && styles.unitChipTextActive]}>{u}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                {isDatePickerOpen && (
                  <View style={{ marginTop: 8 }}>
                    <DateTimePicker
                      value={tempExpiryDate ?? (expiryDateInput ? (parseDisplayDate(expiryDateInput) ?? new Date()) : new Date())}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      minimumDate={new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())}
                      onChange={onChangeExpiryDate}
                    />
                    {Platform.OS === 'ios' && (
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                        <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#3B82F6' }]} onPress={confirmIosDate}>
                          <ThemedText>Done</ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
                
                <View>
                  <ThemedText style={styles.inputLabel} darkColor="#9BA1A6">Product Image</ThemedText>
                  <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                    {selectedImage ? (
                      <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <IconSymbol name="camera" size={24} color="#9BA1A6" />
                        <ThemedText style={styles.imagePlaceholderText} darkColor="#9BA1A6">Tap to select image</ThemedText>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
                
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#2A2A2A' }]} onPress={closeAddForm}>
                  <ThemedText>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#3B82F6' }]} onPress={handleAddProduct}>
                  <ThemedText>Save</ThemedText>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
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
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
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
  sectionTitle: {
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 10,
  },
  listWrap: {
    minHeight: 300,
    marginLeft: 5,
    marginRight: 5,
  },
  list: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  rowIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  rowDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rowDetailQuantity: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9BA1A6',
    marginRight: 12,
  },
  outOfStock: {
    color: '#9BA1A6',
    fontWeight: '700',
    opacity: 0.6,
  },
  rowDetailPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9BA1A6',
    marginRight: 12,
  },
  rowDetailText: {
    fontSize: 12,
    color: '#9BA1A6',
    marginRight: 12,
  },
  rowStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 16,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 6,
    opacity: 0.8,
  },
  input: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#2A2A2A',
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalButton: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateFieldContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  calendarButton: {
    position: 'absolute',
    right: 8,
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePicker: {
    height: 120,
    borderRadius: 10,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 12,
    marginTop: 4,
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  unitChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  unitChipText: {
    fontSize: 12,
    color: '#9BA1A6',
  },
  unitChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#FFFFFF',
    fontSize: 16,
  },
  searchCloseButton: {
    marginLeft: 8,
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
    minHeight: 300,
  },
  emptyImage: {
    width: 150,
    height: 150,
    marginBottom: 32,
    opacity: 0.9,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
    color: '#9BA1A6',
    maxWidth: 280,
  },
});



