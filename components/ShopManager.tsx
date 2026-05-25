import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ImageBackground, Alert, ActivityIndicator, ScrollView, Dimensions, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { pctToLatLng } from '../lib/coords';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const CAR_PART_CATEGORIES = [
  'Engine',
  'Brakes',
  'Suspension',
  'Transmission',
  'Electrical',
  'Exhaust',
  'Body & Trim',
  'Interior',
  'Tires & Wheels',
  'Fluids & Filters',
  'Tools & Equipment'
];

const RICH_CATEGORIES = [
  { name: 'All', icon: 'map-marker-multiple', color: '#6366F1' },
  { name: 'Engine', icon: 'engine', color: '#F59E0B' },
  { name: 'Brakes', icon: 'car-brake-abs', color: '#EF4444' },
  { name: 'Suspension', icon: 'car-settings', color: '#8B5CF6' },
  { name: 'Transmission', icon: 'cog-outline', color: '#EC4899' },
  { name: 'Electrical', icon: 'battery-charging', color: '#10B981' },
  { name: 'Exhaust', icon: 'pipe-leak', color: '#64748B' },
  { name: 'Body & Trim', icon: 'car-door', color: '#06B6D4' },
  { name: 'Interior', icon: 'car-seat', color: '#14B8A6' },
  { name: 'Tires & Wheels', icon: 'tire', color: '#3B82F6' },
  { name: 'Fluids & Filters', icon: 'oil-can', color: '#84CC16' },
  { name: 'Tools & Equipment', icon: 'toolbox-outline', color: '#0EA5E9' },
];

async function promptImagePicker(): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Select Image Source',
      'Choose where to pick the image from',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Camera access is required.');
              return resolve(null);
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              resolve(result.assets[0].uri);
            } else {
              resolve(null);
            }
          }
        },
        {
          text: 'Photo Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Photos library access is required.');
              return resolve(null);
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              resolve(result.assets[0].uri);
            } else {
              resolve(null);
            }
          }
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null)
        }
      ]
    );
  });
}

async function uploadImage(uri: string, pathPrefix: string): Promise<string> {
  if (uri.startsWith('http')) return uri;
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    const filename = `${Math.random().toString(36).slice(2, 10)}.jpg`;
    const path = `${pathPrefix}/${filename}`;

    const { data, error } = await supabase.storage.from('spare-images').upload(path, blob, {
      upsert: true,
      contentType: 'image/jpeg'
    });
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from('spare-images').getPublicUrl(path);
    return publicUrl;
  } catch (e: any) {
    console.warn('uploadImage failed, falling back to placeholder:', e.message);
    return `https://picsum.photos/seed/${Math.random().toString(36).slice(2, 6)}/800/600`;
  }
}

interface ShopManagerProps {
  user: any;
  userX: number;
  userY: number;
}

