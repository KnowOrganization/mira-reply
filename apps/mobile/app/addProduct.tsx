import { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Card } from '../src/components/Card';
import { Toggle } from '../src/components/primitives';
import { Icon } from '../src/components/Icon';
import { colors, space } from '../src/theme';
import { useCreateProduct, useUpdateProduct, useDeleteProduct, useProducts, type ProductVariant } from '../src/api/hooks';

// Add/edit product — Amazon-style onboarding: multiple photos, description,
// price, in-stock toggle, and a flat variant list (color/size/etc). Same
// route handles both: ?id=<productId> loads + patches instead of creating.
//
// Photos: picked via expo-image-picker with base64:true and stored straight
// as data-URLs in the `images` column. ponytail: no object storage (S3/R2/
// Supabase Storage) is wired up — this works today with zero new infra, fine
// for a handful of compressed photos per product. Swap to real uploaded URLs
// once a bucket + credentials exist; no schema change needed since images is
// just string[].
const MAX_IMAGES = 6;

function newVariantId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function AddProduct() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const { data: productsData } = useProducts();
  const existing = isEdit ? productsData?.products.find((p) => p.id === id) : undefined;

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [priceText, setPriceText] = useState('');
  const [description, setDescription] = useState('');
  const [available, setAvailable] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [seeded, setSeeded] = useState(!isEdit);

  // Seed once from the loaded product (edit mode) — avoid the refetch-on-save
  // clobbering in-progress edits.
  useEffect(() => {
    if (seeded || !existing) return;
    setTitle(existing.title);
    setSubtitle(existing.subtitle);
    setPriceText(existing.priceText ?? '');
    setDescription(existing.description);
    setAvailable(existing.available);
    setImages(existing.images.length ? existing.images : existing.imageUrl ? [existing.imageUrl] : []);
    setVariants(existing.variants);
    setSeeded(true);
  }, [existing, seeded]);

  const monogram = title.trim() ? title.trim()[0].toUpperCase() : '?';
  const saving = createProduct.isPending || updateProduct.isPending;
  const saveDisabled = !title.trim() || saving;

  async function pickImage() {
    if (images.length >= MAX_IMAGES) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Enable photo access in Settings to add product photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.5,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
    });
    if (result.canceled) return;
    const next = result.assets
      .filter((a) => a.base64)
      .map((a) => `data:image/jpeg;base64,${a.base64}`);
    setImages((prev) => [...prev, ...next].slice(0, MAX_IMAGES));
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addVariant() {
    setVariants((prev) => [...prev, { id: newVariantId(), label: '', priceText: null, available: true }]);
  }
  function patchVariant(id: string, patch: Partial<ProductVariant>) {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }
  function removeVariant(id: string) {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  }

  function onSave() {
    if (saveDisabled) return;
    const body = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      priceText: priceText.trim() || null,
      description: description.trim(),
      available,
      images,
      imageUrl: images[0] ?? null,
      variants: variants.filter((v) => v.label.trim()),
    };
    if (isEdit) {
      updateProduct.mutate({ id, ...body }, { onSuccess: () => router.back() });
    } else {
      createProduct.mutate(body, { onSuccess: () => router.back() });
    }
  }

  function onDelete() {
    if (!isEdit) return;
    Alert.alert('Remove product', `Remove "${title}" from your catalog?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteProduct.mutate(id, { onSuccess: () => router.back() }),
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title={isEdit ? 'Edit product' : 'Add product'} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Photos */}
        <Text style={styles.label}>Photos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
          {images.map((uri, i) => (
            <View key={i} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.photo} />
              <Pressable onPress={() => removeImage(i)} style={styles.photoRemove} hitSlop={6}>
                <Icon name="close" size={12} color="#fff" />
              </Pressable>
              {i === 0 && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverBadgeText}>Cover</Text>
                </View>
              )}
            </View>
          ))}
          {images.length < MAX_IMAGES && (
            <Pressable onPress={pickImage} style={styles.photoAdd}>
              <Icon name="plus" size={20} color={colors.accentDeep} />
              <Text style={styles.photoAddText}>Add{'\n'}photo</Text>
            </Pressable>
          )}
        </ScrollView>
        <Text style={styles.photoHint}>First photo is the cover · up to {MAX_IMAGES}</Text>

        <Text style={[styles.label, { marginTop: space.lg }]}>Name</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Product name"
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
        />

        <View style={styles.row}>
          <View style={styles.rowField}>
            <Text style={styles.label}>Price</Text>
            <TextInput
              value={priceText}
              onChangeText={setPriceText}
              placeholder="$49"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
            />
          </View>
          <View style={styles.rowField}>
            <Text style={styles.label}>Subtitle</Text>
            <TextInput
              value={subtitle}
              onChangeText={setSubtitle}
              placeholder="Short tagline"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
            />
          </View>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What is it, what's included..."
          placeholderTextColor={colors.textSubtle}
          multiline
          style={[styles.input, styles.inputMultiline]}
        />

        {/* Variants — color/size/etc */}
        <View style={styles.variantHeader}>
          <Text style={styles.label}>Variants</Text>
          <Pressable onPress={addVariant} hitSlop={8} style={styles.variantAdd}>
            <Icon name="plus" size={13} color={colors.accent} />
            <Text style={styles.variantAddText}>Add variant</Text>
          </Pressable>
        </View>
        {variants.length === 0 ? (
          <Text style={styles.variantEmpty}>
            No variants — add one for color, size, or any other option (e.g. "Black / M").
          </Text>
        ) : (
          variants.map((v) => (
            <Card key={v.id} radius={12} style={styles.variantCard}>
              <View style={styles.variantRow}>
                <TextInput
                  value={v.label}
                  onChangeText={(t) => patchVariant(v.id, { label: t })}
                  placeholder="Black / M"
                  placeholderTextColor={colors.textSubtle}
                  style={[styles.input, styles.variantLabelInput]}
                />
                <Pressable onPress={() => removeVariant(v.id)} hitSlop={8} style={styles.variantRemove}>
                  <Icon name="close" size={14} color={colors.textSubtle} />
                </Pressable>
              </View>
              <View style={styles.variantRow}>
                <TextInput
                  value={v.priceText ?? ''}
                  onChangeText={(t) => patchVariant(v.id, { priceText: t || null })}
                  placeholder="Price override (optional)"
                  placeholderTextColor={colors.textSubtle}
                  style={[styles.input, styles.variantPriceInput, { marginBottom: 0 }]}
                />
                <View style={styles.variantToggleWrap}>
                  <Text style={styles.variantToggleLabel}>In stock</Text>
                  <Toggle
                    value={v.available}
                    onValueChange={(val) => patchVariant(v.id, { available: val })}
                  />
                </View>
              </View>
            </Card>
          ))
        )}

        <Card radius={13} style={styles.stockCard}>
          <View style={styles.stockRow}>
            <View>
              <Text style={styles.stockLabel}>In stock</Text>
              <Text style={styles.stockSub}>Available for Mira to offer in DMs</Text>
            </View>
            <Toggle value={available} onValueChange={setAvailable} />
          </View>
        </Card>

        <Pressable
          onPress={onSave}
          disabled={saveDisabled}
          style={({ pressed }) => [styles.cta, saveDisabled && styles.ctaDisabled, pressed && !saveDisabled && styles.pressed]}
        >
          {saving ? (
            <ActivityIndicator color={colors.accentFg} />
          ) : (
            <Text style={styles.ctaText}>{isEdit ? 'Save changes' : 'Add product'}</Text>
          )}
        </Pressable>

        {isEdit && (
          <Pressable onPress={onDelete} style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}>
            <Text style={styles.deleteBtnText}>Remove product</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.9 },

  label: {
    fontSize: 11, fontWeight: '500', letterSpacing: 0.8, textTransform: 'uppercase',
    color: colors.textSubtle, marginBottom: 6, marginLeft: 2,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 11,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14.5, color: colors.text,
    marginBottom: space.md, backgroundColor: colors.bgElev,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },

  row: { flexDirection: 'row', gap: space.md },
  rowField: { flex: 1 },

  // photos
  photoRow: { marginTop: space.xs },
  photoWrap: { width: 84, height: 84, marginRight: 10 },
  photo: { width: 84, height: 84, borderRadius: 13, backgroundColor: colors.bgInset },
  photoRemove: {
    position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  coverBadge: {
    position: 'absolute', bottom: 5, left: 5, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.55)',
  },
  coverBadgeText: { fontSize: 9, fontWeight: '600', color: '#fff' },
  photoAdd: {
    width: 84, height: 84, borderRadius: 13, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft,
  },
  photoAddText: { fontSize: 10.5, fontWeight: '500', color: colors.accentDeep, textAlign: 'center', marginTop: 4 },
  photoHint: { fontSize: 11.5, color: colors.textSubtle, marginTop: 8, marginLeft: 2 },

  // variants
  variantHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: space.lg, marginBottom: space.sm,
  },
  variantAdd: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  variantAddText: { fontSize: 13, fontWeight: '500', color: colors.accent },
  variantEmpty: { fontSize: 12.5, color: colors.textSubtle, lineHeight: 17, marginBottom: space.md },
  variantCard: { padding: 12, marginBottom: 10 },
  variantRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  variantLabelInput: { flex: 1 },
  variantRemove: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  variantPriceInput: { flex: 1 },
  variantToggleWrap: { alignItems: 'center', gap: 4 },
  variantToggleLabel: { fontSize: 10, color: colors.textSubtle },

  stockCard: { padding: 14, marginTop: space.xs, marginBottom: space.xl },
  stockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stockLabel: { fontSize: 14.5, fontWeight: '500', color: colors.text },
  stockSub: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },

  cta: {
    height: 52, borderRadius: 15, backgroundColor: colors.text,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 6,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { fontSize: 15, fontWeight: '600', color: colors.accentFg },

  deleteBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.lg },
  deleteBtnText: { fontSize: 13.5, fontWeight: '500', color: colors.stBlocked },
});
