import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
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
  qrPaymentImageUri?: string | null;
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState<SettingsData>({
    profileName: 'John Doe',
    businessName: 'My Business',
    isDarkMode: true,
    autoSync: false,
    profileImageUri: null,
    qrPaymentImageUri: null,
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

  const pickQRPaymentImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for QR code
        quality: 0.9,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        updateSetting('qrPaymentImageUri', result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to select QR payment image');
    }
  }, [updateSetting]);


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

        {/* Payment Settings */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Payment</ThemedText>
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <IconSymbol name="qrcode" size={20} color="#FFFFFF" />
                <ThemedText style={styles.settingLabel}>QR Payment Code</ThemedText>
              </View>
              <TouchableOpacity 
                style={styles.qrImageContainer} 
                onPress={pickQRPaymentImage}
                activeOpacity={0.8}
              >
                {settings.qrPaymentImageUri ? (
                  <Image 
                    source={{ uri: settings.qrPaymentImageUri }} 
                    style={styles.qrImage} 
                    resizeMode="cover" 
                  />
                ) : (
                  <View style={styles.qrPlaceholder}>
                    <IconSymbol name="plus" size={24} color="#9BA1A6" />
                    <ThemedText style={styles.qrPlaceholderText}>Add QR Code</ThemedText>
                  </View>
                )}
              </TouchableOpacity>
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
  qrImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  qrPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  qrPlaceholderText: {
    fontSize: 6,
    color: '#9BA1A6',
    marginTop: 1,
    textAlign: 'center',
    lineHeight: 8,
  },
});
