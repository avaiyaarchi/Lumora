import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LumoraLogo } from '../src/components/LumoraLogo';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { isDemoMode } from '../src/config/demoConfig';

export default function Index() {
  const router = useRouter();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 600 }),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (isDemoMode()) {
      router.replace('/(tabs)');
    }
  }, [router]);

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
