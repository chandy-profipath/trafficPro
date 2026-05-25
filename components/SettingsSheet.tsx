import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '../theme';

export default function SettingsSheet({ onOpenMyShops }: { onOpenMyShops?: () => void }) {
  const { colors, mode, toggle } = useTheme();
  const _voiceState = useState(true);
  const voice = _voiceState[0];
  const setVoice = _voiceState[1];

  const _hapticsState = useState(true);
  const haptics = _hapticsState[0];
  const setHaptics = _hapticsState[1];

  const _offlineState = useState(false);
  const offline = _offlineState[0];
  const setOffline = _offlineState[1];

  const _alertDistState = useState<500 | 1000 | 2000>(500);
  const alertDist = _alertDistState[0];
  const setAlertDist = _alertDistState[1];

  const Row = ({
    icon,
    title,
    subtitle,
    value,
    onChange,
    iconColor,
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    value: boolean;
    onChange: (v: boolean) => void;
    iconColor: string;
  }) => (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: iconColor + '22' }]}>{icon}</View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} thumbColor="#fff" trackColor={{ true: colors.primary, false: '#9CA3AF' }} />
    </View>
  );

  return (
    <View>
      <View style={[styles.row, { borderColor: colors.border }]}>
        <View style={[styles.iconBox, { backgroundColor: colors.primary + '22' }]}>
          <Ionicons name={mode === 'dark' ? 'moon' : 'sunny'} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.title, { color: colors.text }]}>Appearance</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            {mode === 'dark' ? 'Dark mode for night driving' : 'Light mode for daylight'}
          </Text>
        </View>
        <Switch value={mode === 'dark'} onValueChange={toggle} thumbColor="#fff" trackColor={{ true: colors.primary, false: '#9CA3AF' }} />
      </View>

      <Row
        icon={<MaterialCommunityIcons name="bullhorn" size={20} color="#F59E0B" />}
        iconColor="#F59E0B"
        title="Voice guidance"
        subtitle="Spoken hazard warnings"
        value={voice}
        onChange={setVoice}
      />
      <Row
        icon={<MaterialCommunityIcons name="vibrate" size={20} color="#EF4444" />}
        iconColor="#EF4444"
        title="Haptic feedback"
        subtitle="Vibrate on proximity alerts"
        value={haptics}
        onChange={setHaptics}
      />
      <Row
        icon={<MaterialCommunityIcons name="cloud-off-outline" size={20} color="#22C55E" />}
        iconColor="#22C55E"
        title="Offline map cache"
        subtitle="Store route maps for poor connectivity"
        value={offline}
        onChange={setOffline}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Alert distance</Text>
      <View style={styles.distRow}>
        {[500, 1000, 2000].map((d) => (
          <TouchableOpacity
            key={d}
            onPress={() => setAlertDist(d as any)}
            style={[
              styles.distChip,
              {
                backgroundColor: alertDist === d ? colors.primary : 'transparent',
                borderColor: alertDist === d ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={{ color: alertDist === d ? '#fff' : colors.text, fontWeight: '700', fontSize: 13 }}>
              {d}m
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Feather name="info" size={14} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          Parking reports auto-deregister from the cloud when you move 50m from the reported position.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.row, { borderColor: colors.border, marginTop: 14 }]}
        onPress={() => onOpenMyShops && onOpenMyShops()}
      >
        <View style={[styles.iconBox, { backgroundColor: colors.primary + '22' }]}>
          <MaterialCommunityIcons name="store" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.title, { color: colors.text }]}>Manage Shops</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>Create shops and manage your products</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginTop: 18, marginBottom: 10 },
  distRow: { flexDirection: 'row', gap: 10 },
  distChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
