import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.headerTitle} lightColor="#000000" darkColor="#FFFFFF">Explore</ThemedText>
            <TouchableOpacity style={styles.actionButton}>
              <IconSymbol name="magnifyingglass" size={22} color="#3b82f6" />
            </TouchableOpacity>
          </View>

          <View style={styles.featuredSection}>
            <ThemedText style={styles.sectionTitle}>Featured</ThemedText>
            <TouchableOpacity style={styles.featuredCard}>
              <Image
                source={require('@/assets/images/react-logo.png')}
                style={styles.featuredImage}
                contentFit="cover"
              />
              <View style={styles.featuredOverlay}>
                <ThemedText style={styles.featuredTitle}>New Arrivals</ThemedText>
                <ThemedText style={styles.featuredSubtitle}>Discover the latest products</ThemedText>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.categoriesSection}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Categories</ThemedText>
              <TouchableOpacity>
                <ThemedText style={styles.seeAllText}>See All</ThemedText>
              </TouchableOpacity>
            </View>
            
            <View style={styles.categoryRow}>
              <TouchableOpacity style={styles.categoryCard}>
                <View style={[styles.categoryIcon, {backgroundColor: '#e8f5e9'}]}>
                  <IconSymbol name="leaf.fill" size={24} color="green" />
                </View>
                <ThemedText style={styles.categoryText}>Vegetables</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.categoryCard}>
                <View style={[styles.categoryIcon, {backgroundColor: '#fce4ec'}]}>
                  <IconSymbol name="birthday.cake.fill" size={24} color="#d81b60" />
                </View>
                <ThemedText style={styles.categoryText}>Sweet Food</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.categoryCard}>
                <View style={[styles.categoryIcon, {backgroundColor: '#fff3e0'}]}>
                  <IconSymbol name="popcorn.fill" size={24} color="#ff9800" />
                </View>
                <ThemedText style={styles.categoryText}>Snack</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.trendsSection}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Trending</ThemedText>
              <TouchableOpacity>
                <ThemedText style={styles.seeAllText}>See All</ThemedText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.trendingItem}>
              <View style={styles.trendingInfo}>
                <View style={[styles.trendingIcon, {backgroundColor: '#e3f2fd'}]}>
                  <IconSymbol name="chart.line.uptrend.xyaxis" size={24} color="#2196f3" />
                </View>
                <View>
                  <ThemedText style={styles.trendingTitle}>Popular Products</ThemedText>
                  <ThemedText style={styles.trendingSubtitle}>Top 10 this week</ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={18} color="#9BA1A6" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.trendingItem}>
              <View style={styles.trendingInfo}>
                <View style={[styles.trendingIcon, {backgroundColor: '#f3e5f5'}]}>
                  <IconSymbol name="flame.fill" size={24} color="#9c27b0" />
                </View>
                <View>
                  <ThemedText style={styles.trendingTitle}>Hot Deals</ThemedText>
                  <ThemedText style={styles.trendingSubtitle}>Limited time offers</ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={18} color="#9BA1A6" />
            </TouchableOpacity>
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollView: {
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
  featuredSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  featuredCard: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  featuredTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  featuredSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  categoriesSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryCard: {
    alignItems: 'center',
    width: '30%',
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    textAlign: 'center',
  },
  trendsSection: {
    marginBottom: 24,
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 12,
  },
  trendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendingIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendingSubtitle: {
    fontSize: 14,
    color: '#9BA1A6',
    marginTop: 4,
  },
});
