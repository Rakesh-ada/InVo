import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useEnsureDarkMode } from '@/hooks/ensure-dark-mode';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Prevent splash screen from hiding automatically
SplashScreen.preventAutoHideAsync();

// Set default font family for all Text and TextInput components
if (Text.defaultProps == null) Text.defaultProps = {};
Text.defaultProps.style = { fontFamily: 'Roboto' };

if (TextInput.defaultProps == null) TextInput.defaultProps = {};
TextInput.defaultProps.style = { fontFamily: 'Roboto' };

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  // Load Roboto font
  const [fontsLoaded] = useFonts({
    'Roboto': require('@/assets/font/Roboto-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // This hook ensures the app always uses dark mode
  useEnsureDarkMode();
  
  const colorScheme = useColorScheme();

  if (!fontsLoaded) {
    return null;
  }
  
  // Configure custom dark theme
  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#121212',
      card: '#1A1A1A',
      text: '#ECEDEE',
    },
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider value={customDarkTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="ai-chat" options={{ headerShown: false }} />
          <Stack.Screen name="suppliers" options={{ headerShown: false }} />
          <Stack.Screen name="supplier-order" options={{ headerShown: false }} />
          <Stack.Screen name="product-detail" options={{ 
            title: 'Product Details',
            headerStyle: { backgroundColor: '#121212' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { color: '#FFFFFF' }
          }} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
