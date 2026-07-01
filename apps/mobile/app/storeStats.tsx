import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Card } from '../src/components/Card';
import { SkCard, SkLine, SkRepeat } from '../src/components/skeleton/primitives';
import { colors, radius, space } from '../src/theme';
import { useProducts, useInterestCounts, type Product } from '../src/api/hooks';

// Store insights — 4-stat grid + "Top products" ranked bar list (doc:
// Mira.dc.html ~L1095-1117, rStoreStats). No new backend: stats are derived
// from the existing /products list, and "top" ranking comes from the
// back-in-stock waitlist signal (useInterestCounts → waiting+notified per
// product), the only real demand signal we have client-side. When no product
// has any interest recorded yet, we fall back to catalog order (sortOrder)
// and say so rather than fabricate numbers.

type RankedProduct = { product: Product; n: number };

export default function StoreStats() {
  const { data: productsData, isLoading: productsLoading } = useProducts();
  const { data: interestData, isLoading: interestLoading } = useInterestCounts();

  const products = productsData?.products ?? [];
  const counts = interestData?.counts ?? {};
  const isLoading = productsLoading || interestLoading;

  const totalProducts = products.length;
  const inStockCount = products.filter((p) => p.available).length;
  const featuredCount = products.filter((p) => p.featured).length;
  const totalInterest = Object.values(counts).reduce((sum, c) => sum + c.waiting + c.notified, 0);

  const hasDemandSignal = totalInterest > 0;

  const ranked: RankedProduct[] = hasDemandSignal
    ? products
        .map((product) => {
          const c = counts[product.id];
          return { product, n: (c?.waiting ?? 0) + (c?.notified ?? 0) };
        })
        .sort((a, b) => b.n - a.n)
        .slice(0, 8)
    : [...products]
        .sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt - a.createdAt)
        .slice(0, 8)
        .map((product) => ({ product, n: 0 }));

  const topN = ranked.length > 0 ? Math.max(...ranked.map((r) => r.n)) : 0;

  const stats: { label: string; value: number }[] = [
    { label: 'Products', value: totalProducts },
    { label: 'In stock', value: inStockCount },
    { label: 'Featured', value: featuredCount },
    { label: 'Waitlist interest', value: totalInterest },
  ];

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
        <ScreenHeader title="Store insights" />
        <ScrollView
          contentContainerStyle={{ padding: space.xl, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            <SkRepeat n={4}>
              {(i) => (
                <SkCard key={i} style={styles.statCard} radius={radius.lg}>
                  <SkLine w="60%" h={10} />
                  <SkLine w="40%" h={24} style={{ marginTop: 8 }} />
                </SkCard>
              )}
            </SkRepeat>
          </View>
          <SkCard radius={radius.lg} style={{ marginTop: space.lg, padding: 16 }}>
            <SkLine w="35%" h={11} style={{ marginBottom: 13 }} />
            <SkRepeat n={4}>
              {(i) => <SkLine key={i} w="100%" h={8} style={{ marginBottom: 10 }} />}
            </SkRepeat>
          </SkCard>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Store insights" />
      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {stats.map((s) => (
            <Card key={s.label} radius={radius.lg} style={styles.statCard}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
            </Card>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Top products</Text>
        <Card radius={radius.lg} style={styles.card}>
          <View style={styles.cardInner}>
            {products.length === 0 ? (
              <Text style={styles.emptyText}>No products yet — add some in Catalog.</Text>
            ) : (
              <>
                {ranked.map(({ product, n }) => (
                  <TopProductRow key={product.id} product={product} n={n} max={topN} />
                ))}
                {!hasDemandSignal && <Text style={styles.noSignalNote}>No demand signal yet</Text>}
              </>
            )}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

function TopProductRow({ product, n, max }: { product: Product; n: number; max: number }) {
  const widthPct = max > 0 ? Math.max(4, Math.round((n / max) * 100)) : 4;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel} numberOfLines={1}>
        {product.title}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${widthPct}%` }]} />
      </View>
      <Text style={styles.rowN}>{n}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  statCard: { width: '47%', padding: 14 },
  statLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 0.7, color: colors.textSubtle },
  statValue: { fontSize: 26, fontWeight: '500', letterSpacing: -0.7, color: colors.text, marginTop: 5 },

  sectionLabel: {
    fontSize: 11, fontWeight: '500', letterSpacing: 0.8, color: colors.textSubtle,
    marginTop: space.lg, marginBottom: space.sm, marginLeft: 2,
  },
  card: { marginTop: 0 },
  cardInner: { padding: 16 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  rowLabel: { width: 120, fontSize: 12, color: colors.textMuted, flexShrink: 0 },
  track: { flex: 1, height: 8, borderRadius: 5, backgroundColor: colors.bgInset, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 5 },
  rowN: { fontSize: 11.5, fontWeight: '500', width: 24, textAlign: 'right', color: colors.text },

  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  noSignalNote: { fontSize: 11.5, color: colors.textSubtle, textAlign: 'center', marginTop: 4 },
});
