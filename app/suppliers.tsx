import { ThemedText } from '@/components/themed-text';
import { ArrowRightIcon } from '@/components/ui/arrow-right-icon';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
// eslint-disable-next-line import/namespace
import { dbService, Supplier } from '@/services/database';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SupplierRowProps = {
  supplier: Supplier;
  onPress: (supplier: Supplier) => void;
  onLongPress: (supplier: Supplier) => void;
  onOrderPress: (supplier: Supplier) => void;
};

function SupplierRow({ supplier, onPress, onLongPress, onOrderPress }: SupplierRowProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.row, { backgroundColor: '#1F1F1F' }]}
      onPress={() => onPress(supplier)}
      onLongPress={() => onLongPress(supplier)}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.rowIconWrap, { backgroundColor: '#3B82F6' }]}>
          <IconSymbol name="person.fill" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.rowContent}>
          <ThemedText style={styles.rowTitle}>{supplier.name}</ThemedText>
          <ThemedText style={styles.rowSubtitle} darkColor="#9BA1A6">Tap for details</ThemedText>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.orderButton} 
        activeOpacity={0.7}
        onPress={() => onOrderPress(supplier)}
      >
        <ArrowRightIcon size={20} color="#3B82F6" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <IconSymbol name="person.fill" size={64} color="#9BA1A6" />
      </View>
      <ThemedText style={styles.emptyTitle}>No Suppliers Yet</ThemedText>
      <ThemedText style={styles.emptySubtitle} darkColor="#9BA1A6">
        Start by adding your first supplier
      </ThemedText>
    </View>
  );
}

