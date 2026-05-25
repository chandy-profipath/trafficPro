import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, ScrollView } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useTheme } from '../theme';
import { suppliers, HazardType } from '../data';
import { fetchSpareParts, fetchShops, DBPart, DBShop } from '../lib/db';

const PARTS_CATEGORIES = [
  { id: 'c1', name: 'Engines', icon: 'engine', color: '#F59E0B' },
  { id: 'c2', name: 'Brakes', icon: 'car-brake-abs', color: '#EF4444' },
  { id: 'c3', name: 'Tires', icon: 'tire', color: '#3B82F6' },
  { id: 'c4', name: 'Electrical', icon: 'battery-charging', color: '#10B981' },
  { id: 'c5', name: 'Suspension', icon: 'car-settings', color: '#8B5CF6' },
];

const FEATURED_PARTS = [
  { id: 'p1', name: 'High-Performance Brake Pads', category: 'Brakes', price: '$85.00', rating: 4.8, image: 'https://images.unsplash.com/photo-1486006396143-3d2c81bdfc2b?auto=format&fit=crop&q=80&w=200', compatibility: '98%' },
  { id: 'p2', name: 'All-Terrain Pro Tires', category: 'Tires', price: '$120.00', rating: 4.9, image: 'https://images.unsplash.com/photo-1541829070764-84a7d30dee62?auto=format&fit=crop&q=80&w=200', compatibility: '100%' },
  { id: 'p3', name: 'SilverCell Super Battery', category: 'Electrical', price: '$210.00', rating: 4.7, image: 'https://images.unsplash.com/photo-1619641151626-8312cb74039d?auto=format&fit=crop&q=80&w=200', compatibility: '95%' },
];