export default function ShopManager({ user, userX, userY }: ShopManagerProps) {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  const [view, setView] = useState<'shops' | 'dashboard'>('shops');
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<any | null>(null);

  // Shop Creation State
  const [creating, setCreating] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('Supplier');
  const [shopPhone, setShopPhone] = useState('');
  const [shopImage, setShopImage] = useState('');
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [linkLocation, setLinkLocation] = useState(true);

  // Dashboard Sub-views: 'products' | 'orders' | 'add_product'
  const [dashboardTab, setDashboardTab] = useState<'products' | 'orders' | 'add_product'>('products');

  useEffect(() => {
    loadShops();
  }, [user]);

  function getDistance(sx: number | null, sy: number | null) {
    if (sx === null || sy === null) return null;
    const p1 = pctToLatLng(userX, userY);
    const p2 = pctToLatLng(sx, sy);
    
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(p2.latitude - p1.latitude);
    const dLon = toRad(p2.longitude - p1.longitude);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(p1.latitude)) * Math.cos(toRad(p2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  }

  async function loadShops() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShops(data || []);
    } catch (e: any) {
      console.warn('loadShops failed:', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function pickImage() {
    const uri = await promptImagePicker();
    if (uri) setPickedImageUri(uri);
  }

  async function createShop() {
    if (!shopName.trim()) return Alert.alert('Shop name is required');
    if (!user) return Alert.alert('Please sign in first');

    setCreating(true);
    try {
      let finalImageUrl = null;
      if (pickedImageUri) {
        finalImageUrl = await uploadImage(pickedImageUri, 'shops');
      } else if (shopImage.trim()) {
        finalImageUrl = shopImage.trim();
      }

      const finalX = linkLocation ? userX : null;
      const finalY = linkLocation ? userY : null;

      const { error } = await supabase
        .from('shops')
        .insert([{
          name: shopName.trim(),
          type: shopType,
          image: finalImageUrl,
          phone: shopPhone.trim() || null,
          owner_id: user.id,
          x: finalX,
          y: finalY,
          rating: 4.8,
          reviews: 0
        }]);

      if (error) throw error;

      Alert.alert('Success', 'Shop created successfully!');
      setShopName('');
      setShopImage('');
      setPickedImageUri(null);
      setShopPhone('');
      setLinkLocation(true);
      loadShops();
    } catch (e: any) {
      console.warn(e);
      Alert.alert('Failed', e.message || String(e));
    } finally {
      setCreating(false);
    }
  }

  async function linkShopLocationToCurrent() {
    if (!selectedShop) return;
    try {
      const { error } = await supabase
        .from('shops')
        .update({ x: userX, y: userY })
        .eq('id', selectedShop.id);

      if (error) throw error;

      Alert.alert('Success', 'Shop location linked to your current GPS position!');
      const updatedShop = { ...selectedShop, x: userX, y: userY };
      setSelectedShop(updatedShop);
      loadShops();
    } catch (e: any) {
      Alert.alert('Error', e.message || String(e));
    }
  }

  function handleEnterShop(shop: any) {
    setSelectedShop(shop);
    setDashboardTab('products');
    setView('dashboard');
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (view === 'dashboard' && selectedShop) {
    const isUnmapped = selectedShop.x === null || selectedShop.y === null;

    return (
      <View style={[styles.dashboardRoot, { backgroundColor: colors.bg }]}>
        {/* Premium Banner Background Header */}
        <View style={[styles.premiumHeaderContainerImage, { borderColor: colors.border }]}>
          <ImageBackground 
            source={{ uri: selectedShop.image || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=800&auto=format&fit=crop' }} 
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          >
            {/* Smooth dark overlay to ensure maximum text readability and elegance */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(2, 6, 23, 0.58)' }]} />
            
            {/* Header Content placed perfectly at the bottom */}
            <View style={styles.headerImageContent}>
              <View style={styles.badgeRow}>
                <View style={[styles.premiumBadge, { backgroundColor: colors.primary + '45', borderColor: colors.primary }]}>
                  <Text style={[styles.premiumBadgeText, { color: '#FFF' }]}>{selectedShop.type}</Text>
                </View>
                <TouchableOpacity 
                  activeOpacity={0.8}
                  style={[styles.premiumBadge, { 
                    backgroundColor: isUnmapped ? 'rgba(244, 63, 94, 0.4)' : 'rgba(16, 185, 129, 0.4)', 
                    borderColor: isUnmapped ? colors.danger : colors.success 
                  }]}
                  onPress={async () => {
                    if (isUnmapped) {
                      Alert.alert(
                        'Activate Shop GPS',
                        'Would you like to link this outlet to your current GPS position and activate online customer ordering?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Link GPS Now', onPress: linkShopLocationToCurrent }
                        ]
                      );
                    } else {
                      Alert.alert(
                        'Deactivate Shop GPS',
                        'Would you like to unlink this shop\'s GPS coordinates and temporarily pause online ordering?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Go Offline', 
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                const { error } = await supabase
                                  .from('shops')
                                  .update({ x: null, y: null })
                                  .eq('id', selectedShop.id);
                                if (error) throw error;
                                Alert.alert('Offline', 'Shop GPS unlinked successfully.');
                                setSelectedShop({ ...selectedShop, x: null, y: null });
                                loadShops();
                              } catch (e: any) {
                                Alert.alert('Error', e.message);
                              }
                            }
                          }
                        ]
                      );
                    }
                  }}
                >
                  <View style={[styles.statusDot, { backgroundColor: isUnmapped ? colors.danger : colors.success }]} />
                  <Text style={[styles.premiumBadgeText, { color: '#FFF' }]}>
                    {isUnmapped ? 'Offline' : 'Online'}
                  </Text>
                </TouchableOpacity>
                <View style={[styles.premiumBadge, { backgroundColor: 'rgba(251, 191, 36, 0.35)', borderColor: '#FBBF24' }]}>
                  <Ionicons name="star" size={10} color="#FBBF24" style={{ marginRight: 3 }} />
                  <Text style={[styles.premiumBadgeText, { color: '#FBBF24' }]}>{selectedShop.rating || '4.8'}</Text>
                </View>
              </View>

              <Text style={[styles.premiumShopName, { color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }]} numberOfLines={1}>
                {selectedShop.name}
              </Text>
              
              <View style={[styles.row, { marginTop: 4, flexWrap: 'wrap', gap: 12 }]}>
                {selectedShop.phone && (
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => {
                      Linking.openURL(`tel:${selectedShop.phone}`).catch(() => {
                        Alert.alert('Call Failed', 'Dialer is not supported on this device.');
                      });
                    }}
                  >
                    <Text style={[styles.premiumSubText, { color: '#E5E7EB', textDecorationLine: 'underline' }]}>📞 {selectedShop.phone}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  activeOpacity={0.7} 
                  onPress={() => {
                    if (isUnmapped) {
                      Alert.alert(
                        'Map GPS Coordinates',
                        'Instantly link this shop to your current GPS coordinates to allow customer directions?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Link GPS', onPress: linkShopLocationToCurrent }
                        ]
                      );
                    } else {
                      Alert.alert('GPS Status', `Coordinates linked at X: ${selectedShop.x}, Y: ${selectedShop.y}. Tapping Online status badge above allows unlinking.`);
                    }
                  }}
                >
                  <Text style={[styles.premiumSubText, { color: colors.accent, fontWeight: '800' }]}>
                    📍 {isUnmapped ? 'GPS Off (Tap to Link)' : 'GPS Active'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* Dashboard Grid Access Bar */}
        <View style={styles.quickAccessWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickAccessScroll}>
            <TouchableOpacity 
              style={[
                styles.quickAccessBtn, 
                { backgroundColor: colors.surfaceElevated, borderColor: dashboardTab === 'products' ? colors.primary : colors.border }
              ]} 
              onPress={() => setDashboardTab('products')}
            >
              <View style={[styles.quickAccessIconBg, { backgroundColor: colors.primary + '15' }]}>
                <MaterialCommunityIcons name="package-variant" size={15} color={colors.primary} />
              </View>
              <Text style={[styles.quickAccessText, { color: colors.text }]}>Catalogue</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.quickAccessBtn, 
                { backgroundColor: colors.surfaceElevated, borderColor: dashboardTab === 'orders' ? colors.primary : colors.border }
              ]} 
              onPress={() => setDashboardTab('orders')}
            >
              <View style={[styles.quickAccessIconBg, { backgroundColor: colors.accent + '15' }]}>
                <MaterialCommunityIcons name="cart-outline" size={15} color={colors.accent} />
              </View>
              <Text style={[styles.quickAccessText, { color: colors.text }]}>Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.quickAccessBtn, 
                { backgroundColor: colors.surfaceElevated, borderColor: dashboardTab === 'add_product' ? colors.primary : colors.border }
              ]} 
              onPress={() => setDashboardTab('add_product')}
            >
              <View style={[styles.quickAccessIconBg, { backgroundColor: colors.success + '15' }]}>
                <Ionicons name="add-circle-outline" size={15} color={colors.success} />
              </View>
              <Text style={[styles.quickAccessText, { color: colors.text }]}>Add Product</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickAccessBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]} onPress={() => setView('shops')}>
              <View style={[styles.quickAccessIconBg, { backgroundColor: colors.danger + '15' }]}>
                <Ionicons name="exit-outline" size={15} color={colors.danger} />
              </View>
              <Text style={[styles.quickAccessText, { color: colors.text }]}>Exit Shop</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Dashboard Dynamic Tab Section */}
        <View style={{ flex: 1 }}>
          {dashboardTab === 'products' && <ShopProductsCatalogue shop={selectedShop} />}
          
          {dashboardTab === 'orders' && (
            isUnmapped ? (
              <View style={[styles.warningCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.danger }]}>
                <View style={[styles.warningIconBg, { backgroundColor: colors.danger + '15' }]}>
                  <MaterialCommunityIcons name="map-marker-off" size={32} color={colors.danger} />
                </View>
                <Text style={[styles.warningTitle, { color: colors.text }]}>Orders Deactivated</Text>
                <Text style={[styles.warningText, { color: colors.textMuted }]}>
                  This shop does not have a mapped location. You cannot receive active customer orders until the location is linked.
                </Text>
                <TouchableOpacity 
                  style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 20, width: '100%' }]} 
                  onPress={linkShopLocationToCurrent}
                >
                  <Text style={styles.submitBtnText}>📍 Link Location to GPS</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ShopOrdersReceived shop={selectedShop} />
            )
          )}

          {dashboardTab === 'add_product' && <ShopAddProduct shop={selectedShop} onDone={() => setDashboardTab('products')} />}
        </View>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} style={[styles.shopManagerContainer, { backgroundColor: colors.bg }]}>
      {/* Hero Shops Overview Banner */}
      <View style={[styles.heroCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderLeftColor: colors.primary }]}>
        <View style={styles.heroLeft}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Your Garage Hub</Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>Manage local inventory, receive customer booking and active parts requests.</Text>
        </View>
        <View style={[styles.heroIconBg, { backgroundColor: colors.primary + '15' }]}>
          <MaterialCommunityIcons name="storefront-outline" size={32} color={colors.primary} />
        </View>
      </View>

      {/* Shops List */}
      <Text style={[styles.listTitle, { color: colors.text }]}>Registered Outlets ({shops.length})</Text>
      {shops.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="store-alert-outline" size={40} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No outlets active. Fill out the registration terminal below to initialize your storefront.</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {shops.map((item) => {
            const distance = getDistance(item.x, item.y);
            const isShopUnmapped = item.x === null || item.y === null;
            return (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.shopCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]} 
                onPress={() => handleEnterShop(item)}
                activeOpacity={0.8}
              >
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.shopImage} />
                ) : (
                  <View style={[styles.shopImage, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
                    <MaterialCommunityIcons name="store" size={28} color={colors.primary} />
                  </View>
                )}

                <View style={styles.shopInfo}>
                  <View style={styles.shopHeaderRow}>
                    <Text style={[styles.shopName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    {isShopUnmapped ? (
                      <View style={[styles.miniStatusBadge, { backgroundColor: colors.danger + '15' }]}>
                        <Text style={[styles.miniStatusText, { color: colors.danger }]}>⚠️ Offline</Text>
                      </View>
                    ) : (
                      distance && (
                        <Text style={[styles.shopDistance, { color: colors.accent }]}>📍 {distance} km</Text>
                      )
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <View style={[styles.typeBadge, { backgroundColor: colors.primary + '12' }]}>
                      <Text style={[styles.typeBadgeText, { color: colors.primary }]}>{item.type}</Text>
                    </View>
                    <View style={styles.row}>
                      <Ionicons name="star" size={13} color="#FBBF24" style={{ marginRight: 3 }} />
                      <Text style={[styles.ratingText, { color: colors.text }]}>{item.rating || '4.8'}</Text>
                    </View>
                  </View>

                  {item.phone && (
                    <Text style={[styles.shopPhone, { color: colors.textMuted }]} numberOfLines={1}>📞 {item.phone}</Text>
                  )}
                </View>
                
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={{ height: 28 }} />

      {/* Create Shop Panel */}
      <View style={[styles.formCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.formCardHeader}>
          <View style={[styles.formHeaderIconBg, { backgroundColor: colors.primary + '15' }]}>
            <MaterialCommunityIcons name="store-plus-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Register Outlet</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>Setup and configure a new auto workshop or parts center.</Text>
          </View>
        </View>
        
        <View style={styles.formGrid}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Shop Name</Text>
            <TextInput 
              placeholder="e.g. Apex Auto Parts Center" 
              placeholderTextColor={colors.textMuted} 
              value={shopName} 
              onChangeText={setShopName} 
              style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Outlet Category</Text>
            <View style={styles.row}>
              <TouchableOpacity 
                style={[
                  styles.toggleBtn, 
                  { backgroundColor: colors.bg, borderColor: colors.border },
                  shopType === 'Supplier' && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]} 
                onPress={() => setShopType('Supplier')}
              >
                <Text style={[styles.toggleBtnText, { color: shopType === 'Supplier' ? '#fff' : colors.textMuted }]}>Spare Parts Supplier</Text>
              </TouchableOpacity>
              <View style={{ width: 10 }} />
              <TouchableOpacity 
                style={[
                  styles.toggleBtn, 
                  { backgroundColor: colors.bg, borderColor: colors.border },
                  shopType === 'Mechanic' && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]} 
                onPress={() => setShopType('Mechanic')}
              >
                <Text style={[styles.toggleBtnText, { color: shopType === 'Mechanic' ? '#fff' : colors.textMuted }]}>Professional Mechanic</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Device Image Picker Badge */}
          <View style={[styles.imagePickerBadge, { borderColor: colors.border, backgroundColor: colors.bg }]}>
            {pickedImageUri ? (
              <View style={styles.row}>
                <Image source={{ uri: pickedImageUri }} style={styles.pickerPreview} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>Selected Cover Photo</Text>
                  <TouchableOpacity style={styles.pickerSubBtn} onPress={pickImage}>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Change cover image</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setPickedImageUri(null)} style={[styles.trashBtn, { backgroundColor: colors.danger + '15' }]}>
                  <Ionicons name="trash" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.pickerTrigger} onPress={pickImage}>
                <MaterialCommunityIcons name="cloud-upload-outline" size={24} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 4 }}>Select Storefront Picture</Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>Tap to open your device photo gallery</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Hotline / Phone Number</Text>
            <TextInput 
              placeholder="e.g. +1 (555) 019-2834" 
              placeholderTextColor={colors.textMuted} 
              value={shopPhone} 
              onChangeText={setShopPhone} 
              style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} 
              keyboardType="phone-pad"
            />
          </View>

          {/* Location link trigger */}
          <TouchableOpacity 
            style={[
              styles.locationToggle, 
              { 
                borderColor: linkLocation ? colors.primary : colors.border,
                backgroundColor: linkLocation ? colors.primary + '0A' : colors.bg
              }
            ]}
            onPress={() => setLinkLocation(!linkLocation)}
            activeOpacity={0.8}
          >
            <View style={[styles.locationToggleIconBg, { backgroundColor: linkLocation ? colors.primary + '15' : colors.border + '15' }]}>
              <MaterialCommunityIcons 
                name={linkLocation ? "map-marker" : "map-marker-off"} 
                size={20} 
                color={linkLocation ? colors.primary : colors.textMuted} 
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                {linkLocation ? 'Auto-Link Current GPS' : 'Offline Mode (Manual GPS)'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }}>
                {linkLocation 
                  ? 'Instantly publishes store relative to your current coordinates.' 
                  : 'Requires setting coordinates later in the terminal to view on maps.'}
              </Text>
            </View>
            <Ionicons 
              name={linkLocation ? "checkmark-circle" : "ellipse-outline"} 
              size={22} 
              color={linkLocation ? colors.primary : colors.textMuted} 
            />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={createShop} disabled={creating}>
            <Text style={styles.submitBtnText}>{creating ? 'Publishing Outlet...' : 'Initialize Outlet'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

/* ============================================================================
   Sub-Component: ShopProductsCatalogue
   ============================================================================ */
function ShopProductsCatalogue({ shop }: { shop: any }) {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Product Modal / Form State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCompat, setEditCompat] = useState('');
  const [editImg1, setEditImg1] = useState('');
  const [editImg2, setEditImg2] = useState('');
  const [editImg3, setEditImg3] = useState('');
  const [updating, setUpdating] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = [
    'All',
    ...CAR_PART_CATEGORIES,
    ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))
      .filter((cat) => !CAR_PART_CATEGORIES.some((c) => c.toLowerCase() === cat.toLowerCase()))
  ];
  
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.compatibility && p.compatibility.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());
    return matchesSearch && matchesCat;
  });

  useEffect(() => {
    loadProducts();
  }, [shop]);

  async function loadProducts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('spare_parts')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (e: any) {
      console.warn(e.message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(product: any) {
    setEditingProduct(product);
    setEditName(product.name);
    setEditCategory(product.category);
    setEditPrice(product.price || '');
    setEditCompat(product.compatibility || '');
    
    const imgs = product.images || [];
    setEditImg1(imgs[0] || product.image || '');
    setEditImg2(imgs[1] || '');
    setEditImg3(imgs[2] || '');
  }

  async function deleteProduct(id: string) {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to remove this item from your catalogue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('spare_parts').delete().eq('id', id);
              if (error) throw error;
              Alert.alert('Deleted', 'Product removed successfully');
              loadProducts();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  }

  async function updateProduct() {
    if (!editName.trim()) return Alert.alert('Product name is required');
    if (!editingProduct) return;

    setUpdating(true);
    try {
      const imgs = [editImg1.trim(), editImg2.trim(), editImg3.trim()].filter(Boolean);
      
      const { error } = await supabase
        .from('spare_parts')
        .update({
          name: editName.trim(),
          category: editCategory.trim() || 'General',
          price: editPrice.trim() || null,
          compatibility: editCompat.trim() || null,
          image: imgs[0] || null,
          images: imgs
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      Alert.alert('Success', 'Product updated!');
      setEditingProduct(null);
      loadProducts();
    } catch (e: any) {
      Alert.alert('Update Failed', e.message);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />;

  if (editingProduct) {
    return (
      <ScrollView contentContainerStyle={styles.editorContainer} keyboardShouldPersistTaps="handled">
        <View style={[styles.formCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Edit Product Details</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Product Name</Text>
            <TextInput 
              placeholder="Product Name" 
              placeholderTextColor={colors.textMuted} 
              value={editName} 
              onChangeText={setEditName} 
              style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Category</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: 6, paddingVertical: 4, alignItems: 'center' }}
            >
              {CAR_PART_CATEGORIES.map((cat) => {
                const isSelected = editCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setEditCategory(cat)}
                    style={[
                      styles.categoryPill,
                      { backgroundColor: colors.bg, borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: isSelected ? '#FFF' : colors.textMuted }}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TextInput 
              placeholder="Or enter a custom category..." 
              placeholderTextColor={colors.textMuted} 
              value={editCategory} 
              onChangeText={setEditCategory} 
              style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Price</Text>
            <TextInput 
              placeholder="Price (e.g. $85.00)" 
              placeholderTextColor={colors.textMuted} 
              value={editPrice} 
              onChangeText={setEditPrice} 
              style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Compatibility Details</Text>
            <TextInput 
              placeholder="Compatibility (e.g. Toyota Camry 2018-2022)" 
              placeholderTextColor={colors.textMuted} 
              value={editCompat} 
              onChangeText={setEditCompat} 
              style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} 
            />
          </View>

          <Text style={{ color: colors.text, fontWeight: '800', marginTop: 16, marginBottom: 8, fontSize: 13 }}>Product Photos (Max 3)</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {[editImg1, editImg2, editImg3].map((img, idx) => {
              if (!img) {
                return (
                  <TouchableOpacity key={idx} style={{ width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }} onPress={async () => {
                    const uri = await promptImagePicker();
                    if (uri) {
                      const uploaded = await uploadImage(uri, 'spare-images');
                      if (idx === 0) setEditImg1(uploaded);
                      else if (idx === 1) setEditImg2(uploaded);
                      else if (idx === 2) setEditImg3(uploaded);
                    }
                  }}>
                    <Ionicons name="camera-outline" size={24} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              }
              return (
                <View key={idx} style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                  <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} />
                  <TouchableOpacity style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 2 }} onPress={() => {
                    if (idx === 0) setEditImg1('');
                    else if (idx === 1) setEditImg2('');
                    else if (idx === 2) setEditImg3('');
                  }}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <View style={[styles.row, { marginTop: 16 }]}>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary, flex: 1 }]} onPress={updateProduct} disabled={updating}>
              <Text style={styles.submitBtnText}>{updating ? 'Updating...' : 'Save Changes'}</Text>
            </TouchableOpacity>
            <View style={{ width: 10 }} />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.border, flex: 1 }]} onPress={() => setEditingProduct(null)}>
              <Text style={[styles.submitBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Search & Category Filter Section */}
      <View style={[styles.searchWrapper, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput 
          placeholder="Search spare parts or compatibility..." 
          placeholderTextColor={colors.textMuted} 
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: '500', height: '100%', paddingVertical: 0 }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal categories list */}
      {categories.length > 1 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={{ flexGrow: 0, marginBottom: 8 }} 
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const richCat = RICH_CATEGORIES.find(c => c.name.toLowerCase() === cat.toLowerCase()) || {
              name: cat,
              icon: 'cog-outline',
              color: '#64748B'
            };
            return (
              <TouchableOpacity 
                key={cat} 
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.catBtn, 
                  { 
                    backgroundColor: mode === 'dark' ? colors.surfaceElevated : '#fff', 
                    borderColor: isSelected ? richCat.color : colors.border 
                  }
                ]}
              >
                <MaterialCommunityIcons 
                  name={richCat.icon as any} 
                  size={20} 
                  color={isSelected ? richCat.color : colors.textMuted} 
                />
                <Text style={[styles.catLabel, { color: isSelected ? colors.text : colors.textMuted }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {products.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, marginTop: 10 }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No products found in this outlet.</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, marginTop: 10 }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No results matching your query.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.gridContainer}>
          <View style={styles.gridWrap}>
            {filteredProducts.map(renderProductCard)}
          </View>
        </ScrollView>
      )}
    </View>
  );

  function renderProductCard(item: any) {
    const productImages = item.images || (item.image ? [item.image] : []);
    return (
      <View key={item.id} style={[styles.premiumProductCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        {/* Product Image */}
        <View style={[styles.productImageContainer, { backgroundColor: colors.bg }]}>
          {productImages.length > 0 ? (
            <Image source={{ uri: productImages[0] }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="image-off-outline" size={24} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.bookmarkOverlay}>
            <View style={[styles.premiumBadge, { backgroundColor: colors.primary + '30', borderColor: colors.primary }]}>
              <Text style={[styles.premiumBadgeText, { color: colors.primary, fontSize: 8 }]}>{item.category || 'General'}</Text>
            </View>
          </View>
        </View>

        {/* Product Details */}
        <View style={styles.productDetailsContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={[styles.premiumProductName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 4 }}>
              <Ionicons name="star" size={11} color="#FBBF24" style={{ marginRight: 2 }} />
              <Text style={{ color: colors.text, fontSize: 10, fontWeight: '700' }}>{item.rating || '4.8'}</Text>
            </View>
          </View>

          <Text style={[styles.premiumProductPrice, { color: colors.accent }]}>{item.price || 'Ask for Price'}</Text>
          <Text style={[styles.premiumProductCompat, { color: colors.textMuted }]} numberOfLines={1}>⚙️ {item.compatibility || 'Universal Fit'}</Text>

          <View style={styles.productActionsRow}>
            <TouchableOpacity style={[styles.actionIconButton, { backgroundColor: colors.danger + '15' }]} onPress={() => deleteProduct(item.id)}>
              <Ionicons name="trash-outline" size={15} color={colors.danger} />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionIconButton, { backgroundColor: colors.primary }]} onPress={() => startEdit(item)}>
              <Ionicons name="create-outline" size={15} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
}

/* ============================================================================
   Sub-Component: ShopAddProduct
   ============================================================================ */
function ShopAddProduct({ shop, onDone }: { shop: any; onDone: () => void }) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Engine');
  const [price, setPrice] = useState('');
  const [compatibility, setCompatibility] = useState('');
  const [img1, setImg1] = useState('');
  const [img2, setImg2] = useState('');
  const [img3, setImg3] = useState('');
  const [saving, setSaving] = useState(false);

  async function saveProduct() {
    if (!name.trim()) return Alert.alert('Product name is required');
    setSaving(true);
    try {
      const imgs = [img1.trim(), img2.trim(), img3.trim()].filter(Boolean);

      const { error } = await supabase
        .from('spare_parts')
        .insert([{
          name: name.trim(),
          category: category.trim(),
          price: price.trim() || null,
          compatibility: compatibility.trim() || null,
          rating: 4.8,
          shop_id: shop.id,
          image: imgs[0] || null,
          images: imgs
        }]);

      if (error) throw error;

      Alert.alert('Success', 'Product catalogued!');
      setName('');
      setCategory('Engine');
      setPrice('');
      setCompatibility('');
      setImg1('');
      setImg2('');
      setImg3('');
      onDone();
    } catch (e: any) {
      console.warn(e);
      Alert.alert('Failed', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={[styles.formCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.formCardHeader}>
          <View style={[styles.formHeaderIconBg, { backgroundColor: colors.success + '15' }]}>
            <Ionicons name="sparkles" size={20} color={colors.success} />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Add Catalog Item</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>Introduce a new auto part or mechanic service to buyers.</Text>
          </View>
        </View>

        <View style={styles.formGrid}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Part/Item Name</Text>
            <TextInput 
              placeholder="e.g. Ceramic Front Brake Pads" 
              placeholderTextColor={colors.textMuted} 
              value={name} 
              onChangeText={setName} 
              style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Category / Section</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: 6, paddingVertical: 4, alignItems: 'center' }}
            >
              {CAR_PART_CATEGORIES.map((cat) => {
                const isSelected = category.toLowerCase() === cat.toLowerCase();
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.categoryPill,
                      { backgroundColor: colors.bg, borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: isSelected ? '#FFF' : colors.textMuted }}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TextInput 
              placeholder="Or enter a custom category..." 
              placeholderTextColor={colors.textMuted} 
              value={category} 
              onChangeText={setCategory} 
              style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Retail Price</Text>
            <TextInput 
              placeholder="e.g. $85.00" 
              placeholderTextColor={colors.textMuted} 
              value={price} 
              onChangeText={setPrice} 
              style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Compatibility Requirements</Text>
            <TextInput 
              placeholder="e.g. Toyota Corolla 2015-2020" 
              placeholderTextColor={colors.textMuted} 
              value={compatibility} 
              onChangeText={setCompatibility} 
              style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} 
            />
          </View>

          <Text style={{ color: colors.text, fontWeight: '800', marginTop: 12, marginBottom: 8, fontSize: 13 }}>Product Photos (Max 3)</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {[img1, img2, img3].map((img, idx) => {
              if (!img) {
                return (
                  <TouchableOpacity key={idx} style={{ width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }} onPress={async () => {
                    const uri = await promptImagePicker();
                    if (uri) {
                      const uploaded = await uploadImage(uri, 'spare-images');
                      if (idx === 0) setImg1(uploaded);
                      else if (idx === 1) setImg2(uploaded);
                      else if (idx === 2) setImg3(uploaded);
                    }
                  }}>
                    <Ionicons name="camera-outline" size={24} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              }
              return (
                <View key={idx} style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                  <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} />
                  <TouchableOpacity style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 2 }} onPress={() => {
                    if (idx === 0) setImg1('');
                    else if (idx === 1) setImg2('');
                    else if (idx === 2) setImg3('');
                  }}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 8 }]} onPress={saveProduct} disabled={saving}>
            <Text style={styles.submitBtnText}>{saving ? 'Cataloguing item...' : 'Publish Listing'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

/* ============================================================================
   Sub-Component: ShopOrdersReceived
   ============================================================================ */
function ShopOrdersReceived({ shop }: { shop: any }) {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `shop_id=eq.${shop.id}` },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shop]);

  async function loadOrders() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (e: any) {
      console.warn(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, status: 'Accepted' | 'Completed' | 'Cancelled') {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      Alert.alert('Success', `Order marked as ${status}`);
      loadOrders();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case 'Pending': return { bg: '#FEF3C7', text: '#D97706', dot: '#F59E0B' };
      case 'Accepted': return { bg: '#E0E7FF', text: '#4F46E5', dot: '#6366F1' };
      case 'Completed': return { bg: '#D1FAE5', text: '#059669', dot: '#10B981' };
      case 'Cancelled': return { bg: '#FEE2E2', text: '#DC2626', dot: '#EF4444' };
      default: return { bg: '#E2E8F0', text: '#64748B', dot: '#94A3B8' };
    }
  }

  if (loading) return <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />;

  return (
    <View style={{ flex: 1 }}>
      {orders.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, marginTop: 10 }]}>
          <MaterialCommunityIcons name="inbox-outline" size={38} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No bookings or parts requests received yet. Active purchases will display here in real-time.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.listContainer, { paddingBottom: 24 }]}>
          {orders.map((item) => {
            const statusStyle = getStatusStyle(item.status);
            return (
              <View key={item.id} style={[styles.premiumOrderCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                {/* Header Row */}
                <View style={styles.orderHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.orderProduct, { color: colors.text }]}>{item.product_name}</Text>
                    <View style={styles.row}>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>Qty: {item.quantity || 1} · </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  <View style={[styles.orderStatusBadge, { backgroundColor: statusStyle.bg }]}>
                    <View style={[styles.orderStatusDot, { backgroundColor: statusStyle.dot }]} />
                    <Text style={[styles.orderStatusText, { color: statusStyle.text }]}>{item.status}</Text>
                  </View>
                </View>

                {/* Buyer Segment */}
                <View style={[styles.orderBuyerInfo, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>Customer Dossier:</Text>
                  <View style={[styles.row, { marginTop: 6 }]}>
                    <Ionicons name="mail" size={13} color={colors.textMuted} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.textMuted, fontSize: 11 }} numberOfLines={1}>{item.buyer_email}</Text>
                  </View>
                  {item.buyer_phone && (
                    <View style={[styles.row, { marginTop: 4 }]}>
                      <Ionicons name="call" size={13} color={colors.textMuted} style={{ marginRight: 6 }} />
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{item.buyer_phone}</Text>
                    </View>
                  )}
                </View>

                {/* Action Row */}
                {item.status !== 'Completed' && item.status !== 'Cancelled' && (
                  <View style={styles.orderActions}>
                    {item.status === 'Pending' && (
                      <>
                        <TouchableOpacity style={[styles.orderActionBtn, { backgroundColor: colors.primary }]} onPress={() => updateOrderStatus(item.id, 'Accepted')}>
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>Accept Order</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.orderActionBtn, { backgroundColor: colors.danger + '15' }]} onPress={() => updateOrderStatus(item.id, 'Cancelled')}>
                          <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 11 }}>Reject</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {item.status === 'Accepted' && (
                      <>
                        <TouchableOpacity style={[styles.orderActionBtn, { backgroundColor: colors.success }]} onPress={() => updateOrderStatus(item.id, 'Completed')}>
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>Complete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.orderActionBtn, { backgroundColor: colors.danger + '15' }]} onPress={() => updateOrderStatus(item.id, 'Cancelled')}>
                          <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 11 }}>Cancel</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

/* ============================================================================
   Stylesheet definitions
   ============================================================================ */
const styles = StyleSheet.create({
  shopManagerContainer: {
    flex: 1,
  },
  center: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 22,
  },
  heroLeft: {
    flex: 1,
    marginRight: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  heroSub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  heroIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  formHeaderIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  formGrid: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 13,
    fontWeight: '600',
  },
  imagePickerBadge: {
    borderWidth: 1.5,
    borderRadius: 14,
    borderStyle: 'dashed',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTrigger: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 6,
  },
  pickerPreview: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  pickerSubBtn: {
    marginTop: 4,
    paddingVertical: 2,
  },
  trashBtn: {
    padding: 8,
    borderRadius: 10,
  },
  locationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
  },
  locationToggleIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  toggleBtnText: {
    fontWeight: '700',
    fontSize: 12,
  },
  submitBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyCard: {
    padding: 34,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    lineHeight: 18,
    maxWidth: 260,
  },
  listContainer: {
    gap: 12,
  },
  shopCard: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  shopImage: {
    width: 68,
    height: 68,
    borderRadius: 14,
  },
  shopInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  shopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shopName: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  shopDistance: {
    fontSize: 12,
    fontWeight: '700',
  },
  miniStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  shopPhone: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },

  /* Dashboard Styles */
  dashboardRoot: {
    flex: 1,
  },
  premiumHeaderContainerImage: {
    height: 92,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerImageContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  premiumShopName: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  premiumSubText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  /* Quick Access Carousel styles */
  quickAccessWrapper: {
    marginBottom: 4,
  },
  quickAccessScroll: {
    paddingHorizontal: 0,
    gap: 8,
  },
  quickAccessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickAccessIconBg: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  quickAccessText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  /* Search & Filter Styles */
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 6,
    height: 40,
    gap: 12,
  },
  categoryScroll: {
    paddingHorizontal: 0,
    gap: 10,
    paddingVertical: 2,
    alignItems: 'center',
  },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
    minWidth: 90,
    justifyContent: 'center',
  },
  catLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* Premium Product Cards */
  premiumProductCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    marginBottom: 4,
    flexDirection: 'column',
  },
  productImageContainer: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  bookmarkOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
  },
  productDetailsContainer: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 4,
  },
  premiumProductName: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  premiumProductPrice: {
    fontSize: 14,
    fontWeight: '800',
  },
  premiumProductCompat: {
    fontSize: 10,
  },
  productActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  actionIconButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 8,
  },

  /* Premium Order Card */
  premiumOrderCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderProduct: {
    fontSize: 14,
    fontWeight: '800',
  },
  orderStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  orderStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  orderBuyerInfo: {
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  orderActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  orderActionBtn: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Warning / Activation Card */
  warningCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  warningIconBg: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  warningText: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
    maxWidth: 240,
    fontWeight: '600',
  },
  editorContainer: {
    paddingBottom: 24,
  },
  gridContainer: {
    paddingBottom: 24,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
    paddingHorizontal: 2,
  },
});
