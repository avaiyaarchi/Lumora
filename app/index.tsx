import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LumoraLogo } from '../src/components/LumoraLogo';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

export default function Index() {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 600 }),
      -1,
      true
    );
  }, []);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={pulseAnimatedStyle}>
        <LumoraLogo size={48} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F4FC',
  },
});
