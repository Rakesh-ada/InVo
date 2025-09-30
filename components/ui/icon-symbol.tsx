// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'bell.fill': 'notifications',
  'arrow.up': 'arrow-upward',
  'arrow.down': 'arrow-downward',
  'chart.bar.fill': 'bar-chart',
  'cube.fill': 'view-in-ar',
  'leaf.fill': 'eco',
  'birthday.cake.fill': 'cake',
  'popcorn.fill': 'fastfood',
  'square.and.pencil': 'edit',
  'magnifyingglass': 'search',
  'barcode.viewfinder': 'qr-code-scanner',
  'chevron.left': 'chevron-left',
  'shippingbox.fill': 'inventory',
  'plus': 'add',
  'minus': 'remove',
  'plus.circle.fill': 'add-circle',
  'minus.circle.fill': 'remove-circle',
  'trash': 'delete',
  'cart.fill': 'shopping-cart',
  'cart': 'shopping-cart',
  'xmark': 'close',
  'checkmark': 'check',
  'qrcode': 'qr-code',
  'building.2': 'business',
  'person.fill': 'person',
  'moon.fill': 'dark-mode',
  'arrow.clockwise': 'refresh',
  'square.and.arrow.up': 'share',
  'exclamationmark.triangle.fill': 'warning',
  'checkmark.circle.fill': 'check-circle',
  'arrow.up.circle.fill': 'keyboard-arrow-up',
  'arrow.down.circle.fill': 'keyboard-arrow-down',
  'calendar': 'calendar-today',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
