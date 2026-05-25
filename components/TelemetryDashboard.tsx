import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';



interface Props {
  speed: number;
  stability: number;
  caution: number;
  eco: number;
  distToDest: string;
  timeToDest: string;
  distToDanger: number | null;
  dangerType: string | null;
  visible: boolean;
  minimized: boolean;
  onToggleMinimize: () => void;
}

export default function TelemetryDashboard({
  speed,
  distToDest,
  timeToDest,
  distToDanger,
  visible,
  minimized,
  onToggleMinimize,
}: Props) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.outerWrap, 
        { 
          bottom: insets.bottom + 10,
          opacity: fadeAnim,
          transform: [{ scale: fadeAnim }]
        }
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={onToggleMinimize}
        style={[
          styles.dial, 
          { 
            backgroundColor: mode === 'dark' ? '#0F172A' : '#fff',
            borderColor: distToDanger != null && distToDanger < 100 ? colors.danger : colors.primary,
            width: minimized ? 80 : 160,
            height: minimized ? 80 : 160,
            borderRadius: minimized ? 40 : 80,
          }
        ]}
      >
        {!minimized ? (
          <>
            <View style={styles.dialHeader}>
              <Text style={[styles.dialLabel, { color: colors.textMuted }]}>SPEED</Text>
            </View>
            
            <View style={styles.speedBox}>
              <Text style={[styles.speedText, { color: colors.text }]}>{speed}</Text>
              <Text style={[styles.unitText, { color: colors.textMuted }]}>KM/H</Text>
            </View>

            <View style={styles.dialFooter}>
               <Text style={[styles.etaVal, { color: colors.primary }]}>{timeToDest}</Text>
               <Text style={[styles.etaLabel, { color: colors.textMuted }]}>{distToDest}</Text>
            </View>

            {/* Orbiting metrics */}
            <View style={[styles.orbit, { top: -20, right: -10, backgroundColor: colors.success }]}>
              <Text style={styles.orbitText}>98%</Text>
            </View>
          </>
        ) : (
          <View style={styles.minimizedContent}>
            <Text style={[styles.minSpeed, { color: colors.text }]}>{speed}</Text>
            <View style={[styles.minDot, { backgroundColor: colors.primary }]} />
          </View>
        )}

        {/* Outer Ring Decor */}
        <View style={[styles.ring, { borderColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  dial: {
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'visible',
  },
  dialHeader: { position: 'absolute', top: 25 },
  dialLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  speedBox: { flexDirection: 'row', alignItems: 'flex-end' },
  speedText: { fontSize: 48, fontWeight: '900', fontStyle: 'italic', letterSpacing: -2 },
  unitText: { fontSize: 12, fontWeight: '800', marginLeft: 6, marginBottom: 6 },
  dialFooter: { position: 'absolute', bottom: 20, alignItems: 'center' },
  etaVal: { fontSize: 13, fontWeight: '900' },
  etaLabel: { fontSize: 8, fontWeight: '800' },
  orbit: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  orbitText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  ring: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    borderRadius: 100,
    borderWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  minimizedContent: { alignItems: 'center' },
  minSpeed: { fontSize: 24, fontWeight: '900' },
  minDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
});
