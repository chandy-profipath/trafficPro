import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme';
import type { Hazard } from '../data';
import HazardIcon from './HazardIcon';
import { hazardMeta } from './HazardIcon';

interface Props {
  hazard: Hazard;
  distanceAway: number;
  onDismiss: () => void;
}

export default function AlertBanner({ hazard, distanceAway, onDismiss }: Props) {
  const { colors } = useTheme();
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (distanceAway < 100) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
          Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: false }),
        ])
      ).start();
    } else {
      pulse.setValue(0);
    }
  }, [distanceAway]);
  const sevColor =
    hazard.severity === 'high' ? colors.danger : hazard.severity === 'medium' ? colors.warning : colors.success;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: sevColor,
          shadowColor: sevColor,
          borderWidth: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }]
        },
      ]}
    >
      <View style={styles.row}>
        <HazardIcon type={hazard.type} severity={hazard.severity} withRing size={20} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.label, { color: sevColor }]}>
            {hazard.severity.toUpperCase()} · {hazardMeta[hazard.type].label.toUpperCase()}
          </Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {hazard.title}
          </Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            {distanceAway}m ahead · Slow down & stay alert
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.close}>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 14,
    marginTop: 8,
    padding: 14,
    borderRadius: 18,
    borderLeftWidth: 4,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  title: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  sub: { fontSize: 12, marginTop: 2 },
  close: { padding: 6 },
});
