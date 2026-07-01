import { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  Pressable,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Icon } from '../src/components/Icon';
import { SkCard, SkLine } from '../src/components/skeleton/primitives';
import { CustomizeSheet, type CustomizeSheetHandle } from '../src/components/sheets/CustomizeSheet';
import { colors, radius, space } from '../src/theme';
import {
  useIgSettings,
  usePatchIgSettings,
  useProducts,
  useStatus,
  type Product,
} from '../src/api/hooks';
import {
  resolveStorefrontConfig,
  contrastFg,
  type StorefrontSettingsInput,
  type StorefrontProductLite,
} from '@shaiz/shared';

// Real shop-preview browser (doc: Mira.dc.html:817-916), not a settings form
// — config lives in the Customize sheet. Preview === prod by construction:
// pipes saved settings through resolveStorefrontConfig, the same resolver the
// public store API uses.
function monogram(title: string): string {
  const t = title.trim();
  return t ? t[0].toUpperCase() : '?';
}

function formatPrice(p: string | null): string | null {
  if (!p) return null;
  const t = p.trim();
  if (!t) return null;
  return t.startsWith('$') ? t : `$${t}`;
}

function PressScale({ children, onPress, style }: { children: React.ReactNode; onPress?: () => void; style?: object }) {
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  return (
    <Pressable onPress={onPress} onPressIn={() => animateTo(0.96)} onPressOut={() => animateTo(1)} style={style}>
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  );
}

