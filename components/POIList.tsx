import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme';
import { pois, POI } from '../data';
import StarRating from './StarRating';

interface Props {
  kind: 'fuel' | 'hotel' | 'all';
  data?: any[];
  onSelectPOI?: (poi: any) => void;
}

export default function POIList({ kind, data, onSelectPOI }: Props) {
  const { colors } = useTheme();
  
  const source = Array.isArray(data) ? data : pois;
  const list = kind === 'all' ? source : source.filter((p) => p.kind === kind);

  return (
    <View style={styles.list}>
      {list.map((p) => (
        <TouchableOpacity
          key={p.id}
          activeOpacity={0.7}
          style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          onPress={() => onSelectPOI && onSelectPOI(p)}
        >
          <View style={styles.imgContainer}>
            {p.image ? (
              <Image source={{ uri: p.image }} style={styles.poiImage} />
            ) : (
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: p.kind === 'fuel' ? '#10B981' : '#6366F1' },
                ]}
              >
                {p.kind === 'fuel' ? (
                  <MaterialCommunityIcons name="gas-station" size={24} color="#fff" />
                ) : (
                  <FontAwesome5 name="bed" size={20} color="#fff" />
                )}
              </View>
            )}
            <View style={styles.iconGlow} />
          </View>
          
          <View style={styles.details}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]}>{p.name}</Text>
              {p.kind === 'fuel' && (p.fuelStatus || p.fuel_reports?.[0]?.fuel_status) && (
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: 
                      (p.fuelStatus || p.fuel_reports?.[0]?.fuel_status) === 'In Stock' ? '#22C55E' : 
                      (p.fuelStatus || p.fuel_reports?.[0]?.fuel_status) === 'Limited' ? '#EAB308' : 
                      (p.fuelStatus || p.fuel_reports?.[0]?.fuel_status) === 'No Diesel' ? '#F97316' : '#EF4444' 
                  }
                ]}>
                  <Text style={styles.statusText}>{(p.fuelStatus || p.fuel_reports?.[0]?.fuel_status).toUpperCase()}</Text>
                </View>
              )}
            </View>
            <View style={styles.infoRow}>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={10} color="#FBBF24" />
                <Text style={styles.ratingText}>{p.rating.toFixed(1)}</Text>
              </View>
              <Text style={[styles.dot, { color: colors.textMuted }]}>·</Text>
              <Text style={[styles.distanceText, { color: colors.textMuted }]}>{p.distance || 'Near you'}</Text>
              {(p.lastUpdated || p.fuel_reports?.[0]?.created_at) && (
                <>
                  <Text style={[styles.dot, { color: colors.textMuted }]}>·</Text>
                  <Text style={[styles.updateText, { color: (p.fuelStatus || p.fuel_reports?.[0]?.fuel_status) === 'In Stock' ? '#22C55E' : colors.textMuted }]}>
                    {p.lastUpdated || 'Recently'}
                  </Text>
                </>
              )}
            </View>
            {!!p.price && (
              <Text style={[styles.price, { color: colors.primary }]}>{p.price}</Text>
            )}
          </View>

          <View style={[styles.navBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Ionicons name="location" size={18} color={colors.primary} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  imgContainer: {
    width: 48,
    height: 48,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  poiImage: {
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
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  details: {
    flex: 1,
    marginLeft: 16,
  },
  nameRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
  },
  dot: {
    marginHorizontal: 8,
    fontSize: 14,
    opacity: 0.5,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  updateText: {
    fontSize: 10,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  price: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
