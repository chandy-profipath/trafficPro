const fs = require('fs');
let code = fs.readFileSync('components/ShopManager.tsx', 'utf8');

// 1. Redesign Dashboard Header
const oldHeaderRegex = /\{\/\* Dashboard Header \*\/\}\s*<View style=\{\[styles\.dashboardHeader, \{ backgroundColor: colors\.surfaceElevated, borderColor: colors\.border \}\]\}>[\s\S]*?\{selectedShop\.image \? \([\s\S]*?\{isUnmapped \? \([\s\S]*?getDistance\(selectedShop\.x, selectedShop\.y\) && \([\s\S]*?\)[\s\S]*?\)[\s\S]*?\}[\s\S]*?<\/View>[\s\S]*?<\/View>[\s\S]*?<\/View>/;

const newHeader = `
        {/* Dashboard Header Redesign */}
        <View style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 16, backgroundColor: colors.surfaceElevated, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }}>
          {selectedShop.image ? (
            <ImageBackground source={{ uri: selectedShop.image }} style={{ width: '100%', height: 240, justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
                <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' }} onPress={() => setView('shops')}>
                  <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
              </View>
              <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={{ padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 8 }} numberOfLines={1}>{selectedShop.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.primary }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff', textTransform: 'uppercase' }}>{selectedShop.type}</Text>
                  </View>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>⭐ {selectedShop.rating || '4.8'}</Text>
                  {isUnmapped ? (
                    <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 13 }}>⚠️ No Location</Text>
                  ) : (
                    getDistance(selectedShop.x, selectedShop.y) && (
                      <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 13 }}>📍 {getDistance(selectedShop.x, selectedShop.y)} km</Text>
                    )
                  )}
                </View>
              </BlurView>
            </ImageBackground>
          ) : (
            <View style={{ width: '100%', height: 240, backgroundColor: colors.primary + '20', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
                <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' }} onPress={() => setView('shops')}>
                  <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
              </View>
              <View style={{ padding: 20, backgroundColor: colors.surfaceElevated, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 8 }} numberOfLines={1}>{selectedShop.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.primary }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff', textTransform: 'uppercase' }}>{selectedShop.type}</Text>
                  </View>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>⭐ {selectedShop.rating || '4.8'}</Text>
                  {isUnmapped ? (
                    <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 13 }}>⚠️ No Location</Text>
                  ) : (
                    getDistance(selectedShop.x, selectedShop.y) && (
                      <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 13 }}>📍 {getDistance(selectedShop.x, selectedShop.y)} km</Text>
                    )
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
`;

// 2. Modify ShopProductsCatalogue Sub-Component Definition
const oldCatalogueDef = /function ShopProductsCatalogue\(\{ shop \}: \{ shop: any \}\) \{[\s\S]*?const \[products, setProducts\] = useState<any\[\]>\(\[\]\);/;
const newCatalogueDef = `function ShopProductsCatalogue({ shop }: { shop: any }) {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = React.useMemo(() => {
    const cats = new Set(products.map(p => p.category || 'General'));
    return ['All', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = React.useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.compatibility && p.compatibility.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, selectedCategory]);
`;

// 3. Modify ShopProductsCatalogue Render
const oldCatRenderRegex = /return \([\s\S]*?<View style=\{\{ flex: 1 \}\}>[\s\S]*?\{products\.length === 0 \? \([\s\S]*?<View style=\{\[styles\.listContainer, \{ flexDirection: 'row'[\s\S]*?\{products\.map\(\(item\) => \{[\s\S]*?<\/View>\n      \)\}\n    <\/View>\n  \);/;
const newCatRender = `return (
    <View style={{ flex: 1 }}>
      {/* Search Bar & Categories */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, height: 48, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput 
            placeholder="Search parts, engines..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, color: colors.text, fontSize: 16, marginLeft: 8 }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setSelectedCategory(cat)}
              style={{
                paddingHorizontal: 16, 
                paddingVertical: 8, 
                borderRadius: 20,
                backgroundColor: selectedCategory === cat ? colors.primary : (isDark ? '#334155' : '#E2E8F0'),
                borderWidth: 1,
                borderColor: selectedCategory === cat ? colors.primary : colors.border
              }}
            >
              <Text style={{ color: selectedCategory === cat ? '#fff' : colors.text, fontWeight: '800', fontSize: 13 }}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {products.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, marginTop: 10 }]}>
          <MaterialCommunityIcons name="package-variant-closed" size={36} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>This shop has no products yet. Tap 'Add Item' to insert your first listing.</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, marginTop: 10 }]}>
          <Ionicons name="search" size={36} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No products match your search or filter.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {selectedCategory === 'All' ? (
            categories.filter(c => c !== 'All').map(cat => {
              const catProducts = filteredProducts.filter(p => p.category === cat);
              if (catProducts.length === 0) return null;
              return (
                <View key={cat} style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 12, marginLeft: 4 }}>{cat}</Text>
                  <View style={[styles.listContainer, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 2 }]}>
                    {catProducts.map(renderProductCard)}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={[styles.listContainer, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 2 }]}>
              {filteredProducts.map(renderProductCard)}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );

  function renderProductCard(item: any) {
    const productImages = item.images || (item.image ? [item.image] : []);
    return (
      <View key={item.id} style={[styles.productCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, width: '48%', marginBottom: 16, padding: 10 }]}>
        <View style={[styles.imageRow, { marginBottom: 8 }]}>
          {productImages.length > 0 ? (
            <Image source={{ uri: productImages[0] }} style={[styles.productThumbnail, { width: '100%', height: 110 }]} />
          ) : (
            <View style={[styles.productThumbnail, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0', width: '100%', height: 110, alignItems: 'center', justifyContent: 'center' }]}>
              <MaterialCommunityIcons name="camera-off" size={24} color={colors.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <View style={{ flexDirection: 'column', gap: 2 }}>
            <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
            <Text style={[styles.productPrice, { color: colors.accent, fontSize: 16 }]}>{item.price || 'N/A'}</Text>
          </View>
          <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, marginTop: 6 }}>
            <View style={[styles.catBadge, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <Text style={{ color: colors.text, fontSize: 10, fontWeight: '800' }} numberOfLines={1}>{item.category}</Text>
            </View>
            {item.compatibility && (
              <Text style={{ color: colors.textMuted, fontSize: 10 }} numberOfLines={1}>⚙️ {item.compatibility}</Text>
            )}
          </View>
        </View>
        <View style={[styles.productActions, { borderTopColor: colors.border, flexDirection: 'column', gap: 6, marginTop: 8 }]}>
          <TouchableOpacity style={[styles.actionBtn, { width: '100%', backgroundColor: colors.primary + '18', borderRadius: 8, paddingVertical: 6 }]} onPress={() => startEdit(item)}>
            <MaterialCommunityIcons name="pencil-outline" size={14} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12, marginLeft: 4 }}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { width: '100%', backgroundColor: colors.danger + '18', borderRadius: 8, paddingVertical: 6 }]} onPress={() => deleteProduct(item.id)}>
            <MaterialCommunityIcons name="trash-can-outline" size={14} color={colors.danger} />
            <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 12, marginLeft: 4 }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
`;

// 4. Update ShopAddProduct Image URLs
const oldAddProductImgSectionRegex = /<Text style=\{\{ color: colors\.text, fontWeight: '700', marginTop: 12, marginBottom: 4 \}\}>Add up to 3 image URLs<\/Text>[\s\S]*?<TouchableOpacity style=\{\[styles\.submitBtn, \{ backgroundColor: colors\.primary, marginTop: 16 \}\]\} onPress=\{saveProduct\} disabled=\{saving\}>/;
const newAddProductImgSection = `
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
`;

// 5. Update editProduct Image section
const oldEditProductImgSectionRegex = /<Text style=\{\{ color: colors\.text, fontWeight: '700', marginTop: 10, marginBottom: 4 \}\}>Product Images \(Up to 3\)<\/Text>[\s\S]*?<View style=\{\[styles\.row, \{ marginTop: 16 \}\]\}>/;
const newEditProductImgSection = `
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
`;

code = code.replace(oldHeaderRegex, newHeader);
if (code.match(oldHeaderRegex) || !code.includes('Dashboard Header Redesign')) console.log('Failed Header Replace');

code = code.replace(oldCatalogueDef, newCatalogueDef);
if (code.match(oldCatalogueDef) || !code.includes('filteredProducts')) console.log('Failed Catalogue Def Replace');

code = code.replace(oldCatRenderRegex, newCatRender);
if (code.match(oldCatRenderRegex) || !code.includes('renderProductCard')) console.log('Failed Cat Render Replace');

code = code.replace(oldAddProductImgSectionRegex, newAddProductImgSection);
if (code.match(oldAddProductImgSectionRegex) || !code.includes('Product Photos (Max 3)')) console.log('Failed Add Product Replace');

code = code.replace(oldEditProductImgSectionRegex, newEditProductImgSection);
if (code.match(oldEditProductImgSectionRegex)) console.log('Failed Edit Product Replace');

fs.writeFileSync('components/ShopManager.tsx', code);
console.log('Refactoring finished!');
