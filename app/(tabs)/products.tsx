import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import React, { useCallback, useState } from 'react';
import { FlatList, Image, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';

type StatProps = {
  label: string;
  value: string;
  deltaLabel: string;
  deltaColor: string;
};

function StatCard({ label, value, deltaLabel, deltaColor }: StatProps) {
  return (
    <View style={styles.statCard}>
      <ThemedText style={styles.statLabel} darkColor="#9BA1A6">{label}</ThemedText>
      <ThemedText style={styles.statValue} type="title">{value}</ThemedText>
      <View style={[styles.deltaPill, { backgroundColor: `${deltaColor}22` }]}> 
        <View style={[styles.deltaDot, { backgroundColor: deltaColor }]} />
        <ThemedText style={[styles.deltaText]} darkColor={deltaColor}>{deltaLabel}</ThemedText>
      </View>
    </View>
  );
}

type ProductRowProps = {
  icon: any;
  name: string;
  up: number;
  down: number;
  tint?: string;
  onMeasure?: (height: number) => void;
};

const ROW_HEIGHT = 64;
const SEPARATOR_HEIGHT = 4;
const VISIBLE_ITEMS = 6;

function ProductRow({ icon, name, up, down, tint = '#FFFFFF', onMeasure }: ProductRowProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.row}
      onLayout={(e) => {
        if (onMeasure) onMeasure(e.nativeEvent.layout.height);
      }}
    >
      <View style={styles.rowLeft}>
        <View style={styles.rowIconWrap}>
          <Image source={icon} style={[styles.rowIcon, { tintColor: tint }]} resizeMode="contain" />
        </View>
        <View>
          <ThemedText style={styles.rowTitle}>{name}</ThemedText>
          <View style={styles.rowStats}>
            <ThemedText darkColor="#22C55E">▲ {up}</ThemedText>
            <ThemedText darkColor="#EF4444" style={{ marginLeft: 12 }}>▼ {down}</ThemedText>
          </View>
        </View>
      </View>
      <ThemedText darkColor="#9BA1A6">›</ThemedText>
    </TouchableOpacity>
  );
}

export default function ProductsScreen() {
  const isDark = true;
  const bg = Colors.dark.background;
  const [measuredRowHeight, setMeasuredRowHeight] = useState<number | null>(null);
  const onMeasureRow = useCallback((h: number) => {
    if (!measuredRowHeight && h > 0) setMeasuredRowHeight(h);
  }, [measuredRowHeight]);
  const listHeight = measuredRowHeight
    ? measuredRowHeight * VISIBLE_ITEMS + SEPARATOR_HEIGHT * (VISIBLE_ITEMS - 1) + 8
    : ROW_HEIGHT * VISIBLE_ITEMS + SEPARATOR_HEIGHT * (VISIBLE_ITEMS - 1) + 8;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}> 
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Products</ThemedText>
          <View style={styles.headerActions}>
            <View style={styles.headerCircle} />
            <View style={[styles.headerCircle, { marginLeft: 12 }]} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Total Products" value="128" deltaLabel="+8.00%" deltaColor="#22C55E" />
          <StatCard label="Stock in Hand" value="2,350" deltaLabel="+2.34%" deltaColor="#38BDF8" />
        </View>

        <ThemedText style={styles.sectionTitle} darkColor="#9BA1A6">Products list</ThemedText>

        <View style={styles.listWrap}>
          <View style={[styles.list, { height: listHeight }]}> 
            <FlatList
              data={PRODUCTS}
              keyExtractor={(item) => item.name}
              renderItem={({ item, index }) => (
                <ProductRow
                  icon={item.icon}
                  name={item.name}
                  up={item.up}
                  down={item.down}
                  onMeasure={index === 0 && !measuredRowHeight ? onMeasureRow : undefined}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 4 }}
              style={{ flexGrow: 0, height: listHeight }}
              getItemLayout={measuredRowHeight ? ((_, index) => ({ length: measuredRowHeight, offset: (measuredRowHeight + SEPARATOR_HEIGHT) * index, index })) : undefined}
              initialNumToRender={VISIBLE_ITEMS}
            />
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
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 43,
    marginLeft: 5,
    marginRight: 5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2A2A2A',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 16,
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.8,
  },
  statValue: {
    marginBottom: 8,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  deltaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  deltaText: {
    fontWeight: '600',
    fontSize: 12,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 8,
  },
  listWrap: {
    flex: 1,
  },
  list: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowIcon: {
    width: 24,
    height: 24,
  },
  rowTitle: {
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 2,
  },
  rowStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

const PRODUCTS = [
  { icon: require('@/assets/images/partial-react-logo.png'), name: 'Vegetables', up: 267, down: 149 },
  { icon: require('@/assets/images/partial-react-logo.png'), name: 'Sweet Food', up: 124, down: 87 },
  { icon: require('@/assets/images/partial-react-logo.png'), name: 'Snack', up: 88, down: 27 },
  { icon: require('@/assets/images/partial-react-logo.png'), name: 'Fruits', up: 450, down: 234 },
  { icon: require('@/assets/images/partial-react-logo.png'), name: 'Bakery', up: 98, down: 15 },
  { icon: require('@/assets/images/partial-react-logo.png'), name: 'Dairy', up: 210, down: 64 },
  { icon: require('@/assets/images/partial-react-logo.png'), name: 'Beverages', up: 132, down: 40 },
  { icon: require('@/assets/images/partial-react-logo.png'), name: 'Frozen', up: 76, down: 22 },
];


