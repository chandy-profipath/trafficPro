import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useTheme } from '../theme';
import { fetchSpareParts, fetchShops, DBPart, DBShop } from '../lib/db';
import { supabase } from '../lib/supabase';

const PARTS_CATEGORIES = [
  { id: 'c1', name: 'Engines', icon: 'engine', color: '#F59E0B' },
  { id: 'c2', name: 'Brakes', icon: 'car-brake-abs', color: '#EF4444' },
  { id: 'c3', name: 'Tires', icon: 'tire', color: '#3B82F6' },
  { id: 'c4', name: 'Electrical', icon: 'battery-charging', color: '#10B981' },
  { id: 'c5', name: 'Suspension', icon: 'car-settings', color: '#8B5CF6' },
];

const FEATURED_PARTS = [
  { id: 'p1', name: 'High-Performance Brake Pads', category: 'Brakes', price: '$85.00', rating: 4.8, image: 'https://images.unsplash.com/photo-1486006396143-3d2c81bdfc2b?auto=format&fit=crop&q=80&w=200', compatibility: '98%', shop_id: 's1' },
  { id: 'p2', name: 'All-Terrain Pro Tires', category: 'Tires', price: '$120.00', rating: 4.9, image: 'https://images.unsplash.com/photo-1541829070764-84a7d30dee62?auto=format&fit=crop&q=80&w=200', compatibility: '100%', shop_id: 's2' },
  { id: 'p3', name: 'SilverCell Super Battery', category: 'Electrical', price: '$210.00', rating: 4.7, image: 'https://images.unsplash.com/photo-1619641151626-8312cb74039d?auto=format&fit=crop&q=80&w=200', compatibility: '95%', shop_id: 's3' },
];

