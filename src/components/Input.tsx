import React, { forwardRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useThemeStore } from '../store/themeStore';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, containerStyle, inputStyle, icon, onFocus, onBlur, ...rest }, ref) => {
    const colors = useThemeStore((state) => state.getColors());
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        )}
        
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: colors.card,
              borderColor: error
                ? colors.error
                : isFocused
                ? colors.primary
                : colors.border,
              borderWidth: 2,
              height: rest.multiline ? undefined : 54,
              minHeight: 54,
              paddingVertical: rest.multiline ? 12 : 0,
            },
          ]}
        >
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          
          <TextInput
            ref={ref}
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                textAlignVertical: rest.multiline ? 'top' : 'center',
              },
              inputStyle,
            ]}
            placeholderTextColor={colors.textSecondary + '70'}
            onFocus={(e) => {
              setIsFocused(true);
              if (onFocus) onFocus(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              if (onBlur) onBlur(e);
            }}
            {...rest}
          />
        </View>
        
        {error && (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 54,
  },
  iconContainer: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 6,
  },
});
