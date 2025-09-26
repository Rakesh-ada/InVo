import { SymbolViewProps } from 'expo-symbols';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { IconSymbol } from './icon-symbol';

type MetricCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  icon?: SymbolViewProps['name'];
  percentChange?: number;
};

export function MetricCard({
  title,
  value,
  subtitle,
  backgroundColor,
  textColor = '#FFFFFF',
  icon,
  percentChange,
}: MetricCardProps) {
  return (
    <ThemedView
      style={[styles.card, backgroundColor ? { backgroundColor } : undefined]}
      lightColor={backgroundColor}>
      <View style={styles.header}>
        {icon && (
          <View style={styles.iconContainer}>
            <IconSymbol name={icon} size={24} color={textColor} />
          </View>
        )}
        <View style={styles.titleContainer}>
          <ThemedText style={[styles.value, { color: textColor }]} lightColor={textColor}>
            {value}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: textColor }]} lightColor={textColor}>
            {subtitle || title}
          </ThemedText>
        </View>
      </View>
      {percentChange !== undefined && (
        <View style={styles.footer}>
          <View
            style={[
              styles.percentContainer,
              {
                backgroundColor: percentChange >= 0 ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.25)',
              },
            ]}>
            <View style={styles.percentDot} />
            <ThemedText
              style={[styles.percentText, { color: textColor }]}
              lightColor={textColor}>
              {percentChange >= 0 ? '+' : ''}
              {percentChange}%
            </ThemedText>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    flex: 1,
    minHeight: 140,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.9,
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.8,
    fontWeight: '500',
  },
  percentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    marginRight: 6,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '600',
  },
});