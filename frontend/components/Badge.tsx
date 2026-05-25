import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'muted';
};

export const Badge = ({ children, style, textStyle, variant = 'muted' }: Props) => {
  return (
    <View style={[styles.container, variant === 'primary' ? styles.primary : styles.muted, style]}>
      <Text style={[styles.text, textStyle]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  primary: {
    backgroundColor: '#E6F6FF',
  },
  muted: {
    backgroundColor: '#F5F5F5',
  },
});

export default Badge;