const MOCK_SHOPS = [
  { id: 's1', name: 'Elite Auto Works', type: 'Full Service', image: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=200' },
  { id: 's2', name: 'The Tire Hub', type: 'Fitment Center', image: 'https://images.unsplash.com/photo-1551522435-a13afa10f103?auto=format&fit=crop&q=80&w=200' },
  { id: 's3', name: 'GearHead Customs', type: 'Diagnostics', image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=200' },
];

export default function SparePartsSheet() {
  const { colors, mode } = useTheme();
  const [activeTab, setActiveTab] = useState<'parts' | 'mechanics' | 'chats'>('parts');
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('c1');

  const [parts, setParts] = useState<DBPart[]>([]);
  const [shops, setShops] = useState<DBShop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [p, s] = await Promise.all([fetchSpareParts(), fetchShops()]);
        setParts(p);
        setShops(s);
      } catch (e) {
        console.error('SparePartsSheet load error', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const renderPart = ({ item }: { item: typeof FEATURED_PARTS[0] }) => (
    <TouchableOpacity 
      style={[
        styles.partCard, 
        { 
          backgroundColor: mode === 'dark' ? colors.surfaceElevated : '#fff',
          borderColor: colors.border
        }
      ]}
    >
      <Image source={{ uri: item.image }} style={styles.partImage} />
      <View style={styles.partContent}>
        <View style={styles.partHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.partName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.partPn, { color: colors.textMuted }]}>PN: {item.id.toUpperCase()}-DX</Text>
          </View>
          <View style={[styles.compatBadge, { backgroundColor: mode === 'dark' ? '#064e3b' : '#d1fae5' }]}>
            <Text style={[styles.compatText, { color: mode === 'dark' ? '#34d399' : '#065f46' }]}>{item.compatibility} FIT</Text>
          </View>
        </View>
        
        <View style={styles.partFooter}>
          <Text style={[styles.partPrice, { color: colors.primary }]}>{item.price}</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.miniAction, { backgroundColor: colors.surface }]}>
               <MaterialCommunityIcons name="chat-processing-outline" size={16} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.miniAction, { backgroundColor: colors.surface }]}>
               <MaterialCommunityIcons name="plus-box-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderShop = ({ item }: { item: typeof MOCK_SHOPS[0] }) => (
    <TouchableOpacity 
      style={[
        styles.shopCard, 
        { 
          backgroundColor: mode === 'dark' ? colors.surfaceElevated : '#fff',
          borderColor: colors.border
        }
      ]}
    >
      <Image source={{ uri: item.image }} style={styles.shopImage} />
      <View style={styles.shopContent}>
        <Text style={[styles.shopName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.shopType, { color: colors.textMuted }]}>{item.type}</Text>
        <View style={styles.shopRating}>
           <Ionicons name="star" size={12} color="#F59E0B" />
           <Ionicons name="star" size={12} color="#F59E0B" />
           <Ionicons name="star" size={12} color="#F59E0B" />
           <Ionicons name="star" size={12} color="#F59E0B" />
           <Ionicons name="star" size={12} color="#F59E0B" />
        </View>
      </View>
      <TouchableOpacity style={[styles.bookBtn, { backgroundColor: colors.primary }]}>
        <Text style={styles.bookBtnText}>BOOK</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={{ backgroundColor: colors.bg }}>
      <View style={[styles.tabHeader, { borderBottomColor: colors.border }]}>
         <TouchableOpacity onPress={() => setActiveTab('parts')} style={[styles.tab, activeTab === 'parts' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}>
            <Text style={[styles.tabLabel, { color: activeTab === 'parts' ? colors.text : colors.textMuted }]}>PARTS HUB</Text>
         </TouchableOpacity>
         <TouchableOpacity onPress={() => setActiveTab('mechanics')} style={[styles.tab, activeTab === 'mechanics' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}>
            <Text style={[styles.tabLabel, { color: activeTab === 'mechanics' ? colors.text : colors.textMuted }]}>FIX & INSTALL</Text>
         </TouchableOpacity>
         <TouchableOpacity onPress={() => setActiveTab('chats')} style={[styles.tab, activeTab === 'chats' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}>
            <Text style={[styles.tabLabel, { color: activeTab === 'chats' ? colors.text : colors.textMuted }]}>MY QUOTES</Text>
         </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: mode === 'dark' ? colors.surfaceElevated : '#fff', borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput 
          placeholder="Search by Part Num (e.g. P1-DX), Brand..." 
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {activeTab === 'parts' && (
        <View style={styles.catScroll}>
          <FlatList
            data={PARTS_CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                onPress={() => setSelectedCat(item.id)}
                style={[
                  styles.catBtn,
                  { backgroundColor: mode === 'dark' ? colors.surfaceElevated : '#fff', borderColor: selectedCat === item.id ? item.color : colors.border }
                ]}
              >
                <MaterialCommunityIcons 
                  name={item.icon as any} 
                  size={20} 
                  color={selectedCat === item.id ? item.color : colors.textMuted} 
                />
                <Text style={[
                  styles.catLabel, 
                  { color: selectedCat === item.id ? colors.text : colors.textMuted }
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.catList}
          />
        </View>
      )}
    </View>
  );

  const renderFooter = () => (
    activeTab === 'parts' ? (
      <View style={[styles.promoBox, { backgroundColor: mode === 'dark' ? colors.surfaceElevated : '#fff', borderColor: colors.accent }]}>
        <FontAwesome5 name="shuttle-van" size={24} color={colors.accent} />
        <View style={styles.promoText}>
          <Text style={[styles.promoTitle, { color: colors.text }]}>Emergency Delivery</Text>
          <Text style={[styles.promoSub, { color: colors.textMuted }]}>Breakdown? We deliver parts via drone/courier in 45 mins.</Text>
        </View>
      </View>
    ) : null
  );

  const renderMainItem = (info: any) => {
    if (activeTab === 'parts') return renderPart(info);
    if (activeTab === 'mechanics') return renderShop(info);
    return null;
  };

  return (
    <View style={styles.container}>
      <FlatList<any>
        data={activeTab === 'parts' ? parts : activeTab === 'mechanics' ? shops : []}
        keyExtractor={(item) => item.id}
        renderItem={renderMainItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          activeTab === 'chats' ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 }}>
              <MaterialCommunityIcons name="message-text-clock" size={48} color={colors.textMuted} />
              <Text style={{ color: colors.text, marginTop: 12, fontWeight: '700' }}>No Active Quotes</Text>
              <Text style={{ color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>Start a chat with a supplier to get custom pricing.</Text>
            </View>
          ) : (
            <View style={{ height: 100 }} />
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 12 },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    marginHorizontal: 0,
    paddingHorizontal: 6,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 24,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },
  catScroll: { marginBottom: 24, marginHorizontal: 0 },
  catList: { paddingHorizontal: 6, gap: 12 },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  catLabel: { fontSize: 12, fontWeight: '700' },
  section: { marginBottom: 30 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  seeAll: { fontSize: 13, fontWeight: '700' },
  partCard: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 16,
    width: '100%',
    alignSelf: 'stretch',
  },
  partImage: { width: 100, height: 100, borderRadius: 12 },
  partContent: { flex: 1, justifyContent: 'center' },
  partHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  partName: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  partPn: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  compatBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  compatText: { fontSize: 8, fontWeight: '900' },
  partFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  partPrice: { fontSize: 16, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 8 },
  miniAction: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f010',
  },
  shopCard: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
    gap: 14,
    width: '100%',
    alignSelf: 'stretch',
  },
  shopImage: { width: 84, height: 84, borderRadius: 12 },
  shopContent: { flex: 1 },
  shopName: { fontSize: 15, fontWeight: '700' },
  shopType: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  shopRating: { flexDirection: 'row', gap: 2, marginTop: 4 },
  bookBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  bookBtnText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  promoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    marginTop: 10,
    marginBottom: 40,
  },
  promoText: { flex: 1 },
  promoTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  promoSub: { fontSize: 12, fontWeight: '500', lineHeight: 18 },
});
