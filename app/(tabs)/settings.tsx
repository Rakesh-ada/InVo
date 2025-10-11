import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { weeklyReportService } from '@/services/weekly-report';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import * as FileSystem from 'expo-file-system';
// import * * Sharing from 'expo-sharing';
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
  const router = useRouter();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
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

  const handleGenerateReport = useCallback(async () => {
    setIsGeneratingReport(true);
    try {
      await weeklyReportService.generateAndDownloadReport();
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? This will clear all your data and reset the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all AsyncStorage data
              await AsyncStorage.multiRemove([
                '@invo_settings',
                '@profile_name',
                '@business_name',
                '@dark_mode',
                '@auto_sync',
                '@onboarding_complete',
                '@products_form_data',
                '@search_history',
                '@cart_data',
                '@daily_sales_data',
                '@inventory_ignored_ids',
                '@dashboard_preferences',
                '@product_view_history'
              ]);

              // Clear any edit drafts
              const keys = await AsyncStorage.getAllKeys();
              const editDraftKeys = keys.filter(key => key.startsWith('@edit_draft_'));
              if (editDraftKeys.length > 0) {
                await AsyncStorage.multiRemove(editDraftKeys);
              }

              // Clear database (reset to initial state)
              try {
                const { dbService } = await import('@/services/database');
                await dbService.resetDatabase();
              } catch (e) {
                console.warn('Failed to reset database:', e);
              }

              Alert.alert('Success', 'Logged out successfully! App will reset to onboarding.', [
                {
                  text: 'OK',
                  onPress: () => {
                    // Navigate to onboarding
                    router.replace('/onboarding');
                  }
                }
              ]);
            } catch (error) {
              console.error('Failed to logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  }, [router]);

  const logout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? This will clear your data and show the onboarding screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear onboarding completion flag to show onboarding again
              await AsyncStorage.removeItem('@onboarding_complete');
              // Navigate to index which will redirect to onboarding
              router.replace('/');
            } catch (e) {
              console.warn('Failed to logout', e);
            }
          }
        }
      ]
    );
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
            <TouchableOpacity 
              onPress={handleLogout}
              activeOpacity={0.7}
              style={styles.logoutButton}
            >
              <IconSymbol name="arrow.right.square" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Business Settings */}
        <View style={styles.section}>
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
                placeholder="Business name"
                placeholderTextColor="#6B7280"
              />
            </View>
          </View>
        </View>

        {/* Business QR */}
        <View style={styles.section}>
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <IconSymbol name="qrcode" size={20} color="#FFFFFF" />
                <ThemedText style={styles.settingLabel}>Business QR Code</ThemedText>
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

        {/* Additional Features */}
        <View style={styles.section}>
          <View style={styles.settingCardWithSpacing}>
            <TouchableOpacity 
              style={styles.settingRow} 
              activeOpacity={0.7}
              onPress={() => router.push('/suppliers')}
            >
              <View style={styles.settingLeft}>
                <IconSymbol name="person.fill" size={20} color="#FFFFFF" />
                <ThemedText style={styles.settingLabel}>Suppliers</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={16} color="#9BA1A6" />
            </TouchableOpacity>
          </View>

          <View style={styles.settingCardWithSpacing}>
            <TouchableOpacity 
              style={styles.settingRow} 
              activeOpacity={0.7}
              onPress={() => router.push('/ai-chat')}
            >
              <View style={styles.settingLeft}>
                <IconSymbol name="sparkles" size={20} color="#FFFFFF" />
                <ThemedText style={styles.settingLabel}>Ask InVo AI</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={16} color="#9BA1A6" />
            </TouchableOpacity>
          </View>

          <View style={styles.settingCard}>
            <TouchableOpacity 
              style={styles.settingRow} 
              activeOpacity={0.7}
              onPress={handleGenerateReport}
              disabled={isGeneratingReport}
            >
              <View style={styles.settingLeft}>
                <IconSymbol name="chart.bar.fill" size={20} color="#FFFFFF" />
                <ThemedText style={styles.settingLabel}>Weekly Report</ThemedText>
              </View>
              {isGeneratingReport ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <IconSymbol name="chevron.right" size={16} color="#9BA1A6" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          
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
    borderBottomColor: 'transparent',
    paddingVertical: 4,
  },
  settingCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    marginBottom: 0,
  },
  settingCardWithSpacing: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    marginBottom: 12,
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
    textAlign: 'center',
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
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
