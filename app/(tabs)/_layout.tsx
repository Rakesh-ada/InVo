import { Tabs } from 'expo-router';
import React from 'react';
import { Image, useWindowDimensions } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const colorScheme = 'dark' as const;
  const { width: screenWidth } = useWindowDimensions();
  const TARGET_WIDTH = 350;
  const tabWidth = Math.min(TARGET_WIDTH, screenWidth - 32);
  const horizontal = (screenWidth - tabWidth) / 2;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tabIconSelected,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          left: horizontal,
          right: horizontal,
          bottom: 25,
          height: 64,
          width: tabWidth,
          marginLeft:21,
          borderRadius: 24,
          backgroundColor:
            colorScheme === 'dark'
              ? Colors.dark.cardBackground ?? Colors.dark.background
              : Colors.light.background,
          borderTopWidth: 0,
          paddingHorizontal: 8,
          paddingBottom: 10,
          paddingTop: 10,
          // shadow (iOS)
          shadowColor: '#000',
          shadowOpacity: colorScheme === 'dark' ? 0.18 : 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          // elevation (Android)
          elevation: colorScheme === 'dark' ? 10 : 6,
        },
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarItemStyle: {
          marginHorizontal: 5,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={30} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color }) => <IconSymbol size={30} name="cube.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/cart.png')}
              style={{ width: 30, height: 30, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/setting.png')}
              style={{ width: 30, height: 30, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}
