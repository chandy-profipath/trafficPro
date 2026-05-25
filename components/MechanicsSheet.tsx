import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Image, TextInput as RNTextInput } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '../theme';
import { Mechanic } from '../data';
import StarRating from './StarRating';
import { fetchRatings, submitRating as dbSubmitRating, DBRating, fetchShops, DBShop } from '../lib/db';

interface Props {
  onSelect?: (m: Mechanic) => void;
  onChat?: (m: Mechanic) => void;
}

const RADIUS_OPTIONS = [5, 10, 25];

export default function MechanicsSheet({ onSelect, onChat }: Props) {
  const { colors } = useTheme();
  const _queryState = useState('');
  const query = _queryState[0];
  const setQuery = _queryState[1];

  const _radiusState = useState(10);
  const radius = _radiusState[0];
  const setRadius = _radiusState[1];

  const [list, setList] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);



  // Load shops and merge ratings
  useEffect(() => {
    async function load() {
      try {
        const [shopsRows, ratingsRows] = await Promise.all([fetchShops(), fetchRatings()]);
        
        const mapped: Mechanic[] = (shopsRows as DBShop[]).map(s => ({
          id: s.id,
          name: s.name,
          specialty: s.type || 'General Service',
          rating: s.rating,
          reviews: s.reviews,
          distance: '0.5 km', // Simulation: would calc from driverPos
          phone: s.phone || '',
          open: true,
          image: s.image || undefined,
          x: s.x || 50,
          y: s.y || 50
        }));

        if (ratingsRows.length > 0) {
           setList(mapped.map(m => {
             const mine = ratingsRows.filter(r => r.mechanic_id === m.id);
             if (!mine.length) return m;
             const total = m.rating * m.reviews + mine.reduce((s, r) => s + r.stars, 0);
             const count = m.reviews + mine.length;
             return { ...m, rating: parseFloat((total/count).toFixed(1)), reviews: count };
           }));
        } else {
           setList(mapped);
        }
      } catch (e) {
        console.warn('MechanicsSheet load error', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return list.filter((m) => {
      const distNum = parseFloat(m.distance);
      if (distNum > radius) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.specialty.toLowerCase().includes(q)
      );
    });
  }, [list, query, radius]);



  return (
    <View>
      <View style={[styles.searchBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <Feather name="search" size={20} color={colors.primary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search expert mechanics..."
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
        />
      </View>

      <View style={styles.radiusRow}>
        <Text style={[styles.radiusLabel, { color: colors.text }]}>Range</Text>
        <View style={styles.chipsRow}>
          {RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRadius(r)}
              style={[
                styles.radiusChip,
                {
                  backgroundColor: radius === r ? colors.primary : colors.surfaceElevated,
                  borderColor: radius === r ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: radius === r ? '#fff' : colors.text,
                  fontWeight: '800',
                  fontSize: 11,
                }}
              >
                {r} KM
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={[styles.countText, { color: colors.textMuted }]}>
        {filtered.length} mechanic{filtered.length === 1 ? '' : 's'} within {radius}km
      </Text>

      {filtered.map((m) => (
        <TouchableOpacity
          key={m.id}
          activeOpacity={0.9}
          style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.imgContainer}>
              {m.image ? (
                <Image source={{ uri: m.image }} style={styles.shopImage} />
              ) : (
                <View style={[styles.iconBox, { backgroundColor: '#F59E0B' }]}>
                  <MaterialCommunityIcons name="wrench-outline" size={24} color="#fff" />
                </View>
              )}
              <View style={styles.iconGlow} />
            </View>
            <View style={styles.headerMain}>
              <Text style={[styles.name, { color: colors.text }]}>{m.name}</Text>
              <Text style={[styles.specialty, { color: colors.primary }]}>{m.specialty.toUpperCase()}</Text>
              <View style={styles.ratingRow}>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={10} color="#FBBF24" />
                  <Text style={styles.ratingText}>{m.rating.toFixed(1)}</Text>
                </View>
                <Text style={[styles.reviewCount, { color: colors.textMuted }]}>
                  {m.reviews} reviews
                </Text>
              </View>
            </View>
            <View style={styles.rightCol}>
              <View style={[styles.statusBadge, { backgroundColor: m.open ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)' }]}>
                <Text style={[styles.statusText, { color: m.open ? colors.success : colors.danger }]}>
                  {m.open ? 'OPEN' : 'CLOSED'}
                </Text>
              </View>
              <Text style={[styles.distance, { color: colors.textMuted }]}>{m.distance}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1.5 }]}
              onPress={() => Alert.alert('Calling', `${m.name}\n${m.phone}`)}
            >
              <Feather name="phone" size={14} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => onSelect && onSelect(m)}
            >
              <Ionicons name="navigate" size={14} color="#fff" />
              <Text style={[styles.actionText, { color: '#fff' }]}>Go</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.success }]}
              onPress={() => onChat && onChat(m)}
            >
              <Feather name="message-square" size={14} color="#fff" />
              <Text style={[styles.actionText, { color: '#fff' }]}>Chat</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}

      {filtered.length === 0 && (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="magnify-close" size={40} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No mechanics found. Try expanding your radius.
          </Text>
        </View>
      )}
    </View>
  );
}

function FontAwesomeStar() {
  return <MaterialCommunityIcons name="star" size={14} color="#fff" />;
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    height: 54,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  input: { 
    flex: 1, 
    fontSize: 15,
    fontWeight: '600',
  },
  radiusRow: {
    marginTop: 20,
    marginBottom: 8,
    gap: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  radiusLabel: { 
    fontSize: 10, 
    fontWeight: '900', 
    textTransform: 'uppercase', 
    letterSpacing: 1,
    opacity: 0.6,
  },
  radiusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  countText: { 
    fontSize: 11, 
    fontWeight: '700',
    marginTop: 4, 
    marginBottom: 16,
    opacity: 0.8,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  imgContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  shopImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  iconBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerMain: {
    flex: 1,
    marginLeft: 16,
  },
  name: { 
    fontSize: 16, 
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  specialty: { 
    fontSize: 9, 
    fontWeight: '800', 
    marginTop: 2,
    letterSpacing: 0.5,
  },
  ratingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    marginTop: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  ratingText: { 
    fontSize: 10, 
    fontWeight: '900',
    color: '#F59E0B',
  },
  reviewCount: { 
    fontSize: 10, 
    fontWeight: '700',
    opacity: 0.6,
  },
  rightCol: { 
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '900',
  },
  distance: { 
    fontSize: 11, 
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 16,
  },
  actionRow: { 
    flexDirection: 'row', 
    gap: 10, 
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 14,
  },
  actionText: { 
    fontWeight: '900', 
    fontSize: 12,
  },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { textAlign: 'center', marginTop: 12, fontSize: 13 },
  reviewInput: {
    width: '100%',
    minHeight: 60,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
    textAlignVertical: 'top',
  },
});

