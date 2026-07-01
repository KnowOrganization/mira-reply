// Native Conversational Inbox AI — ice-breakers + persistent menu (push live to
// Instagram), instant seen/typing, VIP radar. Talks to /api/ig/inbox-ai*.
import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { apiGet, apiPost, apiPatch } from '../api';
import { Screen, Card, SectionTitle, Btn, Toggle, Input, Row, Loading } from './ui';
import { T } from './theme';

type Ib = { question: string; payload: string };
type MenuItem = { title: string; type: 'postback' | 'web_url'; payload?: string; url?: string };

export function InboxAiScreen({ onMenu }: { onMenu?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [ib, setIb] = useState<Ib[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [seen, setSeen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [vip, setVip] = useState('0');

  async function load() {
    try {
      const r = await apiGet<{ iceBreakers: Ib[]; persistentMenu: MenuItem[]; autoSeen: boolean; autoTyping: boolean; vipFollowerThreshold: number }>('/api/ig/inbox-ai');
      setIb(r.iceBreakers.length ? r.iceBreakers : [{ question: '', payload: '' }]);
      setMenu(r.persistentMenu.length ? r.persistentMenu : [{ title: '', type: 'postback', payload: '' }]);
      setSeen(r.autoSeen); setTyping(r.autoTyping); setVip(String(r.vipFollowerThreshold || 0));
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function saveIb() { try { await apiPost('/api/ig/inbox-ai/ice-breakers', { iceBreakers: ib.filter((b) => b.question.trim()) }); } catch {} }
  async function saveMenu() { try { await apiPost('/api/ig/inbox-ai/menu', { items: menu.filter((m) => m.title.trim()) }); } catch {} }
  async function patch(p: object) { try { await apiPatch('/api/ig/inbox-ai', p); } catch {} }

  if (loading) return <Screen title="Inbox AI" onMenu={onMenu}><Loading /></Screen>;

  return (
    <Screen title="Inbox AI" onMenu={onMenu} subtitle="Ice-breakers, a persistent menu, instant seen/typing, and a VIP radar — pushed live to Instagram.">
      <SectionTitle>Ice breakers · up to 4</SectionTitle>
      <Card>
        {ib.map((b, i) => (
          <Row key={i} style={{ marginBottom: 8 }}>
            <Input value={b.question} onChangeText={(t) => setIb(ib.map((x, j) => j === i ? { ...x, question: t } : x))} placeholder="Question" style={{ flex: 1 }} />
            <Input value={b.payload} onChangeText={(t) => setIb(ib.map((x, j) => j === i ? { ...x, payload: t } : x))} placeholder="payload" style={{ width: 92 }} />
            <Pressable onPress={() => setIb(ib.filter((_, j) => j !== i))}><Text style={{ fontSize: 18, color: T.subtle }}>×</Text></Pressable>
          </Row>
        ))}
        {ib.length < 4 ? <View style={{ marginBottom: 8 }}><Btn small kind="ghost" label="+ Add ice breaker" onPress={() => setIb([...ib, { question: '', payload: '' }])} /></View> : null}
        <Btn label="Save & push to Instagram" onPress={saveIb} />
      </Card>

      <SectionTitle>Persistent menu · up to 3</SectionTitle>
      <Card>
        {menu.map((m, i) => {
          const isUrl = m.type === 'web_url';
          return (
            <Row key={i} style={{ marginBottom: 8 }}>
              <Input value={m.title} onChangeText={(t) => setMenu(menu.map((x, j) => j === i ? { ...x, title: t } : x))} placeholder="Label" style={{ width: 92 }} />
              <Pressable onPress={() => setMenu(menu.map((x, j) => j === i ? { ...x, type: isUrl ? 'postback' : 'web_url' } : x))} style={{ height: 40, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 11, backgroundColor: T.bgInset }}>
                <Text style={{ fontSize: 11.5, color: T.muted }}>{isUrl ? 'link' : 'tap'}</Text>
              </Pressable>
              <Input value={isUrl ? (m.url ?? '') : (m.payload ?? '')} onChangeText={(t) => setMenu(menu.map((x, j) => j === i ? (isUrl ? { ...x, url: t } : { ...x, payload: t }) : x))} placeholder={isUrl ? 'https://…' : 'payload'} style={{ flex: 1 }} />
              <Pressable onPress={() => setMenu(menu.filter((_, j) => j !== i))}><Text style={{ fontSize: 18, color: T.subtle }}>×</Text></Pressable>
            </Row>
          );
        })}
        {menu.length < 3 ? <View style={{ marginBottom: 8 }}><Btn small kind="ghost" label="+ Add menu item" onPress={() => setMenu([...menu, { title: '', type: 'postback', payload: '' }])} /></View> : null}
        <Btn label="Save & push to Instagram" onPress={saveMenu} />
      </Card>

      <SectionTitle>Responsiveness & VIP</SectionTitle>
      <Card>
        <Row style={{ paddingVertical: 8 }}>
          <View style={{ flex: 1 }}><Text style={{ fontSize: 14, fontWeight: '500', color: T.text }}>Instant read receipt</Text><Text style={{ fontSize: 11.5, color: T.subtle }}>Mark seen the moment a DM lands</Text></View>
          <Toggle on={seen} onChange={(v) => { setSeen(v); patch({ autoSeen: v }); }} />
        </Row>
        <Row style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.border }}>
          <View style={{ flex: 1 }}><Text style={{ fontSize: 14, fontWeight: '500', color: T.text }}>Typing indicator</Text><Text style={{ fontSize: 11.5, color: T.subtle }}>Show typing while drafting</Text></View>
          <Toggle on={typing} onChange={(v) => { setTyping(v); patch({ autoTyping: v }); }} />
        </Row>
        <Row style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.border }}>
          <View style={{ flex: 1 }}><Text style={{ fontSize: 14, fontWeight: '500', color: T.text }}>VIP radar</Text><Text style={{ fontSize: 11.5, color: T.subtle }}>Alert above N followers (0 = off)</Text></View>
          <Input value={vip} onChangeText={setVip} keyboardType="numeric" style={{ width: 88 }} />
        </Row>
        <View style={{ marginTop: 6 }}><Btn small label="Save VIP threshold" onPress={() => patch({ vipFollowerThreshold: Math.max(0, parseInt(vip) || 0) })} /></View>
      </Card>
    </Screen>
  );
}
