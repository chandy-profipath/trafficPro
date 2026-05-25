import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface Props {
  rating: number;
  size?: number;
  onChange?: (r: number) => void;
  color?: string;
}

export default function StarRating({ rating, size = 14, onChange, color = '#FBBF24' }: Props) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {stars.map((s) => {
        const filled = rating >= s;
        const half = !filled && rating >= s - 0.5;
        const Icon = (
          <FontAwesome
            name={filled ? 'star' : half ? 'star-half-empty' : 'star-o'}
            size={size}
            color={color}
          />
        );
        if (onChange) {
          return (
            <TouchableOpacity key={s} onPress={() => onChange(s)}>
              {Icon}
            </TouchableOpacity>
          );
        }
        return <View key={s}>{Icon}</View>;
      })}
    </View>
  );
}
