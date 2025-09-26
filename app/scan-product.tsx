import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScannerAnimation } from '@/components/ui/scanner-animation';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScanProductScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={20} color="#9BA1A6" />
          </TouchableOpacity>
          <ThemedText type="subtitle">Scan Products</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <ThemedView style={styles.scannerContainer}>
          <ThemedView style={styles.productBox}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.productImage}
              contentFit="contain"
            />
          </ThemedView>
          <ScannerAnimation />
          <ThemedText style={styles.scanningText}>Scanning Product</ThemedText>
          <ThemedText style={styles.instructionText}>
            Scanning result will be automatically{"\n"}paid if this item it doesn't exist.
          </ThemedText>
        </ThemedView>

        <TouchableOpacity style={styles.actionButton}>
          <ThemedText style={styles.actionButtonText}>Done</ThemedText>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  productBox: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(9, 160, 219, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  productImage: {
    width: 80,
    height: 80,
  },
  scanningText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 40,
  },
  instructionText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#09a0db',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});