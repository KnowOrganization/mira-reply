// Native Funnel Studio results — giveaway entries + draw, discount codes +
// redeem, A/B results. Talks to /api/ig/automations + /api/ig/funnels/:id/*.
import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { apiGet, apiPost } from '../api';
import { Screen, Card, SectionTitle, Btn, Row, Pill, Loading, Empty } from './ui';
import { T } from './theme';

type Node = { type: string };
type Auto = { id: string; name: string; nodes: Node[] };
type Entry = { id: number; entryNumber: number; fromUsername: string | null; fromUserId: string; won: boolean };
type Code = { id: number; code: string; issuedToUsername: string | null; issuedTo: string; redeemedAt: number | null };
type Ab = { variant: number; assigned: number; converted: number };

const FUNNEL = ['giveaway', 'discount_code', 'ab_split'];
const kinds = (a: Auto) => FUNNEL.filter((t) => a.nodes?.some((n) => n.type === t));

export function FunnelsScreen({ onMenu }: { onMenu?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [funnels, setFunnels] = useState<Auto[]>([]);
  const [sel, setSel] = useState<string>('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [ab, setAb] = useState<Ab[]>([]);

  async function loadList() {
    try {
      const r = await apiGet<{ automations: Auto[] }>('/api/ig/automations');
      const f = (r.automations || []).filter((a) => kinds(a).length > 0);
      setFunnels(f);
      if (f.length && !sel) setSel(f[0].id);
    } catch {}
    setLoading(false);
  }
  async function loadResults(id: string) {
    const a = funnels.find((x) => x.id === id);
    if (!a) return;
    const k = kinds(a);
    try {
      if (k.includes('giveaway')) setEntries((await apiGet<{ entries: Entry[] }>(`/api/ig/funnels/${id}/entries`)).entries);
      if (k.includes('discount_code')) setCodes((await apiGet<{ codes: Code[] }>(`/api/ig/funnels/${id}/codes`)).codes);
      if (k.includes('ab_split')) setAb((await apiGet<{ results: Ab[] }>(`/api/ig/funnels/${id}/ab`)).results);
    } catch {}
  }
  useEffect(() => { loadList(); }, []);
  useEffect(() => { if (sel) loadResults(sel); }, [sel, funnels.length]);

  const cur = funnels.find((a) => a.id === sel);
  const k = cur ? kinds(cur) : [];

  async function draw() { try { await apiPost(`/api/ig/funnels/${sel}/draw`); loadResults(sel); } catch {} }
  async function redeem(code: string) { try { await apiPost(`/api/ig/funnels/${sel}/codes/redeem`, { code }); loadResults(sel); } catch {} }

  if (loading) return <Screen title="Funnels" onMenu={onMenu}><Loading /></Screen>;

  return (
    <Screen title="Funnels" onMenu={onMenu} subtitle="Live results for your Comment→DM funnels — draw winners, redeem codes, compare A/B.">
      {funnels.length === 0 ? (
        <Empty text="No funnels yet. Add a Giveaway, Discount Code, or A/B node to an automation." />
      ) : (
        <>
          <Row style={{ flexWrap: 'wrap', marginBottom: 8 }}>
            {funnels.map((a) => (
              <Pressable key={a.id} onPress={() => setSel(a.id)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: sel === a.id ? T.text : T.bgInset, marginBottom: 6 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: sel === a.id ? '#fff' : T.muted }}>{a.name}</Text>
              </Pressable>
            ))}
          </Row>

          {k.includes('giveaway') ? (
            <>
              <SectionTitle>Giveaway · {entries.length} entrants</SectionTitle>
              <Card>
                <Btn small label="Draw a winner" kind="danger" onPress={draw} />
                <View style={{ marginTop: 10, gap: 4 }}>
                  {entries.map((e) => (
                    <Row key={e.id}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: T.subtle, width: 34 }}>#{e.entryNumber}</Text>
                      <Text style={{ fontSize: 12.5, color: T.text, flex: 1 }}>@{e.fromUsername ?? e.fromUserId}</Text>
                      {e.won ? <Text style={{ fontSize: 11, fontWeight: '700', color: T.blocked }}>🏆 winner</Text> : null}
                    </Row>
                  ))}
                  {entries.length === 0 ? <Text style={{ fontSize: 12, color: T.subtle }}>No entries yet.</Text> : null}
                </View>
              </Card>
            </>
          ) : null}

          {k.includes('discount_code') ? (
            <>
              <SectionTitle>Codes · {codes.filter((c) => c.redeemedAt).length}/{codes.length} redeemed</SectionTitle>
              <Card>
                {codes.map((c) => (
                  <Row key={c.id} style={{ paddingVertical: 6 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: T.text }}>{c.code}</Text>
                    <Text style={{ fontSize: 12, color: T.subtle, flex: 1 }}>@{c.issuedToUsername ?? c.issuedTo}</Text>
                    {c.redeemedAt ? <Pill label="redeemed" color={T.done} bg="rgba(31,157,107,0.12)" /> : <Pressable onPress={() => redeem(c.code)}><Pill label="Redeem" color={T.warm} bg="rgba(184,121,28,0.12)" /></Pressable>}
                  </Row>
                ))}
                {codes.length === 0 ? <Text style={{ fontSize: 12, color: T.subtle }}>No codes issued yet.</Text> : null}
              </Card>
            </>
          ) : null}

          {k.includes('ab_split') ? (
            <>
              <SectionTitle>A/B results</SectionTitle>
              <Card>
                {ab.length === 0 ? <Text style={{ fontSize: 12, color: T.subtle }}>No assignments yet.</Text> : ab.map((r) => {
                  const rate = r.assigned ? Math.round((r.converted / r.assigned) * 100) : 0;
                  const max = Math.max(1, ...ab.map((x) => x.assigned));
                  return (
                    <View key={r.variant} style={{ marginBottom: 12 }}>
                      <Row style={{ justifyContent: 'space-between', marginBottom: 5 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: T.text }}>Variant {String.fromCharCode(65 + r.variant)}</Text>
                        <Text style={{ fontSize: 12, color: T.muted }}>{r.assigned} sent · {r.converted} conv · {rate}%</Text>
                      </Row>
                      <View style={{ height: 8, borderRadius: 5, backgroundColor: T.bgInset }}>
                        <View style={{ height: 8, borderRadius: 5, backgroundColor: T.accent, width: `${Math.round((r.assigned / max) * 100)}%` }} />
                      </View>
                    </View>
                  );
                })}
              </Card>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
