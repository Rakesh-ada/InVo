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
};

export function CategoryItem({
  title,
  iconBgColor,
  iconComponent,
  upCount,
  downCount,
  onPress,
  showChevron = true,
}: CategoryItemProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <ThemedView style={styles.container} darkColor="#1A1A1A">
        <View style={styles.leftContainer}>
          <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
            {iconComponent}
          </View>
          <View style={styles.textContainer}>
            <ThemedText style={styles.title}>{title}</ThemedText>
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
  title: {
    fontSize: 16,
    fontWeight: '600',
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