// Native Brand Safety / Guard screen — crisis kill-switch, auto-moderation
// rules, review queue. Talks to /api/ig/moderation/* with the bearer.
import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { apiGet, apiPost, apiPatch, apiDel } from '../api';
import { Screen, Card, SectionTitle, Btn, Toggle, Input, Row, Pill, Loading, Empty } from './ui';
import { T } from './theme';

type Rule = { id: string; type: string; pattern: string; action: string; enabled: boolean };
type LogRow = { id: number; commentId: string; text: string; fromUsername: string | null; fromUserId: string; ruleType: string; action: string; status: string };

const TYPES = [
  { id: 'keyword', label: 'Keyword' }, { id: 'competitor', label: 'Competitor' },
  { id: 'author_deny', label: 'Block user' }, { id: 'author_allow', label: 'Allow user' },
  { id: 'scam_link', label: 'Scam/link' }, { id: 'emoji_spam', label: 'Emoji spam' },
];
const ACTIONS = ['hide', 'delete', 'flag'];
const needsPattern = (t: string) => ['keyword', 'competitor', 'author_deny', 'author_allow'].includes(t);

export function GuardScreen({ onMenu }: { onMenu?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [crisis, setCrisis] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [type, setType] = useState('keyword');
  const [pattern, setPattern] = useState('');
  const [action, setAction] = useState('hide');

  async function load() {
    try {
      const [c, r, l] = await Promise.all([
        apiGet<{ armed: boolean }>('/api/ig/moderation/crisis'),
        apiGet<{ rules: Rule[] }>('/api/ig/moderation/rules'),
        apiGet<{ log: LogRow[] }>('/api/ig/moderation/log'),
      ]);
      setCrisis(c.armed); setRules(r.rules); setLog(l.log);
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleCrisis() { const next = !crisis; setCrisis(next); try { await apiPost('/api/ig/moderation/crisis', { armed: next }); } catch {} }
  async function addRule() {
    if (needsPattern(type) && !pattern.trim()) return;
    try { await apiPost('/api/ig/moderation/rules', { type, pattern: pattern.trim(), action }); setPattern(''); load(); } catch {}
  }
  async function toggleRule(r: Rule) { try { await apiPatch(`/api/ig/moderation/rules/${r.id}`, { enabled: !r.enabled }); load(); } catch {} }
  async function delRule(r: Rule) { try { await apiDel(`/api/ig/moderation/rules/${r.id}`); load(); } catch {} }
  async function revert(row: LogRow) { try { await apiPost(`/api/ig/moderation/log/${row.id}/revert`); load(); } catch {} }

  if (loading) return <Screen title="Guard" onMenu={onMenu}><Loading /></Screen>;

  return (
    <Screen title="Guard" onMenu={onMenu} subtitle="Auto-moderation, crisis kill-switch, and a review queue — all live.">
      {/* crisis */}
      <Card style={{ borderColor: crisis ? 'rgba(209,67,67,0.5)' : T.border, backgroundColor: crisis ? 'rgba(209,67,67,0.06)' : T.bgElev }}>
        <Row>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: T.text }}>Crisis kill-switch</Text>
            <Text style={{ fontSize: 12, color: T.muted }}>{crisis ? 'ARMED — every new comment auto-hidden.' : 'Off — rules moderate only.'}</Text>
          </View>
          <Btn small label={crisis ? 'Disarm' : 'Arm'} kind={crisis ? 'danger' : 'ghost'} onPress={toggleCrisis} />
        </Row>
      </Card>

      {/* rules */}
      <SectionTitle>Auto-moderation rules</SectionTitle>
      <Card>
        <Row style={{ flexWrap: 'wrap', marginBottom: 8 }}>
          {TYPES.map((t) => (
            <Pressable key={t.id} onPress={() => setType(t.id)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: type === t.id ? T.text : T.bgInset }}>
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: type === t.id ? '#fff' : T.muted }}>{t.label}</Text>
            </Pressable>
          ))}
        </Row>
        {needsPattern(type) ? <Input value={pattern} onChangeText={setPattern} placeholder="word / @user to match" style={{ marginBottom: 8 }} /> : null}
        <Row style={{ marginBottom: 10 }}>
          {ACTIONS.map((a) => (
            <Pressable key={a} onPress={() => setAction(a)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: action === a ? T.accentSoft : T.bgInset }}>
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: action === a ? T.accentDeep : T.muted }}>{a}</Text>
            </Pressable>
          ))}
        </Row>
        <Btn small label="Add rule" onPress={addRule} />
        <View style={{ marginTop: 10, gap: 6 }}>
          {rules.map((r) => (
            <Row key={r.id} style={{ opacity: r.enabled ? 1 : 0.5, paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.border }}>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: T.text }}>{TYPES.find((t) => t.id === r.type)?.label ?? r.type}</Text>
              {r.pattern ? <Text style={{ fontSize: 12, color: T.muted, flex: 1 }} numberOfLines={1}>“{r.pattern}”</Text> : <View style={{ flex: 1 }} />}
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: r.action === 'delete' ? T.blocked : r.action === 'flag' ? T.warm : T.subtle }}>{r.action.toUpperCase()}</Text>
              <Pressable onPress={() => toggleRule(r)}><Text style={{ fontSize: 11, fontWeight: '600', color: T.subtle }}>{r.enabled ? 'On' : 'Off'}</Text></Pressable>
              <Pressable onPress={() => delRule(r)}><Text style={{ fontSize: 16, color: T.subtle }}>×</Text></Pressable>
            </Row>
          ))}
          {rules.length === 0 ? <Text style={{ fontSize: 12, color: T.subtle, paddingVertical: 6 }}>No rules yet.</Text> : null}
        </View>
      </Card>

      {/* review queue */}
      <SectionTitle>Review queue · {log.length}</SectionTitle>
      <Card>
        {log.length === 0 ? <Empty text="Nothing moderated yet." /> : log.map((e) => (
          <Row key={e.id} style={{ paddingVertical: 8, opacity: e.status === 'reverted' ? 0.5 : 1 }}>
            <Text style={{ fontSize: 10.5, fontWeight: '700', width: 48, color: e.action === 'delete' ? T.blocked : T.warm }}>{e.action.toUpperCase()}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12.5, color: T.text }} numberOfLines={1}>{e.text || '(no text)'}</Text>
              <Text style={{ fontSize: 11, color: T.subtle }}>@{e.fromUsername ?? e.fromUserId} · {e.ruleType}</Text>
            </View>
            {e.status === 'reverted' ? <Text style={{ fontSize: 10.5, color: T.subtle }}>reverted</Text> : <Pressable onPress={() => revert(e)}><Pill label="Un-hide" color={T.accentDeep} bg={T.accentSoft} /></Pressable>}
          </Row>
        ))}
      </Card>
    </Screen>
  );
}
