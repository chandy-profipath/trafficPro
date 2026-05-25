import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Keyboard, ActivityIndicator, ScrollView } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme';
import { hazards } from '../data';
import type { RouteResult } from '../lib/directions';

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface Props {
  onStart: (from: string, to: string) => void;
  routeActive: boolean;
  onStop: () => void;
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  routeData?: RouteResult | null;
  loading?: boolean;
}

interface PlaceSuggestion {
  place_id: string;
  description: string;
}

export default function RoutePlanner({ onStart, routeActive, onStop, from, to, setFrom, setTo, routeData, loading }: Props) {
  const { colors, mode } = useTheme();

  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeField, setActiveField] = useState<'from' | 'to' | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = async (input: string) => {
    if (!input || input.length < 3 || !GOOGLE_PLACES_API_KEY) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_PLACES_API_KEY}&language=en`;
      const res = await fetch(url);
      const json = await res.json();
      // REQUEST_DENIED = Places API not enabled; log full status for diagnosis
      if (json.status && json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
        console.warn('[Autocomplete] API error:', json.status, json.error_message || '');
      }
      setSuggestions(json.predictions || []);
    } catch (e: any) {
      // On Expo web this will be a CORS/network error — use Android/iOS for full functionality
      console.warn('[Autocomplete] Fetch failed:', e?.message || e);
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  const handleFromChange = (val: string) => {
    setFrom(val);
    setActiveField('from');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const handleToChange = (val: string) => {
    setTo(val);
    setActiveField('to');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const selectPlace = (desc: string) => {
    if (activeField === 'from') setFrom(desc);
    else setTo(desc);
    setSuggestions([]);
    setActiveField(null);
    Keyboard.dismiss();
  };

  const clearSuggestions = () => {
    setSuggestions([]);
    setActiveField(null);
  };

  return (
    <View style={styles.container}>
      {/* Origin Input */}
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: colors.success }]} />
        <View style={[
          styles.inputWrap,
          { backgroundColor: colors.bg, borderColor: activeField === 'from' ? colors.primary : colors.border }
        ]}>
          <Ionicons name="radio-button-on" size={14} color={colors.success} style={{ marginRight: 8 }} />
          <TextInput
            value={from}
            onChangeText={handleFromChange}
            onFocus={() => setActiveField('from')}
            placeholder="Current location"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text }]}
          />
          {searching && activeField === 'from' && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
          )}
          {from.length > 0 && (
            <TouchableOpacity onPress={() => { setFrom(''); clearSuggestions(); }} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Suggestions dropdown for "from" */}
      {suggestions.length > 0 && activeField === 'from' && (
        <View style={[styles.resultsList, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
            {suggestions.map((s) => (
              <TouchableOpacity
                key={s.place_id}
                style={[styles.resultItem, { borderBottomColor: colors.border }]}
                onPress={() => selectPlace(s.description)}
              >
                <View style={[styles.resultIconWrap, { backgroundColor: colors.success + '22' }]}>
                  <Ionicons name="location" size={14} color={colors.success} />
                </View>
                <Text style={[styles.resultText, { color: colors.text }]} numberOfLines={2}>
                  {s.description}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.connector} />

      {/* Destination Input */}
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: colors.danger }]} />
        <View style={[
          styles.inputWrap,
          { backgroundColor: colors.bg, borderColor: activeField === 'to' ? colors.primary : colors.border }
        ]}>
          <Ionicons name="navigate" size={14} color={colors.danger} style={{ marginRight: 8 }} />
          <TextInput
            value={to}
            onChangeText={handleToChange}
            onFocus={() => setActiveField('to')}
            placeholder="Search destination…"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text }]}
          />
          {searching && activeField === 'to' && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
          )}
          {to.length > 0 && (
            <TouchableOpacity onPress={() => { setTo(''); clearSuggestions(); }} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Suggestions dropdown for "to" */}
      {suggestions.length > 0 && activeField === 'to' && (
        <View style={[styles.resultsList, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
            {suggestions.map((s) => (
              <TouchableOpacity
                key={s.place_id}
                style={[styles.resultItem, { borderBottomColor: colors.border }]}
                onPress={() => selectPlace(s.description)}
              >
                <View style={[styles.resultIconWrap, { backgroundColor: colors.primary + '22' }]}>
                  <Ionicons name="location" size={14} color={colors.primary} />
                </View>
                <Text style={[styles.resultText, { color: colors.text }]} numberOfLines={2}>
                  {s.description}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={[styles.statsRow, { borderColor: colors.border }]}>
        <Stat icon="map-marker-distance" label="Distance" value={routeData?.distanceText || '—'} />
        <Stat icon="clock-outline" label="ETA" value={routeData?.durationText || '—'} />
      </View>

      {routeActive && routeData ? (
        <View>
          <View style={[styles.routeInfoCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View style={styles.routeInfoRow}>
              <Ionicons name="location" size={14} color={colors.success} />
              <Text style={[styles.routeInfoText, { color: colors.textMuted }]} numberOfLines={1}>
                {routeData.startAddress}
              </Text>
            </View>
            <View style={styles.routeInfoRow}>
              <Ionicons name="navigate" size={14} color={colors.danger} />
              <Text style={[styles.routeInfoText, { color: colors.textMuted }]} numberOfLines={1}>
                {routeData.endAddress}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.danger }]}
            onPress={onStop}
          >
            <MaterialCommunityIcons name="stop-circle" size={18} color="#fff" />
            <Text style={styles.primaryText}>End route</Text>
          </TouchableOpacity>
        </View>
      ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: (!from || !to || loading) ? 0.6 : 1 }]}
              onPress={() => onStart(from, to)}
              disabled={!from || !to || loading}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.primaryText}>Fetching route…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="navigate" size={18} color="#fff" />
                  <Text style={styles.primaryText}>Start navigation</Text>
                </>
              )}
            </TouchableOpacity>
          )}


    </View>
  );
}

function Stat({ icon, label, value }: { icon: any; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 240 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  connector: {
    width: 2,
    height: 14,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    marginLeft: 5,
  },
  inputWrap: { 
    flex: 1, 
    height: 50, 
    borderRadius: 14, 
    borderWidth: 1.5, 
    flexDirection: 'row',
    alignItems: 'center', 
    paddingHorizontal: 12,
    gap: 4,
  },
  autocompleteContainer: { flex: 1, zIndex: 999 },
  input: { flex: 1, fontSize: 14, height: '100%' },
  loader: { marginLeft: 4 },
  clearBtn: { padding: 4, marginLeft: 2 },
  resultsList: {
    marginTop: 6,
    marginLeft: 22,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderBottomWidth: 1,
  },
  resultIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  resultText: { fontSize: 13, flex: 1, fontWeight: '500' },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    zIndex: 1,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 11 },
  primaryBtn: {
    marginTop: 12,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 1,
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  tipText: { fontSize: 11, marginTop: 12, textAlign: 'center', zIndex: 1 },
  routeInfoCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  routeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeInfoText: {
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },
});
