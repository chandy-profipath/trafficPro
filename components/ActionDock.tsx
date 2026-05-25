import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

interface Props {
  parked: boolean;
  onTogglePark: () => void;
  onOpenCapture: () => void;
  onOpenSafety: () => void;
  onOpenShop: () => void;
  onOpenProfile?: () => void;
  visible?: boolean;
  telemetryMinimized?: boolean;
}

export default function ActionDock(props: Props) {
  const { colors } = useTheme();
  const {
    parked,
    onTogglePark,
    onOpenCapture,
    onOpenSafety,
    onOpenShop,
    onOpenProfile,
    visible = true,
    telemetryMinimized = false,
  } = props;

  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [visible]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          bottom: insets.bottom + (telemetryMinimized ? 15 : 10),
          opacity,
          zIndex: 999,
        },
      ]}
      pointerEvents={visible ? 'box-none' : 'none'}
    >
      <View style={styles.circularContainer}>
        {/* Top Left: Park */}
        <View style={[styles.orbitPos, { left: 0, top: 0 }]}>
          <DockBtn
            icon={<MaterialCommunityIcons name={parked ? 'parking' : 'car-brake-parking'} size={20} color="#fff" />}
            color={parked ? colors.danger : colors.primary}
            label="Park"
            onPress={onTogglePark}
            highlight={parked}
          />
        </View>

        {/* Top Right: Shop */}
        <View style={[styles.orbitPos, { right: 0, top: 0 }]}>
          <DockBtn icon={<MaterialCommunityIcons name="car-cog" size={24} color="#fff" />} color="#8B5CF6" label="Shop" onPress={onOpenShop} />
        </View>

        {!telemetryMinimized && (
          <>
            {/* Bottom Left: Safety */}
            <View style={[styles.orbitPos, { left: -10, bottom: 20 }]}>
              <DockBtn icon={<MaterialCommunityIcons name="shield-check" size={20} color="#fff" />} color={colors.accent} label="Safety" onPress={onOpenSafety} />
            </View>

            {/* Bottom Right: Capture */}
            <View style={[styles.orbitPos, { right: -10, bottom: 20 }]}>
              <DockBtn icon={<MaterialCommunityIcons name="video" size={20} color="#fff" />} color="#64748b" label="Capture" onPress={onOpenCapture} />
            </View>
          </>
        )}
      </View>

      {/* Profile button positioned above the telemetry dial (centered) */}
      {!telemetryMinimized && onOpenProfile && (
        <View style={[styles.profilePos, { bottom: telemetryMinimized ? 100 : 140 }]}>
          <DockBtn icon={<Ionicons name="person" size={20} color="#fff" />} color="#06b6d4" label="Profile" onPress={onOpenProfile} />
        </View>
      )}
    </Animated.View>
  );
}

function DockBtn({ icon, color, label, onPress, highlight }: { icon: React.ReactNode; color: string; label: string; onPress: () => void; highlight?: boolean; }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.85}>
      <View
        style={[
          styles.circle,
          {
            backgroundColor: color,
            shadowColor: color,
            borderWidth: highlight ? 2 : 0,
            borderColor: highlight ? colors.text : 'transparent',
          },
        ]}
      >
        {icon}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularContainer: {
    width: 280,
    height: 160,
    position: 'relative',
  },
  orbitPos: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: { alignItems: 'center' },
  circle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  profilePos: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
