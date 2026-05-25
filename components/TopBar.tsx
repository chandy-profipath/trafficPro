import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Keyboard, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme';

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY';

interface Props {
  routeActive: boolean;
  destination: string;
  setDestination: (v: string) => void;
  onSelectSuggestion: (desc: string) => void;
  onOpenSettings: () => void;
  etaText?: string;
}

export default function TopBar({ 
  routeActive, 
  destination, 
  setDestination, 
  onSelectSuggestion,
  onOpenSettings, 
  etaText 
}: Props) {
  const { colors, mode } = useTheme();
  const [navMinimized, setNavMinimized] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = async (val: string) => {
    if (val.length < 3 || !GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY === 'YOUR_API_KEY') {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(val)}&key=${GOOGLE_PLACES_API_KEY}&language=en`;
      const res = await fetch(url);
      const json = await res.json();
      // Log status so we can diagnose issues (REQUEST_DENIED = API not enabled)
      if (json.status && json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
        console.warn('[Autocomplete] API error:', json.status, json.error_message || '');
      }
      setSuggestions(json.predictions || []);
    } catch (e: any) {
      // On web, this may fail with a CORS/network error if Places API isn't allowed
      console.warn('[Autocomplete] Fetch failed (CORS on web or network error):', e?.message || e);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (val: string) => {
    setDestination(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
    if (!val) setSuggestions([]);
  };

  const selectPlace = (desc: string) => {
    onSelectSuggestion(desc);
    setSuggestions([]);
    Keyboard.dismiss();
  };

  return (
    <View style={[styles.container, { paddingTop: 10 }]}>
      <View style={[styles.wrap, { backgroundColor: mode === 'dark' ? '#0F172A' : '#fff', borderColor: colors.border }]}>
        <View style={styles.searchSection}>
          <TextInput
            value={destination}
            onChangeText={handleSearch}
            placeholder={routeActive ? "Active Route: " + etaText : "Where to go today?"}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, paddingLeft: 12 }]}
          />
          {searching && <ActivityIndicator size="small" color={colors.accent} style={styles.loader} />}
          {!searching && destination.length > 0 && (
            <TouchableOpacity onPress={() => { setDestination(''); setSuggestions([]); }} style={{ padding: 4, marginRight: 4 }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <Ionicons name="search" size={18} color={destination ? colors.accent : colors.textMuted} style={{ marginRight: 8, marginLeft: 4 }} />
        </View>
        
        <TouchableOpacity style={styles.gearBtn} onPress={onOpenSettings}>
          <Ionicons name="settings-sharp" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Primary Navigation HUD (Floating Instruction) */}
      {routeActive && (
        <View style={styles.navInstructionWrap}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setNavMinimized((v) => !v)}
            style={[styles.navHudson, { backgroundColor: colors.primary, paddingHorizontal: navMinimized ? 12 : 16 }]}
          >
            <MaterialCommunityIcons name={navMinimized ? "arrow-right" : "arrow-left-top"} size={navMinimized ? 18 : 22} color="#fff" />

            {!navMinimized ? (
              <>
                <View style={styles.navTextStack}>
                  <Text style={styles.navMain} numberOfLines={1} ellipsizeMode="tail">250m · TURN LEFT</Text>
                  <Text style={styles.navSub} numberOfLines={1} ellipsizeMode="tail">Entering Main Highway</Text>
                </View>
                <View style={styles.navDiv} />
                <Text style={styles.navEta}>{etaText}</Text>
              </>
            ) : (
              <View style={styles.navMinimizedRight}>
                <Text style={styles.navEtaMin}>{etaText}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {suggestions.length > 0 && !routeActive && (
        <View style={[styles.resultsList, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          {suggestions.map((item) => (
            <TouchableOpacity
              key={item.place_id}
              style={[styles.resultItem, { borderBottomColor: colors.border }]}
              onPress={() => selectPlace(item.description)}
            >
              <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.primary} />
              <Text style={[styles.resultText, { color: colors.text }]} numberOfLines={1}>
                {item.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
    paddingHorizontal: 16,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    height: '100%',
  },
  loader: {
    marginLeft: 8,
  },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    height: 24,
  },
  tempText: {
    fontSize: 12,
    fontWeight: '800',
  },
  gearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navInstructionWrap: {
    alignItems: 'center',
    marginTop: 12,
  },
  navHudson: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    gap: 12,
    maxWidth: '90%',
  },
  navMinimizedRight: {
    marginLeft: 8,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.12)'
  },
  navEtaMin: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900'
  },
  navTextStack: {
    flex: 1,
  },
  navMain: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  navSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  navDiv: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  navEta: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  resultsList: {
    position: 'absolute',
    top: 70,
    left: 24,
    right: 24,
    borderRadius: 24,
    borderWidth: 1.5,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    zIndex: 1001,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderBottomWidth: 1,
  },
  resultText: { 
    fontSize: 14, 
    fontWeight: '700',
    flex: 1 
  },
});
