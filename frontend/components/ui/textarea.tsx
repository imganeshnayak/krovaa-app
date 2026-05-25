import React from 'react';
import { View, TextInput, TextInputProps, StyleSheet, ViewStyle, TextStyle } from 'react-native';

type TextareaProps = TextInputProps & {
  style?: ViewStyle;
  inputStyle?: TextStyle;
  placeholderTextColor?: string;
};

export const Textarea = ({
  style,
  inputStyle,
  placeholderTextColor,
  ...props
}: TextareaProps) => {
  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={[styles.input, inputStyle]}
        placeholderTextColor={placeholderTextColor}
        multiline
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
    textAlignVertical: 'top',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#F5F5F5',
    color: '#1C1C1C',
    minHeight: 80,
  },
});

export default Textarea;