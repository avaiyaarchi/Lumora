import React from 'react';
import { StyleSheet, Text, Pressable, ViewStyle, TextStyle, ActivityIndicator, StyleProp } from 'react-native';
import { useThemeStore } from '../store/themeStore';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const colors = useThemeStore((state) => state.getColors());

  const getButtonStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 100, // Pill shaped
      flexDirection: 'row',
    };

    // Size styling
    let sizeStyle: ViewStyle = {};
    if (size === 'small') {
      sizeStyle = { paddingVertical: 8, paddingHorizontal: 16 };
    } else if (size === 'medium') {
      sizeStyle = { paddingVertical: 14, paddingHorizontal: 28 };
    } else if (size === 'large') {
      sizeStyle = { paddingVertical: 18, paddingHorizontal: 36 };
    }

    // Variant styling
    let variantStyle: ViewStyle = {};
    if (variant === 'primary') {
      variantStyle = {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 3,
      };
    } else if (variant === 'secondary') {
      variantStyle = {
        backgroundColor: colors.secondary,
        borderWidth: 1.5,
        borderColor: colors.primary,
      };
    } else if (variant === 'danger') {
      variantStyle = {
        backgroundColor: colors.error,
        shadowColor: colors.error,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
      };
    } else if (variant === 'ghost') {
      variantStyle = {
        backgroundColor: 'transparent',
      };
    }

    if (disabled) {
      variantStyle = {
        backgroundColor: colors.textSecondary + '30',
        shadowOpacity: 0,
        elevation: 0,
      };
    }

    return { ...baseStyle, ...sizeStyle, ...variantStyle };
  };

  const getTextStyles = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: '700',
      textAlign: 'center',
    };

    // Size text styling
    let sizeTextStyle: TextStyle = {};
    if (size === 'small') {
      sizeTextStyle = { fontSize: 13 };
    } else if (size === 'medium') {
      sizeTextStyle = { fontSize: 16 };
    } else if (size === 'large') {
      sizeTextStyle = { fontSize: 18 };
    }

    // Variant text styling
    let variantTextStyle: TextStyle = {};
    if (variant === 'primary' || variant === 'danger') {
      variantTextStyle = { color: '#FFFFFF' };
    } else if (variant === 'secondary') {
      variantTextStyle = { color: colors.primary };
    } else if (variant === 'ghost') {
      variantTextStyle = { color: colors.primary };
    }

    if (disabled) {
      variantTextStyle = { color: colors.textSecondary + '70' };
    }

    return { ...baseTextStyle, ...sizeTextStyle, ...variantTextStyle };
  };

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        getButtonStyles(),
        pressed && !disabled && !loading && { transform: [{ scale: 0.97 }], opacity: 0.9 },
        style,
      ]}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.primary}
        />
      ) : (
        <Text style={[getTextStyles(), textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({});