export default function Store() {
  const router = useRouter();
  const customizeRef = useRef<CustomizeSheetHandle>(null);
  const { data: settings, isLoading } = useIgSettings<Partial<StorefrontSettingsInput>>();
  const { data: productsData } = useProducts();
  const { data: status } = useStatus();
  const patchSettings = usePatchIgSettings();

  const products: Product[] = productsData?.products ?? [];
  const handle = status?.account?.username ?? null;
  const [selected, setSelected] = useState<Product | null>(null);

  const productLites: StorefrontProductLite[] = products.map((p) => ({ id: p.id, available: p.available, imageUrl: p.imageUrl }));
  const settingsInput: StorefrontSettingsInput = settings ?? {};
  const config = resolveStorefrontConfig(settingsInput, productLites);
  const accentFg = contrastFg(config.accent);

  const available = products.filter((p) => p.available);
  const featured = config.featuredIds.map((id) => available.find((p) => p.id === id)).filter((p): p is Product => !!p);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
        <View style={{ paddingHorizontal: space.xl, paddingTop: 60 }}>
          <SkLine w="60%" h={26} />
          <SkCard radius={radius.lg} style={{ marginTop: space.lg, padding: 20 }}>
            <SkLine w="100%" h={120} r={14} />
          </SkCard>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <Pressable onPress={() => (selected ? setSelected(null) : router.back())} style={styles.toolbarBack}>
          <Icon name="chevronLeft" size={20} color={colors.text} />
        </Pressable>
        {!selected && (
          <>
            <View style={styles.urlPill}>
              <Icon name="instagram" size={13} color={colors.textSubtle} />
              <Text style={styles.urlText} numberOfLines={1}>mira.shop/{handle ?? '—'}</Text>
            </View>
            <Pressable onPress={() => customizeRef.current?.present()} style={styles.editPill}>
              <Text style={styles.editPillText}>Edit</Text>
            </Pressable>
          </>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        {selected ? (
          <ProductDetail
            product={selected}
            shopName={config.title}
            accent={config.accent}
            accentFg={accentFg}
            buyLabel={config.buyLabel}
            related={available.filter((p) => p.id !== selected.id).slice(0, 4)}
            onSelectRelated={setSelected}
          />
        ) : (
          <>
            {/* Sticky-style shop header (inline, top of scroll) */}
            <View style={styles.shopHeader}>
              <View style={[styles.shopDot, { backgroundColor: config.accent }]} />
              <Text style={styles.shopTitle} numberOfLines={1}>{config.title}</Text>
            </View>

            {/* Hero — minimal or split */}
            {config.heroLayout === 'minimal' ? (
              <View style={styles.heroMinimal}>
                <Text style={styles.heroEyebrow}>Welcome</Text>
                <Text style={styles.heroHeadline}>{config.heroHeadline}</Text>
                {!!config.heroTagline && <Text style={styles.heroTagline}>{config.heroTagline}</Text>}
                <View style={[styles.heroCta, { backgroundColor: config.accent }]}>
                  <Text style={[styles.heroCtaText, { color: accentFg }]}>{config.buyLabel} now</Text>
                </View>
              </View>
            ) : (
              <View style={styles.heroSplit}>
                <View style={styles.heroSplitText}>
                  <Text style={styles.heroEyebrow}>Welcome</Text>
                  <Text style={styles.heroHeadlineSplit}>{config.heroHeadline}</Text>
                  {!!config.heroTagline && <Text style={styles.heroTagline}>{config.heroTagline}</Text>}
                </View>
                <View style={[styles.heroSplitMonogram, { backgroundColor: config.accent }]}>
                  <Text style={[styles.heroMonogramText, { color: accentFg }]}>{monogram(config.title)}</Text>
                </View>
              </View>
            )}

            {/* Featured rail */}
            {config.showFeatured && featured.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Featured</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                  {featured.map((p) => (
                    <PressScale key={p.id} onPress={() => setSelected(p)} style={styles.railCard}>
                      <ProductImage product={p} accent={config.accent} style={styles.railImage} />
                      <Text style={styles.railTitle} numberOfLines={1}>{p.title}</Text>
                      {!!formatPrice(p.priceText) && <Text style={styles.railPrice}>{formatPrice(p.priceText)}</Text>}
                    </PressScale>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* All products grid */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>All products</Text>
              {available.length === 0 ? (
                <Text style={styles.emptyText}>No available products yet — add some in Catalog.</Text>
              ) : (
                <View style={styles.grid}>
                  {available.map((p) => (
                    <PressScale key={p.id} onPress={() => setSelected(p)} style={styles.gridCard}>
                      <ProductImage product={p} accent={config.accent} style={styles.gridImage} />
                      <Text style={styles.gridTitle} numberOfLines={1}>{p.title}</Text>
                      {!!formatPrice(p.priceText) && <Text style={styles.gridPrice}>{formatPrice(p.priceText)}</Text>}
                    </PressScale>
                  ))}
                </View>
              )}
            </View>

            {/* About */}
            {config.showAbout && !!config.about && (
              <View style={styles.aboutBlock}>
                <Text style={styles.aboutEyebrow}>ABOUT</Text>
                <Text style={styles.aboutText}>{config.about}</Text>
                {!!config.contactUrl && <Text style={styles.aboutContact}>Get in touch →</Text>}
              </View>
            )}

            <Text style={styles.footer}>Powered by Mira</Text>
          </>
        )}
      </ScrollView>

      <CustomizeSheet
        ref={customizeRef}
        initial={settingsInput}
        onSave={(patch) => patchSettings.mutate(patch)}
      />
    </View>
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;

function ProductImage({ product, accent, style }: { product: Product; accent: string; style: object }) {
  return product.imageUrl ? (
    <Image source={{ uri: product.imageUrl }} style={style} />
  ) : (
    <View style={[style, { backgroundColor: `${accent}1f`, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: accent }}>{monogram(product.title)}</Text>
    </View>
  );
}

function ProductDetail({ product, shopName, accent, accentFg, buyLabel, related, onSelectRelated }: {
  product: Product; shopName: string; accent: string; accentFg: string; buyLabel: string;
  related: Product[]; onSelectRelated: (p: Product) => void;
}) {
  const price = formatPrice(product.priceText);
  const gallery = product.images.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  return (
    <View>
      {gallery.length > 1 ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {gallery.map((uri, i) => (
            <Image key={i} source={{ uri }} style={[styles.detailImage, { width: SCREEN_WIDTH }]} />
          ))}
        </ScrollView>
      ) : (
        <ProductImage product={product} accent={accent} style={styles.detailImage} />
      )}
      <View style={styles.detailBody}>
        <Text style={styles.detailTitle}>{product.title}</Text>
        {!!price && <Text style={styles.detailPrice}>{price}</Text>}
        {!!product.description && <Text style={styles.detailDesc}>{product.description}</Text>}

        {product.variants.length > 0 && (
          <View style={styles.variantChipRow}>
            {product.variants.map((v) => (
              <View
                key={v.id}
                style={[styles.variantChip, !v.available && styles.variantChipDisabled]}
              >
                <Text style={[styles.variantChipText, !v.available && styles.variantChipTextDisabled]}>
                  {v.label}
                  {v.priceText ? ` · ${v.priceText}` : ''}
                  {!v.available ? ' · sold out' : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {product.ctaUrl ? (
          <View style={[styles.detailCta, { backgroundColor: accent }]}>
            <Text style={[styles.detailCtaText, { color: accentFg }]}>{buyLabel} · Opens instagram.com</Text>
          </View>
        ) : (
          <View style={[styles.detailCta, styles.detailCtaOutline]}>
            <Text style={styles.detailCtaOutlineText}>Ask in DMs to order</Text>
          </View>
        )}

        {related.length > 0 && (
          <View style={{ marginTop: space.xl }}>
            <Text style={styles.sectionLabel}>More from {shopName}</Text>
            <View style={styles.grid}>
              {related.map((p) => (
                <PressScale key={p.id} onPress={() => onSelectRelated(p)} style={styles.gridCard}>
                  <ProductImage product={p} accent={accent} style={styles.gridImage} />
                  <Text style={styles.gridTitle} numberOfLines={1}>{p.title}</Text>
                </PressScale>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: 56, paddingBottom: space.sm },
  toolbarBack: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.bgElev, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  urlPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.bgInset },
  urlText: { fontSize: 12.5, color: colors.textMuted, flex: 1 },
  editPill: { height: 34, paddingHorizontal: 13, borderRadius: 10, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  editPillText: { fontSize: 13, fontWeight: '600', color: colors.accentFg },

  shopHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.xl, paddingVertical: space.md },
  shopDot: { width: 8, height: 8, borderRadius: 4 },
  shopTitle: { fontSize: 15, fontWeight: '600', color: colors.text },

  heroMinimal: { alignItems: 'center', paddingHorizontal: space.xl, paddingVertical: space.xxl, gap: space.sm },
  heroEyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: colors.textSubtle, textTransform: 'uppercase' },
  heroHeadline: { fontSize: 26, fontWeight: '700', color: colors.text, textAlign: 'center', letterSpacing: -0.5 },
  heroTagline: { fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  heroCta: { height: 44, paddingHorizontal: 24, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: space.sm },
  heroCtaText: { fontSize: 14, fontWeight: '600' },

  heroSplit: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.xl, paddingVertical: space.xl },
  heroSplitText: { flex: 1, gap: 6 },
  heroHeadlineSplit: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.4 },
  heroSplitMonogram: { width: 100, height: 100, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroMonogramText: { fontSize: 36, fontWeight: '700' },

  section: { marginTop: space.lg, paddingHorizontal: space.xl },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, color: colors.textSubtle, textTransform: 'uppercase', marginBottom: space.md },
  emptyText: { fontSize: 13, color: colors.textMuted },

  variantChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space.md },
  variantChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.bgInset, borderWidth: 1, borderColor: colors.border },
  variantChipDisabled: { opacity: 0.5 },
  variantChipText: { fontSize: 12.5, fontWeight: '500', color: colors.text },
  variantChipTextDisabled: { textDecorationLine: 'line-through' },

  rail: { gap: space.md },
  railCard: { width: 130 },
  railImage: { width: 130, height: 162, borderRadius: 13, backgroundColor: colors.bgInset },
  railTitle: { fontSize: 13, fontWeight: '500', color: colors.text, marginTop: space.xs },
  railPrice: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted, marginTop: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  gridCard: { width: '47%' },
  gridImage: { width: '100%', aspectRatio: 4 / 5, borderRadius: 13, backgroundColor: colors.bgInset },
  gridTitle: { fontSize: 13, fontWeight: '500', color: colors.text, marginTop: space.xs },
  gridPrice: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted, marginTop: 1 },

  aboutBlock: { marginTop: space.xl, paddingHorizontal: space.xl, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  aboutEyebrow: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2, color: colors.accentDeep, marginBottom: space.xs },
  aboutText: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
  aboutContact: { fontSize: 12.5, fontWeight: '600', color: colors.accentDeep, marginTop: space.sm },

  footer: { textAlign: 'center', fontSize: 11.5, color: colors.textSubtle, marginTop: space.xl, marginBottom: space.lg },

  detailImage: { width: '100%', aspectRatio: 1, backgroundColor: colors.bgInset },
  detailBody: { padding: space.xl },
  detailTitle: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.4 },
  detailPrice: { fontSize: 16, fontWeight: '600', color: colors.textMuted, marginTop: 4 },
  detailDesc: { fontSize: 14, lineHeight: 21, color: colors.textMuted, marginTop: space.md },
  detailCta: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: space.lg },
  detailCtaText: { fontSize: 14.5, fontWeight: '600' },
  detailCtaOutline: { borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  detailCtaOutlineText: { fontSize: 14.5, fontWeight: '600', color: colors.text },
});
