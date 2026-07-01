import { useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { colors, space } from '../src/theme';
import {
  useInterestCounts,
  useProducts,
  useNotifyRestock,
  type Product,
} from '../src/api/hooks';

// Back in stock — people who DM'd interest in a sold-out product, captured
// automatically (doc: Mira.dc.html:704-716). One row per product with any
// waitlist activity (cross-referencing /commerce/interest counts against
// /products for title+thumb), "Notify" fans out the back-in-stock DM blast;
// once sent, waiting drops to 0 server-side and the row flips to a disabled
// "Notified" state — driven by the refetched counts, no extra local state.
function monogram(title: string): string {
  const t = title.trim();
  return t ? t[0].toUpperCase() : '?';
}

type WaitRow = {
  productId: string;
  waiting: number;
  notified: number;
  product: Product | undefined;
};

export default function Waitlist() {
  const { data: countsData, isLoading: countsLoading } = useInterestCounts();
  const { data: productsData, isLoading: productsLoading } = useProducts();
  const notify = useNotifyRestock();

  const counts = countsData?.counts ?? {};
  const products = productsData?.products ?? [];
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const rows = useMemo<WaitRow[]>(() => {
    return Object.entries(counts)
      .map(([productId, c]) => ({ productId, waiting: c.waiting, notified: c.notified, product: productById.get(productId) }))
      .filter((r) => r.waiting > 0 || r.notified > 0)
      .sort((a, b) => b.waiting - a.waiting || b.notified - a.notified);
  }, [counts, productById]);

  const isLoading = countsLoading || productsLoading;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Back in stock" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          People who DM'd about a sold-out product, captured automatically. Notify them all the
          moment you restock.
        </Text>

        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: space.xl }} />
        ) : rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No one's waiting on a restock right now.</Text>
          </View>
        ) : (
          <>
            {rows.map((r) => {
              const title = r.product?.title ?? 'Unknown product';
              const available = r.product?.available ?? false;
              const imageUrl = r.product?.imageUrl ?? null;
              const isPending = notify.isPending && notify.variables === r.productId;
              const isNotified = r.waiting === 0 && r.notified > 0;
              const sub = `${r.waiting} waiting · ${r.notified} notified · ${available ? 'in stock' : 'sold out'}`;

              return (
                <View key={r.productId} style={styles.row}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Text style={styles.thumbMonogram}>{monogram(title)}</Text>
                    </View>
                  )}
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text>
                  </View>
                  <Pressable
                    onPress={() => notify.mutate(r.productId)}
                    disabled={isPending || isNotified}
                    style={({ pressed }) => [
                      styles.notifyBtn,
                      isNotified ? styles.notifyBtnDone : styles.notifyBtnActive,
                      pressed && !isPending && !isNotified && styles.pressed,
                    ]}
                  >
                    {isPending ? (
                      <ActivityIndicator color={colors.accentFg} size="small" />
                    ) : (
                      <Text style={[styles.notifyBtnText, isNotified ? styles.notifyBtnTextDone : styles.notifyBtnTextActive]}>
                        {isNotified ? `Notified · ${r.notified}` : `Notify ${r.waiting}`}
                      </Text>
                    )}
                  </Pressable>
                </View>
              );
            })}
            <Text style={styles.caption}>Only people still inside the 24h window receive the DM.</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.9 },

  intro: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginHorizontal: 2, marginBottom: space.md },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElev,
    borderRadius: 14, padding: 13, marginBottom: 10,
    ...shadowCard(),
  },
  thumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.bgInset },
  thumbPlaceholder: { backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  thumbMonogram: { fontSize: 15, fontWeight: '700', color: colors.accentDeep },
  rowBody: { flex: 1, gap: 2, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  rowSub: { fontSize: 11.5, color: colors.textSubtle },

  notifyBtn: {
    height: 32, paddingHorizontal: 14, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notifyBtnActive: { backgroundColor: colors.accent },
  notifyBtnDone: { backgroundColor: colors.bgInset },
  notifyBtnText: { fontSize: 12, fontWeight: '500' },
  notifyBtnTextActive: { color: colors.accentFg },
  notifyBtnTextDone: { color: colors.textSubtle },

  emptyCard: { padding: space.xl, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },

  caption: { fontSize: 11.5, color: colors.textSubtle, textAlign: 'center', marginTop: space.sm },
});

function shadowCard() {
  return { shadowColor: '#14151a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 };
}
