import {
  ScrollView,
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Toggle } from '../src/components/primitives';
import { Icon } from '../src/components/Icon';
import { SkRepeat } from '../src/components/skeleton/primitives';
import { SkProductCard } from '../src/components/skeleton/units';
import { colors, space } from '../src/theme';
import {
  useProducts,
  useUpdateProduct,
  useStatus,
  useInterestCounts,
  type Product,
} from '../src/api/hooks';

// Catalog management — grouped product list (doc: Mira.dc.html:780-814) with
// hairline-divided rows (not per-product cards), featured-star + in-stock
// toggles per row, and entry cards into the live storefront + back-in-stock
// waitlist. Adding/editing a product is its own route (app/addProduct.tsx).
function monogram(title: string): string {
  const t = title.trim();
  return t ? t[0].toUpperCase() : '?';
}

function formatPrice(p: string | null): string | null {
  if (!p) return null;
  const t = p.trim();
  return t || null;
}

export default function Catalog() {
  const router = useRouter();
  const { data, isLoading } = useProducts();
  const { data: status } = useStatus();
  const { data: interest } = useInterestCounts();
  const updateProduct = useUpdateProduct();

  const products = data?.products ?? [];
  const inStockCount = products.filter((p) => p.available).length;
  const featuredCount = products.filter((p) => p.featured).length;
  const waitTotal = Object.values(interest?.counts ?? {}).reduce((sum, c) => sum + c.waiting, 0);
  const handle = status?.account?.username;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Catalog" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* View live storefront */}
        <Pressable
          onPress={() => router.push('/store')}
          style={({ pressed }) => [styles.linkCard, styles.linkCardAccent, pressed && styles.pressed]}
        >
          <View style={[styles.linkIcon, { backgroundColor: colors.accent }]}>
            <Icon name="sparkle" size={16} color={colors.accentFg} />
          </View>
          <View style={styles.linkBody}>
            <Text style={[styles.linkTitle, { color: colors.accentDeep }]}>View live storefront</Text>
            <Text style={[styles.linkSub, { color: colors.accentDeep }]} numberOfLines={1}>
              mira.shop/{handle ?? '—'}
            </Text>
          </View>
          <Icon name="chevronRight" size={16} color={colors.accentDeep} />
        </Pressable>

        {/* Back in stock waitlist */}
        <Pressable
          onPress={() => router.push('/waitlist' as never)} // TODO: Phase 8 builds /waitlist
          style={({ pressed }) => [styles.linkCard, styles.linkCardPlain, pressed && styles.pressed]}
        >
          <View style={[styles.linkIcon, { backgroundColor: colors.bgInset }]}>
            <Icon name="bell" size={16} color={colors.textMuted} />
          </View>
          <View style={styles.linkBody}>
            <Text style={styles.linkTitle}>Back in stock</Text>
            <Text style={[styles.linkSub, { color: colors.textSubtle }]}>
              {waitTotal} waiting on sold-out items
            </Text>
          </View>
          <Icon name="chevronRight" size={16} color={colors.textSubtle} />
        </Pressable>

        {/* Row header */}
        <View style={styles.rowHeader}>
          <Text style={styles.rowHeaderLabel}>
            {inStockCount} in stock · {featuredCount} featured
          </Text>
          <Pressable
            onPress={() => router.push('/addProduct')}
            hitSlop={8}
            style={({ pressed }) => [styles.addLink, pressed && styles.pressed]}
          >
            <Icon name="plus" size={15} color={colors.accent} />
            <Text style={styles.addLinkText}>Add</Text>
          </Pressable>
        </View>

        {/* Grouped list */}
        {isLoading ? (
          <SkRepeat n={4}>{(i) => <SkProductCard key={i} />}</SkRepeat>
        ) : products.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No products yet — add your first.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {products.map((product: Product, i) => {
              const price = formatPrice(product.priceText);
              return (
                <Pressable
                  key={product.id}
                  onPress={() => router.push({ pathname: '/addProduct', params: { id: product.id } })}
                  style={({ pressed }) => [
                    styles.row,
                    i < products.length - 1 && styles.rowDivider,
                    pressed && styles.pressed,
                  ]}
                >
                  {product.imageUrl ? (
                    <Image source={{ uri: product.imageUrl }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Text style={styles.thumbMonogram}>{monogram(product.title)}</Text>
                    </View>
                  )}
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{product.title}</Text>
                    {!!product.subtitle && (
                      <Text style={styles.rowSubtitle} numberOfLines={1}>{product.subtitle}</Text>
                    )}
                    <Text style={styles.rowPriceLine} numberOfLines={1}>
                      {price ? <Text style={styles.rowPrice}>{price}</Text> : null}
                      {price ? '  ·  ' : ''}
                      <Text style={{ color: product.available ? colors.stDone : colors.stBlocked }}>
                        {product.available ? 'In stock' : 'Sold out'}
                      </Text>
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => updateProduct.mutate({ id: product.id, featured: !product.featured })}
                    hitSlop={6}
                    style={styles.starBtn}
                  >
                    <Icon
                      name="sparkle"
                      size={19}
                      color={product.featured ? colors.stWarm : colors.borderStrong}
                    />
                  </Pressable>
                  <Toggle
                    value={product.available}
                    onValueChange={(v) => updateProduct.mutate({ id: product.id, available: v })}
                  />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Add product CTA */}
        <Pressable
          onPress={() => router.push('/addProduct')}
          style={({ pressed }) => [styles.addCta, pressed && styles.pressed]}
        >
          <Icon name="plus" size={16} color={colors.textMuted} />
          <Text style={styles.addCtaText}>Add product</Text>
        </Pressable>

        <Text style={styles.caption}>
          Toggle a product off and Mira instantly stops offering it in DMs.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.9 },

  linkCard: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    borderRadius: 13, padding: 13, marginTop: space.md,
  },
  linkCardAccent: { backgroundColor: colors.accentSoft },
  linkCardPlain: { backgroundColor: colors.bgElev, borderWidth: 1, borderColor: colors.border, ...shadowCard() },
  linkIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  linkBody: { flex: 1, gap: 2 },
  linkTitle: { fontSize: 13.5, fontWeight: '500', color: colors.text },
  linkSub: { fontSize: 11.5 },

  rowHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: space.lg, marginBottom: space.sm, paddingHorizontal: 2,
  },
  rowHeaderLabel: { fontSize: 11.5, fontWeight: '500', letterSpacing: 0.5, color: colors.textSubtle, textTransform: 'uppercase' },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  addLinkText: { fontSize: 13.5, fontWeight: '500', color: colors.accent },

  listCard: { backgroundColor: colors.bgElev, borderRadius: 13, ...shadowCard() },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10, paddingHorizontal: 13 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  thumb: { width: 48, height: 58, borderRadius: 9, backgroundColor: colors.bgInset },
  thumbPlaceholder: { backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  thumbMonogram: { fontSize: 17, fontWeight: '700', color: colors.accentDeep },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14.5, fontWeight: '500', color: colors.text },
  rowSubtitle: { fontSize: 12, color: colors.textSubtle },
  rowPriceLine: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  rowPrice: { fontWeight: '700', color: colors.text },
  starBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  emptyCard: { padding: space.xl, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },

  addCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
    height: 50, borderRadius: 13, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong,
    marginTop: space.lg,
  },
  addCtaText: { fontSize: 14, fontWeight: '500', color: colors.textMuted },

  caption: { fontSize: 12, color: colors.textSubtle, textAlign: 'center', marginTop: space.md, lineHeight: 17 },
});

function shadowCard() {
  return { shadowColor: '#14151a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 };
}
