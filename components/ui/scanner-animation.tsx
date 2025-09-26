import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const scannerHeight = 2;

export function ScannerAnimation() {
  const translateY = useSharedValue(0);
  const height = 200;

  useEffect(() => {
    translateY.value = 0;
    translateY.value = withRepeat(
      withTiming(height, { duration: 2000, easing: Easing.linear }),
      -1,
      true
    );

    return () => {
      cancelAnimation(translateY);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.cornerTopLeft} />
      <View style={styles.cornerTopRight} />
      <View style={styles.cornerBottomLeft} />
      <View style={styles.cornerBottomRight} />
      <Animated.View style={[styles.scanner, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width - 80,
    position: 'relative',
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
  },
  scanner: {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: scannerHeight,
    backgroundColor: '#09a0db',
    shadowColor: '#09a0db',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: 'white',
    borderTopLeftRadius: 16,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: 'white',
    borderTopRightRadius: 16,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: 'white',
    borderBottomLeftRadius: 16,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: 'white',
    borderBottomRightRadius: 16,
  },
});