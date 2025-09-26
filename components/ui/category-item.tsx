import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { IconSymbol } from './icon-symbol';

type CategoryItemProps = {
  title: string;
  iconBgColor: string;
  iconComponent?: React.ReactNode;
  upCount: number;
  downCount: number;
  onPress?: () => void;
  showChevron?: boolean;
  lowStock?: boolean;
};

export function CategoryItem({
  title,
  iconBgColor,
  iconComponent,
  upCount,
  downCount,
  onPress,
  showChevron = true,
  lowStock = false,
}: CategoryItemProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <ThemedView style={styles.container} darkColor="#1A1A1A" lightColor="#FFFFFF">
        <View style={styles.leftContainer}>
          <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
            {iconComponent}
          </View>
          <View style={styles.textContainer}>
            <View style={styles.titleContainer}>
              <ThemedText style={styles.title}>{title}</ThemedText>
              {lowStock && (
                <View style={styles.lowStockContainer}>
                  <ThemedText style={styles.lowStockText}>Low Stock</ThemedText>
                </View>
              )}
            </View>
            <View style={styles.countsContainer}>
              <View style={styles.countItem}>
                <IconSymbol name="arrow.up" size={12} color="#4ade80" />
                <ThemedText style={styles.countTextUp}>{upCount}</ThemedText>
              </View>
              <View style={styles.countItem}>
                <IconSymbol name="arrow.down" size={12} color="#f87171" />
                <ThemedText style={styles.countTextDown}>{downCount}</ThemedText>
              </View>
            </View>
          </View>
        </View>
        {showChevron && <IconSymbol name="chevron.right" size={18} color="#9BA1A6" />}
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    justifyContent: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  lowStockContainer: {
    backgroundColor: '#FFF3F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  lowStockText: {
    fontSize: 10,
    color: '#FF5630',
    fontWeight: '500',
  },
  countsContainer: {
    flexDirection: 'row',
    marginTop: 4,
    alignItems: 'center',
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  countTextUp: {
    fontSize: 12,
    color: '#4ade80', // Lighter green for dark mode
    marginLeft: 2,
  },
  countTextDown: {
    fontSize: 12,
    color: '#f87171', // Lighter red for dark mode
    marginLeft: 2,
  },
});