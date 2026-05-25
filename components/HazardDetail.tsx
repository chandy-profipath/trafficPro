import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme';
import type { Hazard } from '../data';
import HazardIcon, { hazardMeta } from './HazardIcon';

export default function HazardDetail({ hazard }: { hazard: Hazard }) {
  const { colors } = useTheme();
  const sevColor = hazard.severity === 'high' ? colors.danger : hazard.severity === 'medium' ? colors.warning : colors.success;

  return (
    <View>
      <View style={[styles.header, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <HazardIcon type={hazard.type} severity={hazard.severity} withRing size={22} />
        <View style={{ marginLeft: 14, flex: 1 }}>
          <Text style={[styles.category, { color: sevColor }]}>
            {hazard.severity.toUpperCase()} SEVERITY
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>{hazardMeta[hazard.type].label}</Text>
          <Text style={[styles.desc, { color: colors.textMuted }]}>{hazard.title}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <StatBox icon="map-marker-distance" label="Distance" value={`${hazard.distance}m`} />
        <StatBox icon="account-group" label="Confirmed by" value="12 drivers" />
        <StatBox icon="clock-outline" label="Reported" value="34 min ago" />
      </View>

      <View style={[styles.tipsBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Text style={[styles.tipsTitle, { color: colors.text }]}>Safety tips</Text>
        <Tip text="Reduce speed to 40 km/h or below before approaching" />
        <Tip text="Maintain extra following distance from vehicles ahead" />
        <Tip text="Avoid sudden steering — prepare early" />
      </View>
    </View>
  );
}

function StatBox({ icon, label, value }: { icon: any; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function Tip({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.tipRow}>
      <MaterialCommunityIcons name="check-circle" size={14} color={colors.success} />
      <Text style={[styles.tipText, { color: colors.textMuted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1 },
  category: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  title: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  desc: { fontSize: 13, marginTop: 2 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statBox: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 14, fontWeight: '800' },
  statLabel: { fontSize: 10 },
  tipsBox: { marginTop: 16, padding: 14, borderRadius: 14, borderWidth: 1 },
  tipsTitle: { fontSize: 14, fontWeight: '800', marginBottom: 10 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  tipText: { fontSize: 12, flex: 1, lineHeight: 18 },
});
