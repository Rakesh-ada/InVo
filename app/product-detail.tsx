import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { dbService, Product } from '@/services/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, Image, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProductDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bg = Colors.dark.background;

  const [product, setProduct] = useState<Product | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Edit form state
  const [nameInput, setNameInput] = useState('');
  const [buyingPriceInput, setBuyingPriceInput] = useState('');
  const [sellingPriceInput, setSellingPriceInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [expiryDateInput, setExpiryDateInput] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  

  const loadProduct = useCallback(async () => {
    try {
      if (!id) return;
      
      const products = await dbService.getProducts();
      const found = products.find(p => p.id === id);
      if (found) {
        setProduct(found);
        setNameInput(found.name);
        setBuyingPriceInput(found.buyingPrice.toString());
        setSellingPriceInput(found.sellingPrice.toString());
        setQuantityInput(found.quantity.toString());
        setExpiryDateInput(found.expiryDate);
        setSelectedDate(new Date(found.expiryDate || new Date()));
        
        // Save to view history
        const viewHistory = await AsyncStorage.getItem('@product_view_history');
        const history = viewHistory ? JSON.parse(viewHistory) : [];
        const viewRecord = {
          id: found.id,
          name: found.name,
          viewedAt: new Date().toISOString(),
          price: found.sellingPrice,
        };
        const updatedHistory = [viewRecord, ...history.filter((h: any) => h.id !== found.id)].slice(0, 20);
        await AsyncStorage.setItem('@product_view_history', JSON.stringify(updatedHistory));
      }
    } catch (e) {
      console.warn('Failed to load product details:', e);
      Alert.alert('Error', 'Failed to load product details');
    }
  }, [id]);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      setExpiryDateInput(date.toISOString().split('T')[0]);
    }
  };

  const saveEditDraft = useCallback(async () => {
    if (product && isEditMode) {
      try {
        const draft = {
          productId: product.id,
          nameInput,
          buyingPriceInput,
          sellingPriceInput,
          quantityInput,
          expiryDateInput,
          savedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(`@edit_draft_${product.id}`, JSON.stringify(draft));
      } catch (error) {
        console.warn('Failed to save edit draft:', error);
      }
    }
  }, [product, isEditMode, nameInput, buyingPriceInput, sellingPriceInput, quantityInput, expiryDateInput]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  // Save edit drafts when editing
  useEffect(() => {
    const timer = setTimeout(() => {
      saveEditDraft();
    }, 1000); // Save draft after 1 second of no changes
    
    return () => clearTimeout(timer);
  }, [nameInput, buyingPriceInput, sellingPriceInput, quantityInput, expiryDateInput, saveEditDraft]);

  const handleSave = useCallback(async () => {
    if (!product) return;

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

    try {
      const updatedProduct: Product = {
        ...product,
        name: trimmedName,
        buyingPrice,
        sellingPrice,
        quantity,
        expiryDate: expiryDateInput || product.expiryDate,
      };
      
      await dbService.updateProduct(updatedProduct);
      setProduct(updatedProduct);
      setIsEditMode(false);
      
      // Clear edit draft after successful save
      try {
        await AsyncStorage.removeItem(`@edit_draft_${product.id}`);
      } catch (error) {
        console.warn('Failed to clear edit draft:', error);
      }
      
      Alert.alert('Success', 'Product updated successfully');
    } catch (e) {
      Alert.alert('Error', 'Failed to update product');
    }
  }, [product, nameInput, buyingPriceInput, sellingPriceInput, quantityInput, expiryDateInput]);

  const handleDelete = useCallback(async () => {
    if (!product) return;

    try {
      await dbService.deleteProduct(product.id);
      Alert.alert('Success', 'Product deleted successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to delete product');
    }
  }, [product, router]);

  const cancelEdit = async () => {
    if (product) {
      setNameInput(product.name);
      setBuyingPriceInput(product.buyingPrice.toString());
      setSellingPriceInput(product.sellingPrice.toString());
      setQuantityInput(product.quantity.toString());
      setExpiryDateInput(product.expiryDate);
      setSelectedDate(new Date(product.expiryDate || new Date()));
      
      // Clear edit draft
      try {
        await AsyncStorage.removeItem(`@edit_draft_${product.id}`);
      } catch (error) {
        console.warn('Failed to clear edit draft:', error);
      }
    }
    setIsEditMode(false);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Product Details',
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8 }}>
          {!isEditMode ? (
            <>
              <TouchableOpacity onPress={() => setIsEditMode(true)} style={styles.headerIconBtn}>
                <Image
                  source={require('@/assets/images/edit.png')}
                  style={{ width: 18, height: 18, tintColor: '#FFFFFF' }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsDeleteModalOpen(true)} style={styles.headerIconBtn}>
                <IconSymbol name="trash" size={18} color="#EF4444" />
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      ),
    });
  }, [navigation, isEditMode, handleSave, cancelEdit]);

  if (!product) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        <View style={styles.container}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Product Image */}
          <View style={styles.imageSection}>
            <View style={styles.imageContainer}>
              {product.imageUri ? (
                <Image source={{ uri: product.imageUri }} style={styles.productImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <IconSymbol name="photo" size={40} color="#9BA1A6" />
                  <ThemedText style={styles.imagePlaceholderText} darkColor="#9BA1A6">No image</ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Product Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Product Name</ThemedText>
              {isEditMode ? (
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  style={styles.detailInput}
                  placeholder="Product name"
                  placeholderTextColor="#6B7280"
                />
              ) : (
                <ThemedText style={styles.detailValue}>{product.name}</ThemedText>
              )}
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Buying Price</ThemedText>
              {isEditMode ? (
                <TextInput
                  value={buyingPriceInput}
                  onChangeText={setBuyingPriceInput}
                  keyboardType="decimal-pad"
                  style={styles.detailInput}
                  placeholder="0.00"
                  placeholderTextColor="#6B7280"
                />
              ) : (
                <ThemedText style={styles.detailValue}>₹{product.buyingPrice}</ThemedText>
              )}
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Selling Price</ThemedText>
              {isEditMode ? (
                <TextInput
                  value={sellingPriceInput}
                  onChangeText={setSellingPriceInput}
                  keyboardType="decimal-pad"
                  style={styles.detailInput}
                  placeholder="0.00"
                  placeholderTextColor="#6B7280"
                />
              ) : (
                <ThemedText style={styles.detailValue}>₹{product.sellingPrice}</ThemedText>
              )}
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Quantity</ThemedText>
              {isEditMode ? (
                <TextInput
                  value={quantityInput}
                  onChangeText={setQuantityInput}
                  keyboardType="number-pad"
                  style={styles.detailInput}
                  placeholder="0"
                  placeholderTextColor="#6B7280"
                />
              ) : (
                <ThemedText style={styles.detailValue}>{product.quantity}</ThemedText>
              )}
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Expiry Date</ThemedText>
              {isEditMode ? (
                <View style={styles.datePickerContainer}>
                  <TouchableOpacity 
                    style={styles.datePickerButton} 
                    onPress={() => setShowDatePicker(true)}
                  >
                    <ThemedText style={styles.datePickerText}>
                      {expiryDateInput || 'Select Date'}
                    </ThemedText>
                    <View style={styles.calendarIconContainer}>
                      <IconSymbol name="calendar.badge.plus" size={18} color="#3B82F6" />
                    </View>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      minimumDate={new Date()}
                    />
                  )}
                </View>
              ) : (
                <ThemedText style={styles.detailValue}>{product.expiryDate}</ThemedText>
              )}
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Added Date</ThemedText>
              <ThemedText style={styles.detailValue}>{new Date(product.addedDate).toLocaleDateString()}</ThemedText>
            </View>
          </View>

          {/* Edit Actions */}
          {isEditMode && (
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
                <ThemedText>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal visible={isDeleteModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ThemedText type="subtitle" style={{ marginBottom: 12 }}>Delete Product</ThemedText>
            <ThemedText style={{ marginBottom: 20, color: '#9BA1A6' }}>
              Are you sure you want to delete "{product.name}"? This action cannot be undone.
            </ThemedText>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsDeleteModalOpen(false)}>
                <ThemedText>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 24,
    marginTop: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  content: {
    flex: 1,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imageContainer: {
    width: 500,
    height: 250,
    borderRadius: 24,
    backgroundColor: '#1F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImage: {
    width: 500,
    height: 250,
    borderRadius: 24,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 14,
    marginTop: 8,
  },
  detailsSection: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#9BA1A6',
    textAlign: 'right',
    flex: 1,
  },
  detailInput: {
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'right',
    flex: 1,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  datePickerContainer: {
    flex: 1,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flex: 1,
    borderWidth: 1,
    borderColor: '#3B82F6',
    minHeight: 44,
  },
  datePickerText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'right',
    flex: 1,
  },
  calendarIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
