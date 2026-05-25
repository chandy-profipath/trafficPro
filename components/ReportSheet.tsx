import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useTheme } from '../theme';
import type { HazardType } from '../data';
import HazardIcon, { hazardMeta } from './HazardIcon';

interface Props {
  onSubmit: (t: HazardType, note: string, severity: 'low' | 'medium' | 'high') => void;
}

const TYPES: HazardType[] = ['pothole', 'debris', 'speed_bump', 'sharp_curve', 'parked_vehicle'];

export default function ReportSheet({ onSubmit }: Props) {
  const { colors } = useTheme();
  const _typeState = useState<HazardType>('pothole');
  const type = _typeState[0];
  const setType = _typeState[1];

  const _severityState = useState<'low' | 'medium' | 'high'>('medium');
  const severity = _severityState[0];
  const setSeverity = _severityState[1];

  const _noteState = useState('');
  const note = _noteState[0];
  const setNote = _noteState[1];

  return (
    <View>
      <Text style={[styles.section, { color: colors.textMuted }]}>HAZARD TYPE</Text>
      <View style={styles.typeGrid}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setType(t)}
            style={[
              styles.typeBtn,
              {
                backgroundColor: type === t ? colors.surfaceElevated : 'transparent',
                borderColor: type === t ? hazardMeta[t].color : colors.border,
              },
            ]}
          >
            <HazardIcon type={t} size={16} />
            <Text style={[styles.typeLabel, { color: colors.text }]}>{hazardMeta[t].label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.section, { color: colors.textMuted }]}>SEVERITY</Text>
      <View style={styles.sevRow}>
        {(['low', 'medium', 'high'] as const).map((s) => {
          const sevColor = s === 'high' ? colors.danger : s === 'medium' ? colors.warning : colors.success;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => setSeverity(s)}
              style={[
                styles.sevBtn,
                {
                  backgroundColor: severity === s ? sevColor : 'transparent',
                  borderColor: severity === s ? sevColor : colors.border,
                },
              ]}
            >
              <Text style={{ color: severity === s ? '#fff' : colors.text, fontWeight: '800', textTransform: 'uppercase', fontSize: 12 }}>
                {s}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.section, { color: colors.textMuted }]}>DETAILS (OPTIONAL)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Add more context for other drivers..."
        placeholderTextColor={colors.textMuted}
        multiline
        style={[
          styles.noteBox,
          { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border },
        ]}
      />

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary }]}
        onPress={() => onSubmit(type, note, severity)}
      >
        <MaterialCommunityIcons name="cloud-upload" size={18} color="#fff" />
        <Text style={styles.submitText}>Upload to cloud database</Text>
      </TouchableOpacity>

      <Text style={[styles.footnote, { color: colors.textMuted }]}>
        Your GPS location will be attached to warn approaching drivers.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: 8, marginBottom: 10 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  typeLabel: { fontSize: 13, fontWeight: '700' },
  sevRow: { flexDirection: 'row', gap: 10 },
  sevBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  noteBox: {
    minHeight: 80,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 20,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  footnote: { fontSize: 11, textAlign: 'center', marginTop: 12 },
});
