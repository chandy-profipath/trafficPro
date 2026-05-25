import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { HazardType } from '../data';
import { useTheme } from '../theme';

interface Props {
  type: HazardType;
  size?: number;
  severity?: 'low' | 'medium' | 'high';
  withRing?: boolean;
}

export const hazardMeta: Record<HazardType, { label: string; icon: React.ReactNode; color: string }> = {
  debris: { label: 'Debris', icon: null, color: '#F59E0B' },
  pothole: { label: 'Pothole', icon: null, color: '#EF4444' },
  speed_bump: { label: 'Speed Bump', icon: null, color: '#8B5CF6' },
  sharp_curve: { label: 'Sharp Curve', icon: null, color: '#0EA5E9' },
  parked_vehicle: { label: 'Parked Vehicle', icon: null, color: '#EC4899' },
};

export default function HazardIcon({ type, size = 18, severity, withRing }: Props) {
  const { colors } = useTheme();
  const color = hazardMeta[type].color;
  const ringColor =
    severity === 'high' ? '#EF4444' : severity === 'medium' ? '#F59E0B' : '#10B981';

  const renderInner = () => {
    switch (type) {
      case 'pothole':
        return <MaterialCommunityIcons name="alpha-p-circle" size={size} color="#fff" />;
      case 'debris':
        return <MaterialCommunityIcons name="alert-octagon" size={size} color="#fff" />;
      case 'speed_bump':
        return <MaterialCommunityIcons name="road-variant" size={size} color="#fff" />;
      case 'sharp_curve':
        return <MaterialCommunityIcons name="sign-direction" size={size} color="#fff" />;
      case 'parked_vehicle':
        return <FontAwesome5 name="car-side" size={size - 4} color="#fff" />;
    }
  };

  const outer = size + 14;
  return (
    <View
      style={{
        width: outer,
        height: outer,
        borderRadius: outer / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: withRing ? 3 : 2,
        borderColor: withRing ? ringColor : '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 5,
      }}
    >
      {renderInner()}
    </View>
  );
}
