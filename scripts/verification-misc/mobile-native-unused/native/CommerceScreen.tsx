// Native back-in-stock waitlist — people who DM'd about a sold-out product;
// notify them all on restock. /api/ig/commerce/interest + /products/:id/notify-restock.
import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { apiGet, apiPost } from '../api';
import { Screen, Card, Row, Loading, Empty } from './ui';
import { T } from './theme';

type Product = { id: string; title: string; available: boolean };
type Counts = Record<string, { waiting: number; notified: number }>;

export function CommerceScreen({ onMenu }: { onMenu?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const [p, c] = await Promise.all([
        apiGet<{ products: Product[] }>('/api/ig/products'),
        apiGet<{ counts: Counts }>('/api/ig/commerce/interest'),
      ]);
      setProducts(p.products || []); setCounts(c.counts || {});
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function notify(id: string) {
    try { const r = await apiPost<{ attempted: number; sent: number }>(`/api/ig/products/${id}/notify-restock`); setMsg(`DM'd ${r.sent}/${r.attempted}`); load(); } catch {}
  }

  if (loading) return <Screen title="Back-in-stock" onMenu={onMenu}><Loading /></Screen>;

  const rows = products
    .map((p) => ({ ...p, ...(counts[p.id] ?? { waiting: 0, notified: 0 }) }))
    .filter((p) => p.waiting > 0 || p.notified > 0)
    .sort((a, b) => b.waiting - a.waiting);

  return (
    <Screen title="Back-in-stock" onMenu={onMenu} subtitle="Captured automatically when someone DMs about a sold-out item — notify them all on restock.">
      {rows.length === 0 ? (
        <Empty text="No waitlists yet. They appear when a DM asks about a sold-out product." />
      ) : (
        <Card>
          {rows.map((p) => (
            <Row key={p.id} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: T.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: T.text }}>{p.title}</Text>
                <Text style={{ fontSize: 11.5, color: T.subtle }}>{p.waiting} waiting · {p.notified} notified · {p.available ? 'in stock' : 'sold out'}</Text>
              </View>
              <Pressable onPress={() => notify(p.id)} disabled={p.waiting === 0} style={{ height: 32, paddingHorizontal: 13, borderRadius: 9, backgroundColor: p.waiting === 0 ? T.bgInset : T.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: p.waiting === 0 ? T.subtle : '#fff' }}>Notify {p.waiting || ''}</Text>
              </Pressable>
            </Row>
          ))}
          {msg ? <Text style={{ fontSize: 12, color: T.muted, paddingTop: 8 }}>{msg} — only those still in the 24h window receive it.</Text> : null}
        </Card>
      )}
    </Screen>
  );
}
