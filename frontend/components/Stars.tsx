import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';

type Props = {
  value: number;
  max?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (v: number) => void;
};

export const Stars = ({ value, max = 5, size = 16, interactive = false, onChange }: Props) => {
  return (
    <View style={styles.row}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < value;
        return (
          <TouchableOpacity
            key={i}
            activeOpacity={interactive ? 0.7 : 1}
            onPress={() => interactive && onChange?.(i + 1)}
            disabled={!interactive}
          >
            <Star size={size} color={filled ? '#F59E0B' : '#E5E7EB'} fill={filled ? '#F59E0B' : 'transparent'} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
});

export default Stars;