export default function SuppliersScreen() {
  const router = useRouter();
  const bg = Colors.dark.background;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [whatsappInput, setWhatsappInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  const loadSuppliers = useCallback(async () => {
    try {
      console.log('Loading suppliers from database...');
      
      // Check if database is healthy first
      const isHealthy = await dbService.checkDatabaseHealth();
      if (!isHealthy) {
        console.log('Database not healthy, initializing...');
        await dbService.initDatabase();
      }
      
      const suppliers = await dbService.getSuppliers();
      console.log(`Loaded ${suppliers.length} suppliers from database`);
      setSuppliers(suppliers);
    } catch (e) {
      console.error('Failed to load suppliers', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      
      Alert.alert(
        'Database Error',
        `Failed to load suppliers: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useFocusEffect(
    useCallback(() => {
      loadSuppliers();
      return () => {};
    }, [loadSuppliers])
  );

  const openAddForm = () => setIsAddOpen(true);
  const closeAddForm = () => {
    setIsAddOpen(false);
    setNameInput('');
    setPhoneInput('');
    setWhatsappInput('');
    setEmailInput('');
  };

  const handleAddSupplier = async () => {
    const trimmedName = nameInput.trim();
    const trimmedPhone = phoneInput.trim();
    const trimmedWhatsapp = whatsappInput.trim();
    const trimmedEmail = emailInput.trim();
    
    if (!trimmedName) {
      Alert.alert('Validation', 'Please enter a supplier name.');
      return;
    }
    if (!trimmedPhone) {
      Alert.alert('Validation', 'Please enter a phone number.');
      return;
    }
    if (!trimmedWhatsapp) {
      Alert.alert('Validation', 'Please enter a WhatsApp number.');
      return;
    }
    
    try {
      console.log('Adding supplier:', {
        name: trimmedName,
        phoneNumber: trimmedPhone,
        whatsappNumber: trimmedWhatsapp,
        email: trimmedEmail || undefined,
      });

      await dbService.addSupplier({
        name: trimmedName,
        phoneNumber: trimmedPhone,
        whatsappNumber: trimmedWhatsapp,
        email: trimmedEmail || undefined,
      });
      
      // Reload suppliers to get updated list
      await loadSuppliers();
      closeAddForm();
      
      Alert.alert('Success', 'Supplier added successfully!');
    } catch (e) {
      console.error('Failed to add supplier:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to save supplier: ${errorMessage}`);
    }
  };

  const handleSupplierPress = (supplier: Supplier) => {
    // Show supplier information
    Alert.alert(
      supplier.name,
      `Phone: ${supplier.phoneNumber}\nWhatsApp: ${supplier.whatsappNumber}${supplier.email ? `\nEmail: ${supplier.email}` : ''}`,
      [{ text: 'OK' }]
    );
  };

  const handleSupplierLongPress = (supplier: Supplier) => {
    // Delete supplier on long press
    Alert.alert(
      'Delete Supplier',
      `Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await dbService.deleteSupplier(supplier.id);
              await loadSuppliers();
              Alert.alert('Success', 'Supplier deleted successfully!');
            } catch (error) {
              console.error('Failed to delete supplier:', error);
              Alert.alert('Error', 'Failed to delete supplier. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleOrderPress = (supplier: Supplier) => {
    // Navigate to the supplier order page
    router.push({
      pathname: '/supplier-order',
      params: { supplierId: supplier.id }
    });
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback to settings tab if can't go back
      router.replace('/(tabs)/settings');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backIconButton}>
            <IconSymbol name="chevron.left" size={28} color="white" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <ThemedText type="title">Suppliers</ThemedText>
          </View>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.listWrap}>
          {suppliers.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={styles.list}>
              <FlatList
                data={suppliers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <SupplierRow
                    supplier={item}
                    onPress={handleSupplierPress}
                    onLongPress={handleSupplierLongPress}
                    onOrderPress={handleOrderPress}
                  />
                )}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 4 }}
              />
            </View>
          )}
        </View>

        {/* Floating Add Button */}
        <TouchableOpacity style={styles.floatingAddButton} onPress={openAddForm}>
          <IconSymbol name="plus" size={32} color="#FFFFFF" />
        </TouchableOpacity>

        <Modal visible={isAddOpen} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCard}>
              <ThemedText type="subtitle" style={{ marginBottom: 12 }}>Add Supplier</ThemedText>
              
              <View style={{ gap: 12 }}>
                <View>
                  <ThemedText style={styles.inputLabel} darkColor="#9BA1A6">Supplier Name</ThemedText>
                  <TextInput
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="e.g., ABC Distributors"
                    placeholderTextColor="#6B7280"
                    style={styles.input}
                  />
                </View>
                
                <View>
                  <ThemedText style={styles.inputLabel} darkColor="#9BA1A6">Phone Number</ThemedText>
                  <TextInput
                    value={phoneInput}
                    onChangeText={setPhoneInput}
                    keyboardType="phone-pad"
                    placeholder="e.g., +91 9876543210"
                    placeholderTextColor="#6B7280"
                    style={styles.input}
                  />
                </View>

                <View>
                  <ThemedText style={styles.inputLabel} darkColor="#9BA1A6">WhatsApp Number</ThemedText>
                  <TextInput
                    value={whatsappInput}
                    onChangeText={setWhatsappInput}
                    keyboardType="phone-pad"
                    placeholder="e.g., +91 9876543210"
                    placeholderTextColor="#6B7280"
                    style={styles.input}
                  />
                </View>

                <View>
                  <ThemedText style={styles.inputLabel} darkColor="#9BA1A6">Email (Optional)</ThemedText>
                  <TextInput
                    value={emailInput}
                    onChangeText={setEmailInput}
                    keyboardType="email-address"
                    placeholder="e.g., supplier@example.com"
                    placeholderTextColor="#6B7280"
                    style={styles.input}
                    autoCapitalize="none"
                  />
                </View>
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#2A2A2A' }]} onPress={closeAddForm}>
                  <ThemedText>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#3B82F6' }]} onPress={handleAddSupplier}>
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
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 40,
    marginLeft: 4,
    marginRight: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft:35,
  },
  backIconButton: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
    width: 40,
    height: 40,
    backgroundColor: 'transparent',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listWrap: {
    flex: 1,
    marginLeft: 4,
    marginRight: 4,
    marginTop: 8,
  },
  list: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingHorizontal: 8,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontWeight: '600',
    fontSize: 19,
    marginBottom: 1,
    letterSpacing: 0.2,
  },
  rowSubtitle: {
    fontSize: 13,
    opacity: 0.7,
  },
  orderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
    flex: 1,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
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
});