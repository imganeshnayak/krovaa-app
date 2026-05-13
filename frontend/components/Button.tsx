import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors, BorderRadius, FontWeights, Spacing } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style, textStyle }: ButtonProps) {
  const bgMap: Record<string, string> = {
    primary: Colors.primary,
    secondary: Colors.secondary,
    outline: 'transparent',
    ghost: 'transparent',
  };
  const colorMap: Record<string, string> = {
    primary: Colors.white,
    secondary: Colors.white,
    outline: Colors.primary,
    ghost: Colors.primary,
  };
  const borderMap: Record<string, number> = {
    primary: 0,
    secondary: 0,
    outline: 1.5,
    ghost: 0,
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: bgMap[variant], borderWidth: borderMap[variant], borderColor: Colors.primary },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={colorMap[variant]} />
      ) : (
        <Text style={[styles.text, { color: colorMap[variant] }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  text: {
    fontSize: 16,
    fontWeight: FontWeights.semiBold as any,
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.5,
  },
});
