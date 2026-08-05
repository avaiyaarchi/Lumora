import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Circle, G, Use } from 'react-native-svg';
import { useThemeStore } from '../store/themeStore';

// Fallback palette = Lavender Garden, used for `static` mode and as a safety default
const STATIC_COLORS = {
  rayStart: '#C9B6FF',
  rayEnd: '#8B5CF6',
  core: '#FFFFFF',
};

type LumoraLogoProps = {
  size?: number;
  showWordmark?: boolean;
  static?: boolean; // ignore active theme, always render Lavender Garden colors
};

export function LumoraLogo({ size = 48, showWordmark = false, static: forceStatic = false }: LumoraLogoProps) {
  const colorsStore = useThemeStore((s) => s.getColors());

  const colors = forceStatic
    ? STATIC_COLORS
    : {
        rayStart: colorsStore.secondary,
        rayEnd: colorsStore.primary,
        core: colorsStore.background === colorsStore.card ? '#FFFFFF' : colorsStore.card,
      };

  return (
    <View style={[styles.row, { gap: size * 0.18 }]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="lumoraRay" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.rayStart} />
            <Stop offset="100%" stopColor={colors.rayEnd} />
          </LinearGradient>
        </Defs>
        <G transform="translate(100, 100)">
          <G id="rayLong">
            <Path
              d="M 0,0 C 14,-12 15,-40 0,-82 C -15,-40 -14,-12 0,0 Z"
              fill="url(#lumoraRay)"
            />
          </G>
          <Use href="#rayLong" rotation={0} />
          <Use href="#rayLong" rotation={90} />
          <Use href="#rayLong" rotation={180} />
          <Use href="#rayLong" rotation={270} />

          <G id="rayShort">
            <Path
              d="M 0,0 C 9,-8 10,-24 0,-52 C -10,-24 -9,-8 0,0 Z"
              fill="url(#lumoraRay)"
              opacity={0.85}
            />
          </G>
          <Use href="#rayShort" rotation={45} />
          <Use href="#rayShort" rotation={135} />
          <Use href="#rayShort" rotation={225} />
          <Use href="#rayShort" rotation={315} />

          <Circle cx={0} cy={0} r={19} fill={colors.core} />
        </G>
      </Svg>

      {showWordmark && (
        <Text
          style={[
            styles.wordmark,
            { fontSize: size * 0.42, color: forceStatic ? '#2D2640' : colorsStore.textPrimary },
          ]}
        >
          Lumora
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: 'System',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
