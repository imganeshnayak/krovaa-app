import React from 'react';
import { View, Text, TextInput, StyleSheet, TextStyle, ViewStyle } from 'react-native';

type Props = {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (t: string) => void;
  textarea?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
};

export const Field = ({ label, placeholder, value, onChangeText, textarea, style, inputStyle }: Props) => {
  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={!!textarea}
        numberOfLines={textarea ? 4 : 1}
        style={[styles.input, textarea && styles.textarea, inputStyle]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
});

export default Field;
