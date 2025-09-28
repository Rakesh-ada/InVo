import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { dbService } from '@/services/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import * as FileSystem from 'expo-file-system';
// import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';

type SettingsData = {
  profileName: string;
  businessName: string;
  isDarkMode: boolean;
  autoSync: boolean;
  profileImageUri?: string | null;
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState<SettingsData>({
    profileName: 'John Doe',
    businessName: 'My Business',
    isDarkMode: true,
    autoSync: false,
    profileImageUri: null,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('@invo_settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
  };

  const saveSettings = async (newSettings: SettingsData) => {
    try {
      setSettings(newSettings);
      await AsyncStorage.setItem('@invo_settings', JSON.stringify(newSettings));
      
      // Also save individual settings for quick access
      await AsyncStorage.setItem('@profile_name', newSettings.profileName);
      await AsyncStorage.setItem('@business_name', newSettings.businessName);
      await AsyncStorage.setItem('@dark_mode', JSON.stringify(newSettings.isDarkMode));
      await AsyncStorage.setItem('@auto_sync', JSON.stringify(newSettings.autoSync));
      
    } catch (e) {
      console.warn('Failed to save settings:', e);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const updateSetting = useCallback((key: keyof SettingsData, value: any) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  }, [settings]);

  const pickProfileImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        updateSetting('profileImageUri', result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to select image');
    }
  }, [updateSetting]);

  const exportData = async () => {
    try {
      // Get products data via SQLite database
      await dbService.initDatabase();
      const products = await dbService.getProducts();

      // Get cart data if available
      const cartData = await AsyncStorage.getItem('@cart_items');
      const cart = cartData ? JSON.parse(cartData) : [];

      // Create export data
      const exportData = {
        businessName: settings.businessName,
        exportDate: new Date().toISOString(),
        products: products,
        cart: cart,
        settings: settings,
      };

      // Save export history
      const exportHistory = await AsyncStorage.getItem('@export_history');
      const history = exportHistory ? JSON.parse(exportHistory) : [];
      const newExport = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        productCount: products.length,
        cartItemCount: cart.length,
      };
      history.unshift(newExport);
      await AsyncStorage.setItem('@export_history', JSON.stringify(history.slice(0, 10)));

      // For now, just show the JSON data in an alert
      // In a real app, you'd implement proper file sharing
      Alert.alert(
        'Export Data', 
        `JSON Report Generated\\n\\nProducts: ${products.length}\\nCart Items: ${cart.length}\\nExport saved to history.`,
        [{ text: 'OK' }]
      );
    } catch (e) {
      console.warn('Export failed:', e);
      Alert.alert('Export Failed', 'Could not export data');
    }
  };

  const bg = Colors.dark.background;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Settings</ThemedText>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Profile</ThemedText>
          <View style={styles.profileCard}>
            <TouchableOpacity style={styles.profileImage} onPress={pickProfileImage} activeOpacity={0.8}>
              {settings.profileImageUri ? (
                <Image source={{ uri: settings.profileImageUri }} style={styles.profileImageImg} resizeMode="cover" />
              ) : (
                <IconSymbol name="person.fill" size={40} color="#FFFFFF" />
              )}
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <TextInput
                value={settings.profileName}
                onChangeText={(text) => updateSetting('profileName', text)}
                style={styles.profileNameInput}
                placeholder="Your Name"
                placeholderTextColor="#6B7280"
              />
            </View>
          </View>
        </View>

        {/* Business Settings */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Business</ThemedText>
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <IconSymbol name="building.2" size={20} color="#FFFFFF" />
                <ThemedText style={styles.settingLabel}>Business Name</ThemedText>
              </View>
              <TextInput
                value={settings.businessName}
                onChangeText={(text) => updateSetting('businessName', text)}
                style={styles.businessNameInput}
                placeholder="Enter business name"
                placeholderTextColor="#6B7280"
              />
            </View>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>App Settings</ThemedText>
          
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <IconSymbol name="moon.fill" size={20} color="#FFFFFF" />
                <ThemedText style={styles.settingLabel}>Dark Mode</ThemedText>
              </View>
              <Switch
                value={settings.isDarkMode}
                onValueChange={(value) => updateSetting('isDarkMode', value)}
                trackColor={{ false: '#2A2A2A', true: '#3b82f6' }}
                thumbColor={settings.isDarkMode ? '#FFFFFF' : '#9BA1A6'}
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <IconSymbol name="arrow.clockwise" size={20} color="#FFFFFF" />
                <ThemedText style={styles.settingLabel}>Auto Sync</ThemedText>
              </View>
              <Switch
                value={settings.autoSync}
                onValueChange={(value) => updateSetting('autoSync', value)}
                trackColor={{ false: '#2A2A2A', true: '#3b82f6' }}
                thumbColor={settings.autoSync ? '#FFFFFF' : '#9BA1A6'}
              />
            </View>
          </View>
        </View>

        {/* Export Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Data</ThemedText>
          <TouchableOpacity style={styles.exportButton} onPress={exportData}>
            <View style={styles.exportLeft}>
              <IconSymbol name="square.and.arrow.up" size={20} color="#FFFFFF" />
              <ThemedText style={styles.exportLabel}>Export JSON Report</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#9BA1A6" />
          </TouchableOpacity>
        </View>
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
    marginBottom: 24,
    marginTop: 43,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#FFFFFF',
  },
  profileCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileImageImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileInfo: {
    flex: 1,
  },
  profileNameInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    paddingVertical: 4,
  },
  settingCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    color: '#FFFFFF',
  },
  businessNameInput: {
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 150,
    textAlign: 'right',
  },
  exportButton: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    color: '#FFFFFF',
  },
});
