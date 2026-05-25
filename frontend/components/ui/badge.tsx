import React from 'react';
import { StyleSheet } from 'react-native';

// Web version using HTML elements
export const Badge = ({ children, style, textStyle, variant = 'muted' }: { 
  children: React.ReactNode; 
  style?: React.CSSProperties; 
  textStyle?: React.CSSProperties; 
  variant?: 'primary' | 'muted' 
}) => {
  const baseStyle = {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.6,
    ...style,
  };

  const variantStyle = variant === 'primary' 
    ? { backgroundColor: '#E6F6FF', color: '#00A4EF' } 
    : { backgroundColor: '#F5F5F5', color: '#1C1C1C' };

  const textStyleObj = {
    ...textStyle,
  };

  return (
    <span style={{ ...baseStyle, ...variantStyle }}>{children}</span>
  );
};

const styles = StyleSheet.create({});

export default Badge;