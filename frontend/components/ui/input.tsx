import React from 'react';
import { View, TextInput, TextInputProps, StyleSheet, ViewStyle, TextStyle } from 'react-native';

type InputProps = TextInputProps & {
  style?: ViewStyle;
  inputStyle?: TextStyle;
  placeholderTextColor?: string;
};

export const Input = ({
  style,
  inputStyle,
  placeholderTextColor,
  ...props
}: InputProps) => {
  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={[styles.input, inputStyle]}
        placeholderTextColor={placeholderTextColor}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Base container styling
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#F5F5F5',
    color: '#1C1C1C',
  },
});

export default Input;