const MOCK_SHOPS = [
  { id: 's1', name: 'Elite Auto Works', type: 'Full Service', image: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=200', rating: 4.8, reviews: 156, phone: '+1 (555) 019-2834' },
  { id: 's2', name: 'The Tire Hub', type: 'Fitment Center', image: 'https://images.unsplash.com/photo-1551522435-a13afa10f103?auto=format&fit=crop&q=80&w=200', rating: 4.7, reviews: 89, phone: '+1 (555) 012-9988' },
  { id: 's3', name: 'GearHead Customs', type: 'Diagnostics', image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=200', rating: 4.9, reviews: 42, phone: '+1 (555) 014-4422' },
];

interface Props {
  onChat?: (shop: any) => void;
}

export default function SparePartsSheet({ onChat }: Props) {
  const { colors, mode } = useTheme();
  const [activeTab, setActiveTab] = useState<'parts' | 'mechanics' | 'chats'>('parts');
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('c1');

  const [parts, setParts] = useState<DBPart[]>([]);
  const [shops, setShops] = useState<DBShop[]>([]);
  const [loading, setLoading] = useState(true);

  // Live Quotes State
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [userEmail, setUserEmail] = useState('buyer@trafficpro.com');

  useEffect(() => {
    async function loadData() {
      try {
        const [p, s] = await Promise.all([fetchSpareParts(), fetchShops()]);
        setParts(p || []);
        setShops(s || []);
      } catch (e) {
        console.error('SparePartsSheet load error', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.email) {
          setUserEmail(data.user.email);
        }
      } catch (e) {}
    }
    loadUser();
  }, []);

  // Fetch customer orders on tab enter or email set
  const loadMyOrders = async () => {
    setLoadingOrders(true);
    try {
      let email = userEmail;
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.email) {
          email = data.user.email;
          setUserEmail(email);
        }
      } catch (e) {}

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('buyer_email', email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyOrders(data || []);
    } catch (e: any) {
      console.warn('loadMyOrders failed:', e.message);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Setup Realtime Database Subscription for Orders Status Sync
  useEffect(() => {
    if (activeTab === 'chats') {
      loadMyOrders();

      const channel = supabase
        .channel('my-orders-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload: any) => {
            const row = payload.new || payload.old;
            if (row && row.buyer_email === userEmail) {
              loadMyOrders();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeTab, userEmail]);

  // Order Placement Handler
  async function handlePurchasePart(item: any) {
    Alert.alert(
      'Purchase Part',
      `Would you like to place an order for the "${item.name}"? The merchant will be notified instantly.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Purchase',
          onPress: async () => {
            try {
              let email = userEmail;
              let phone = '+1 (555) 123-4567';
              try {
                const { data } = await supabase.auth.getUser();
                if (data?.user?.email) email = data.user.email;
              } catch (e) {}

              const { error } = await supabase
                .from('orders')
                .insert([{
                  shop_id: item.shop_id || 's1', // fallback
                  product_name: item.name,
                  quantity: 1,
                  status: 'Pending',
                  buyer_email: email,
                  buyer_phone: phone
                }]);

              if (error) throw error;
              Alert.alert('Success', 'Order placed successfully! Monitor merchant status live inside "MY QUOTES".');
              setActiveTab('chats');
            } catch (err: any) {
              Alert.alert('Order Failed', err.message);
            }
          }
        }
      ]
    );
  }

  // Mechanic Booking Handler
  async function handleBookMechanic(shop: any) {
    Alert.alert(
      'Book Workshop',
      `Request a diagnostics & service appointment with "${shop.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Booking',
          onPress: async () => {
            try {
              let email = userEmail;
              let phone = '+1 (555) 123-4567';
              try {
                const { data } = await supabase.auth.getUser();
                if (data?.user?.email) email = data.user.email;
              } catch (e) {}

              const { error } = await supabase
                .from('orders')
                .insert([{
                  shop_id: shop.id,
                  product_name: 'Mechanic Slot Booking',
                  quantity: 1,
                  status: 'Pending',
                  buyer_email: email,
                  buyer_phone: phone
                }]);

              if (error) throw error;
              Alert.alert('Success', 'Booking request transmitted! View progress under "MY QUOTES".');
              setActiveTab('chats');
            } catch (err: any) {
              Alert.alert('Booking Failed', err.message);
            }
          }
        }
      ]
    );
  }

  // Chat Initiator
  function handleChatSupplier(item: any) {
    if (!onChat) {
      Alert.alert('Chat Unavailable', 'Please access quotes chat from the home map dashboard.');
      return;
    }
    const supplierShop = shops.find(s => s.id === item.shop_id) || {
      id: item.shop_id || 's1',
      name: 'Global Auto Supplier',
      type: 'Supplier'
    };
    onChat(supplierShop);
  }

  // Dynamic Filter Computations
  const filteredParts = (parts.length > 0 ? parts : FEATURED_PARTS).filter(part => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = part.name?.toLowerCase().includes(q);
      const matchCompat = part.compatibility?.toLowerCase().includes(q);
      const matchCat = part.category?.toLowerCase().includes(q);
      if (!matchName && !matchCompat && !matchCat) return false;
    }
    
    if (selectedCat) {
      const catObj = PARTS_CATEGORIES.find(c => c.id === selectedCat);
      if (catObj) {
        const catName = catObj.name.toLowerCase();
        const partCat = (part.category || '').toLowerCase();
        
        if (catName === 'engines' && !partCat.includes('engine') && !partCat.includes('filter') && !partCat.includes('oil')) return false;
        if (catName === 'brakes' && !partCat.includes('brake')) return false;
        if (catName === 'tires' && !partCat.includes('tire') && !partCat.includes('wheel')) return false;
        if (catName === 'electrical' && !partCat.includes('elect') && !partCat.includes('battery')) return false;
        if (catName === 'suspension' && !partCat.includes('suspen') && !partCat.includes('shock')) return false;
      }
    }
    
    return true;
  });

  const filteredShops = (shops.length > 0 ? shops : MOCK_SHOPS).filter(shop => {
    if (!search.trim()) return true;
    
    const q = search.toLowerCase();
    const matchName = shop.name?.toLowerCase().includes(q);
    const matchType = shop.type?.toLowerCase().includes(q);
    return matchName || matchType;
  });

  function getStatusStyle(status: string) {
    switch (status) {
      case 'Pending': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', dot: '#F59E0B' };
      case 'Accepted': return { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366F1', dot: '#6366F1' };
      case 'Completed': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', dot: '#10B981' };
      case 'Cancelled': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', dot: '#EF4444' };
      default: return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94A3B8', dot: '#94A3B8' };
    }
  }

  const renderPart = ({ item }: { item: any }) => (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={() => handlePurchasePart(item)}
      style={[
        styles.gridPartCard, 
        { 
          backgroundColor: mode === 'dark' ? colors.surfaceElevated : '#fff',
          borderColor: colors.border
        }
      ]}
    >
      <View style={[styles.gridPartImageContainer, { backgroundColor: colors.bg }]}>
        <Image source={{ uri: item.image || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=200' }} style={styles.gridPartImage} />
        <View style={styles.gridCompatBadgeContainer}>
          <View style={[styles.gridCompatBadge, { backgroundColor: mode === 'dark' ? '#064e3b' : '#d1fae5' }]}>
            <Text style={[styles.gridCompatText, { color: mode === 'dark' ? '#34d399' : '#065f46' }]}>
              {item.compatibility || 'Universal'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.gridPartContent}>
        <Text style={[styles.gridPartName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.gridPartCategory, { color: colors.textMuted }]}>
          {item.category || 'General'}
        </Text>
        
        <View style={styles.gridPartFooter}>
          <Text style={[styles.gridPartPrice, { color: colors.accent }]}>
            {item.price || 'TBD'}
          </Text>
          <View style={styles.gridActionRow}>
            <TouchableOpacity style={[styles.gridMiniAction, { backgroundColor: colors.surface }]} onPress={() => handleChatSupplier(item)}>
               <MaterialCommunityIcons name="chat-processing-outline" size={13} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.gridMiniAction, { backgroundColor: colors.surface }]} onPress={() => handlePurchasePart(item)}>
               <MaterialCommunityIcons name="plus" size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderShop = ({ item }: { item: any }) => (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={() => handleBookMechanic(item)}
      style={[
        styles.shopCard, 
        { 
          backgroundColor: mode === 'dark' ? colors.surfaceElevated : '#fff',
          borderColor: colors.border
        }
      ]}
    >
      <Image source={{ uri: item.image || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=200' }} style={styles.shopImage} />
      <View style={styles.shopContent}>
        <Text style={[styles.shopName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.shopType, { color: colors.textMuted }]}>{item.type || 'Automotive Clinic'}</Text>
        <View style={styles.shopRating}>
           <Ionicons name="star" size={12} color="#F59E0B" />
           <Text style={{ fontSize: 10, color: colors.textMuted, marginLeft: 4 }}>{item.rating || '4.8'} ({item.reviews || 0} reviews)</Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.bookBtn, { backgroundColor: colors.primary }]} onPress={() => handleBookMechanic(item)}>
        <Text style={styles.bookBtnText}>BOOK</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderOrder = ({ item }: { item: any }) => {
    const statusStyle = getStatusStyle(item.status);
    const orderShop = shops.find(s => s.id === item.shop_id);
    const shopName = orderShop ? orderShop.name : 'Registered Outlet';

    return (
      <View 
        style={[
          styles.orderCard, 
          { 
            backgroundColor: mode === 'dark' ? colors.surfaceElevated : '#fff',
            borderColor: colors.border
          }
        ]}
      >
        <View style={styles.orderTop}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.orderProduct, { color: colors.text }]} numberOfLines={1}>{item.product_name}</Text>
            <Text style={[styles.orderMerchant, { color: colors.primary }]} numberOfLines={1}>🏢 {shopName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusStyle.dot }]} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={[styles.orderFooter, { borderTopColor: colors.border + '15' }]}>
          <Text style={[styles.orderDate, { color: colors.textMuted }]}>
            📅 {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
          {orderShop && (
            <TouchableOpacity 
              style={[styles.miniChatBtn, { backgroundColor: colors.success }]}
              onPress={() => onChat && onChat(orderShop)}
            >
              <MaterialCommunityIcons name="chat-processing-outline" size={13} color="#fff" style={{ marginRight: 4 }} />
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>Message</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

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

      {activeTab !== 'chats' && (
        <View style={[styles.searchBar, { backgroundColor: mode === 'dark' ? colors.surfaceElevated : '#fff', borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput 
            placeholder={activeTab === 'parts' ? "Search parts or compatibility requirements..." : "Search workshop clinics..."}
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      )}

      {activeTab === 'parts' && (
        <View style={styles.catScroll}>
          <FlatList
            data={PARTS_CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                onPress={() => setSelectedCat(selectedCat === item.id ? '' : item.id)}
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
    if (activeTab === 'chats') return renderOrder(info);
    return null;
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 120 }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList<any>
          key={activeTab === 'parts' ? 'grid' : 'list'}
          numColumns={activeTab === 'parts' ? 2 : 1}
          data={activeTab === 'parts' ? filteredParts : activeTab === 'mechanics' ? filteredShops : activeTab === 'chats' ? myOrders : []}
          keyExtractor={(item) => item.id}
          renderItem={renderMainItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            activeTab === 'chats' && loadingOrders ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : activeTab === 'chats' ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 }}>
                <MaterialCommunityIcons name="message-text-clock" size={48} color={colors.textMuted} />
                <Text style={{ color: colors.text, marginTop: 12, fontWeight: '700' }}>No Active Quotes</Text>
                <Text style={{ color: colors.textMuted, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }}>
                  No orders placed yet. Tap any spare part or book a workshop to initialize purchases!
                </Text>
              </View>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
                <MaterialCommunityIcons name="store-alert-outline" size={36} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, marginTop: 8, fontWeight: '600' }}>No listings matching your search.</Text>
              </View>
            )
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
    minWidth: 90,
    justifyContent: 'center',
  },
  catLabel: { fontSize: 12, fontWeight: '700' },
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
  
  // Custom Live Quotes styles
  orderCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    width: '100%',
    alignSelf: 'stretch',
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderProduct: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  orderMerchant: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  orderDate: {
    fontSize: 10,
    fontWeight: '700',
  },
  miniChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  // 2-column product grid card styles
  gridPartCard: {
    flex: 0.5,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    marginHorizontal: 6,
    overflow: 'hidden',
  },
  gridPartImageContainer: {
    width: '100%',
    height: 104,
    position: 'relative',
  },
  gridPartImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridCompatBadgeContainer: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  gridCompatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gridCompatText: {
    fontSize: 7.5,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  gridPartContent: {
    padding: 10,
    gap: 3,
  },
  gridPartName: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  gridPartCategory: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  gridPartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  gridPartPrice: {
    fontSize: 13.5,
    fontWeight: '900',
  },
  gridActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  gridMiniAction: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f010',
  },
});
