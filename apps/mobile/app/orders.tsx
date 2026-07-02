import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Card } from '../src/components/Card';
import { Icon } from '../src/components/Icon';
import { Chip, Stat } from '../src/components/primitives';
import { colors, space } from '../src/theme';
import { useOrders, type OrderApi } from '../src/api/hooks';

// Orders — real data from GET /api/ig/orders (Workstream A).
// Stats row: new / total orders / revenue. Per-order cards: status chip,
// amount (minor units / 100 = rupees), email, date.

function fmtRupees(minor: number): string {
  return `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

type StatusTone = 'done' | 'warm' | 'blocked' | 'grey';
function statusTone(status: string): StatusTone {
  if (status === 'paid') return 'done';
  if (status === 'pending') return 'warm';
  if (status === 'failed') return 'blocked';
  return 'grey';
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function Orders() {
  const { data, isLoading, isError, refetch } = useOrders();
  const orders = data?.orders ?? [];
  const stats = data?.stats ?? { count: 0, revenueCents: 0, newCount: 0 };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Orders" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats row */}
        <View style={styles.statRow}>
          <Card style={styles.statCard}>
            <Stat value={stats.newCount} label="New" size={21} color={colors.accent} />
          </Card>
          <Card style={styles.statCard}>
            <Stat value={stats.count} label="Orders" size={21} />
          </Card>
          <Card style={styles.statCard}>
            <Stat value={fmtRupees(stats.revenueCents)} label="Revenue" size={21} color={colors.stDone} />
          </Card>
        </View>

        {/* Error state */}
        {isError && (
          <Card style={styles.errorCard}>
            <View style={styles.errorRow}>
              <Icon name="bell" size={15} color={colors.stBlocked} />
              <Text style={styles.errorText}>Failed to load orders.</Text>
              <Text style={styles.retryText} onPress={() => refetch()}>Retry</Text>
            </View>
          </Card>
        )}

        {/* Loading skeletons */}
        {isLoading && orders.length === 0 && (
          <>
            {[0, 1, 2].map((i) => (
              <Card key={i} style={[styles.orderCard, styles.skeleton]} />
            ))}
          </>
        )}

        {/* Empty state */}
        {!isLoading && !isError && orders.length === 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No orders yet. Share your store link to get started.</Text>
          </Card>
        )}

        {/* Order cards */}
        {orders.map((order: OrderApi) => (
          <Card key={order.id} style={styles.orderCard}>
            <View style={styles.orderRow}>
              <View style={styles.orderBody}>
                <View style={styles.orderMeta}>
                  <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
                  <Chip label={statusLabel(order.status)} tone={statusTone(order.status)} small />
                </View>
                <Text style={styles.orderCustomer} numberOfLines={1}>
                  {order.email || order.customerName || '—'}
                </Text>
              </View>
              <View style={styles.orderRight}>
                <Text style={styles.orderAmount}>{fmtRupees(order.amountTotal)}</Text>
                <Text style={styles.orderDate}>{fmtDate(order.createdAt)}</Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  statCard: { flex: 1, padding: 12 },

  errorCard: { padding: 13, marginTop: space.md, backgroundColor: colors.accentSoft },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  errorText: { flex: 1, fontSize: 12.5, color: colors.stBlocked, fontWeight: '500' },
  retryText: { fontSize: 12.5, fontWeight: '700', color: colors.accent },

  skeleton: { height: 72, marginTop: space.md, opacity: 0.4 },

  emptyCard: { padding: space.xl, alignItems: 'center', marginTop: space.lg },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },

  orderCard: { padding: 14, marginTop: space.md },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  orderBody: { flex: 1, minWidth: 0, gap: 3 },
  orderMeta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  orderId: { fontSize: 12, fontWeight: '500', color: colors.textSubtle, letterSpacing: 0.2 },
  orderCustomer: { fontSize: 13.5, color: colors.textMuted },
  orderRight: { alignItems: 'flex-end', flexShrink: 0 },
  orderAmount: {
    fontSize: 15, fontWeight: '600', color: colors.text,
    letterSpacing: -0.3,
  },
  orderDate: { fontSize: 11.5, color: colors.textSubtle, marginTop: 2 },
});
