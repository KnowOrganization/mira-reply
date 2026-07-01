import { ScrollView, View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Card } from '../src/components/Card';
import { Icon } from '../src/components/Icon';
import { Chip, Stat } from '../src/components/primitives';
import { colors, space } from '../src/theme';
import { useProducts, type Product } from '../src/api/hooks';

// Orders — doc spec (Mira.dc.html ~1070-1092): 3-stat row (New/Orders/Revenue)
// + per-order cards with avatar, customer/product, amount, status chip + advance
// CTA. There is no real orders/payments backend — the storefront is link-out
// only (ctaUrl), Mira never processes money (packages/db/src/schema.ts products
// comment), and the closest real signal (discount-code redemptions) is scoped
// per-automation with no global "all redemptions" endpoint. So this screen is a
// thin, HONEST proxy: it borrows the doc's layout over useProducts() (already
// global) with placeholder/zeroed monetary fields, clearly flagged as
// illustrative rather than fabricating fake revenue.
function monogram(title: string): string {
  const t = title.trim();
  return t ? t[0].toUpperCase() : '?';
}

export default function Orders() {
  const { data, isLoading } = useProducts();
  const products = data?.products?.filter((p) => p.available || p.featured) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Orders" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Honesty note — there's no real orders/payments pipeline yet. */}
        <Card style={styles.noteCard}>
          <View style={styles.noteRow}>
            <View style={styles.noteIcon}>
              <Icon name="bell" size={15} color={colors.accentDeep} />
            </View>
            <Text style={styles.noteText}>
              Mira doesn't process payments — this view is illustrative until a real orders pipeline exists.
            </Text>
          </View>
        </Card>

        {/* Summary row */}
        <View style={styles.statRow}>
          <Card style={styles.statCard}>
            <Stat value={0} label="New" size={21} color={colors.accent} />
          </Card>
          <Card style={styles.statCard}>
            <Stat value={products.length} label="Orders" size={21} />
          </Card>
          <Card style={styles.statCard}>
            <Stat value="—" label="Revenue" size={21} color={colors.stDone} />
          </Card>
        </View>

        {isLoading ? null : products.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No products to illustrate orders with yet.</Text>
          </Card>
        ) : (
          products.map((product: Product) => (
            <Card key={product.id} style={styles.orderCard}>
              <View style={styles.orderRow}>
                {product.imageUrl ? (
                  <Image source={{ uri: product.imageUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarMonogram}>{monogram(product.title)}</Text>
                  </View>
                )}
                <View style={styles.orderBody}>
                  <Text style={styles.orderTitle} numberOfLines={1}>{product.title}</Text>
                  <Text style={styles.orderSubtitle} numberOfLines={1}>{product.subtitle || product.title}</Text>
                </View>
                <View style={styles.orderAmount}>
                  <Text style={styles.amountText}>$0</Text>
                </View>
              </View>
              <View style={styles.orderFooter}>
                <Chip label="Pending" tone="grey" />
              </View>
            </Card>
          ))
        )}

        <Text style={styles.caption}>
          Real order tracking needs a connected checkout — for now Mira links customers out via each product's CTA.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  noteCard: { padding: 13, marginTop: space.md, backgroundColor: colors.accentSoft, borderColor: colors.accentSoft },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  noteIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  noteText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.accentDeep, fontWeight: '500' },

  statRow: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  statCard: { flex: 1, padding: 12 },

  emptyCard: { padding: space.xl, alignItems: 'center', marginTop: space.lg },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },

  orderCard: { padding: 14, marginTop: space.md },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgInset },
  avatarPlaceholder: { backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarMonogram: { fontSize: 14, fontWeight: '500', color: colors.accentDeep },
  orderBody: { flex: 1, minWidth: 0, gap: 1 },
  orderTitle: { fontSize: 14.5, fontWeight: '500', color: colors.text },
  orderSubtitle: { fontSize: 12, color: colors.textSubtle },
  orderAmount: { alignItems: 'flex-end', flexShrink: 0 },
  amountText: { fontSize: 15, fontWeight: '500', letterSpacing: -0.3, color: colors.textSubtle },

  orderFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },

  caption: { fontSize: 12, color: colors.textSubtle, textAlign: 'center', marginTop: space.lg, lineHeight: 17 },
});
