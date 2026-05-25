import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ImageBackground, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { pctToLatLng } from '../lib/coords';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';

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
  const [linkLocation, setLinkLocation] = useState(true); // Toggle for choosing not to set location initially

  // Dashboard Sub-views: 'products' | 'orders' | 'add_product'
  const [dashboardTab, setDashboardTab] = useState<'products' | 'orders' | 'add_product'>('products');

  useEffect(() => {
    loadShops();
  }, [user]);

  // Haversine function to compute distance in kilometers
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
    return (R * c).toFixed(1); // 1 decimal place
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
      // 1. Upload picked image if available
      let finalImageUrl = null;
      if (pickedImageUri) {
        finalImageUrl = await uploadImage(pickedImageUri, 'shops');
      } else if (shopImage.trim()) {
        finalImageUrl = shopImage.trim();
      }

      // 2. Set coordinates only if location linking is enabled
      const finalX = linkLocation ? userX : null;
      const finalY = linkLocation ? userY : null;

      const { data, error } = await supabase
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
        }])
        .select()
        .single();

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
      <View style={[styles.dashboardRoot, { backgroundColor: '#0B0F19' }]}>
        {/* Header (Greeting & Subtext) */}
        <View style={{ paddingHorizontal: 20, paddingTop: 30, paddingBottom: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#FFF' }}>Hello Manager!</Text>
          <Text style={{ fontSize: 15, color: '#9CA3AF', marginTop: 4 }}>{selectedShop.name} dashboard is ready.</Text>
        </View>

        {/* Quick Access Grid */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 14 }}>Quick Access</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <TouchableOpacity style={styles.quickAccessBtn} onPress={() => setDashboardTab('orders')}>
              <MaterialCommunityIcons name="cart-outline" size={26} color="#00E5FF" />
              <Text style={styles.quickAccessText}>Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAccessBtn} onPress={() => setDashboardTab('products')}>
              <MaterialCommunityIcons name="package-variant" size={26} color="#00E5FF" />
              <Text style={styles.quickAccessText}>Inventory</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAccessBtn} onPress={() => setDashboardTab('add_product')}>
              <Ionicons name="add" size={26} color="#00E5FF" />
              <Text style={styles.quickAccessText}>Add Part</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAccessBtn} onPress={() => setView('shops')}>
              <Ionicons name="exit-outline" size={26} color="#00E5FF" />
              <Text style={styles.quickAccessText}>Exit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dashboard Content */}
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          {dashboardTab === 'products' && <ShopProductsCatalogue shop={selectedShop} />}
          
          {dashboardTab === 'orders' && (
            isUnmapped ? (
              <View style={[styles.warningCard, { backgroundColor: 'rgba(220, 38, 38, 0.1)', borderColor: '#DC2626' }]}>
                <MaterialCommunityIcons name="map-marker-off" size={36} color="#DC2626" />
                <Text style={[styles.warningTitle, { color: '#FFF' }]}>Orders Deactivated</Text>
                <Text style={[styles.warningText, { color: '#9CA3AF' }]}>
                  This shop does not have a mapped location. You cannot receive active customer orders until the location is linked.
                </Text>
                <TouchableOpacity 
                  style={[styles.submitBtn, { backgroundColor: '#00E5FF', marginTop: 16 }]} 
                  onPress={linkShopLocationToCurrent}
                >
                  <Text style={[styles.submitBtnText, { color: '#000' }]}>📍 Link Location to GPS</Text>
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
    <View style={styles.shopManagerContainer}>
      {/* Shops List */}
      <Text style={[styles.listTitle, { color: colors.text }]}>Your Registered Shops ({shops.length})</Text>
      {shops.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="store-alert" size={40} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No shops created yet. Register one below to start selling.</Text>
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
                  <View style={[styles.shopImage, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0', alignItems: 'center', justifyContent: 'center' }]}>
                    <MaterialCommunityIcons name="store" size={32} color={colors.primary} />
                  </View>
                )}

                <View style={styles.shopInfo}>
                  <View style={styles.shopHeaderRow}>
                    <Text style={[styles.shopName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    {isShopUnmapped ? (
                      <Text style={[styles.shopDistance, { color: colors.danger, fontSize: 11 }]}>⚠️ Unmapped</Text>
                    ) : (
                      distance && (
                        <Text style={[styles.shopDistance, { color: colors.accent }]}>📍 {distance} km</Text>
                      )
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <View style={[styles.typeBadge, { backgroundColor: colors.primary + '18' }]}>
                      <Text style={[styles.typeBadgeText, { color: colors.primary }]}>{item.type}</Text>
                    </View>
                    <Text style={[styles.ratingText, { color: colors.text }]}>⭐ {item.rating || '4.8'}</Text>
                  </View>

                  {item.phone && (
                    <Text style={[styles.shopPhone, { color: colors.textMuted }]} numberOfLines={1}>📞 {item.phone}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={{ height: 20 }} />

      {/* Create Shop Panel */}
      <View style={[styles.formCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <Text style={[styles.formTitle, { color: colors.text }]}><MaterialCommunityIcons name="store-plus" size={18} color={colors.primary} /> Create New Shop</Text>
        
        <View style={styles.formGrid}>
          <TextInput 
            placeholder="Shop Name" 
            placeholderTextColor={colors.textMuted} 
            value={shopName} 
            onChangeText={setShopName} 
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]} 
          />
          <View style={styles.row}>
            <TouchableOpacity 
              style={[styles.toggleBtn, shopType === 'Supplier' && { backgroundColor: colors.primary }]} 
              onPress={() => setShopType('Supplier')}
            >
              <Text style={[styles.toggleBtnText, { color: shopType === 'Supplier' ? '#fff' : colors.textMuted }]}>Supplier</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleBtn, shopType === 'Mechanic' && { backgroundColor: colors.primary }]} 
              onPress={() => setShopType('Mechanic')}
            >
              <Text style={[styles.toggleBtnText, { color: shopType === 'Mechanic' ? '#fff' : colors.textMuted }]}>Mechanic</Text>
            </TouchableOpacity>
          </View>

          {/* Device Image Picker Badge */}
          <View style={[styles.imagePickerBadge, { borderColor: colors.border }]}>
            {pickedImageUri ? (
              <View style={styles.row}>
                <Image source={{ uri: pickedImageUri }} style={styles.pickerPreview} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>Selected Photo</Text>
                  <TouchableOpacity style={styles.pickerSubBtn} onPress={pickImage}>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Change Photo</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setPickedImageUri(null)} style={{ padding: 6 }}>
                  <Ionicons name="trash" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.pickerTrigger} onPress={pickImage}>
                <MaterialCommunityIcons name="image-plus" size={24} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 4 }}>Select Shop Picture</Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>Click to open your device photo gallery</Text>
              </TouchableOpacity>
            )}
          </View>

          <TextInput 
            placeholder="Phone Number" 
            placeholderTextColor={colors.textMuted} 
            value={shopPhone} 
            onChangeText={setShopPhone} 
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]} 
            keyboardType="phone-pad"
          />

          {/* Location link trigger */}
          <TouchableOpacity 
            style={[
              styles.locationToggle, 
              { 
                borderColor: linkLocation ? colors.primary : colors.border,
                backgroundColor: linkLocation ? colors.primary + '0A' : 'transparent'
              }
            ]}
            onPress={() => setLinkLocation(!linkLocation)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons 
              name={linkLocation ? "map-marker" : "map-marker-off"} 
              size={22} 
              color={linkLocation ? colors.primary : colors.textMuted} 
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                {linkLocation ? 'GPS Location Linked' : 'No Location Set'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }}>
                {linkLocation 
                  ? 'Shop will render on maps & receive orders immediately.' 
                  : '⚠️ No orders can be received until location is mapped later.'}
              </Text>
            </View>
            <Ionicons 
              name={linkLocation ? "checkbox" : "square-outline"} 
              size={20} 
              color={linkLocation ? colors.primary : colors.textMuted} 
            />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={createShop} disabled={creating}>
            <Text style={styles.submitBtnText}>{creating ? 'Creating...' : 'Register Shop'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];
  
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.compatibility && p.compatibility.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
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

          <TextInput 
            placeholder="Product Name" 
            placeholderTextColor={colors.textMuted} 
            value={editName} 
            onChangeText={setEditName} 
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]} 
          />
          <TextInput 
            placeholder="Category" 
            placeholderTextColor={colors.textMuted} 
            value={editCategory} 
            onChangeText={setEditCategory} 
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]} 
          />
          <TextInput 
            placeholder="Price (e.g. $85.00)" 
            placeholderTextColor={colors.textMuted} 
            value={editPrice} 
            onChangeText={setEditPrice} 
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]} 
          />
          <TextInput 
            placeholder="Compatibility (e.g. Universal)" 
            placeholderTextColor={colors.textMuted} 
            value={editCompat} 
            onChangeText={setEditCompat} 
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]} 
          />

          <Text style={{ color: colors.text, fontWeight: '800', marginTop: 16, marginBottom: 8 }}>Product Photos (Max 3)</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {[editImg1, editImg2, editImg3].map((img, idx) => {
              if (!img) {
                return (
                  <TouchableOpacity key={idx} style={{ width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }} onPress={async () => {
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
                <View key={idx} style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden' }}>
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
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#9CA3AF', flex: 1 }]} onPress={() => setEditingProduct(null)}>
              <Text style={styles.submitBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Featured Products Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFF' }}>Featured Products</Text>
          <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>A vibrant product list</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={18} color="#9CA3AF" />
          </View>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </View>
        </View>
      </View>

      {products.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: '#1F2937', borderColor: '#374151' }]}>
          <Text style={[styles.emptyText, { color: '#9CA3AF' }]}>No products found.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {filteredProducts.map(renderProductCard)}
        </ScrollView>
      )}
    </View>
  );

  function renderProductCard(item: any) {
    const productImages = item.images || (item.image ? [item.image] : []);
    return (
      <View key={item.id} style={{
        backgroundColor: '#111827',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 229, 255, 0.25)', // Neon glow effect border
        shadowColor: '#00E5FF',
        shadowOpacity: 0.15,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 0 },
        elevation: 5,
        marginBottom: 20,
        flexDirection: 'row',
        padding: 12,
        paddingRight: 16
      }}>
        {/* Left: Image Box */}
        <View style={{ width: 110, height: 110, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden', padding: 8 }}>
          {productImages.length > 0 ? (
            <Image source={{ uri: productImages[0] }} style={{ width: '100%', height: '100%', resizeMode: 'cover', borderRadius: 8 }} />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="image-outline" size={32} color="#4B5563" />
            </View>
          )}
          <View style={{ position: 'absolute', top: 10, left: 10 }}>
            <Ionicons name="bookmark-outline" size={18} color="#00E5FF" />
          </View>
        </View>

        {/* Right: Details */}
        <View style={{ flex: 1, marginLeft: 16, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 }} numberOfLines={2}>{item.name}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold' }}>⭐ {item.rating || '4.8'}</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 11 }}>(112)</Text>
            </View>
          </View>

          <Text style={{ color: '#00E5FF', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>{item.price || 'N/A'}</Text>
          <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }} numberOfLines={1}>{item.compatibility || 'Universal Fit | Standard'}</Text>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
            <TouchableOpacity style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }} onPress={() => deleteProduct(item.id)}>
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#00E5FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }} onPress={() => startEdit(item)}>
              <Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>Edit Order</Text>
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
  const [category, setCategory] = useState('General');
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
      setCategory('General');
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
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      <View style={[styles.formCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <Text style={[styles.formTitle, { color: colors.text }]}><Ionicons name="sparkles" size={18} color={colors.primary} /> Add Item to Catalogue</Text>

        <TextInput 
          placeholder="Product Name" 
          placeholderTextColor={colors.textMuted} 
          value={name} 
          onChangeText={setName} 
          style={[styles.formInput, { color: colors.text, borderColor: colors.border }]} 
        />
        <TextInput 
          placeholder="Category (e.g. Engines, Brakes)" 
          placeholderTextColor={colors.textMuted} 
          value={category} 
          onChangeText={setCategory} 
          style={[styles.formInput, { color: colors.text, borderColor: colors.border }]} 
        />
        <TextInput 
          placeholder="Price (e.g. $85.00)" 
          placeholderTextColor={colors.textMuted} 
          value={price} 
          onChangeText={setPrice} 
          style={[styles.formInput, { color: colors.text, borderColor: colors.border }]} 
        />
        <TextInput 
          placeholder="Compatibility (e.g. Toyota, Honda)" 
          placeholderTextColor={colors.textMuted} 
          value={compatibility} 
          onChangeText={setCompatibility} 
          style={[styles.formInput, { color: colors.text, borderColor: colors.border }]} 
        />

        <Text style={{ color: colors.text, fontWeight: '800', marginTop: 16, marginBottom: 8 }}>Product Photos (Max 3)</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {[img1, img2, img3].map((img, idx) => {
            if (!img) {
              return (
                <TouchableOpacity key={idx} style={{ width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }} onPress={async () => {
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
              <View key={idx} style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden' }}>
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
          <Text style={styles.submitBtnText}>{saving ? 'Adding...' : 'Publish Listing'}</Text>
        </TouchableOpacity>
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
      case 'Pending': return { bg: '#FEF3C7', text: '#D97706' }; // Amber
      case 'Accepted': return { bg: '#E0E7FF', text: '#4F46E5' }; // Indigo
      case 'Completed': return { bg: '#D1FAE5', text: '#059669' }; // Emerald
      case 'Cancelled': return { bg: '#FEE2E2', text: '#DC2626' }; // Red
      default: return { bg: '#E2E8F0', text: '#64748B' };
    }
  }

  if (loading) return <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />;

  return (
    <View style={{ flex: 1 }}>
      {orders.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, marginTop: 10 }]}>
          <MaterialCommunityIcons name="inbox" size={38} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No orders received yet. Active purchases will display here in real-time.</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {orders.map((item) => {
            const statusStyle = getStatusStyle(item.status);
            return (
              <View key={item.id} style={[styles.orderCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <View style={styles.orderHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.orderProduct, { color: colors.text }]}>{item.product_name}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Qty: {item.quantity || 1} · {new Date(item.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={[styles.orderStatusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.orderStatusText, { color: statusStyle.text }]}>{item.status}</Text>
                  </View>
                </View>

                <View style={[styles.orderBuyerInfo, { borderTopColor: colors.border }]}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>Customer details:</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>📧 {item.buyer_email}</Text>
                  {item.buyer_phone && (
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>📞 {item.buyer_phone}</Text>
                  )}
                </View>

                {item.status !== 'Completed' && item.status !== 'Cancelled' && (
                  <View style={[styles.orderActions, { borderTopColor: colors.border }]}>
                    {item.status === 'Pending' && (
                      <>
                        <TouchableOpacity style={[styles.orderActionBtn, { backgroundColor: colors.primary }]} onPress={() => updateOrderStatus(item.id, 'Accepted')}>
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.orderActionBtn, { backgroundColor: colors.danger }]} onPress={() => updateOrderStatus(item.id, 'Cancelled')}>
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Cancel</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {item.status === 'Accepted' && (
                      <>
                        <TouchableOpacity style={[styles.orderActionBtn, { backgroundColor: colors.success }]} onPress={() => updateOrderStatus(item.id, 'Completed')}>
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Complete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.orderActionBtn, { backgroundColor: colors.danger }]} onPress={() => updateOrderStatus(item.id, 'Cancelled')}>
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Cancel</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ============================================================================
   Stylesheet definitions
   ============================================================================ */
const styles = StyleSheet.create({
  shopManagerContainer: {
    marginTop: 8,
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
  formCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formGrid: {
    gap: 12,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
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
    paddingVertical: 4,
  },
  pickerPreview: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  pickerSubBtn: {
    marginTop: 4,
    paddingVertical: 2,
  },
  locationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
  },
  toggleBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
  },
  toggleBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 8,
  },
  emptyCard: {
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    lineHeight: 18,
    maxWidth: 240,
  },
  listContainer: {
    gap: 12,
  },
  shopCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  shopImage: {
    width: 76,
    height: 76,
    borderRadius: 12,
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
    gap: 6,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  shopDistance: {
    fontSize: 13,
    fontWeight: '700',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  shopPhone: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },

  /* Dashboard Styles */
  dashboardRoot: {
    flex: 1,
    paddingBottom: 16,
  },
  quickAccessBtn: {
    flex: 1,
    height: 85,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  quickAccessText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  editorContainer: {
    paddingBottom: 24,
  },

  /* Order Styles */
  orderCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  orderProduct: {
    fontSize: 15,
    fontWeight: '800',
  },
  orderStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  orderBuyerInfo: {
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 8,
  },
  orderActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
    gap: 8,
  },
  orderActionBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Warning / Activation Card */
  warningCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  warningText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 285,
    fontWeight: '600',
  },
});
