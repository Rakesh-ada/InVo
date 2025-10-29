import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ProductsIconProps {
  size?: number;
  color?: string;
}

export function ProductsIcon({ size = 24, color = 'currentColor' }: ProductsIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M22 20V7L20 3H4L2 7.00353V20C2 20.5523 2.44772 21 3 21H21C21.5523 21 22 20.5523 22 20ZM4 9H20V19H4V9ZM5.236 5H18.764L19.764 7H4.237L5.236 5ZM15 11H9V13H15V11Z" />
    </Svg>
  );
}
