import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Animated } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

interface Props {
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onToggleTheme: () => void;
  onCenter: () => void;
  layers: { fuel: boolean; hotels: boolean; mechanics: boolean; hazards: boolean };
  setLayers: (l: Props['layers']) => void;
  visible: boolean;
}

export default function FloatingControls({
  fullscreen,
  onToggleFullscreen,
  onToggleTheme,
  onCenter,
  layers,
  setLayers,
  visible,
}: Props) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const BtnStyle = {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  };

  const dynamicRightStack = {
    right: Math.max(14, insets.right),
    top: Math.max(100, insets.top + 90),
  };

  const dynamicLayerBar = {
    left: Math.max(14, insets.left),
    top: Math.max(100, insets.top + 90),
  };

  return (
    <Animated.View 
      style={[styles.wrap, { opacity }]} 
      pointerEvents={visible ? 'box-none' : 'none'}
    >
      <View style={[styles.stack, dynamicRightStack]}>
        <TouchableOpacity style={[styles.btn, BtnStyle]} onPress={onToggleFullscreen}>
          <MaterialCommunityIcons
            name={fullscreen ? 'fullscreen-exit' : 'fullscreen'}
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>
        {!fullscreen && (
          <>
            <TouchableOpacity style={[styles.btn, BtnStyle]} onPress={onToggleTheme}>
              <Ionicons name={mode === 'dark' ? 'sunny' : 'moon'} size={20} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, BtnStyle]} onPress={onCenter}>
              <MaterialCommunityIcons name="crosshairs-gps" size={22} color={colors.primary} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {!fullscreen && (
        <View style={[styles.layerBar, dynamicLayerBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <LayerChip
            active={layers.hazards}
            onPress={() => setLayers({ ...layers, hazards: !layers.hazards })}
            icon={<MaterialCommunityIcons name="alert-octagon" size={20} color={layers.hazards ? '#fff' : colors.text} />}
            activeColor={colors.danger}
          />
          <LayerChip
            active={layers.fuel}
            onPress={() => setLayers({ ...layers, fuel: !layers.fuel })}
            icon={<MaterialCommunityIcons name="gas-station" size={20} color={layers.fuel ? '#fff' : colors.text} />}
            activeColor="#22C55E"
          />
        </View>
      )}
    </Animated.View>
  );
}

function LayerChip({
  active,
  onPress,
  icon,
  activeColor,
}: {
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  activeColor: string;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? activeColor : 'transparent',
          borderColor: active ? activeColor : colors.border,
        },
      ]}
    >
      {icon}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject },
  stack: { position: 'absolute', gap: 10 },
  btn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  layerBar: {
    position: 'absolute',
    padding: 8,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
  },
});
