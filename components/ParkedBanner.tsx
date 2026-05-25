import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface Props {
  onClear: () => void;
  since: string;
}

export default function ParkedBanner({ onClear, since }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.surfaceElevated, borderColor: '#EC4899' },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: '#EC4899' }]}>
        <MaterialCommunityIcons name="parking" size={22} color="#fff" />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.title, { color: colors.text }]}>You're registered as parked</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          Other drivers are being warned · parked {since}
        </Text>
      </View>
      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.danger }]} onPress={onClear}>
        <Ionicons name="close" size={16} color="#fff" />
        <Text style={styles.btnText}>Unpark</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 16,
    borderLeftWidth: 4,
    shadowColor: '#EC4899',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 2 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
