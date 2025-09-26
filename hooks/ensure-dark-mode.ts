// This file ensures that the entire app uses dark mode

import { useEffect } from 'react';
import { AppState, Appearance } from 'react-native';

// Call this hook in the root component to enforce dark mode
export function useEnsureDarkMode() {
  useEffect(() => {
    // Force dark mode immediately
    Appearance.setColorScheme('dark');
    
    // Re-apply dark mode when app comes back from background
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        Appearance.setColorScheme('dark');
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
}