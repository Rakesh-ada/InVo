import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  // If dark color is not provided, use the default background color from theme
  const backgroundColor = useThemeColor(
    { 
      light: lightColor, 
      dark: darkColor || '#1A1A1A' // Default dark background if not specified
    }, 
    'background'
  );

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
