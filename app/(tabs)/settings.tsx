import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import React from 'react';
import { StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const [darkMode, setDarkMode] = React.useState(true);
  const [notifications, setNotifications] = React.useState(true);
  const [locationServices, setLocationServices] = React.useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle} lightColor="#000000" darkColor="#FFFFFF">Settings</ThemedText>
          <TouchableOpacity style={styles.actionButton}>
            <IconSymbol name="person.crop.circle.fill" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>App Settings</ThemedText>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <IconSymbol name="moon.fill" size={22} color="#9BA1A6" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Dark Mode</ThemedText>
            </View>
            <Switch 
              value={darkMode} 
              onValueChange={setDarkMode} 
              trackColor={{ false: '#3e3e3e', true: '#2563eb' }}
              thumbColor="#ffffff"
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <IconSymbol name="bell.fill" size={22} color="#9BA1A6" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Notifications</ThemedText>
            </View>
            <Switch 
              value={notifications} 
              onValueChange={setNotifications}
              trackColor={{ false: '#3e3e3e', true: '#2563eb' }}
              thumbColor="#ffffff"
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <IconSymbol name="location.fill" size={22} color="#9BA1A6" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Location Services</ThemedText>
            </View>
            <Switch 
              value={locationServices} 
              onValueChange={setLocationServices}
              trackColor={{ false: '#3e3e3e', true: '#2563eb' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Account</ThemedText>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.settingInfo}>
              <IconSymbol name="person.fill" size={22} color="#9BA1A6" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Profile Information</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color="#9BA1A6" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.settingInfo}>
              <IconSymbol name="lock.fill" size={22} color="#9BA1A6" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Security</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color="#9BA1A6" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.settingInfo}>
              <IconSymbol name="creditcard.fill" size={22} color="#9BA1A6" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Payment Methods</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color="#9BA1A6" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>About</ThemedText>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.settingInfo}>
              <IconSymbol name="info.circle.fill" size={22} color="#9BA1A6" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>App Information</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color="#9BA1A6" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.settingInfo}>
              <IconSymbol name="doc.text.fill" size={22} color="#9BA1A6" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Terms of Service</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color="#9BA1A6" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.settingInfo}>
              <IconSymbol name="hand.raised.fill" size={22} color="#9BA1A6" style={styles.settingIcon} />
              <ThemedText style={styles.settingLabel}>Privacy Policy</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color="#9BA1A6" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton}>
          <ThemedText style={styles.logoutText}>Log Out</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#121212',
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    opacity: 1,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#3b82f6',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 16,
  },
});