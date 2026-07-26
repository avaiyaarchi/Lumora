import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useThemeStore } from '../store/themeStore';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, bordered = false }) => {
  const colors = useThemeStore((state) => state.getColors());

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 22,
          padding: 20,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 1,
          shadowRadius: 16,
          elevation: 2,
          borderWidth: bordered ? 2 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};
