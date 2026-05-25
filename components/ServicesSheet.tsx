import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useTheme } from '../theme';
import POIList from './POIList';

type Tab = 'all' | 'fuel' | 'hotel';

interface Props {
  onOpenShop: () => void;
  pois?: any[];
}

export default function ServicesSheet({ onOpenShop, pois }: Props) {
  const { colors, mode } = useTheme();
  const _tabState = useState<Tab>('all');
  const tab = _tabState[0];
  const setTab = _tabState[1];

  const TabBtn = ({ value, label, icon, color }: { value: Tab; label: string; icon: React.ReactNode; color: string }) => (
    <TouchableOpacity
      onPress={() => setTab(value)}
      style={[
        styles.tab,
        {
          backgroundColor: tab === value ? color : 'transparent',
          borderColor: tab === value ? color : colors.border,
        },
      ]}
    >
      {icon}
      <Text style={{ color: tab === value ? '#fff' : colors.text, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View>
      <TouchableOpacity 
        onPress={onOpenShop}
        style={[
          styles.shopBanner, 
          { 
            backgroundColor: mode === 'dark' ? colors.primary + '20' : colors.primary + '10',
            borderColor: colors.primary + '30'
          }
        ]}
      >
        <View style={styles.shopIcon}>
          <FontAwesome5 name="store" size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.shopTitle, { color: colors.text }]}>Spare Parts Shop Available</Text>
          <Text style={[styles.shopSub, { color: colors.textMuted }]}>Genuine parts with express delivery</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      </TouchableOpacity>

      <View style={styles.tabRow}>
        <TabBtn
          value="all"
          label="All"
          color={colors.primary}
          icon={<MaterialCommunityIcons name="map-marker-multiple" size={14} color={tab === 'all' ? '#fff' : colors.text} />}
        />
        <TabBtn
          value="fuel"
          label="Fuel"
          color="#22C55E"
          icon={<MaterialCommunityIcons name="gas-station" size={14} color={tab === 'fuel' ? '#fff' : colors.text} />}
        />
        <TabBtn
          value="hotel"
          label="Hotels"
          color="#6366F1"
          icon={<FontAwesome5 name="bed" size={12} color={tab === 'hotel' ? '#fff' : colors.text} />}
        />
      </View>

      <POIList kind={tab} data={pois} />
    </View>
  );
}

const styles = StyleSheet.create({
  shopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  shopIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopTitle: { fontSize: 13, fontWeight: '800' },
  shopSub: { fontSize: 10, fontWeight: '600', opacity: 0.8 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
});
